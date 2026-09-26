/**
 * ⚠️ TEMPORARY — hand-written, not generated.
 *
 * `types/` is meant to hold types generated from
 * `api/openapi/public.yaml` (see docs/SDK-CONTRACT.md and docs/BUILD.md
 * S2) and is never supposed to be hand-edited. That spec doesn't exist yet
 * — it's backend Phase 3 — so `core/auth` has nothing to generate against.
 *
 * These shapes are hand-written directly from
 * `vit-rin-backend/api/openapi/auth.yaml` (schemas `StartOtpRequest`,
 * `OtpChallenge`, `VerifyOtpRequest`, `TokenPair`, `GrantType`) and
 * `vit-rin-backend/docs/adr/0007-token-model.md`, and cover only the auth
 * flow `core/auth` needs for S1.
 *
 * DELETE THIS FILE once S2 generates real types from `public.yaml` (or a
 * generated `auth.yaml` client, whichever lands first) — do not extend it
 * by hand for anything beyond OTP + token issuance/refresh.
 */

/** `POST /api/v1/auth/otp` request body. */
export interface StartOtpRequest {
  /** A public client id, e.g. `pk_live_9f2c1a`. */
  client_id: string;
  /** E.164, e.g. `+989121234567`. */
  phone: string;
}

/** `POST /api/v1/auth/otp` response body (202). */
export interface OtpChallenge {
  challenge_id: string;
  /** Seconds until the code expires. */
  expires_in: number;
}

/** `POST /api/v1/auth/otp/verify` request body. */
export interface VerifyOtpRequest {
  challenge_id: string;
  code: string;
}

export type GrantType = 'refresh_token' | 'client_credentials';

/** `POST /oauth/token` request body (`application/x-www-form-urlencoded`). */
export interface RefreshTokenRequest {
  grant_type: 'refresh_token';
  refresh_token: string;
}

/**
 * `POST /api/v1/auth/otp/verify` (200) and `POST /oauth/token`
 * (`refresh_token` grant, 200) response body.
 *
 * `refresh_token` is present for the OTP-verify and refresh_token-grant
 * responses; ADR 0007 notes it's absent for `client_credentials`, which
 * `core/auth` never performs (that grant is for confidential
 * `cid_live_*` clients, never shipped to a browser or a game).
 */
export interface TokenPair {
  access_token: string;
  refresh_token?: string;
  token_type: 'Bearer';
  /** Seconds until `access_token` expires. */
  expires_in: number;
}
