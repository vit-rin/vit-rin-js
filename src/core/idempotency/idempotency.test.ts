import { describe, expect, it } from 'vitest';

import {
  IDEMPOTENCY_KEY_HEADER,
  generateIdempotencyKey,
  isMutatingMethod,
  withIdempotencyKey,
} from './index';

describe('isMutatingMethod', () => {
  it.each(['POST', 'PUT', 'PATCH', 'DELETE', 'post', 'Patch'])('treats %s as mutating', (method) => {
    expect(isMutatingMethod(method)).toBe(true);
  });

  it.each(['GET', 'HEAD', 'OPTIONS', 'get'])('treats %s as non-mutating', (method) => {
    expect(isMutatingMethod(method)).toBe(false);
  });
});

describe('generateIdempotencyKey', () => {
  it('produces a UUID-shaped string', () => {
    const key = generateIdempotencyKey();
    expect(key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('is different on every call', () => {
    const keys = new Set(Array.from({ length: 200 }, () => generateIdempotencyKey()));
    expect(keys.size).toBe(200);
  });
});

describe('withIdempotencyKey', () => {
  it('attaches a key for a mutating method', () => {
    const headers = withIdempotencyKey({}, 'POST');
    expect(headers[IDEMPOTENCY_KEY_HEADER]).toBeTruthy();
  });

  it('leaves a non-mutating method untouched', () => {
    const headers = withIdempotencyKey({ Accept: 'application/json' }, 'GET');
    expect(headers).toEqual({ Accept: 'application/json' });
    expect(headers[IDEMPOTENCY_KEY_HEADER]).toBeUndefined();
  });

  it('uses a caller-supplied key instead of generating one', () => {
    const headers = withIdempotencyKey({}, 'POST', 'fixed-key-123');
    expect(headers[IDEMPOTENCY_KEY_HEADER]).toBe('fixed-key-123');
  });

  it('does not mutate the headers object it was given', () => {
    const original = { Accept: 'application/json' };
    withIdempotencyKey(original, 'POST');
    expect(original).toEqual({ Accept: 'application/json' });
  });
});
