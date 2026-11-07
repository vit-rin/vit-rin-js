/**
 * surfaces/competitions — open a play session in a Competition, and finalize it
 * with the score (adr/0020, `public.yaml`).
 *
 * The server judges every result against bounds it copied when the session
 * opened and with its own clock; this surface only carries the score there.
 * It sends the score and nothing else: no duration, no flag, no proof.
 */
import type { AuthClient } from '../../core/auth';
import { generateIdempotencyKey } from '../../core/idempotency';
import type { FinalizeRequest, PlaySession, SessionResult } from '../../types/public';

const PUBLIC = '/api/v1/public';

export interface FinalizeOptions {
  /**
   * The `Idempotency-Key` for this finalize. Leave it out and the SDK mints one.
   * Pass the same key to repeat a finalize whose answer you did not receive:
   * the server returns the original answer, never a second result.
   */
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export class CompetitionsClient {
  constructor(private readonly auth: AuthClient) {}

  /**
   * `POST /competitions/{competitionId}/sessions`. Every call opens a **new**
   * session; a Customer may play as often as they like. Rejects with an
   * `ApiError` whose `code` is `competition.not_open` (409) when the Competition
   * is not open, and a 404 for a Competition of another Business.
   */
  open(competitionId: string, options: { signal?: AbortSignal } = {}): Promise<PlaySession> {
    return this.auth.authorizedRequest<PlaySession>({
      method: 'POST',
      path: `${PUBLIC}/competitions/${encodeURIComponent(competitionId)}/sessions`,
      signal: options.signal,
    });
  }

  /**
   * `POST /sessions/{sessionId}/finalize`. A session takes one finalize. A
   * result the server refuses rejects with an `ApiError` whose `code` is
   * `competition.score_out_of_bounds`, `competition.too_fast`,
   * `competition.too_slow` or `competition.session_expired` (all 422), and the
   * session is closed: it cannot be finalized again with another score.
   */
  finalize(sessionId: string, score: number, options: FinalizeOptions = {}): Promise<SessionResult> {
    const body: FinalizeRequest = { score };
    return this.auth.authorizedRequest<SessionResult>({
      method: 'POST',
      path: `${PUBLIC}/sessions/${encodeURIComponent(sessionId)}/finalize`,
      body,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }
}

/**
 * A play session held by a Game, with its finalize.
 *
 * `finalize` keeps its `Idempotency-Key` for as long as the score is the same,
 * so calling it again after a network failure repeats the **same** request and
 * the server answers once. A different score gets a new key (and the server
 * answers `competition.session_already_finalized`).
 */
export class OpenSession {
  readonly id: string;
  readonly competitionId: string;
  readonly openedAt: string;
  readonly expiresAt: string;

  private keyedScore?: number;
  private key?: string;

  constructor(
    session: PlaySession,
    private readonly competitions: CompetitionsClient,
    private readonly onAccepted?: (result: SessionResult) => void,
  ) {
    this.id = session.id;
    this.competitionId = session.competition_id;
    this.openedAt = session.opened_at;
    this.expiresAt = session.expires_at;
  }

  async finalize(score: number, options: { signal?: AbortSignal } = {}): Promise<SessionResult> {
    if (this.key === undefined || this.keyedScore !== score) {
      this.key = generateIdempotencyKey();
      this.keyedScore = score;
    }
    const result = await this.competitions.finalize(this.id, score, { idempotencyKey: this.key, signal: options.signal });
    this.onAccepted?.(result);
    return result;
  }
}
