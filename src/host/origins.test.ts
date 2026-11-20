import { describe, expect, it } from 'vitest';

import { HostError, connectToHost, type HostWindow } from './index';

// A Game takes a token only from a page it names, and only over a connection a network attacker cannot
// read or rewrite: `https`, with `http` for the developer's own machine alone (M5 review, SK-2).

const COMPETITION = '0197a5d0-0000-7000-8000-0000000000c1';

function framed(): HostWindow {
  const parent = { postMessage: () => undefined };
  return {
    parent,
    location: { search: `?competition=${COMPETITION}` },
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  } as unknown as HostWindow;
}

async function connect(origins: string[]) {
  return connectToHost({ apiBaseUrl: 'https://api.example.test', allowedParentOrigins: origins, window: framed(), timeoutMs: 20 });
}

describe('allowedParentOrigins', () => {
  it.each(['http://stage.vit-rin.com', 'http://example.com', 'http://192.0.2.10', 'http://app.localhost.evil.com', 'http://localhost.example.com'])(
    'refuses %s: a token handed over http can be read or replaced on the way',
    async (origin) => {
      await expect(connect([origin])).rejects.toMatchObject({ code: 'host.origin_invalid' });
      await expect(connect([origin])).rejects.toBeInstanceOf(HostError);
    },
  );

  it.each(['http://localhost', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://[::1]:8080'])(
    'accepts %s, the developer\'s own machine (the connect then waits for a page that never answers, here)',
    async (origin) => {
      // It is valid, so the call goes on to wait for a token and times out; it is not refused for its origin.
      await expect(connect([origin])).rejects.toMatchObject({ code: 'host.token_timeout' });
    },
  );

  it('accepts https origins as before', async () => {
    await expect(connect(['https://stage.vit-rin.com'])).rejects.toMatchObject({ code: 'host.token_timeout' });
  });

  it('refuses one http origin among several https ones', async () => {
    await expect(connect(['https://stage.vit-rin.com', 'http://example.com'])).rejects.toMatchObject({ code: 'host.origin_invalid' });
  });

  it.each(['https://stage.vit-rin.com/', 'https://stage.vit-rin.com/path', '*', 'null', 'https://*.vit-rin.com'])(
    'still refuses %s, which is not an exact origin',
    async (origin) => {
      await expect(connect([origin])).rejects.toMatchObject({ code: 'host.origin_invalid' });
    },
  );
});
