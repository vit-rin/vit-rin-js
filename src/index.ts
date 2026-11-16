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
export { ApiError, NetworkError, RateLimitedError, TimeoutError, VitRinError, parseRetryAfter } from './core/transport/errors';
export type { ApiErrorBody, ApiErrorEnvelope, ApiFieldError } from './core/transport/errors';

export { AuthClient, AuthError } from './core/auth';
export type { AuthConfig, AuthEvent, RefreshedToken, StoredTokens, TokenEventPayload } from './core/auth';

export { CompetitionsClient, OpenSession } from './surfaces/competitions';
export type { FinalizeOptions } from './surfaces/competitions';
export { connectToHost, HostError, HOST_MESSAGE } from './host';
export type { ConnectOptions, HostConnection, HostWindow } from './host';

export {
  generateIdempotencyKey,
  isMutatingMethod,
  withIdempotencyKey,
  IDEMPOTENCY_KEY_HEADER,
} from './core/idempotency';

export { EventEmitter } from './core/events';
export type { Listener, Unsubscribe } from './core/events';

// The API's types, generated from the specifications it serves (src/types/generated, scripts/generate-types.mjs).
export type {
  PlaySession,
  FinalizeRequest,
  SessionResult,
  SessionOutcome,
  Leaderboard,
  LeaderboardRow,
  StartOtpRequest,
  OtpChallenge,
  VerifyOtpRequest,
  TokenPair,
  GrantType,
  RefreshTokenRequest,
} from './types';
