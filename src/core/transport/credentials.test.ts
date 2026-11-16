import { describe, expect, it, vi } from 'vitest';

import { Transport } from './index';

// A request made by the SDK carries no cookie and no HTTP authentication, whatever page it runs in
// (M5 review, SK-1). `fetch` defaults to `same-origin`, which sends cookies when the page is on the
// API's own origin; the SDK authenticates with a bearer token and has no use for them.
describe('Transport credentials', () => {
  it.each(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])('sends %s with credentials omitted', async (method) => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const transport = new Transport({ baseUrl: 'https://api.example.test', fetch: fetchMock });

    await transport.request({ method, path: '/thing', body: method === 'GET' ? undefined : { a: 1 } });

    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(init?.credentials).toBe('omit');
  });

  it('keeps credentials omitted even when a caller passes headers of its own', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const transport = new Transport({ baseUrl: 'https://api.example.test', fetch: fetchMock });

    await transport.request({ path: '/thing', headers: { Authorization: 'Bearer x', Cookie: 'a=b' } });

    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(init?.credentials).toBe('omit');
  });
});
