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
| **Next** | **M2** has no SDK work: its wallet reads are in the backend's `consumer.yaml`, which the SDK does not wrap, and the SDK's wallet surface is M4 ([ROADMAP.md §8](https://github.com/vit-rin/vit-rin-backend/blob/main/docs/ROADMAP.md#8-dependencies-across-repositories)). S1 is exercised against the real API (M1, proven on staging with the backend and frontend; `vit-stage-all-eu-01`, D-14: production deferred to M6). The SDK's next work is S2, which waits on `api/openapi/public.yaml` from the backend (M3). The S2 and S3 lines carry the milestone ROADMAP §8 gives each surface |

### What blocks this repo

| Need | From | Blocks |
|---|---|---|
| `api/openapi/auth.yaml` | backend — **spec ready now**, [adr/0007](https://github.com/vit-rin/vit-rin-backend/blob/main/docs/adr/0007-token-model.md) | `core/auth`'s shape now; exercising it live once Phase 1 ships |
| `api/openapi/public.yaml` | backend Phase 3 | S2 onward |
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

Blocked on `public.yaml`. Each is a thin typed wrapper over the generated client.

- [ ] `types/` generated from `public.yaml` — never hand-edited (M3)
- [ ] `campaigns` — read, enter (M4)
- [ ] `games` — read, launch (M3)
- [ ] `competitions` — open, finalize (M3)
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

- [ ] CI publishes to npm and the CDN on a tag (M3)
- [ ] Write `README.md` usage docs; rewrite [SDK-CONTRACT.md](SDK-CONTRACT.md) from what was built and change its status from Specification to Binding (M3)
- *Done when:* a sample game served from a **non-vit-rin origin**, holding only a token, completes authenticate → open competition → finalize → verdict.

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
