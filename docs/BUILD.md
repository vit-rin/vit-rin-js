# vit-rin-js — Build Tracker

**Scope: this repository only.** Each repo owns its own build file and its own
phases. Sibling trackers:
[backend](https://github.com/vit-rin/vit-rin-backend/blob/main/docs/BUILD.md) ·
[frontend](https://github.com/vit-rin/vit-rin-frontend/blob/main/docs/BUILD.md) ·
[deploy](https://github.com/vit-rin/vit-rin-deploy/blob/main/docs/BUILD.md)

Reference, not progress: [SDK-CONTRACT.md](SDK-CONTRACT.md) (the rules) ·
[DOMAIN.md](https://github.com/vit-rin/vit-rin-backend/blob/main/docs/DOMAIN.md)
(the models and the mandatory vocabulary).

## How to use this file

1. Take the first unchecked box in the current phase.
2. Done means the **Done when** line is true, not that it builds.
3. Tick the box and update the dashboard in the same commit as the work.

`[ ]` not started · `[~]` in progress · `[x]` done

## Status

| | |
|---|---|
| Branch `dev` | S1 core built, unit-tested (52 tests) and exercised against the real API (5 integration tests, in CI) (transport, token auth with single-retry refresh, idempotency keys, Rollup ESM/CJS/IIFE, size budget); generated types, surfaces, UI overlay and release not built |
| Surfaces | 0 of 8 |
| **Next** | **M3** ([ROADMAP.md §6](https://github.com/vit-rin/vit-rin-backend/blob/main/docs/ROADMAP.md#m3--play-game-competition-sdk-first-curated-game)). Every decision is resolved. Two tasks need nothing from the backend's spec slice and can start now: the token provider with its `refresh` callback ([adr/0018](https://github.com/vit-rin/vit-rin-backend/blob/main/docs/adr/0018-game-embedding-and-token-handoff.md)), and the cross-site check (ROADMAP D-24). Generated types and the `games` and `competitions` surfaces wait on `public.yaml`, served at `/openapi/public.json`. The release goes to the CDN only; npm is deferred (D-25). The first game to use the SDK is `memory-match`, on `games.stage.vit-rin.com`. M0–M2 are proven on staging (`vit-stage-all-eu-01`) |

### What blocks this repo

| Need | From | Blocks |
|---|---|---|
| `api/openapi/auth.yaml` | backend — **spec ready now**, [adr/0007](https://github.com/vit-rin/vit-rin-backend/blob/main/docs/adr/0007-token-model.md) | `core/auth`'s shape now; exercising it live once Phase 1 ships |
| `api/openapi/public.yaml`, served at `/openapi/public.json` | backend M3 spec slice | generated types, `games`, `competitions` |
| Per-request CORS for public clients and Game origins ([adr/0016](https://github.com/vit-rin/vit-rin-backend/blob/main/docs/adr/0016-public-surface-cross-origin.md)) | backend M3 | the cross-site check against a deployed API |
| The CDN path `/sdk/<version>/` | deploy M3 | S4's release reaching hosts |
| Real token auth running | backend Phase 1 | verifying S1's `core/auth` end to end |

---

## Tracker upkeep

- [x] **Reconcile this tracker with [ROADMAP.md §3](https://github.com/vit-rin/vit-rin-backend/blob/main/docs/ROADMAP.md#3-current-state-verified-against-code)** — the status table still reads "clean slate" though S1's core is built; every task tagged with its milestone (M0)

## S0 — Clean slate ✅

- [x] `dev` holds only docs — no source is carried over from any prior branch
- [x] `i18n`/`theme` are built fresh in S3 (UI overlay), not ported
- [x] `build/` is gitignored from the start
- *Done when:* `dev` has an empty `src/` and the contract has no baseline to record.

## S1 — Core

- [x] Rollup config — inputs `index` and `ui`; ESM (preserveModules), CJS, minified IIFE for CDN
- [x] `rollup-plugin-dts` per entry; `package.json` `exports` maps `.` and `./ui`
- [x] React external for ESM/CJS, **bundled** for IIFE
- [x] `core/transport` — fetch wrapper, timeouts, typed errors from the API's `error.code`
- [x] `core/auth` — **token only**. No cookie read, no implicit redirect. Auto-refresh on 401 with a single retry
- [x] `core/idempotency` — key on every mutating call
- [x] CI size budget on the headless bundle — the `Bundle size budget` workflow ran green on the `dev` push for `70335e7`, and the same commands pass locally (`npm run build && npm run size`) (M0)
- [x] CI runs `typecheck` and the unit tests alongside the size budget — `ci.yml` runs `typecheck` and `npm test` on every push and pull request, and `size.yml` runs the build and the budget; `CI` and `Bundle size budget` are both green on the `dev` push for `70335e7` (M0)
- [x] **S1 exercised against the real API** — refresh with a single retry; a replayed mutating call with the same idempotency key returns the original response; a `429` surfaces as a typed error carrying `Retry-After`. **Observed passing, 5 of 5, against the real API with Postgres and Redis.** `ApiError` carries `retryAfter` and a `429` is a `RateLimitedError`; `core/auth`'s retry after a refresh now reuses one `Idempotency-Key` for the whole call (it used to mint a new one per attempt, so the retry was not recognisably the same call). Unit tests cover both. `src/core/real-api.integration.test.ts` runs the three scenarios against a live API (`npm run test:integration`, the `integration` CI job); the 401-then-one-retry (and the retry carrying the new token), a failed refresh that surfaces without looping, the replay returning the original, and the typed `429` all passed. The `integration` CI job has not been seen green; it needs the `BACKEND_READ_TOKEN` secret (M1)
- *Done when:* `source-map-explorer` shows **no React** in the headless ESM output, and `@arethetypeswrong/cli --pack .` is clean.

## S2 — Surfaces

Each is a thin typed wrapper over the generated client. The M3 lines wait on
the backend's `public.yaml`, except the token provider and the cross-site check.

- [ ] `types/` generated from `public.yaml`, never hand-edited — generated from the spec the API serves at `/openapi/public.json`; CI fails on drift. *Done when:* no hand-written request or response shape remains, `src/types/auth.ts` included (M3)
- [ ] **Token provider and `refresh` callback** ([adr/0018](https://github.com/vit-rin/vit-rin-backend/blob/main/docs/adr/0018-game-embedding-and-token-handoff.md), [adr/0011](https://github.com/vit-rin/vit-rin-backend/blob/main/docs/adr/0011-consumer-sign-in.md)) — the client takes a token and a `refresh` callback and holds no refresh token. A host helper builds both from the frame handshake (`vitrin:ready`, `vitrin:token`, `vitrin:refresh`, `vitrin:finished`), and accepts `vitrin:token` only from the allowed parent origins in the Game's deployed configuration, never from the URL. *Done when:* a token sent from an allowed parent origin is accepted and one from any other origin is ignored; a forced `401` calls `refresh` once and retries once with the same idempotency key; a failed refresh surfaces and does not loop; the public-client OTP path still passes its integration tests (the Business-site regression, ROADMAP D-19) (M3)
- [ ] `campaigns` — read, enter (M4)
- [ ] `games` — read, launch (M3)
- [ ] `competitions` — open, finalize — open a play session for a Competition, and finalize it with the score and an idempotency key; the result is the outcome and the raw score ([adr/0020](https://github.com/vit-rin/vit-rin-backend/blob/main/docs/adr/0020-competition-and-play-session.md)). *Done when:* against the real API, a repeated finalize returns the original outcome and an out-of-bounds score surfaces as a typed error with its code (M3)
- [ ] **Cross-site check** (ROADMAP D-24) — the games host shares a site with the app and the API, so it cannot show that the SDK works on any origin. The `integration` job serves a page from `localhost`, which is cross-site to the API, and drives the real API through the SDK from it. *Done when:* the calls succeed through CORS, and the job asserts that no request carries credentials (no cookie, `credentials: "omit"`) (M3)
- [ ] `missions` — read, progress (M7)
- [ ] `rewards` — read, earnings (M4)
- [ ] `wallet` — balances, transactions, cards (M4)
- [ ] `store` — catalog, order (M9)
- [ ] `ads` — placements `before_game`, `after_game`, `before_result` **only** (M10)
- *Done when:* every surface is typed from the spec with no hand-written request or response shapes.

## S3 — UI overlay

- [ ] `ui/` as a separate entry point (M3)
- [ ] Theme tokens and `fa`/`en` with RTL (M3)
- [ ] Controls, result screen (M3)
- [ ] Ad screen (M10)
- *Done when:* a host that imports only `@vit-rin/js` ships no overlay code at all.

## S4 — Release

- [ ] CI publishes to the CDN on a tag — the build is a versioned, immutable release artifact that deploy places at `/sdk/<version>/…` on the CDN host, and hosts pin the version (M3)
- npm publishing — **deferred** ([ROADMAP.md D-25](https://github.com/vit-rin/vit-rin-backend/blob/main/docs/ROADMAP.md#10-open-decisions)): no npm publish and no dist-tag in M3; revisited once M3 is wired and tested end to end. It has no milestone until then, so it is not a task line
- [ ] Write `README.md` usage docs; rewrite [SDK-CONTRACT.md](SDK-CONTRACT.md) from what was built and change its status from Specification to Binding. The contract's verification line names the games host and the cross-site check instead of "a non-vit-rin origin" (ROADMAP D-24) (M3)
- *Done when:* `memory-match`, served from **`games.stage.vit-rin.com`** with an SDK version pinned from the CDN, holding only a token, completes authenticate → open competition → finalize → verdict; and the cross-site check (S2) is green.

---

## Standing rules

- **Token auth only.** No cookie read, no implicit redirect to a login page.
  The SDK must work on any origin.
- **`@vit-rin/js` must not pull in React.** Enforced by a CI size budget, not by discipline.
- `types/` is generated. Never hand-edited.
- Ad placements are `before_game`, `after_game`, `before_result`.
- Every mutating call sends an idempotency key.
- `build/` is a release artifact and must not be committed.
- The public API is semver; changing a surface method's signature is breaking.
- Never reference any previous VIT-RIN system in code or comments.
