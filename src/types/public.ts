/**
 * ⚠️ TEMPORARY — hand-written, not generated.
 *
 * `types/` is meant to be generated from the spec the API serves at
 * `/openapi/public.json` (docs/BUILD.md, S2: "types/ generated from
 * public.yaml") and never hand-edited. That generation step is not built yet,
 * so the `competitions` surface and the frame host helper use these shapes,
 * written from `vit-rin-backend/api/openapi/public.yaml` (schemas
 * `PlaySession`, `FinalizeRequest`, `SessionResult`).
 *
 * DELETE THIS FILE when S2 generates `types/`. Do not extend it.
 */

/** `POST /competitions/{competitionId}/sessions` response (201). */
export interface PlaySession {
  id: string;
  competition_id: string;
  /** RFC 3339. */
  opened_at: string;
  /** RFC 3339. After this a finalize is refused (`competition.session_expired`). */
  expires_at: string;
}

/** `POST /sessions/{sessionId}/finalize` request body. */
export interface FinalizeRequest {
  /** The raw score the Game reports. */
  score: number;
}

/**
 * What the server decided. A refused result is an error (an `ApiError` with
 * its `code`), not an outcome.
 */
export type SessionOutcome = 'accepted';

/** `POST /sessions/{sessionId}/finalize` response (200). Never a bound, never a flag. */
export interface SessionResult {
  session_id: string;
  outcome: SessionOutcome;
  score: number;
  /** RFC 3339. */
  finalized_at: string;
}
