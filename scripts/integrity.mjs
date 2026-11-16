#!/usr/bin/env node
// The Subresource Integrity value of a release file (M5 review SK-4, backend decision D-53): `sha384-` and the
// base64 of the SHA-384 of its bytes, which is what `<script integrity="…">` takes. A page that pins it refuses a
// file that is not the one that was released, however it got altered on the way. The release workflow writes it
// next to the file as `<file>.integrity`, publishes it with the release, and checks it against openssl.
//
//   node scripts/integrity.mjs build/iife/vit-rin.min.js     # writes build/iife/vit-rin.min.js.integrity
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function sriOf(bytes) {
  return `sha384-${createHash('sha384').update(bytes).digest('base64')}`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = process.argv[2];
  if (!file) {
    console.error('usage: integrity.mjs <file>');
    process.exit(2);
  }
  const value = sriOf(readFileSync(file));
  writeFileSync(`${file}.integrity`, `${value}\n`);
  console.log(`${file}: ${value}`);
}
