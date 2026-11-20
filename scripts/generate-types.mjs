#!/usr/bin/env node
// Generates src/types/generated/{public,auth}.ts from the OpenAPI specs the API serves at
// /openapi/public.json and /openapi/auth.json (docs/SDK-CONTRACT.md, backend M5 decision D-53).
// The generated files are committed, never edited, and CI regenerates them from the real API and fails
// on any difference (`npm run types:check`), so they cannot drift from what is served.
//
//   node scripts/generate-types.mjs [--from <base URL | directory of <surface>.json>] [--check]
//
// --from defaults to $VITRIN_API_URL, then to the backend's committed bundles next to this repository
// (which a backend test holds byte-equal to what the API serves). --check writes nothing and exits 1
// when a file differs from what would be generated.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import openapiTS, { astToString } from 'openapi-typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'src/types/generated');
const SURFACES = ['public', 'auth'];

const args = process.argv.slice(2);
const check = args.includes('--check');
const fromIdx = args.indexOf('--from');
let from = fromIdx >= 0 ? args[fromIdx + 1] : (process.env.VITRIN_API_URL ?? '');
if (!from) from = resolve(root, '../vit-rin-backend/api/openapi/bundled');

function sourceOf(surface) {
  if (/^https?:\/\//.test(from)) return { url: new URL(`/openapi/${surface}.json`, from), label: `/openapi/${surface}.json` };
  const file = join(resolve(from), `${surface}.json`);
  if (!existsSync(file)) throw new Error(`no ${file}: pass --from <API base URL> or the directory holding ${surface}.json`);
  return { url: pathToFileURL(file), label: `/openapi/${surface}.json` };
}

let differs = 0;
mkdirSync(out, { recursive: true });
for (const surface of SURFACES) {
  const { url, label } = sourceOf(surface);
  const body = astToString(await openapiTS(url));
  const text =
    `// Generated from the specification the API serves at ${label}, by scripts/generate-types.mjs, with openapi-typescript.\n` +
    `// Never edited by hand: \`npm run types:generate\` rewrites it, and CI fails if it differs from what the API serves.\n` +
    body;
  const file = join(out, `${surface}.ts`);
  const current = existsSync(file) ? readFileSync(file, 'utf8') : '';
  if (check) {
    if (current !== text) {
      differs++;
      console.error(`types:check: ${file} differs from ${label}`);
    }
  } else {
    writeFileSync(file, text);
    console.log(`wrote ${file}`);
  }
}
if (check) {
  if (differs) process.exit(1);
  console.log('types:check: the generated types are what the API serves');
}
