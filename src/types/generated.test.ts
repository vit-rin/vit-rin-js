import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The SDK's types are the API's, generated from the specs the API serves, and never written by hand
// (docs/SDK-CONTRACT.md, backend M5 decision D-53). The two hand-written files that stood in until the
// public spec existed are gone, and what replaces them says it was generated.
const here = (p: string) => new URL(p, import.meta.url);

describe('types/', () => {
  it('has no hand-written file left', () => {
    expect(existsSync(here('./auth.ts'))).toBe(false);
    expect(existsSync(here('./public.ts'))).toBe(false);
  });

  it.each(['public', 'auth'])('the %s types are generated, from the spec the API serves', (surface) => {
    const file = here(`./generated/${surface}.ts`);
    expect(existsSync(file)).toBe(true);
    const text = readFileSync(file, 'utf8');
    expect(text).toContain('with openapi-typescript');
    expect(text).toContain('export interface paths');
    // A generated file is regenerated, not edited: it carries where it came from (scripts/generate-types.mjs).
    expect(text).toContain(`/openapi/${surface}.json`);
  });

  it('the names the SDK exports are the generated schemas, not copies', () => {
    const index = readFileSync(here('./index.ts'), 'utf8');
    for (const name of ['PlaySession', 'FinalizeRequest', 'SessionResult', 'OtpChallenge', 'TokenPair']) {
      expect(index).toMatch(new RegExp(`export type ${name} = \\w+Components\\['schemas'\\]\\['${name}'\\]`));
    }
  });
});
