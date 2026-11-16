import { describe, expect, it, vi } from 'vitest';

import { AuthClient, type AuthEvent } from './index';

// The event that says tokens were set carries what a UI needs, the access token and when it
// expires, and not the refresh token: a listener is any code on the page, and the refresh token is
// the credential that outlives the session (M5 review, SK-3). A host that wants to keep it has it
// from the call that returned it.

const pair = { access_token: 'access-1', refresh_token: 'refresh-1', token_type: 'Bearer', expires_in: 900 };
const challenge = { challenge_id: '0197a5d0-0000-7000-8000-000000000001', expires_in: 120 };

function client(fetchImpl: typeof fetch) {
  return new AuthClient({ baseUrl: 'https://api.example.test', clientId: 'pk_live_test', fetch: fetchImpl });
}
const answers = (...bodies: unknown[]) =>
  vi.fn(async () => new Response(JSON.stringify(bodies.shift()), { status: 200, headers: { 'Content-Type': 'application/json' } })) as unknown as typeof fetch;

describe('tokens_set', () => {
  it('carries the access token and its expiry and no refresh token, after a verify', async () => {
    const auth = client(answers(challenge, pair));
    const events: AuthEvent[] = [];
    auth.on((e) => events.push(e));

    await auth.startOtp('+989121234567');
    const returned = await auth.verifyOtp(challenge.challenge_id, '123456');

    const set = events.find((e) => e.type === 'tokens_set');
    expect(set).toBeDefined();
    if (set?.type !== 'tokens_set') throw new Error('unreachable');
    expect(set.tokens.accessToken).toBe('access-1');
    expect(typeof set.tokens.expiresAt).toBe('number');
    expect(Object.keys(set.tokens).sort()).toEqual(['accessToken', 'expiresAt']);
    expect(JSON.stringify(events)).not.toContain('refresh-1');
    // The caller that asked for the pair has it, as before.
    expect(returned.refresh_token).toBe('refresh-1');
  });

  it('carries no refresh token for a token the host handed in', () => {
    const auth = client(answers());
    const events: AuthEvent[] = [];
    auth.on((e) => events.push(e));

    auth.setAccessToken('handed-in', 123456);

    expect(events).toEqual([{ type: 'tokens_set', tokens: { accessToken: 'handed-in', expiresAt: 123456 } }]);
  });

  it('still refreshes with the refresh token it keeps inside', async () => {
    const fetchMock = answers(challenge, pair, { ...pair, access_token: 'access-2', refresh_token: 'refresh-2' });
    const auth = client(fetchMock);
    await auth.startOtp('+989121234567');
    await auth.verifyOtp(challenge.challenge_id, '123456');

    await auth.refresh();

    expect(auth.getAccessToken()).toBe('access-2');
    const calls = (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls;
    expect(String((calls[2]?.[1] as RequestInit).body)).toContain('refresh_token=refresh-1');
  });
});
