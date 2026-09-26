/**
 * core/idempotency
 *
 * Every mutating call the SDK makes must carry an `Idempotency-Key` header
 * so a retried request (ours, or a host retrying on our behalf) is safe to
 * replay server-side. This module is the single primitive that decides
 * "is this call mutating" and "what key does it get" — `core/transport`
 * calls into it on every request instead of each call site deciding for
 * itself.
 *
 * The mutating/non-mutating split is a static method allowlist for now,
 * since no `surfaces/` exist yet to consult (S2). When surfaces land, a
 * surface can still force the issue either way via the `idempotent`
 * override on a transport request.
 */

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const IDEMPOTENCY_KEY_HEADER = 'Idempotency-Key';

/** True for HTTP methods that mutate server state and must carry a key. */
export function isMutatingMethod(method: string): boolean {
  return MUTATING_METHODS.has(method.toUpperCase());
}

/**
 * Generates a fresh idempotency key. Prefers `crypto.randomUUID` where
 * available (every modern browser and Node 19+); falls back to a
 * RFC-4122-shaped v4 UUID built on `Math.random` so the SDK still works in
 * older runtimes without pulling in a dependency for it.
 */
export function generateIdempotencyKey(): string {
  const cryptoObj: Crypto | undefined =
    typeof globalThis !== 'undefined' ? (globalThis as { crypto?: Crypto }).crypto : undefined;

  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID();
  }

  return fallbackUuidV4();
}

function fallbackUuidV4(): string {
  let seed = Date.now() + Math.random() * 1_000_000;
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    // Deterministic-looking PRNG step so we don't call Math.random() in a
    // hot loop; still good enough for a client-generated idempotency key,
    // which only needs to be unique per request, not cryptographically
    // secure.
    seed = (seed * 9301 + 49297) % 233280;
    const rand = (seed / 233280) * 16;
    const value = char === 'x' ? Math.floor(rand) : (Math.floor(rand) & 0x3) | 0x8;
    return value.toString(16);
  });
}

/**
 * Returns a new headers object with `Idempotency-Key` attached, but only
 * when `method` mutates. Non-mutating methods (GET, HEAD, OPTIONS, ...) are
 * returned untouched — attaching a key there would be meaningless and would
 * make caching harder to reason about.
 */
export function withIdempotencyKey(
  headers: Record<string, string>,
  method: string,
  key: string = generateIdempotencyKey(),
): Record<string, string> {
  if (!isMutatingMethod(method)) {
    return headers;
  }
  return { ...headers, [IDEMPOTENCY_KEY_HEADER]: key };
}
