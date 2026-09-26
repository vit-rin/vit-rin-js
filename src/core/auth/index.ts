import { EventEmitter } from '../events';
import { ApiError } from '../transport/errors';
import { Transport, type FetchLike, type RequestOptions } from '../transport';
import type { OtpChallenge, TokenPair } from '../../types/auth';
import { AuthError } from './errors';

export { AuthError } from './errors';

export interface StoredTokens {
  accessToken: string;
  refreshToken?: string;
  /** Epoch milliseconds. `undefined` when the host supplied a bare access
   * token with no known expiry. */
  expiresAt?: number;
}

export type AuthEvent =
  | { type: 'tokens_set'; tokens: StoredTokens }
  | { type: 'tokens_cleared' }
  | { type: 'refresh_failed'; error: unknown };

export interface AuthConfig {
  /** Same API base URL used for every other call. */
  baseUrl: string;
  /**
   * The public client id (`pk_live_*`) this game/host is registered as.
   * Required to start an OTP challenge; not required if the host only
   * ever supplies a pre-obtained access token via `setAccessToken`.
   */
  clientId?: string;
  /** Reuse an existing Transport instead of constructing one. */
  transport?: Transport;
  fetch?: FetchLike;
  timeoutMs?: number;
  /** A token the host already obtained by some other means. */
  accessToken?: string;
}

/**
 * core/auth — token only.
 *
 * This class never reads `document.cookie` and never redirects the page
 * anywhere. A host either hands it an access token directly
 * (`setAccessToken`) or lets it obtain one itself through a public
 * client's OTP flow (`startOtp` + `verifyOtp`). Both paths work from any
 * origin, which is the whole point: a game embedding this SDK on its own
 * domain has no session with `vit-rin`'s origin to share.
 */
export class AuthClient extends EventEmitter<AuthEvent> {
  private readonly transport: Transport;
  private readonly clientId?: string;

  private accessToken?: string;
  private refreshToken?: string;
  private expiresAt?: number;

  /** De-dupes concurrent refresh attempts so two 401s in flight at once
   * don't each spend the (single-use) refresh token. */
  private refreshing?: Promise<void>;

  constructor(config: AuthConfig) {
    super();
    this.transport = config.transport ?? new Transport({ baseUrl: config.baseUrl, fetch: config.fetch, timeoutMs: config.timeoutMs });
    this.clientId = config.clientId;
    if (config.accessToken) {
      this.setAccessToken(config.accessToken);
    }
  }

  // --- host-supplied token ------------------------------------------------

  /**
   * Accepts an access token the host obtained itself (e.g. its own
   * backend already authenticated the player). No network call, no
   * cookie, no redirect — the SDK just starts using it.
   */
  setAccessToken(accessToken: string, expiresAt?: number): void {
    this.accessToken = accessToken;
    this.expiresAt = expiresAt;
    this.emit({ type: 'tokens_set', tokens: this.snapshot() });
  }

  getAccessToken(): string | undefined {
    return this.accessToken;
  }

  isAuthenticated(): boolean {
    return this.accessToken !== undefined;
  }

  /** Drops every token in memory. Does not call the network. */
  clear(): void {
    this.accessToken = undefined;
    this.refreshToken = undefined;
    this.expiresAt = undefined;
    this.emit({ type: 'tokens_cleared' });
  }

  private snapshot(): StoredTokens {
    return { accessToken: this.accessToken!, refreshToken: this.refreshToken, expiresAt: this.expiresAt };
  }

  private storeTokenPair(pair: TokenPair): void {
    this.accessToken = pair.access_token;
    this.refreshToken = pair.refresh_token ?? this.refreshToken;
    this.expiresAt = Date.now() + pair.expires_in * 1000;
    this.emit({ type: 'tokens_set', tokens: this.snapshot() });
  }

  // --- OTP (pk_live_* public client) --------------------------------------

  /** `POST /api/v1/auth/otp` — sends a code to `phone` for this client. */
  async startOtp(phone: string): Promise<OtpChallenge> {
    if (!this.clientId) {
      throw new AuthError('auth.no_client_id', 'AuthClient was not configured with a clientId; cannot start an OTP challenge.');
    }
    return this.transport.request<OtpChallenge>({
      method: 'POST',
      path: '/api/v1/auth/otp',
      body: { client_id: this.clientId, phone },
    });
  }

  /**
   * `POST /api/v1/auth/otp/verify` — exchanges the code for a token pair
   * and stores it. Returns the pair too, in case the host wants to persist
   * the refresh token itself (e.g. in its own secure storage).
   */
  async verifyOtp(challengeId: string, code: string): Promise<TokenPair> {
    const pair = await this.transport.request<TokenPair>({
      method: 'POST',
      path: '/api/v1/auth/otp/verify',
      body: { challenge_id: challengeId, code },
    });
    this.storeTokenPair(pair);
    return pair;
  }

  // --- refresh -------------------------------------------------------------

  /**
   * `POST /oauth/token` with `grant_type=refresh_token`. Consumes the
   * current refresh token (single-use rotation per ADR 0007) and stores
   * the new pair. Concurrent calls share one in-flight request instead of
   * each spending a token.
   */
  async refresh(): Promise<void> {
    if (!this.refreshToken) {
      throw new AuthError('auth.no_refresh_token', 'No refresh token is available to refresh with.');
    }
    if (!this.refreshing) {
      this.refreshing = this.doRefresh().finally(() => {
        this.refreshing = undefined;
      });
    }
    return this.refreshing;
  }

  private async doRefresh(): Promise<void> {
    const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: this.refreshToken! });
    try {
      const pair = await this.transport.request<TokenPair>({
        method: 'POST',
        path: '/oauth/token',
        body,
      });
      this.storeTokenPair(pair);
    } catch (err) {
      // A reused/expired refresh token revokes the whole family server
      // side (ADR 0007) — there is nothing left to retry with, so drop
      // what we're holding rather than keep offering a dead refresh token.
      this.refreshToken = undefined;
      this.emit({ type: 'refresh_failed', error: err });
      throw err;
    }
  }

  // --- logout ---------------------------------------------------------------

  /** `POST /api/v1/auth/logout`. Idempotent server-side; always clears
   * local state even if the network call fails. */
  async logout(): Promise<void> {
    const refreshToken = this.refreshToken;
    this.clear();
    if (!refreshToken) return;
    await this.transport.request<void>({
      method: 'POST',
      path: '/api/v1/auth/logout',
      body: { refresh_token: refreshToken },
      noContent: true,
    });
  }

  // --- authorized requests ---------------------------------------------------

  /**
   * Attaches the current access token and performs the request. On a 401,
   * refreshes exactly once and retries the original request exactly once.
   * If the retry still fails — or there's no refresh token to try — the
   * error propagates to the caller. This never loops: at most one refresh
   * and one retry per call.
   */
  async authorizedRequest<T>(options: RequestOptions): Promise<T> {
    const attempt = (): Promise<T> => {
      const headers = { ...options.headers };
      if (this.accessToken) {
        headers.Authorization = `Bearer ${this.accessToken}`;
      }
      return this.transport.request<T>({ ...options, headers });
    };

    try {
      return await attempt();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401 && this.refreshToken) {
        await this.refresh();
        return await attempt();
      }
      throw err;
    }
  }
}
