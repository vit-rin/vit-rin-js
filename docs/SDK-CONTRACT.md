# vit-rin-js — SDK Contract

**Status:** Binding. Rewritten from what was built (backend M5 task C.3, decision D-53), once the cross-site
check it names existed. A change to a rule below is a change to this file first, then to the code, and a change
to a surface's signature is a breaking change under semver.

The SDK is what a Game, on any origin, uses to talk to the VIT-RIN API with a token. It is built and released
from this repository; the API it talks to is `vit-rin-backend`'s, and the shapes of what crosses the wire are the
API's, generated from the specifications it serves.

## Rules

1. **Token auth only.** The SDK **MUST NOT** read a cookie, **MUST NOT** redirect the page, and **MUST NOT** send a
   credential other than a bearer token: every `fetch` it makes is `credentials: 'omit'`. It takes an access token
   from the host (`setAccessToken`, or the `refresh` callback, or the frame handshake) or obtains one itself through
   a public client (`pk_live_*`) and OTP. It works on any origin.
2. **A Game never holds a refresh token it was not issued by its own sign-in.** The frame handshake carries an
   access token only, and a page that sends a refresh token in it is refused. The `tokens_set` event carries the
   access token and its expiry and **never** the refresh token; the pair, refresh token included, is returned by
   `verifyOtp` to the code that asked for it, and the client keeps it inside for its own refresh.
3. **A parent origin is an exact `https` origin.** `allowedParentOrigins` takes origins as `new URL(x).origin`
   writes them: no path, no wildcard, no `null`, a certificate-style host name or a bracketed IPv6 address.
   `http` is accepted for `localhost`, `127.0.0.1` and `[::1]` only. Anything else throws `host.origin_invalid`
   before a listener is attached.
4. **`@vit-rin/js` MUST NOT pull in React.** The headless core (the `.` export) and the overlay (`./ui`) are
   separate entry points; a CI size budget (10 kB brotlied) and a check that the headless build contains no React
   fail the build on a stray import.
5. **`types/` is generated, never hand-edited.** `src/types/generated/{public,auth}.ts` come from the
   specifications the API serves at `/openapi/public.json` and `/openapi/auth.json` (`npm run types:generate`);
   CI regenerates them from the real API and fails on any difference (`npm run types:check`). `src/types/index.ts`
   only names generated schemas.
6. **Every mutating call sends an idempotency key**, unless the caller says it is not idempotent. A retry after a
   refresh repeats the same key.
7. **A failure is typed.** The API's `error.code` is the stable identifier a caller switches on: `ApiError`
   (status, code, fields), `RateLimitedError` (a `429`, with `retryAfter` in seconds), `NetworkError`,
   `TimeoutError` (default 10 s), `AuthError`, `HostError`.
8. **`build/` is a release artifact and MUST NOT be committed.** A release is immutable: never re-tag, cut the next.
9. **Ad placements** are `before_game`, `after_game`, `before_result`, the names of
   [`DOMAIN.md §5`](../../vit-rin-backend/docs/DOMAIN.md#5-advertising). No surface for them exists yet.

## What is built

### Core (`.` export)

- **`Transport`** — a `fetch` wrapper: base URL, an injectable `fetch`, timeouts, an abort signal, JSON and form
  bodies, idempotency keys, the typed errors above, `credentials: 'omit'`.
- **`AuthClient`** — `setAccessToken`, `getAccessToken`, `isAuthenticated`, `clear`, `startOtp`, `verifyOtp`,
  `refresh`, `canRefresh`, `logout`, `authorizedRequest`, and events `tokens_set` (access token and expiry),
  `tokens_cleared`, `refresh_failed`. A `401` triggers one refresh, shared by every call in flight, and one retry
  with the new token; a refresh that fails surfaces the error and never loops. A host that holds its own session
  gives a `refresh` callback instead of a refresh token.
- **`connectToHost`** — the frame handshake (backend adr/0018): a Game in a frame of an allowed page announces
  `vitrin:ready` to each allowed origin by name (never `*`), takes `vitrin:token` only from `window.parent`, from an
  allowed origin, in the exact shape (`access_token`, `token_type: "Bearer"`, an integer `expires_in`), asks for a
  new one with `vitrin:refresh` (the `refresh` callback the `AuthClient` calls on a `401`), and tells the page
  `vitrin:finished` with the session id once a finalize has succeeded. It returns the Competition the frame's URL
  names and `openSession()`.
- **`CompetitionsClient` / `OpenSession`** — `open(competitionId)` and `finalize(sessionId, score)`: a Game opens a
  play session and finalizes it with the score it observed. The server judges; the answer is the outcome and the
  raw score, and a refused result is an `ApiError`.
- **Generated types**, exported under the names the SDK always used (`PlaySession`, `FinalizeRequest`,
  `SessionResult`, `OtpChallenge`, `TokenPair`, …) plus `Leaderboard` and `LeaderboardRow`.

### Not built, and not promised

The `campaigns`, `games`, `missions`, `rewards`, `wallet`, `store` and `ads` surfaces, and the UI overlay
(`./ui` is a placeholder that proves the build shape and exports nothing a host may rely on). npm publishing is
deferred (ROADMAP D-25). None of these is part of this contract until it is built and this file says so.

### Release

A tag `vX.Y.Z` builds once and publishes `vit-rin-js-vX.Y.Z.tar.gz` (the CDN build, its source map and its
Subresource Integrity value) with its checksum; deploy installs it unchanged at `<cdn>/sdk/X.Y.Z/`. A Game loads
the pinned file and pins its integrity:

```html
<script src="https://cdn.example/sdk/1.2.3/vit-rin.min.js"
        integrity="sha384-…" crossorigin="anonymous"></script>
```

The integrity value is `vit-rin.min.js.integrity`, served beside the bundle, attached to the release and stated in
its notes; the release workflow checks it against `openssl` before it publishes. The CDN sends
`Access-Control-Allow-Origin: *` for `/sdk/` (public static files, no credentials), which is what lets a page on
another site use `integrity=`.

## Build

Rollup. Two inputs (`index`, `ui`); outputs ESM (preserveModules), CJS, and a minified IIFE for the CDN (global
`VitRin`). `rollup-plugin-dts` per entry. React is external for ESM/CJS and bundled for the IIFE.
`package.json` `exports` maps `.` to the headless core and `./ui` to the overlay.

## Verification

Each line is a check that runs, and where.

- **Typecheck and unit tests** on every push and pull request (`ci.yml`).
- **Bundle size and no React** in the headless build (`size.yml`).
- **S1 against the real API** — refresh with a single retry, a replayed mutating call returns the original answer,
  a `429` is typed (`ci.yml`, `integration`, with the backend's API, Postgres and Redis).
- **Generated types are what the API serves** — `npm run types:check` against that API (`ci.yml`).
- **The cross-site check** (`e2e/cross-site`, `npm run test:cross-site`, `ci.yml`) — a page on its own origin loads
  the CDN build in Chromium and signs in, reads, refreshes and signs out against the real API, once with the API on
  another site and once on the same site, another origin, while the browser holds a cookie for the API's host.
  Every `fetch` the SDK makes asks for `credentials: 'omit'`, and no request reaches the API with a `Cookie`,
  read where it arrives (a recording proxy in front of the API). A control makes the second claim able to fail: a
  request that asks for credentials reaches the API with the cookie. The check was shown red by sending
  credentials and green without.
- **Types of the package** — `npm run check:types` (`@arethetypeswrong/cli`) before a release.
- **A Game on the platform** — `memory-match`, served from the staging games host with an SDK version pinned from
  the CDN and holding only a token, completes authenticate → open competition → finalize → verdict (backend M3).
