# vit-rin-js — SDK Contract

**Status:** Specification — the rewrite has not started.

> The current `main` is the previous SDK. The rewrite happens on branch `dev`,
> which **does not exist yet**. Rewrite this document from reality once the
> headless core works, and change the status to Binding.

## Baseline decision — required before branching

Two checkouts differ:

- `vit-rin-v2/vit-rin-js` — `main` at `5f17553`, v2.1.23
- `origin/feat/theme-tokens-i18n-foundation` — v2.3.0, adds `src/i18n/`,
  `src/theme/` and the `theme` / `locale` options

Pick one, branch `dev` from it, record the choice here.

## Rules

- **Token auth only.** The SDK **MUST NOT** read a cookie and **MUST NOT**
  redirect to a login page. It takes an access token from the host
  application, or obtains one itself via a public client (`pk_live_*`) and
  OTP. It must work on any origin.
- **`@vit-rin/js` MUST NOT pull in React.** The headless core and the UI
  overlay (`@vit-rin/js/ui`) are separate entry points. Enforce with a CI size
  budget on the headless bundle, so a stray import fails the build.
- `types/` is generated from `api/openapi/public.yaml`. Never hand-edited.
- Ad placements are `before_game`, `after_game`, `before_result` — the
  canonical names from
  [`DOMAIN.md §5`](../../vit-rin-backend/docs/DOMAIN.md#5-advertising).
- Every mutating call sends an idempotency key.
- `build/` is a release artifact and **MUST NOT** be committed.
- The public API is semver. A surface method's signature is a breaking change.

## Shape

```
src/
  core/      transport (fetch), auth + auto-refresh, retry,
             idempotency keys, typed errors, events
  surfaces/  campaigns/ games/ competitions/ missions/
             rewards/ wallet/ store/ ads/
  types/     generated
  ui/        optional overlay, separate entry point
```

## Build

Rollup. Two inputs (`index`, `ui`); outputs ESM (preserveModules), CJS, and a
minified IIFE for CDN. `rollup-plugin-dts` per entry. React is external for
ESM/CJS and bundled for the IIFE. `package.json` `exports` maps `.` to the
headless core and `./ui` to the overlay.

## Verification

`npm run build` produces all three formats · `source-map-explorer` confirms no
React in the headless ESM output · `@arethetypeswrong/cli --pack .` clean ·
**serve a sample game from a non-vit-rin origin with only a token** and
complete authenticate → open competition → finalize → verdict · force a 401
mid-session and confirm transparent refresh with a single retry.
