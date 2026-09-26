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
| Branch `dev` | **does not exist** |
| Surfaces | 0 of 8 |
| **Next** | **S0 — pick the baseline and branch** |

### What blocks this repo

| Need | From | Blocks |
|---|---|---|
| `api/openapi/public.yaml` | backend Phase 3 | S2 onward |
| Real token auth | backend Phase 1 | S1 |

S0 is not blocked and should be settled now — it is a decision, not work.

---

## S0 — Baseline and branch 🔴 DECISION NEEDED

Two candidate starting points differ materially:

| Candidate | Version | Has |
|---|---|---|
| `main` @ `5f17553` | 2.1.23 | the older snapshot currently checked out here |
| `origin/feat/theme-tokens-i18n-foundation` | 2.3.0 | `src/i18n/`, `src/theme/`, `theme`/`locale` options |

- [ ] Choose one and record the choice in [SDK-CONTRACT.md](SDK-CONTRACT.md)
- [ ] `git switch -c dev <chosen-ref>` and push it
- [ ] Decide what carries over from the old source and what is rewritten
- *Done when:* `dev` exists on the remote and the contract names its baseline.

## S1 — Core

- [ ] Rollup config — inputs `index` and `ui`; ESM (preserveModules), CJS, minified IIFE for CDN
- [ ] `rollup-plugin-dts` per entry; `package.json` `exports` maps `.` and `./ui`
- [ ] React external for ESM/CJS, **bundled** for IIFE
- [ ] `core/transport` — fetch wrapper, timeouts, typed errors from the API's `error.code`
- [ ] `core/auth` — **token only**. No cookie read, no implicit redirect. Auto-refresh on 401 with a single retry
- [ ] `core/idempotency` — key on every mutating call
- [ ] CI size budget on the headless bundle
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

- [ ] `build/` removed from the repository and added to `.gitignore` — it is a release artifact
- [ ] CI publishes to npm and the CDN on a tag
- [ ] Rewrite `README.md` for v2; rewrite [SDK-CONTRACT.md](SDK-CONTRACT.md) from what was built and change its status from Specification to Binding
- [ ] Migration note for integrators moving off cookie auth
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
