import { createServer } from "node:http";
import { request as httpRequest } from "node:http";
import { readFileSync } from "node:fs";

import { AuthClient } from "../../src/index";

// What the cross-site check needs from a running VIT-RIN API (the same one src/core/real-api.integration.test.ts
// uses): its URL, the log its development OTP sender writes the code to, and the bootstrap operator's phone.
export const API_URL = process.env.VITRIN_API_URL ?? "";
export const API_LOG = process.env.VITRIN_API_LOG ?? "";
export const ADMIN_PHONE = process.env.VITRIN_ADMIN_PHONE ?? "";
export const PLATFORM_CLIENT =
  process.env.VITRIN_PLATFORM_CLIENT ?? "pk_live_platform";

export function freshPhone(): string {
  return `+9891${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;
}

export async function codeFor(phone: string): Promise<string> {
  const pattern = new RegExp(
    `phone=${phone.replace("+", "\\+")} code=(\\d+)`,
    "g",
  );
  for (let i = 0; i < 50; i++) {
    const hits = [...readFileSync(API_LOG, "utf8").matchAll(pattern)];
    const last = hits[hits.length - 1];
    if (last?.[1]) return last[1];
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`no OTP code was logged for ${phone}`);
}

/**
 * A public client of a fresh Business that allows exactly `origin`, which is what a Game on that origin is.
 * Provisioned as the operator, from Node: the page under test does none of this.
 */
export async function provisionPublicClient(origin: string): Promise<string> {
  const admin = new AuthClient({ baseUrl: API_URL, clientId: PLATFORM_CLIENT });
  const challenge = await admin.startOtp(ADMIN_PHONE);
  await admin.verifyOtp(challenge.challenge_id, await codeFor(ADMIN_PHONE));
  const stamp = Date.now().toString(36);
  const business = await admin.authorizedRequest<{ id: string }>({
    method: "POST",
    path: "/api/v1/admin/businesses",
    body: { name: `Cross-site ${stamp}`, slug: `xsite-${stamp}` },
  });
  const client = await admin.authorizedRequest<{ client_id: string }>({
    method: "POST",
    path: `/api/v1/admin/businesses/${business.id}/clients`,
    body: { kind: "public", name: "cross-site", allowed_origins: [origin] },
  });
  return client.client_id;
}

/**
 * Waits until the API answers a preflight from `origin`. The origins a public client allows are read into the
 * API's CORS set on an interval (HTTP_ORIGIN_REFRESH, 5 s by default), so a client made a moment ago is not
 * yet answered.
 */
export async function waitForOrigin(origin: string): Promise<void> {
  for (let i = 0; i < 60; i++) {
    const res = await fetch(`${API_URL}/api/v1/auth/otp`, {
      method: "OPTIONS",
      headers: {
        Origin: origin,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type,idempotency-key",
      },
    });
    if (res.headers.get("access-control-allow-origin") === origin) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`the API never allowed ${origin}`);
}

export interface Seen {
  method: string;
  path: string;
  /** The Cookie header exactly as the server received it, which is what a credentialed request is. */
  cookie: string | undefined;
}

/**
 * A recording reverse proxy in front of the real API. The page talks to it as it would to the API, and it forwards
 * every request unchanged and keeps what the *server* received. The browser's own view of a request's headers (the
 * automation layer's `allHeaders`) leaves out a Cookie it did send on a CORS request, so it cannot be what the
 * check trusts; the receiving end can.
 */
export async function startRecordingProxy(
  port: number,
): Promise<{ seen: Seen[]; close: () => void }> {
  const upstream = new URL(API_URL);
  const seen: Seen[] = [];
  const server = createServer((req, res) => {
    seen.push({
      method: req.method ?? "",
      path: req.url ?? "",
      cookie: req.headers.cookie,
    });
    const forward = httpRequest(
      {
        host: upstream.hostname,
        port: upstream.port,
        method: req.method,
        path: req.url,
        headers: req.headers,
      },
      (answer) => {
        res.writeHead(answer.statusCode ?? 502, answer.headers);
        answer.pipe(res);
      },
    );
    forward.on("error", () => res.writeHead(502).end());
    req.pipe(forward);
  });
  await new Promise<void>((resolve) =>
    server.listen(port, "127.0.0.1", resolve),
  );
  return { seen, close: () => server.close() };
}
