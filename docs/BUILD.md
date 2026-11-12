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
| Branch `dev` | Built: the S1 core (transport, token auth with single-retry refresh, idempotency keys, Rollup ESM/CJS/IIFE, size budget), the token provider and frame handshake (`src/host`), the `competitions` surface and the CDN release. **86 unit tests** (`npm test`) and 5 integration tests against the real API (the `integration` CI job, green on the `dev` push for `9ea05c8`). Released as `v0.2.0`, which the CDN serves. **Not built:** generated types (`src/types/` is hand-written and marked temporary), the other surfaces and the UI overlay |
| Surfaces | 1 of 8 (`competitions`) |
| **Next** | **M5** ([backend M5-PLAN.md](https://github.com/vit-rin/vit-rin-backend/blob/main/docs/M5-PLAN.md), signed off by the owner): this repository's column is Block C, the first SDK work since M3: the hardening of the plan's §2.2 row 17 (`credentials: 'omit'`, an `https` parent origin only, the refresh token no longer handed to any `tokens_set` listener, an SRI hash on the release), the cross-site check and generated types pulled in by D-53, and supply-chain checks. It is tagged at the M5 close. M0 to M3 are proven on staging (`vit-stage-all-eu-01`) and M4 needed no work here. **The GitHub default branch is `main`, and `dev` is where this SDK lives**: the un-prefixed tags `1.0.1` to `2.1.23` are not releases of it, so `gh release --generate-notes` and "latest" tooling read the wrong history until the owner changes the default branch (a repository setting, not a file in it) |

### What blocks this repo

| Need | From | Blocks |
|---|---|---|
| ~~`api/openapi/auth.yaml`~~ — **done, running** ([adr/0007](https://github.com/vit-rin/vit-rin-backend/blob/main/docs/adr/0007-token-model.md)) | backend | ~~`core/auth`'s shape~~ — built |
| ~~`api/openapi/public.yaml`, served at `/openapi/public.json`~~ — **done, byte-equal on staging** | backend M3 | generated types (**pulled into M5**, D-53), `games`; `competitions` is built |
| ~~Per-request CORS for public clients and Game origins ([adr/0016](https://github.com/vit-rin/vit-rin-backend/blob/main/docs/adr/0016-public-surface-cross-origin.md))~~ — **done, enforced on staging** | backend M3 | the cross-site check against a deployed API (task C.3) |
| ~~The CDN path `/sdk/<version>/`~~ — **done**; `v0.2.0` is served and byte-equal to its release artifact | deploy M3 | ~~S4's release reaching hosts~~ — reached |
| ~~Real token auth running~~ — **done** | backend Phase 1 | ~~verifying S1's `core/auth` end to end~~ — verified |

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
- [x] **S1 exercised against the real API** — refresh with a single retry; a replayed mutating call with the same idempotency key returns the original response; a `429` surfaces as a typed error carrying `Retry-After`. **Observed passing, 5 of 5, against the real API with Postgres and Redis.** `ApiError` carries `retryAfter` and a `429` is a `RateLimitedError`; `core/auth`'s retry after a refresh now reuses one `Idempotency-Key` for the whole call (it used to mint a new one per attempt, so the retry was not recognisably the same call). Unit tests cover both. `src/core/real-api.integration.test.ts` runs the three scenarios against a live API (`npm run test:integration`, the `integration` CI job); the 401-then-one-retry (and the retry carrying the new token), a failed refresh that surfaces without looping, the replay returning the original, and the typed `429` all passed. The `integration` CI job needs the `BACKEND_READ_TOKEN` secret and is green: it passed in the CI run for the `dev` push `9ea05c8` (M1)
- *Done when:* `source-map-explorer` shows **no React** in the headless ESM output, and `@arethetypeswrong/cli --pack .` is clean.

## S2 — Surfaces

Each is a thin typed wrapper over the generated client. The M3 lines wait on
the backend's `public.yaml`, except the token provider and the cross-site check.

- [ ] `types/` generated from `public.yaml`, never hand-edited — generated from the spec the API serves at `/openapi/public.json`; CI fails on drift. Deferred out of M3 by the owner, and **pulled into M5 by D-53** (backend M5-PLAN task C.3). *Done when:* no hand-written request or response shape remains, `src/types/auth.ts` and `src/types/public.ts` included (M5)
- [x] **Token provider and `refresh` callback** ([adr/0018](https://github.com/vit-rin/vit-rin-backend/blob/main/docs/adr/0018-game-embedding-and-token-handoff.md), [adr/0011](https://github.com/vit-rin/vit-rin-backend/blob/main/docs/adr/0011-consumer-sign-in.md)) — the client takes a token and a `refresh` callback and holds no refresh token. A host helper builds both from the frame handshake (`vitrin:ready`, `vitrin:token`, `vitrin:refresh`, `vitrin:finished`), and accepts `vitrin:token` only from the allowed parent origins in the Game's deployed configuration, never from the URL. *Done when:* a token sent from an allowed parent origin is accepted and one from any other origin is ignored; a forced `401` calls `refresh` once and retries once with the same idempotency key; a failed refresh surfaces and does not loop; the public-client OTP path still passes its integration tests (the Business-site regression, ROADMAP D-19). **Built** in `src/host/index.ts` and **observed on staging** in `v0.2.0`: `memory-match` loads the CDN build, receives its token by `postMessage` and refreshes through the page (M3)
- `campaigns` — read, enter. Not built: M4's done-when did not need it, and the roadmap leaves the `campaigns`, `rewards` and `wallet` surfaces for later; no milestone until then, so it is not a task line
- `games` — read, launch. Not built and not in M5 (backend D-53); it has no milestone until then, so it is not a task line
- [x] `competitions` — open, finalize — open a play session for a Competition, and finalize it with the score and an idempotency key; the result is the outcome and the raw score ([adr/0020](https://github.com/vit-rin/vit-rin-backend/blob/main/docs/adr/0020-competition-and-play-session.md)). *Done when:* against the real API, a repeated finalize returns the original outcome and an out-of-bounds score surfaces as a typed error with its code. **Built** in `src/surfaces/competitions/index.ts` and **observed on staging** in `v0.2.0`: `memory-match` opens, plays and finalizes a session through it (M3)
- [ ] **Cross-site check** (ROADMAP D-24), deferred out of M3 by the owner and **pulled into M5 by D-53** (backend M5-PLAN task C.3) — the games host shares a site with the app and the API, so it cannot show that the SDK works on any origin. The `integration` job serves a page from `localhost`, which is cross-site to the API, and drives the real API through the SDK from it. *Done when:* the calls succeed through CORS, and the job asserts that no request carries credentials (no cookie, `credentials: "omit"`) (M5)
- [ ] `missions` — read, progress (M7)
- `rewards` — read, earnings. As `campaigns`: not built, no milestone, not a task line
- `wallet` — balances, transactions, cards. As `campaigns`: not built, no milestone, not a task line
- [ ] `store` — catalog, order (M9)
- [ ] `ads` — placements `before_game`, `after_game`, `before_result` **only** (M10)
- *Done when:* every surface is typed from the spec with no hand-written request or response shapes.

## S3 — UI overlay

- `ui/` as a separate entry point, theme tokens and `fa`/`en` with RTL, controls and the result screen. Deferred out of M3 by the owner and **not in M5** (backend D-53): `src/ui/index.ts` is still the S1 placeholder. No milestone until then, so these are not task lines
- [ ] Ad screen (M10)
- *Done when:* a host that imports only `@vit-rin/js` ships no overlay code at all.

## S4 — Release

- [x] CI publishes to the CDN on a tag — the build is a versioned, immutable release artifact that deploy places at `/sdk/<version>/…` on the CDN host, and hosts pin the version. **Built** in `.github/workflows/release.yml` (a `vX.Y.Z` tag publishes `vit-rin-js-vX.Y.Z.tar.gz` and its checksum) and **observed on staging**: `v0.2.0`, served from the CDN, is byte-equal to the artifact (M3)
- npm publishing — **deferred** ([ROADMAP.md D-25](https://github.com/vit-rin/vit-rin-backend/blob/main/docs/ROADMAP.md#10-open-decisions)): no npm publish and no dist-tag in M3; revisited once M3 is wired and tested end to end. It has no milestone until then, so it is not a task line
- Write `README.md` usage docs. Deferred out of M3 by the owner and not in M5; no milestone until then, so it is not a task line
- [ ] Rewrite [SDK-CONTRACT.md](SDK-CONTRACT.md) from what was built and change its status from Specification to Binding, once the cross-site check exists. The contract's verification line names the games host and the cross-site check instead of "a non-vit-rin origin" (ROADMAP D-24); pulled into M5 by D-53 (backend M5-PLAN task C.3) (M5)
- *Done when:* `memory-match`, served from **`games.stage.vit-rin.com`** with an SDK version pinned from the CDN, holding only a token, completes authenticate → open competition → finalize → verdict; and the cross-site check (S2) is green. The first half is **observed on staging** (`memory-match` `v0.1.0` with the SDK `v0.2.0`); the cross-site check is not built.

## M5 — Operations and launch readiness: the SDK column

[Backend ROADMAP.md §6 M5](https://github.com/vit-rin/vit-rin-backend/blob/main/docs/ROADMAP.md#m5--operations-and-launch-readiness) and [M5-PLAN.md](https://github.com/vit-rin/vit-rin-backend/blob/main/docs/M5-PLAN.md), signed off by the owner; its §6 holds every task with its full Done-when, and the decisions are D-41 to D-57 in the roadmap's §10. Tasks are numbered as the plan numbers them. This is the first milestone since M3 to touch this repository, so it is tagged `milestone/M5` at the close.

- [x] **0.2 This tracker matches the code** — the SDK rows of the plan's §2.1 are corrected here and in `SDK-CONTRACT.md`, this section exists, and the SDK's reconciliation leaves the backend ROADMAP §9 (M5)
- [ ] **C.2 The SDK's fixes already known** (the plan's §2.2 row 17) — *Done when:* each is proven by a test that fails first: `fetch` sets `credentials: 'omit'` (`core/transport/index.ts`); an `http:` parent origin is refused (`host/index.ts`); `tokens_set` no longer hands the refresh token to any listener (`core/auth/index.ts`); the release publishes an SRI hash and the CDN sends a CORS header for `/sdk/` (`release.yml`, with the deploy repository) (M5)
- [ ] **C.3 The cross-site check and generated types** (D-53) — *Done when:* a CI job drives the real API from a page on another site and asserts no request carries credentials; `types/` is generated from the served `public.json` and the hand-written files are deleted; a release publishes an SRI hash; `SDK-CONTRACT.md` is Binding (M5)
- [ ] **C.4 Supply chain** — *Done when:* `npm audit` and an image or dependency scan in CI, actions pinned by commit; each job is seen red on a planted vulnerable dependency and green without it (M5)

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
