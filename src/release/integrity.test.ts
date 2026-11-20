import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// A release publishes the Subresource Integrity value of the file a Game loads (M5 review SK-4, decision D-53), so
// a page that pins it refuses a file that is not the one that was released.
// @ts-expect-error a plain ES module the release workflow also runs
import { sriOf } from '../../scripts/integrity.mjs';

describe('Subresource Integrity of a release', () => {
  it('is the sha384 of the bytes, base64, as a browser computes it (known vectors)', () => {
    // FIPS 180-4's own examples: SHA-384("abc") and SHA-384("").
    expect(sriOf(Buffer.from('abc'))).toBe('sha384-ywB1P0WjXou1oD1pmsZQBycsMqsO3tFjGotgWkP/W+2AhgcroefMI1i67KE0yCWn');
    expect(sriOf(Buffer.from(''))).toBe('sha384-OLBgp1GsljhM2TJ+sbHjaiH9txEUvgdDTAzHv2P24donTt6/529l+9Ua0vFImLlb');
  });

  it('changes with any byte of the file', () => {
    const a = sriOf(Buffer.from('console.log(1)'));
    expect(sriOf(Buffer.from('console.log(2)'))).not.toBe(a);
    expect(sriOf(Buffer.from('console.log(1) '))).not.toBe(a);
  });

  it('is what openssl says, which is what the release workflow checks it against', () => {
    const dir = mkdtempSync(join(tmpdir(), 'sri-'));
    try {
      const file = join(dir, 'f.js');
      writeFileSync(file, 'window.VitRin = { a: 1 };\n');
      const viaOpenssl = execFileSync('sh', ['-c', `openssl dgst -sha384 -binary "${file}" | openssl base64 -A`]).toString();
      expect(sriOf(readFileSync(file))).toBe(`sha384-${viaOpenssl}`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('the script writes <file>.integrity holding the value and a newline, and says so', () => {
    const dir = mkdtempSync(join(tmpdir(), 'sri-'));
    try {
      const file = join(dir, 'vit-rin.min.js');
      writeFileSync(file, 'x');
      const out = execFileSync('node', [new URL('../../scripts/integrity.mjs', import.meta.url).pathname, file]).toString();
      const written = readFileSync(`${file}.integrity`, 'utf8');
      expect(written).toBe(`${sriOf(Buffer.from('x'))}\n`);
      expect(out).toContain(sriOf(Buffer.from('x')));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('refuses a file that is not there', () => {
    expect(() => execFileSync('node', [new URL('../../scripts/integrity.mjs', import.meta.url).pathname, '/nonexistent/vit-rin.min.js'], { stdio: 'pipe' })).toThrow();
  });
});
