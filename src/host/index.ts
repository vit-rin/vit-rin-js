/**
 * host — a Game's side of the frame handshake (adr/0018).
 *
 * The consumer site's game page frames the Game and hands it a customer token
 * by `postMessage`. The Game's SDK:
 *
 *   Game → page   vitrin:ready      { }                          the SDK is listening
 *   page → Game   vitrin:token      { access_token, token_type, expires_in }
 *   Game → page   vitrin:refresh    { }                          the token is no longer good
 *   Game → page   vitrin:finished   { session_id }               a result was accepted
 *
 * `vitrin:token` carries the `TokenPair` the API issues for `customer_context`
 * (auth.yaml), field for field: `expires_in` is seconds from now, and there is
 * no `refresh_token` (a message that has one is ignored). The Competition to play
 * is not in it. The page names it in the frame's URL (`?competition=<id>`), so a
 * refreshed token never has to say it again.
 *
 * Origins are checked here, on the Game's side. A `vitrin:token` is accepted only
 * if it comes from the Game's own parent window **and** from one of the
 * `allowedParentOrigins` the host was deployed with. That list is configuration
 * of the environment the Game is served in; it is never read from the URL or
 * from a message. A page that frames the Game from anywhere else gets no answer
 * to `vitrin:ready`, and a token it sends is ignored.
 *
 * The SDK keeps the token in memory only. It holds no refresh token: when a
 * request meets a `401` it asks the page for a fresh one (`vitrin:refresh`),
 * retries once, and surfaces the error if no token comes.
 */
import { AuthClient } from '../core/auth';
import { Transport, type FetchLike } from '../core/transport';
import { VitRinError } from '../core/transport/errors';
import { CompetitionsClient, OpenSession } from '../surfaces/competitions';

export const HOST_MESSAGE = {
  ready: 'vitrin:ready',
  token: 'vitrin:token',
  refresh: 'vitrin:refresh',
  finished: 'vitrin:finished',
} as const;

/** A failure of the handshake itself. `code` is stable; `message` is for logs. */
export class HostError extends VitRinError {
  constructor(
    readonly code:
      | 'host.not_framed'
      | 'host.origin_invalid'
      | 'host.competition_missing'
      | 'host.token_timeout'
      | 'host.refresh_timeout'
      | 'host.closed',
    message: string,
  ) {
    super(message);
  }
}

/** The part of `window` the handshake uses; a test passes a fake. */
export type HostWindow = Pick<Window, 'parent' | 'addEventListener' | 'removeEventListener'> & {
  location?: Pick<Location, 'search'>;
};

export interface ConnectOptions {
  /** e.g. `https://api.stage.vit-rin.com`. */
  apiBaseUrl: string;
  /**
   * The origins allowed to frame this Game and hand it a token, from the
   * deployed configuration of this environment. Exact origins (`https://host`),
   * no path, no wildcard.
   */
  allowedParentOrigins: readonly string[];
  /**
   * The Competition to play. Leave it out and it is read from the `competition`
   * parameter of the frame's own URL, where the page that built the frame put it.
   */
  competitionId?: string;
  /** How long to wait for a token from the page, in ms. Default 10 000. */
  timeoutMs?: number;
  fetch?: FetchLike;
  /** Defaults to the global `window`. */
  window?: HostWindow;
}

export interface HostConnection {
  /** The Competition the page asked this Game to play. */
  readonly competitionId: string;
  /**
   * Opens a **new** play session in that Competition. Every call is a new
   * session: call it before each play, including a replay.
   */
  openSession(): Promise<OpenSession>;
  /** Stops listening. Call it when the Game unmounts. */
  close(): void;
}

interface TokenMessage {
  accessToken: string;
  /** Epoch milliseconds: when the message arrived plus `expires_in`. */
  expiresAt: number;
}

const COMPETITION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DEFAULT_TIMEOUT_MS = 10_000;
const READY_RETRY_MS = 500;

/** An exact origin: `new URL(x).origin === x`, so no path, no wildcard, no `null`. */
function assertExactOrigins(origins: readonly string[]): string[] {
  if (origins.length === 0) {
    throw new HostError('host.origin_invalid', 'allowedParentOrigins is empty: no page could ever hand this Game a token.');
  }
  return origins.map((origin) => {
    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      throw new HostError('host.origin_invalid', `allowedParentOrigins: "${origin}" is not an origin.`);
    }
    if ((parsed.protocol !== 'https:' && parsed.protocol !== 'http:') || parsed.origin !== origin) {
      throw new HostError('host.origin_invalid', `allowedParentOrigins: "${origin}" is not an exact http(s) origin.`);
    }
    return origin;
  });
}

function parseToken(data: unknown): TokenMessage | undefined {
  if (typeof data !== 'object' || data === null) return undefined;
  const m = data as Record<string, unknown>;
  if (m.type !== HOST_MESSAGE.token) return undefined;
  if (typeof m.access_token !== 'string' || m.access_token === '') return undefined;
  if (m.token_type !== 'Bearer') return undefined;
  if (typeof m.expires_in !== 'number' || !Number.isInteger(m.expires_in) || m.expires_in <= 0) return undefined;
  // A Game never holds a refresh token (adr/0018). A page that sends one is wrong, and the
  // token is not taken, so the mistake is seen at once instead of quietly working.
  if ('refresh_token' in m) return undefined;
  return { accessToken: m.access_token, expiresAt: Date.now() + m.expires_in * 1000 };
}

function competitionIdOf(options: ConnectOptions, win: HostWindow): string {
  const id = options.competitionId ?? new URLSearchParams(win.location?.search ?? '').get('competition') ?? '';
  if (!COMPETITION_ID.test(id)) {
    throw new HostError('host.competition_missing', "The frame's URL does not name the Competition to play (?competition=<id>).");
  }
  return id.toLowerCase();
}

/**
 * Connects this Game to the page that framed it and waits for its token.
 * Rejects with `HostError` `host.not_framed` when the Game is not in a frame,
 * and `host.token_timeout` when no allowed page answers in time.
 */
export async function connectToHost(options: ConnectOptions): Promise<HostConnection> {
  const allowed = new Set(assertExactOrigins(options.allowedParentOrigins));
  const win: HostWindow = options.window ?? (globalThis as unknown as { window: Window }).window;
  const parent = win.parent;
  if (!parent || (parent as unknown) === (win as unknown)) {
    throw new HostError('host.not_framed', 'This page is not in a frame: there is no page to hand it a token.');
  }
  const competitionId = competitionIdOf(options, win);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let closed = false;
  let parentOrigin: string | undefined;
  let waiters: Array<(token: TokenMessage) => void> = [];
  let auth: AuthClient | undefined;

  const onMessage = (event: MessageEvent): void => {
    if (event.source !== parent) return;
    if (!allowed.has(event.origin)) return;
    const token = parseToken(event.data);
    if (!token) return;
    parentOrigin = event.origin;
    auth?.setAccessToken(token.accessToken, token.expiresAt);
    const pending = waiters;
    waiters = [];
    for (const resolve of pending) resolve(token);
  };
  win.addEventListener('message', onMessage as EventListener);

  const close = (): void => {
    closed = true;
    win.removeEventListener('message', onMessage as EventListener);
  };

  const nextToken = (ms: number, timeout: HostError): Promise<TokenMessage> =>
    new Promise<TokenMessage>((resolve, reject) => {
      const timer = setTimeout(() => {
        waiters = waiters.filter((w) => w !== done);
        reject(timeout);
      }, ms);
      const done = (token: TokenMessage): void => {
        clearTimeout(timer);
        resolve(token);
      };
      waiters.push(done);
    });

  // `ready` names each allowed origin as its target, so a page anywhere else is
  // never delivered it. It is repeated until the page answers, because the page
  // may attach its listener after the frame has loaded.
  const sendReady = (): void => {
    for (const origin of allowed) parent.postMessage({ type: HOST_MESSAGE.ready }, origin);
  };

  let first: TokenMessage;
  const waiting = nextToken(timeoutMs, new HostError('host.token_timeout', 'No allowed page handed this Game a token.'));
  sendReady();
  const retry = setInterval(sendReady, READY_RETRY_MS);
  try {
    first = await waiting;
  } catch (err) {
    close();
    throw err;
  } finally {
    clearInterval(retry);
  }

  auth = new AuthClient({
    baseUrl: options.apiBaseUrl,
    transport: new Transport({ baseUrl: options.apiBaseUrl, fetch: options.fetch }),
    accessToken: first.accessToken,
    refresh: async () => {
      if (closed || !parentOrigin) throw new HostError('host.closed', 'The host connection is closed.');
      const fresh = nextToken(timeoutMs, new HostError('host.refresh_timeout', 'The page did not hand over a fresh token.'));
      parent.postMessage({ type: HOST_MESSAGE.refresh }, parentOrigin);
      const token = await fresh;
      return { accessToken: token.accessToken, expiresAt: token.expiresAt };
    },
  });
  auth.setAccessToken(first.accessToken, first.expiresAt);

  const competitions = new CompetitionsClient(auth);

  return {
    competitionId,
    async openSession() {
      if (closed) throw new HostError('host.closed', 'The host connection is closed.');
      const session = await competitions.open(competitionId);
      return new OpenSession(session, competitions, (result) => {
        if (!closed && parentOrigin) {
          parent.postMessage({ type: HOST_MESSAGE.finished, session_id: result.session_id }, parentOrigin);
        }
      });
    },
    close,
  };
}
