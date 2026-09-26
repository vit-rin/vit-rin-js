import { afterEach, describe, expect, it, vi } from 'vitest';

import { Transport } from './index';
import { ApiError, NetworkError, TimeoutError } from './errors';
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
