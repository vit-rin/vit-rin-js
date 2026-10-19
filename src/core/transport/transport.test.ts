import { afterEach, describe, expect, it, vi } from 'vitest';

import { Transport } from './index';
import { ApiError, NetworkError, RateLimitedError, TimeoutError, parseRetryAfter } from './errors';
import { IDEMPOTENCY_KEY_HEADER } from '../idempotency';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('Transport', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves with the decoded JSON body on a 2xx response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { hello: 'world' }));
    const transport = new Transport({ baseUrl: 'https://api.example.test', fetch: fetchMock });

    const result = await transport.request<{ hello: string }>({ path: '/thing' });

    expect(result).toEqual({ hello: 'world' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('https://api.example.test/thing');
  });

  it('strips a trailing slash from baseUrl', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, {}));
    const transport = new Transport({ baseUrl: 'https://api.example.test/', fetch: fetchMock });

    await transport.request({ path: '/thing' });

    expect(fetchMock).toHaveBeenCalledWith('https://api.example.test/thing', expect.anything());
  });

  it('sends a JSON body with the right content type for a plain object', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, {}));
    const transport = new Transport({ baseUrl: 'https://api.example.test', fetch: fetchMock });

    await transport.request({ method: 'POST', path: '/thing', body: { a: 1 } });

    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(init.body).toBe(JSON.stringify({ a: 1 }));
    expect(init.headers['Content-Type']).toBe('application/json');
  });

  it('sends a URLSearchParams body as form-urlencoded', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, {}));
    const transport = new Transport({ baseUrl: 'https://api.example.test', fetch: fetchMock });

    const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: 'abc' });
    await transport.request({ method: 'POST', path: '/oauth/token', body });

    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(init.body).toBe(body);
    expect(init.headers['Content-Type']).toContain('application/x-www-form-urlencoded');
  });

  it('attaches an Idempotency-Key header for a mutating method', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, {}));
    const transport = new Transport({ baseUrl: 'https://api.example.test', fetch: fetchMock });

    await transport.request({ method: 'POST', path: '/thing', body: {} });

    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(init.headers[IDEMPOTENCY_KEY_HEADER]).toBeTruthy();
  });

  it('does not attach an Idempotency-Key header for GET', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, {}));
    const transport = new Transport({ baseUrl: 'https://api.example.test', fetch: fetchMock });

    await transport.request({ path: '/thing' });

    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(init.headers[IDEMPOTENCY_KEY_HEADER]).toBeUndefined();
  });

  it('throws a typed ApiError decoded from the shared error envelope', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(404, {
        error: { code: 'campaign.not_found', message: 'No such campaign', request_id: 'req_1' },
      }),
    );
    const transport = new Transport({ baseUrl: 'https://api.example.test', fetch: fetchMock });

    const err = await transport.request({ path: '/campaigns/1' }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ApiError);
    if (!(err instanceof ApiError)) throw err;
    expect(err.status).toBe(404);
    expect(err.code).toBe('campaign.not_found');
    expect(err.requestId).toBe('req_1');
  });

  it('falls back to a synthetic http.<status> code for a non-envelope error body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('<html>gateway error</html>', { status: 502, headers: { 'Content-Type': 'text/html' } }),
    );
    const transport = new Transport({ baseUrl: 'https://api.example.test', fetch: fetchMock });

    const err = await transport.request({ path: '/thing' }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ApiError);
    if (!(err instanceof ApiError)) throw err;
    expect(err.status).toBe(502);
    expect(err.code).toBe('http.502');
  });

  it('returns undefined for a 204 No Content response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const transport = new Transport({ baseUrl: 'https://api.example.test', fetch: fetchMock });

    const result = await transport.request({ method: 'POST', path: '/logout' });

    expect(result).toBeUndefined();
  });

  it('wraps a rejected fetch in a NetworkError', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    const transport = new Transport({ baseUrl: 'https://api.example.test', fetch: fetchMock });

    const err = await transport.request({ path: '/thing' }).catch((e) => e);

    expect(err).toBeInstanceOf(NetworkError);
  });

  it('throws a TimeoutError when the request exceeds its timeout', async () => {
    const fetchMock = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => {
          reject(new DOMException('aborted', 'AbortError'));
        });
      });
    });
    const transport = new Transport({ baseUrl: 'https://api.example.test', fetch: fetchMock, timeoutMs: 5 });

    const err = await transport.request({ path: '/slow' }).catch((e) => e);

    expect(err).toBeInstanceOf(TimeoutError);
  });
});

describe('Transport — rate limiting', () => {
  const rateLimited = (headers: Record<string, string>) =>
    new Response(JSON.stringify({ error: { code: 'rate_limited', message: 'slow down', request_id: 'req-1' } }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', ...headers },
    });

  it('a 429 is a RateLimitedError carrying how long to wait', async () => {
    const fetchMock = vi.fn().mockResolvedValue(rateLimited({ 'Retry-After': '42' }));
    const transport = new Transport({ baseUrl: 'https://api.example.test', fetch: fetchMock });

    const err = (await transport.request({ method: 'POST', path: '/thing' }).catch((e: unknown) => e)) as ApiError;

    expect(err).toBeInstanceOf(RateLimitedError);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(429);
    expect(err.code).toBe('rate_limited');
    expect(err.retryAfter).toBe(42);
    expect(err.requestId).toBe('req-1');
  });

  it('a 429 without Retry-After is still a RateLimitedError, with no wait', async () => {
    const fetchMock = vi.fn().mockResolvedValue(rateLimited({}));
    const transport = new Transport({ baseUrl: 'https://api.example.test', fetch: fetchMock });

    const err = (await transport.request({ method: 'POST', path: '/thing' }).catch((e: unknown) => e)) as ApiError;

    expect(err).toBeInstanceOf(RateLimitedError);
    expect(err.retryAfter).toBeUndefined();
  });

  it('does not retry a 429 by itself: waiting is the caller\'s decision', async () => {
    const fetchMock = vi.fn().mockResolvedValue(rateLimited({ 'Retry-After': '1' }));
    const transport = new Transport({ baseUrl: 'https://api.example.test', fetch: fetchMock });

    await transport.request({ method: 'POST', path: '/thing' }).catch(() => undefined);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('an in-progress idempotent request also says how long to wait', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 'idempotency.in_progress', message: 'busy' } }), {
        status: 409,
        headers: { 'Content-Type': 'application/json', 'Retry-After': '1' },
      }),
    );
    const transport = new Transport({ baseUrl: 'https://api.example.test', fetch: fetchMock });

    const err = (await transport.request({ method: 'POST', path: '/thing' }).catch((e: unknown) => e)) as ApiError;

    expect(err).toBeInstanceOf(ApiError);
    expect(err).not.toBeInstanceOf(RateLimitedError);
    expect(err.code).toBe('idempotency.in_progress');
    expect(err.retryAfter).toBe(1);
  });
});

describe('parseRetryAfter', () => {
  it('reads whole seconds', () => {
    expect(parseRetryAfter('60')).toBe(60);
    expect(parseRetryAfter(' 5 ')).toBe(5);
    expect(parseRetryAfter('0')).toBe(0);
  });

  it('reads an HTTP date, as seconds from now, never negative', () => {
    const now = Date.parse('2026-01-01T00:00:00Z');
    expect(parseRetryAfter('Thu, 01 Jan 2026 00:01:30 GMT', now)).toBe(90);
    expect(parseRetryAfter('Wed, 31 Dec 2025 23:00:00 GMT', now)).toBe(0);
  });

  it('is undefined when there is nothing usable', () => {
    expect(parseRetryAfter(null)).toBeUndefined();
    expect(parseRetryAfter(undefined)).toBeUndefined();
    expect(parseRetryAfter('')).toBeUndefined();
    expect(parseRetryAfter('soon')).toBeUndefined();
    expect(parseRetryAfter('-5')).toBeUndefined();
  });
});
