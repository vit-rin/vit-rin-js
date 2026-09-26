# vit-rin-js — SDK Contract

**Status:** Specification — the rewrite has not started.

> The current `main` is the previous SDK. The rewrite happens on branch `dev`.
> Rewrite this document from reality once the headless core works, and change
> the status to Binding.

## Baseline decision — recorded

`dev` is branched from `main` @ `5f17553`, v2.1.23 — the snapshot already
checked out here.

Not used: `origin/feat/theme-tokens-i18n-foundation` — v2.3.0, adds
`src/i18n/`, `src/theme/` and the `theme` / `locale` options. Whether those
land in the rewrite (S3 — UI overlay) or get reworked from scratch is still
open, tracked in [BUILD.md](BUILD.md) S0.

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
