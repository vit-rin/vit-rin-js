/**
 * @vit-rin/js/ui — optional overlay entry point.
 *
 * PLACEHOLDER for S1. The real overlay (theme tokens, `fa`/`en` + RTL,
 * controls/ad/result screens) is S3's job — see docs/BUILD.md. What
 * exists here for now only proves out the build shape S1 is responsible
 * for: this is a *separate* Rollup entry from `src/index.ts`, it is the
 * only place in the package that imports React, and React is external in
 * its ESM/CJS output but bundled into its IIFE output (so a `<script>`
 * tag pulling this straight from the CDN doesn't need React loaded
 * separately).
 *
 * A host that imports only `@vit-rin/js` (the `.` export) never reaches
 * this file, so it ships no React and no overlay code — that's the S3
 * "done when".
 */
import { version } from 'react';

/** Replaced by real overlay components in S3. Exists so this entry point
 * has something to export and to bundle React against. */
export function vitRinUiPlaceholderVersion(): string {
  return version;
}
