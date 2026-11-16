import { readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { test, expect } from "@playwright/test";

import {
  API_URL,
  codeFor,
  freshPhone,
  provisionPublicClient,
  startRecordingProxy,
  waitForOrigin,
  type Seen,
} from "./support";

/**
 * The cross-site check (docs/SDK-CONTRACT.md, Verification; backend M5 task C.3, decision D-53).
 *
 * A page on one origin loads the SDK's CDN build and signs in, reads, refreshes and signs out against the real
 * VIT-RIN API on another. The browser holds a cookie for the API's host the whole time. The SDK authenticates with
 * a bearer token and has no use for it, so no request it makes may carry credentials:
 *
 *  - every `fetch` it makes is asked for with `credentials: 'omit'`, recorded in the page;
 *  - no request reaches the API with a `Cookie` header, read where it arrives: a recording proxy in front of the
 *    real API keeps what the server received (the browser automation's own view of a request's headers leaves out
 *    a Cookie it did send on a CORS request, so it is not what this trusts).
 *
 * It runs twice. Against `127.0.0.1` the API is on **another site** (a different host), the case the SDK is
 * deployed in; a browser would not send a cookie there anyway. Against `localhost` the API is on the **same site,
 * another origin**: a Lax cookie is sent there when a request asks for credentials, so the claim can fail, and a
 * control proves it: the same page asks for `credentials: 'include'` and that request reaches the proxy with the
 * cookie. If it does not, the harness cannot see a cookie and the test fails rather than pass for nothing.
 */
const PAGE_ORIGIN = "http://localhost:4100";
const PROXY_PORT = 4101;

let server: Server;
let proxy: Awaited<ReturnType<typeof startRecordingProxy>>;
let clientId: string;

test.beforeAll(async () => {
  const page = readFileSync(new URL("./page.html", import.meta.url));
  const sdk = readFileSync(
    new URL("../../build/iife/vit-rin.min.js", import.meta.url),
  );
  server = createServer((req, res) => {
    if (req.url === "/vit-rin.min.js")
      res.writeHead(200, { "Content-Type": "text/javascript" }).end(sdk);
    else res.writeHead(200, { "Content-Type": "text/html" }).end(page);
  });
  await new Promise<void>((resolve) =>
    server.listen(4100, "127.0.0.1", resolve),
  );
  if (API_URL) {
    proxy = await startRecordingProxy(PROXY_PORT);
    // One Business and one public client for both cases: it takes the operator's sign-in, which is limited per phone.
    clientId = await provisionPublicClient(PAGE_ORIGIN);
    await waitForOrigin(PAGE_ORIGIN);
  }
});
test.afterAll(() => {
  server.close();
  proxy?.close();
});

const CASES = [
  { name: "another site", host: "127.0.0.1", control: false },
  { name: "the same site, another origin", host: "localhost", control: true },
];

for (const { name, host, control } of CASES) {
  test(`the SDK makes no credentialed request from a page to an API on ${name}`, async ({
    page,
    context,
  }) => {
    test.skip(
      !API_URL,
      "VITRIN_API_URL is not set: this check needs a running API (see the CI job)",
    );
    const api = `http://${host}:${PROXY_PORT}`;
    proxy.seen.length = 0;

    // A cookie for the API's host, which a credentialed request would send.
    await context.addCookies([
      {
        name: "vitrin_probe",
        value: "cookie-for-the-api",
        url: api,
        secure: false,
        sameSite: "Lax",
      },
    ]);

    await page.goto(`${PAGE_ORIGIN}/`);
    const phone = freshPhone();
    const challenge = await page.evaluate(
      async ({ apiUrl, clientId, phone }) => {
        const w = window as unknown as {
          VitRin: { AuthClient: new (c: unknown) => any };
          __auth: any;
        };
        w.__auth = new w.VitRin.AuthClient({ baseUrl: apiUrl, clientId });
        return w.__auth.startOtp(phone);
      },
      { apiUrl: api, clientId, phone },
    );
    const code = await codeFor(phone);
    const signedIn = await page.evaluate(
      async ({ challengeId, code }) => {
        const auth = (window as unknown as { __auth: any }).__auth;
        const pair = await auth.verifyOtp(challengeId, code);
        // A read of the public surface with the token (the Game does not exist, so the answer is a typed 404: the
        // call was made, authenticated, and its answer readable from this origin), a refresh, the same read with the
        // new token, and the end of the session.
        const missing =
          "/api/v1/public/games/0197a5d0-0000-7000-8000-00000000dead";
        const read = () =>
          auth.authorizedRequest({ path: missing }).then(
            () => 0,
            (e: { status?: number }) => e.status ?? -1,
          );
        const first = await read();
        await auth.refresh();
        const second = await read();
        await auth.logout();
        return {
          hasAccess: typeof pair.access_token === "string",
          first,
          second,
        };
      },
      { challengeId: challenge.challenge_id, code },
    );
    expect(signedIn.hasAccess).toBe(true);
    expect(
      signedIn.first,
      "the read was answered, and readably, by the API",
    ).toBe(404);
    expect(signedIn.second).toBe(404);

    // The SDK's own calls, as the page asked for them.
    const asked = await page.evaluate(
      () =>
        (
          window as unknown as {
            __fetches: Array<{
              url: string;
              credentials?: string;
              method: string;
            }>;
          }
        ).__fetches,
    );
    const sdkCalls = asked.filter((f) => f.url.startsWith(api));
    expect(
      sdkCalls.length,
      "sign-in start, verify, read, refresh, read, logout",
    ).toBe(6);
    for (const call of sdkCalls) {
      expect(
        call.credentials,
        `${call.method} ${call.url} asks for credentials ${call.credentials}`,
      ).toBe("omit");
    }

    // What the server received: the cookie never.
    const received = proxy.seen.filter((r: Seen) => r.method !== "OPTIONS");
    expect(received.length, "the same six, as the server saw them").toBe(6);
    for (const r of received) {
      expect(
        r.cookie,
        `${r.method} ${r.path} arrived with a cookie`,
      ).toBeUndefined();
    }

    // The control, where a browser sends the cookie when asked: the same site. If it does not, the claim above
    // proves nothing.
    if (!control) return;
    await page.evaluate(async (url) => {
      await fetch(`${url}/healthz`, {
        credentials: "include",
        mode: "no-cors",
      }).catch(() => undefined);
    }, api);
    await expect
      .poll(() => proxy.seen.some((r) => r.path === "/healthz"))
      .toBe(true);
    expect(
      proxy.seen.find((r) => r.path === "/healthz")?.cookie,
      "the control (credentials: include) must reach the server with the cookie, or this harness cannot see one",
    ).toContain("vitrin_probe=cookie-for-the-api");
  });
}
