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
| Branch `dev` | clean slate — no source carried over |
| Surfaces | 0 of 8 |
| **Next** | **S1 — Core** |

### What blocks this repo

| Need | From | Blocks |
|---|---|---|
| `api/openapi/auth.yaml` | backend — **spec ready now**, [adr/0007](https://github.com/vit-rin/vit-rin-backend/blob/main/docs/adr/0007-token-model.md) | `core/auth`'s shape now; exercising it live once Phase 1 ships |
| `api/openapi/public.yaml` | backend Phase 3 | S2 onward |
| Real token auth running | backend Phase 1 | verifying S1's `core/auth` end to end |

---

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
- [~] CI size budget on the headless bundle — workflow and `size-limit` config are in place and pass locally (`npm run build && npm run size`); not yet observed running in GitHub Actions since this environment can't push or watch a run
- *Done when:* `source-map-explorer` shows **no React** in the headless ESM output, and `@arethetypeswrong/cli --pack .` is clean.

## S2 — Surfaces

Blocked on `public.yaml`. Each is a thin typed wrapper over the generated client.

- [ ] `types/` generated from `public.yaml` — never hand-edited
- [ ] `campaigns` — read, enter
- [ ] `games` — read, launch
- [ ] `competitions` — open, finalize
- [ ] `missions` — read, progress
- [ ] `rewards` — read, earnings
- [ ] `wallet` — balances, transactions, cards
- [ ] `store` — catalog, order
- [ ] `ads` — placements `before_game`, `after_game`, `before_result` **only**
- *Done when:* every surface is typed from the spec with no hand-written request or response shapes.

## S3 — UI overlay

- [ ] `ui/` as a separate entry point
- [ ] Theme tokens and `fa`/`en` with RTL
- [ ] Controls, ad screen, result screen
- *Done when:* a host that imports only `@vit-rin/js` ships no overlay code at all.

## S4 — Release

- [ ] CI publishes to npm and the CDN on a tag
- [ ] Write `README.md` usage docs; rewrite [SDK-CONTRACT.md](SDK-CONTRACT.md) from what was built and change its status from Specification to Binding
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
