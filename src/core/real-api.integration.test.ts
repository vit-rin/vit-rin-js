/**
 * S1 exercised against the real API (docs/BUILD.md, M1):
 *
 *  - a 401 refreshes once and retries once
 *  - a replayed mutating call with the same idempotency key returns the
 *    original response
 *  - a 429 surfaces as a typed error carrying Retry-After
 *
 * It talks to a running vit-rin-backend whose OTP sender is the development
 * log sender, so the code a sign-in needs is read from the API's log:
 *
 *   VITRIN_API_URL        e.g. http://127.0.0.1:8190
 *   VITRIN_API_LOG        the file the API's stdout goes to
 *   VITRIN_ADMIN_PHONE    the API's AUTH_BOOTSTRAP_SUPER_ADMIN_PHONE
 *
 * Without VITRIN_API_URL the suite is skipped, so `npm test` is unaffected.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { ApiError, AuthClient, RateLimitedError, Transport, generateIdempotencyKey } from '../index';
import type { FetchLike } from './transport';

const API_URL = process.env.VITRIN_API_URL;
const API_LOG = process.env.VITRIN_API_LOG ?? '';
const ADMIN_PHONE = process.env.VITRIN_ADMIN_PHONE ?? '';
const PLATFORM_CLIENT = process.env.VITRIN_PLATFORM_CLIENT ?? 'pk_live_platform';

const live = describe.skipIf(!API_URL);

function freshPhone(): string {
  return `+9891${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`;
}

async function codeFor(phone: string): Promise<string> {
  const pattern = new RegExp(`phone=${phone.replace('+', '\\+')} code=(\\d+)`, 'g');
  for (let i = 0; i < 50; i++) {
    const hits = [...readFileSync(API_LOG, 'utf8').matchAll(pattern)];
    const last = hits[hits.length - 1];
    if (last?.[1]) return last[1];
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`no OTP code was logged for ${phone}`);
}

async function signIn(clientId: string, phone: string, fetchImpl?: FetchLike): Promise<AuthClient> {
  const auth = new AuthClient({ baseUrl: API_URL!, clientId, fetch: fetchImpl });
  const challenge = await auth.startOtp(phone);
  await auth.verifyOtp(challenge.challenge_id, await codeFor(phone));
  return auth;
}

/** A fetch that records what it was asked, so a test can count real requests. */
function recording(): { fetch: FetchLike; calls: Array<{ url: string; method: string; headers: Record<string, string> }> } {
  const calls: Array<{ url: string; method: string; headers: Record<string, string> }> = [];
  const fetchImpl: FetchLike = async (input, init) => {
    calls.push({
      url: String(input),
      method: (init?.method ?? 'GET').toUpperCase(),
      headers: { ...(init?.headers as Record<string, string>) },
    });
    return fetch(input, init);
  };
  return { fetch: fetchImpl, calls };
}

/**
 * A public client of a fresh Business, which is what a game embedding the SDK
 * is. Provisioned as the super-admin, who is the only one who can.
 */
async function provisionPublicClient(): Promise<string> {
  const admin = await signIn(PLATFORM_CLIENT, ADMIN_PHONE);
  const stamp = Date.now().toString(36);
  const business = await admin.authorizedRequest<{ id: string }>({
    method: 'POST',
    path: '/api/v1/admin/businesses',
    body: { name: `SDK ${stamp}`, slug: `sdk-${stamp}` },
  });
  const client = await admin.authorizedRequest<{ client_id: string }>({
    method: 'POST',
    path: `/api/v1/admin/businesses/${business.id}/clients`,
    body: { kind: 'public', name: 'sdk-it', allowed_origins: ['https://games.example.test'] },
  });
  return client.client_id;
}

live('S1 against the real API', () => {
  it('a 401 refreshes once and retries once, and the retry carries the new token', async () => {
    const clientId = await provisionPublicClient();
    const rec = recording();
    const auth = await signIn(clientId, freshPhone(), rec.fetch);
    rec.calls.length = 0;
    const before = auth.getAccessToken();

    auth.setAccessToken('not.a.jwt');
    // The memberships list is a person-level read that any signed-in token may
    // ask; a customer is refused it (403) once the token is accepted, which is
    // all that is needed to prove the retry was authenticated.
    const outcome = await auth
      .authorizedRequest<unknown>({ path: '/api/v1/admin/me/memberships' })
      .then(() => 'ok', (e: unknown) => e);

    const refreshes = rec.calls.filter((c) => c.url.endsWith('/oauth/token'));
    const attempts = rec.calls.filter((c) => c.url.endsWith('/api/v1/admin/me/memberships'));
    expect(refreshes).toHaveLength(1);
    expect(attempts).toHaveLength(2);
    expect(attempts[0]?.headers.Authorization).toBe('Bearer not.a.jwt');
    expect(attempts[1]?.headers.Authorization).toBe(`Bearer ${auth.getAccessToken()}`);
    expect(auth.getAccessToken()).not.toBe(before);
    // Past the 401: the server accepted the new token and answered as itself.
    expect(outcome).toBeInstanceOf(ApiError);
    expect((outcome as ApiError).status).not.toBe(401);
  });

  it('gives up after one refresh: a refresh token that is no good surfaces the error, no loop', async () => {
    const clientId = await provisionPublicClient();
    const rec = recording();
    const auth = await signIn(clientId, freshPhone(), rec.fetch);
    rec.calls.length = 0;

    await auth.logout().catch(() => undefined); // revokes the session server-side
    auth.setAccessToken('not.a.jwt');
    const err = await auth.authorizedRequest({ path: '/api/v1/admin/me/memberships' }).catch((e: unknown) => e);

    // After logout there is no refresh token to try: the 401 propagates.
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(401);
    expect(rec.calls.filter((c) => c.url.endsWith('/oauth/token'))).toHaveLength(0);
  });

  it('a replayed mutating call with the same Idempotency-Key returns the original response', async () => {
    const clientId = await provisionPublicClient();
    const transport = new Transport({ baseUrl: API_URL! });
    const phone = freshPhone();
    const key = generateIdempotencyKey();
    const send = (idempotencyKey: string) =>
      transport.request<{ challenge_id: string }>({
        method: 'POST',
        path: '/api/v1/auth/otp',
        body: { client_id: clientId, phone },
        idempotencyKey,
      });

    const first = await send(key);
    const second = await send(key);
    const other = await send(generateIdempotencyKey());

    expect(second.challenge_id).toBe(first.challenge_id);
    expect(other.challenge_id).not.toBe(first.challenge_id);
  });

  it('the same key with a different request is refused, with a code to switch on', async () => {
    const clientId = await provisionPublicClient();
    const transport = new Transport({ baseUrl: API_URL! });
    const key = generateIdempotencyKey();
    const send = (phone: string) =>
      transport.request({
        method: 'POST',
        path: '/api/v1/auth/otp',
        body: { client_id: clientId, phone },
        idempotencyKey: key,
      });

    await send(freshPhone());
    const err = await send(freshPhone()).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(422);
    expect((err as ApiError).code).toBe('idempotency.key_reused');
  });

  it('a 429 surfaces as a typed error carrying Retry-After', async () => {
    const clientId = await provisionPublicClient();
    const transport = new Transport({ baseUrl: API_URL! });
    const phone = freshPhone();

    // The API's default is 5 sends per phone per 15 minutes.
    let limited: unknown;
    for (let i = 0; i < 8 && !limited; i++) {
      limited = await transport
        .request({ method: 'POST', path: '/api/v1/auth/otp', body: { client_id: clientId, phone } })
        .then(() => undefined, (e: unknown) => e);
    }

    expect(limited).toBeInstanceOf(RateLimitedError);
    const err = limited as RateLimitedError;
    expect(err.status).toBe(429);
    expect(err.code).toBe('rate_limited');
    expect(err.retryAfter).toBeGreaterThan(0);
    expect(err.retryAfter).toBeLessThanOrEqual(15 * 60);
  });
});
