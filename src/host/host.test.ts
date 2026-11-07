import { describe, expect, it } from 'vitest';

import { ApiError } from '../core/transport/errors';
import { HOST_MESSAGE, HostError, connectToHost, type HostWindow } from './index';

const APP = 'https://stage.vit-rin.com';
const API = 'https://api.stage.vit-rin.com';
const COMPETITION = '0197a5d0-0000-7000-8000-0000000000c1';
const SESSION = '0197a5d0-0000-7000-8000-0000000000e1';

type Posted = { message: Record<string, unknown>; targetOrigin: string };

/** A game window with a parent that records what it is sent. */
function frame() {
  const target = new EventTarget();
  const posted: Posted[] = [];
  const parent = {
    postMessage: (message: Record<string, unknown>, targetOrigin: string) => posted.push({ message, targetOrigin }),
  };
  const win = {
    parent,
    // The page names the Competition in the frame's URL.
    location: { search: `?competition=${COMPETITION}&lang=en` },
    addEventListener: (type: string, listener: EventListener) => target.addEventListener(type, listener),
    removeEventListener: (type: string, listener: EventListener) => target.removeEventListener(type, listener),
  } as unknown as HostWindow;
  const send = (data: unknown, origin: string, source: unknown = parent) => {
    target.dispatchEvent(Object.assign(new Event('message'), { data, origin, source }));
  };
  // The `TokenPair` of `customer_context`, as the API issues it: no refresh_token.
  const token = (access: string, extra: Record<string, unknown> = {}) => ({
    type: HOST_MESSAGE.token,
    access_token: access,
    token_type: 'Bearer',
    expires_in: 900,
    ...extra,
  });
  const sent = (type: string) => posted.filter((p) => p.message.type === type);
  return { win, parent, posted, send, token, sent };
}

type Call = { url: string; method: string; headers: Record<string, string>; body?: string };

/** A fetch that answers from a queue of [status, body] and records what it was asked. */
function api(...answers: Array<[number, unknown]>) {
  const calls: Call[] = [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({
      url: String(input),
      method: init?.method ?? 'GET',
      headers: { ...(init?.headers as Record<string, string>) },
      body: init?.body as string | undefined,
    });
    const [status, body] = answers.shift() ?? [500, { error: { code: 'test.unexpected', message: 'no answer queued' } }];
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
  return { fetch: fetchImpl, calls };
}

const session = { id: SESSION, competition_id: COMPETITION, opened_at: '2026-01-01T00:00:00Z', expires_at: '2026-01-01T00:10:00Z' };
const accepted = { session_id: SESSION, outcome: 'accepted', score: 60, finalized_at: '2026-01-01T00:01:00Z' };

/** Connects and has the page answer, as the consumer site does. */
async function connected(f: ReturnType<typeof frame>, fetchImpl: typeof fetch, extra: { timeoutMs?: number } = {}) {
  const pending = connectToHost({ apiBaseUrl: API, allowedParentOrigins: [APP], fetch: fetchImpl, window: f.win, ...extra });
  f.send(f.token('tok-1'), APP);
  return pending;
}

describe('connectToHost: who may hand the Game a token', () => {
  it('says ready to the allowed origins only, never to "*"', async () => {
    const f = frame();
    const other = 'https://second.vit-rin.com';
    const pending = connectToHost({ apiBaseUrl: API, allowedParentOrigins: [APP, other], window: f.win, timeoutMs: 20 });
    f.send(f.token('tok-1'), APP);
    await pending;
    const ready = f.sent(HOST_MESSAGE.ready);
    expect(ready.map((r) => r.targetOrigin).sort()).toEqual([other, APP].sort());
    expect(f.posted.some((p) => p.targetOrigin === '*')).toBe(false);
  });

  it('accepts a token from the parent at an allowed origin', async () => {
    const f = frame();
    const { calls, fetch } = api([201, session]);
    const host = await connected(f, fetch);
    expect(host.competitionId).toBe(COMPETITION);
    await host.openSession();
    expect(calls[0]!.headers.Authorization).toBe('Bearer tok-1');
  });

  it('ignores a token from an origin that is not allowed, and times out', async () => {
    const f = frame();
    const pending = connectToHost({ apiBaseUrl: API, allowedParentOrigins: [APP], window: f.win, timeoutMs: 40 });
    f.send(f.token('stolen'), 'https://evil.example');
    f.send(f.token('stolen'), `${APP}.evil.example`);
    f.send(f.token('stolen'), 'null');
    await expect(pending).rejects.toMatchObject({ code: 'host.token_timeout' });
  });

  it('ignores a token from an allowed origin that is not the Game\'s parent window', async () => {
    const f = frame();
    const pending = connectToHost({ apiBaseUrl: API, allowedParentOrigins: [APP], window: f.win, timeoutMs: 40 });
    f.send(f.token('stolen'), APP, { postMessage() {} });
    await expect(pending).rejects.toBeInstanceOf(HostError);
  });

  it('ignores malformed token messages', async () => {
    const f = frame();
    const pending = connectToHost({ apiBaseUrl: API, allowedParentOrigins: [APP], window: f.win, timeoutMs: 40 });
    for (const bad of [
      null,
      'vitrin:token',
      { type: HOST_MESSAGE.token },
      { type: HOST_MESSAGE.token, access_token: '', token_type: 'Bearer', expires_in: 900 },
      { type: HOST_MESSAGE.token, access_token: 't', token_type: 'Bearer' },
      { type: HOST_MESSAGE.token, access_token: 't', token_type: 'Bearer', expires_in: '900' },
      { type: HOST_MESSAGE.token, access_token: 't', token_type: 'Bearer', expires_in: 0 },
      { type: HOST_MESSAGE.token, access_token: 't', token_type: 'Bearer', expires_in: 1.5 },
      { type: HOST_MESSAGE.token, access_token: 't', expires_in: 900 },
      { type: HOST_MESSAGE.token, access_token: 't', token_type: 'mac', expires_in: 900 },
      { type: 'other', access_token: 't', token_type: 'Bearer', expires_in: 900 },
    ]) {
      f.send(bad, APP);
    }
    await expect(pending).rejects.toMatchObject({ code: 'host.token_timeout' });
  });

  it('never takes a token that carries a refresh token: a Game holds none', async () => {
    const f = frame();
    const pending = connectToHost({ apiBaseUrl: API, allowedParentOrigins: [APP], window: f.win, timeoutMs: 40 });
    f.send(f.token('tok', { refresh_token: 'rt' }), APP);
    await expect(pending).rejects.toMatchObject({ code: 'host.token_timeout' });
  });

  it('takes the Competition from the frame\'s URL, not from the token', async () => {
    const f = frame();
    const { calls, fetch } = api([201, session]);
    // A competition_id inside the message is not read, even a different one.
    const pending = connectToHost({ apiBaseUrl: API, allowedParentOrigins: [APP], fetch, window: f.win });
    f.send(f.token('tok-1', { competition_id: '0197a5d0-0000-7000-8000-0000000000ff' }), APP);
    const host = await pending;
    expect(host.competitionId).toBe(COMPETITION);
    await host.openSession();
    expect(calls[0]!.url).toBe(`${API}/api/v1/public/competitions/${COMPETITION}/sessions`);
  });

  it('an explicit competitionId wins over the URL', async () => {
    const f = frame();
    const other = '0197a5d0-0000-7000-8000-0000000000aa';
    const pending = connectToHost({ apiBaseUrl: API, allowedParentOrigins: [APP], window: f.win, competitionId: other });
    f.send(f.token('tok-1'), APP);
    expect((await pending).competitionId).toBe(other);
  });

  it.each([[''], ['?lang=en'], ['?competition='], ['?competition=not-a-uuid'], ['?competition=../../admin']])(
    'refuses to start when the frame\'s URL does not name a Competition (%j), and says nothing to the page',
    async (search) => {
      const f = frame();
      (f.win as unknown as { location: { search: string } }).location = { search };
      await expect(connectToHost({ apiBaseUrl: API, allowedParentOrigins: [APP], window: f.win })).rejects.toMatchObject({
        code: 'host.competition_missing',
      });
      expect(f.posted).toEqual([]);
    },
  );

  it('refuses to start outside a frame', async () => {
    const target = new EventTarget();
    const win: Record<string, unknown> = {
      addEventListener: target.addEventListener.bind(target),
      removeEventListener: target.removeEventListener.bind(target),
    };
    win.parent = win;
    await expect(connectToHost({ apiBaseUrl: API, allowedParentOrigins: [APP], window: win as unknown as HostWindow })).rejects.toMatchObject({
      code: 'host.not_framed',
    });
  });

  it.each([[[]], [['*']], [['https://stage.vit-rin.com/']], [['https://stage.vit-rin.com/game']], [['stage.vit-rin.com']], [['null']]])(
    'refuses allowedParentOrigins %j',
    async (origins) => {
      await expect(connectToHost({ apiBaseUrl: API, allowedParentOrigins: origins, window: frame().win })).rejects.toMatchObject({
        code: 'host.origin_invalid',
      });
    },
  );

  it('stops listening once closed', async () => {
    const f = frame();
    const { calls, fetch } = api([401, { error: { code: 'auth.token_expired', message: 'x' } }]);
    const host = await connected(f, fetch, { timeoutMs: 20 });
    host.close();
    await expect(host.openSession()).rejects.toMatchObject({ code: 'host.closed' });
    expect(calls).toHaveLength(0);
  });
});

describe('a play session through the host', () => {
  it('opens a session in the page\'s Competition and finalizes it with the score alone', async () => {
    const f = frame();
    const { calls, fetch } = api([201, session], [200, accepted]);
    const host = await connected(f, fetch);

    const open = await host.openSession();
    expect(calls[0]).toMatchObject({ method: 'POST', url: `${API}/api/v1/public/competitions/${COMPETITION}/sessions` });
    expect(open.id).toBe(SESSION);

    const result = await open.finalize(60);
    expect(result).toEqual(accepted);
    expect(calls[1]).toMatchObject({ method: 'POST', url: `${API}/api/v1/public/sessions/${SESSION}/finalize` });
    expect(JSON.parse(calls[1]!.body!)).toEqual({ score: 60 });
    expect(calls[1]!.headers['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('repeats a finalize with the same Idempotency-Key, and mints a new one for another score', async () => {
    const f = frame();
    const { calls, fetch } = api([201, session], [200, accepted], [200, accepted], [409, { error: { code: 'competition.session_already_finalized', message: 'x' } }]);
    const open = await (await connected(f, fetch)).openSession();

    await open.finalize(60);
    await open.finalize(60);
    expect(calls[1]!.headers['Idempotency-Key']).toBe(calls[2]!.headers['Idempotency-Key']);

    await expect(open.finalize(90)).rejects.toMatchObject({ status: 409, code: 'competition.session_already_finalized' });
    expect(calls[3]!.headers['Idempotency-Key']).not.toBe(calls[1]!.headers['Idempotency-Key']);
  });

  it('tells the page which session finished, to its origin, only when the result was accepted', async () => {
    const f = frame();
    const refused = { error: { code: 'competition.score_out_of_bounds', message: 'x' } };
    const { fetch } = api([201, session], [422, refused], [201, { ...session, id: 'second' }], [200, { ...accepted, session_id: 'second' }]);
    const host = await connected(f, fetch);

    const first = await host.openSession();
    await expect(first.finalize(99999)).rejects.toBeInstanceOf(ApiError);
    expect(f.sent(HOST_MESSAGE.finished)).toHaveLength(0);

    const second = await host.openSession();
    await second.finalize(60);
    expect(f.sent(HOST_MESSAGE.finished)).toEqual([
      { message: { type: HOST_MESSAGE.finished, session_id: 'second' }, targetOrigin: APP },
    ]);
  });

  it('surfaces a refusal with its code', async () => {
    const f = frame();
    const refused = { error: { code: 'competition.too_fast', message: 'x' } };
    const { fetch } = api([201, session], [422, refused]);
    const open = await (await connected(f, fetch)).openSession();
    await expect(open.finalize(60)).rejects.toMatchObject({ status: 422, code: 'competition.too_fast' });
  });
});

describe('a 401 mid-session', () => {
  const expired = { error: { code: 'auth.token_expired', message: 'x' } };

  it('asks the page for a fresh token once, and retries once with the same Idempotency-Key', async () => {
    const f = frame();
    const { calls, fetch } = api([201, session], [401, expired], [200, accepted]);
    const open = await (await connected(f, fetch)).openSession();

    const result = open.finalize(60);
    await new Promise((r) => setTimeout(r, 5));
    expect(f.sent(HOST_MESSAGE.refresh)).toEqual([{ message: { type: HOST_MESSAGE.refresh }, targetOrigin: APP }]);
    f.send(f.token('tok-2'), APP);

    await expect(result).resolves.toEqual(accepted);
    expect(calls).toHaveLength(3);
    expect(calls[1]!.headers.Authorization).toBe('Bearer tok-1');
    expect(calls[2]!.headers.Authorization).toBe('Bearer tok-2');
    expect(calls[2]!.headers['Idempotency-Key']).toBe(calls[1]!.headers['Idempotency-Key']);
  });

  it('does not take a fresh token from an origin that is not allowed, and does not loop when none comes', async () => {
    const f = frame();
    const { calls, fetch } = api([201, session], [401, expired], [200, accepted]);
    const open = await (await connected(f, fetch, { timeoutMs: 40 })).openSession();

    const result = open.finalize(60);
    await new Promise((r) => setTimeout(r, 5));
    f.send(f.token('stolen'), 'https://evil.example');

    await expect(result).rejects.toMatchObject({ code: 'host.refresh_timeout' });
    expect(calls).toHaveLength(2); // the open and one finalize: no retry, no second refresh
    expect(f.sent(HOST_MESSAGE.refresh)).toHaveLength(1);
  });

  it('surfaces the 401 when the retry is refused too, and refreshes once', async () => {
    const f = frame();
    const { calls, fetch } = api([201, session], [401, expired], [401, expired]);
    const open = await (await connected(f, fetch)).openSession();

    const result = open.finalize(60);
    await new Promise((r) => setTimeout(r, 5));
    f.send(f.token('tok-2'), APP);

    await expect(result).rejects.toMatchObject({ status: 401 });
    expect(calls).toHaveLength(3);
    expect(f.sent(HOST_MESSAGE.refresh)).toHaveLength(1);
  });
});
