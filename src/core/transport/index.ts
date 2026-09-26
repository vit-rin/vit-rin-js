import { withIdempotencyKey } from '../idempotency';
import { ApiError, NetworkError, TimeoutError } from './errors';

export type { ApiErrorBody, ApiErrorEnvelope, ApiFieldError } from './errors';
export { ApiError, NetworkError, TimeoutError, VitRinError } from './errors';

/** A `fetch`-compatible function. Lets callers inject a mock in tests, or
 * a polyfill in a runtime that doesn't have a global `fetch`. */
export type FetchLike = typeof fetch;

export interface TransportConfig {
  /** e.g. `https://api.vit-rin.example`. No trailing slash required. */
  baseUrl: string;
  /** Default per-request timeout. Defaults to 10s. */
  timeoutMs?: number;
  /** Injectable for tests; defaults to the global `fetch`. */
  fetch?: FetchLike;
}

export interface RequestOptions {
  /** Path relative to `baseUrl`, e.g. `/api/v1/auth/otp`. */
  path: string;
  method?: string;
  headers?: Record<string, string>;
  /**
   * A plain object is sent as `application/json`. A `URLSearchParams` (or
   * a string already in that shape) is sent as
   * `application/x-www-form-urlencoded` — `/oauth/token` requires this.
   * `undefined` sends no body.
   */
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
  /**
   * Force the idempotency decision instead of deriving it from `method`.
   * Surfaces (S2) will use this for calls that don't fit the plain
   * method-based heuristic; core/auth does not need it today.
   */
  idempotent?: boolean;
  idempotencyKey?: string;
  /** The response has no body (e.g. `204 No Content`). */
  noContent?: boolean;
}

function combineSignals(a: AbortSignal, b?: AbortSignal): AbortSignal {
  if (!b) return a;
  // `AbortSignal.any` isn't available in every runtime the SDK targets yet,
  // so combine manually.
  const controller = new AbortController();
  const onAbort = (signal: AbortSignal) => controller.abort(signal.reason);
  if (a.aborted) controller.abort(a.reason);
  if (b.aborted) controller.abort(b.reason);
  a.addEventListener('abort', () => onAbort(a));
  b.addEventListener('abort', () => onAbort(b));
  return controller.signal;
}

function encodeBody(body: unknown): { payload: BodyInit | undefined; contentType?: string } {
  if (body === undefined || body === null) {
    return { payload: undefined };
  }
  if (body instanceof URLSearchParams) {
    return { payload: body, contentType: 'application/x-www-form-urlencoded;charset=UTF-8' };
  }
  if (typeof body === 'string' || body instanceof ArrayBuffer || body instanceof Blob) {
    return { payload: body as BodyInit };
  }
  return { payload: JSON.stringify(body), contentType: 'application/json' };
}

async function decodeBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.length === 0) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * core/transport — the one place that calls `fetch`. Applies a timeout,
 * attaches idempotency keys to mutating calls, and turns non-2xx responses
 * and network failures into the typed errors in `./errors` instead of
 * letting callers deal with raw `Response` objects.
 */
export class Transport {
  private readonly baseUrl: string;
  private readonly defaultTimeoutMs: number;
  private readonly fetchImpl: FetchLike;

  constructor(config: TransportConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.defaultTimeoutMs = config.timeoutMs ?? 10_000;
    const fetchImpl = config.fetch ?? globalThis.fetch;
    if (!fetchImpl) {
      throw new Error(
        '@vit-rin/js: no `fetch` available in this environment. Pass one explicitly via TransportConfig.fetch.',
      );
    }
    this.fetchImpl = fetchImpl;
  }

  async request<T>(options: RequestOptions): Promise<T> {
    const method = (options.method ?? 'GET').toUpperCase();
    const url = `${this.baseUrl}${options.path}`;
    const timeoutMs = options.timeoutMs ?? this.defaultTimeoutMs;

    const { payload, contentType } = encodeBody(options.body);

    let headers: Record<string, string> = { ...options.headers };
    if (contentType && !Object.keys(headers).some((h) => h.toLowerCase() === 'content-type')) {
      headers['Content-Type'] = contentType;
    }

    const shouldAttachKey = options.idempotent ?? true;
    headers = shouldAttachKey ? withIdempotencyKey(headers, method, options.idempotencyKey) : headers;

    const timeoutController = new AbortController();
    const timer = setTimeout(() => timeoutController.abort(new TimeoutError()), timeoutMs);
    const signal = combineSignals(timeoutController.signal, options.signal);

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method,
        headers,
        body: payload,
        signal,
      });
    } catch (err) {
      if (timeoutController.signal.aborted) {
        throw new TimeoutError();
      }
      throw new NetworkError(err instanceof Error ? err.message : 'Network request failed', err);
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      const body = await decodeBody(response);
      throw ApiError.fromResponseBody(response.status, body);
    }

    if (options.noContent || response.status === 204) {
      return undefined as T;
    }

    return (await decodeBody(response)) as T;
  }
}
