#!/usr/bin/env node
/**
 * TypeScript's `node16`/`nodenext` module resolution disambiguates a
 * `.d.ts` file's module kind (ESM vs CJS) by the nearest `package.json`'s
 * `"type"` field, the same rule it uses for `.js`. This package's root is
 * `"type": "module"`, so a bare `index.d.ts` is read as ESM types — fine
 * for the `import` condition, but wrong for `require` (our real CJS
 * output, `build/cjs/*.cjs`). Without a matching `.d.cts`, `attw` reports
 * that condition as "masquerading as ESM".
 *
 * The declaration content itself doesn't need to differ (rollup-plugin-dts
 * emits plain `import`/`export` type syntax either way — TypeScript reads
 * that the same regardless of extension); only the extension needs to be
 * unambiguous. So this just mirrors each ESM `.d.ts` to a `.d.cts` sibling
 * after `rollup -c` runs, and `package.json`'s `exports` map points the
 * `require` condition's `types` at the `.d.cts` copy.
 */
import { copyFileSync } from 'node:fs';

const pairs = [
  ['build/types/index.d.ts', 'build/types/index.d.cts'],
  ['build/types/ui/index.d.ts', 'build/types/ui/index.d.cts'],
];

for (const [from, to] of pairs) {
  copyFileSync(from, to);
  console.log(`mirrored ${from} -> ${to}`);
}
