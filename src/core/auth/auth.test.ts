import { describe, expect, it, vi } from 'vitest';

import { AuthClient, AuthError } from './index';
import { ApiError } from '../transport/errors';
import { IDEMPOTENCY_KEY_HEADER } from '../idempotency';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const TOKEN_PAIR = (accessToken: string, refreshToken = 'refresh-1') => ({
  access_token: accessToken,
  refresh_token: refreshToken,
  token_type: 'Bearer' as const,
  expires_in: 900,
});

// A factory, not a shared constant: a `Response` body can only be read
// once, and several tests need a fresh 401 on more than one call.
const unauthorized = () => jsonResponse(401, { error: { code: 'auth.invalid_token', message: 'expired' } });

describe('AuthClient — host-supplied token', () => {
  it('accepts a pre-obtained access token with no network call', () => {
    const fetchMock = vi.fn();
    const auth = new AuthClient({ baseUrl: 'https://api.example.test', fetch: fetchMock, accessToken: 'host-token' });

    expect(auth.getAccessToken()).toBe('host-token');
    expect(auth.isAuthenticated()).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('never touches document.cookie or window.location', () => {
    // This is a design assertion, not a runtime one: core/auth has no
    // reference to either global anywhere in its source.
    const source = AuthClient.toString();
    expect(source).not.toMatch(/document\.cookie/);
    expect(source).not.toMatch(/location\.(href|assign|replace)/);
  });
});

describe('AuthClient — OTP', () => {
  it('startOtp requires a clientId', async () => {
    const auth = new AuthClient({ baseUrl: 'https://api.example.test', fetch: vi.fn() });
    await expect(auth.startOtp('+989121234567')).rejects.toBeInstanceOf(AuthError);
  });

  it('startOtp posts client_id and phone', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(202, { challenge_id: 'chal_1', expires_in: 120 }));
    const auth = new AuthClient({ baseUrl: 'https://api.example.test', fetch: fetchMock, clientId: 'pk_live_abc' });

    const challenge = await auth.startOtp('+989121234567');

    expect(challenge).toEqual({ challenge_id: 'chal_1', expires_in: 120 });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('https://api.example.test/api/v1/auth/otp');
    expect(JSON.parse(init.body)).toEqual({ client_id: 'pk_live_abc', phone: '+989121234567' });
    expect(init.headers[IDEMPOTENCY_KEY_HEADER]).toBeTruthy();
  });

  it('verifyOtp stores the returned token pair', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, TOKEN_PAIR('access-1')));
    const auth = new AuthClient({ baseUrl: 'https://api.example.test', fetch: fetchMock, clientId: 'pk_live_abc' });

    const pair = await auth.verifyOtp('chal_1', '482913');

    expect(pair.access_token).toBe('access-1');
    expect(auth.getAccessToken()).toBe('access-1');
  });
});

describe('AuthClient — refresh', () => {
  it('throws AuthError when there is no refresh token to use', async () => {
    const auth = new AuthClient({ baseUrl: 'https://api.example.test', fetch: vi.fn(), accessToken: 'a' });
    await expect(auth.refresh()).rejects.toBeInstanceOf(AuthError);
  });

  it('posts grant_type=refresh_token as form-urlencoded and rotates the token', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, TOKEN_PAIR('access-1', 'refresh-1')))
      .mockResolvedValueOnce(jsonResponse(200, TOKEN_PAIR('access-2', 'refresh-2')));
    const auth = new AuthClient({ baseUrl: 'https://api.example.test', fetch: fetchMock, clientId: 'pk_live_abc' });
    await auth.verifyOtp('chal_1', '482913');

    await auth.refresh();

    expect(auth.getAccessToken()).toBe('access-2');
    const [url, init] = fetchMock.mock.calls[1] ?? [];
    expect(url).toBe('https://api.example.test/oauth/token');
    expect(init.headers['Content-Type']).toContain('application/x-www-form-urlencoded');
    expect(String(init.body)).toContain('grant_type=refresh_token');
    expect(String(init.body)).toContain('refresh_token=refresh-1');
  });

  it('dedupes concurrent refresh calls into a single request', async () => {
    let resolveRefresh!: (r: Response) => void;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, TOKEN_PAIR('access-1', 'refresh-1')))
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            resolveRefresh = resolve;
          }),
      );
    const auth = new AuthClient({ baseUrl: 'https://api.example.test', fetch: fetchMock, clientId: 'pk_live_abc' });
    await auth.verifyOtp('chal_1', '482913');

    const first = auth.refresh();
    const second = auth.refresh();
    resolveRefresh(jsonResponse(200, TOKEN_PAIR('access-2', 'refresh-2')));
    await Promise.all([first, second]);

    // 1 call for verifyOtp + exactly 1 call for both refresh() invocations together.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('drops the refresh token when the server reports it was already spent/expired', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, TOKEN_PAIR('access-1', 'refresh-1')))
      .mockResolvedValueOnce(
        jsonResponse(401, { error: { code: 'auth.refresh_reused', message: 'refresh token already spent' } }),
      );
    const auth = new AuthClient({ baseUrl: 'https://api.example.test', fetch: fetchMock, clientId: 'pk_live_abc' });
    await auth.verifyOtp('chal_1', '482913');

    await expect(auth.refresh()).rejects.toBeInstanceOf(ApiError);
    // A second call must fail fast (AuthError, no network) rather than
    // retrying a token the server already told us is dead.
    await expect(auth.refresh()).rejects.toBeInstanceOf(AuthError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('AuthClient — authorizedRequest auto-refresh (single retry, no loop)', () => {
  it('attaches the current access token and returns on a normal 200', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    const auth = new AuthClient({ baseUrl: 'https://api.example.test', fetch: fetchMock, accessToken: 'access-1' });

    const result = await auth.authorizedRequest<{ ok: boolean }>({ path: '/thing' });

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(init.headers.Authorization).toBe('Bearer access-1');
  });

  it('on a 401, refreshes exactly once and retries exactly once, then succeeds', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, TOKEN_PAIR('access-1', 'refresh-1'))) // sign in via OTP
      .mockResolvedValueOnce(unauthorized()) // original request, now-stale token
      .mockResolvedValueOnce(jsonResponse(200, TOKEN_PAIR('access-2', 'refresh-2'))) // refresh
      .mockResolvedValueOnce(jsonResponse(200, { ok: true })); // retried request
    const auth = new AuthClient({ baseUrl: 'https://api.example.test', fetch: fetchMock, clientId: 'pk_live_abc' });
    await auth.verifyOtp('chal_1', '482913');

    const result = await auth.authorizedRequest<{ ok: boolean }>({ path: '/thing' });

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[1]?.[1]?.headers.Authorization).toBe('Bearer access-1');
    expect(fetchMock.mock.calls[3]?.[1]?.headers.Authorization).toBe('Bearer access-2');
    expect(auth.getAccessToken()).toBe('access-2');
  });

  it('surfaces the 401 immediately when there is no refresh token (no retry attempted)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(unauthorized());
    const auth = new AuthClient({ baseUrl: 'https://api.example.test', fetch: fetchMock, accessToken: 'access-1' });

    await expect(auth.authorizedRequest({ path: '/thing' })).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('surfaces the error if the retry after refresh still 401s — never loops', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, TOKEN_PAIR('access-1', 'refresh-1'))) // sign in via OTP
      .mockResolvedValueOnce(unauthorized()) // original
      .mockResolvedValueOnce(jsonResponse(200, TOKEN_PAIR('access-2', 'refresh-2'))) // refresh succeeds
      .mockResolvedValueOnce(unauthorized()); // retry still unauthorized
    const auth = new AuthClient({ baseUrl: 'https://api.example.test', fetch: fetchMock, clientId: 'pk_live_abc' });
    await auth.verifyOtp('chal_1', '482913');

    await expect(auth.authorizedRequest({ path: '/thing' })).rejects.toBeInstanceOf(ApiError);
    // Exactly 4 calls: sign-in + original + refresh + one retry. Not a
    // fifth call, which would mean it looped.
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});

describe('AuthClient — logout', () => {
  it('sends the refresh token and an idempotency key, and clears local state', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, TOKEN_PAIR('access-1', 'refresh-1')))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const auth = new AuthClient({ baseUrl: 'https://api.example.test', fetch: fetchMock, clientId: 'pk_live_abc' });
    await auth.verifyOtp('chal_1', '482913');

    await auth.logout();

    expect(auth.getAccessToken()).toBeUndefined();
    const [url, init] = fetchMock.mock.calls[1] ?? [];
    expect(url).toBe('https://api.example.test/api/v1/auth/logout');
    expect(JSON.parse(init.body)).toEqual({ refresh_token: 'refresh-1' });
    expect(init.headers[IDEMPOTENCY_KEY_HEADER]).toBeTruthy();
  });

  it('is a no-op network-wise when there is nothing to revoke', async () => {
    const fetchMock = vi.fn();
    const auth = new AuthClient({ baseUrl: 'https://api.example.test', fetch: fetchMock, accessToken: 'access-1' });

    await auth.logout();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(auth.getAccessToken()).toBeUndefined();
  });
});
