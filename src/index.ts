/**
 * @vit-rin/js — headless core.
 *
 * This entry point (the `.` export) is the whole SDK minus the optional UI
 * overlay. It must never import React — the overlay lives at
 * `@vit-rin/js/ui` as a separate entry point specifically so a host can
 * take just this file and ship no UI code at all.
 *
 * Token auth only: nothing in this module reads a cookie or redirects the
 * page. A host either calls `setAccessToken` with a token it already has,
 * or drives `startOtp` / `verifyOtp` against its own `pk_live_*` client id.
 */

export { Transport } from './core/transport';
export type { TransportConfig, RequestOptions, FetchLike } from './core/transport';
export { ApiError, NetworkError, TimeoutError, VitRinError } from './core/transport/errors';
export type { ApiErrorBody, ApiErrorEnvelope, ApiFieldError } from './core/transport/errors';

export { AuthClient, AuthError } from './core/auth';
export type { AuthConfig, AuthEvent, StoredTokens } from './core/auth';

export {
  generateIdempotencyKey,
  isMutatingMethod,
  withIdempotencyKey,
  IDEMPOTENCY_KEY_HEADER,
} from './core/idempotency';

export { EventEmitter } from './core/events';
export type { Listener, Unsubscribe } from './core/events';

// Temporary hand-written auth types — see src/types/auth.ts for why, and
// docs/BUILD.md S2 for when this stops being true.
export type {
  StartOtpRequest,
  OtpChallenge,
  VerifyOtpRequest,
  TokenPair,
  GrantType,
  RefreshTokenRequest,
} from './types/auth';
