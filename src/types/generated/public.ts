// Generated from the specification the API serves at /openapi/public.json, by scripts/generate-types.mjs, with openapi-typescript.
// Never edited by hand: `npm run types:generate` rewrites it, and CI fails if it differs from what the API serves.
export interface paths {
    "/games/{gameId}": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                gameId: components["parameters"]["GameId"];
            };
            cookie?: never;
        };
        /**
         * Read a Game
         * @description The Game's name, where it is served and its path: what a page needs to
         *     frame it. Only an active Game: a draft or a retired one answers `404`.
         *     Never its bounds.
         */
        get: operations["readGame"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/competitions/{competitionId}/sessions": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                competitionId: components["parameters"]["CompetitionId"];
            };
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Open a play session
         * @description Every request opens a **new** session: a Customer may play as often as
         *     they like, and each attempt is its own session. The session copies the
         *     Game's bounds when it opens, so a later edit of the Game does not change
         *     it.
         *
         *     The Competition must be **open**: its Campaign is active, its Game is
         *     active, and now lies inside both its window and the Campaign's
         *     (`competition.not_open`, `409`). A Competition of another Business, or
         *     none at all, answers `404`.
         *
         *     The Customer must hold an **Entry** in the Competition's Campaign
         *     ([adr/0022](../../docs/adr/0022-entry-gate.md)), made with the consumer
         *     API's Enter operation; without one the answer is
         *     `competition.entry_required` (`409`). The Entry is asked for only
         *     here, when a session opens, never when one is finalized, and it costs
         *     nothing and does not limit how many sessions a Customer opens.
         */
        post: operations["openSession"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/sessions/{sessionId}/finalize": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                sessionId: components["parameters"]["SessionId"];
            };
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Report the result of a play session
         * @description A session takes **one** finalize, by the Customer who opened it (another
         *     Customer's token answers `404`). The server judges the result against the
         *     session alone and with its own clock; any duration the client measured
         *     is not part of the request.
         *
         *     A result the server refuses closes the session as rejected, and says why:
         *     `competition.session_expired` (after `expires_at`), `competition.too_fast`
         *     (before the Game's shortest play), `competition.too_slow` (after its
         *     longest) or `competition.score_out_of_bounds`, all `422`. A rejected
         *     session cannot be finalized again with another score, so the limits
         *     cannot be probed.
         *
         *     A result inside the bounds is accepted, and is never refused for looking
         *     suspicious: a result past a flag threshold is accepted and stored, and
         *     the response does not show it.
         *
         *     A repeat with the **same** score returns the original answer: the same
         *     result, or the same refusal. A repeat with a different score is
         *     `competition.session_already_finalized` (`409`). Concurrent requests for
         *     one session get one outcome.
         */
        post: operations["finalizeSession"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/competitions/{competitionId}/leaderboard": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                competitionId: components["parameters"]["CompetitionId"];
            };
            cookie?: never;
        };
        /**
         * Read a Competition's Leaderboard
         * @description The top of the Leaderboard, and the token's own standing wherever it
         *     falls. Each Customer appears once, with their best single score; an
         *     earlier finalize wins a tie. A flagged result counts like any other.
         *     Customers are shown by a handle that is the same on every read and
         *     unrelated across Businesses, never by a phone or an id. Two Customers
         *     of one Leaderboard can share a handle, so a handle names no one.
         *
         *     The Leaderboard is a read projection built from the Competition's
         *     events, so a result shows once the worker has applied it, not at the
         *     moment it is finalized.
         */
        get: operations["getLeaderboard"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        PlaySession: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            competition_id: string;
            /** Format: date-time */
            opened_at: string;
            /**
             * Format: date-time
             * @description After this a finalize is refused (`competition.session_expired`).
             */
            expires_at: string;
        };
        FinalizeRequest: {
            /**
             * Format: int64
             * @description The raw score the Game reports.
             */
            score: number;
        };
        /**
         * @description What the server decided. A refused result is an error, not an outcome: see the `422` of the operation.
         * @enum {string}
         */
        SessionOutcome: "accepted";
        /** @description Never a bound and never a flag. */
        SessionResult: {
            /** Format: uuid */
            session_id: string;
            outcome: components["schemas"]["SessionOutcome"];
            /** Format: int64 */
            score: number;
            /** Format: date-time */
            finalized_at: string;
        };
        Leaderboard: {
            items: components["schemas"]["LeaderboardRow"][];
            /** @description The token's own row, or null if it has no accepted result yet. */
            you: components["schemas"]["LeaderboardRow"] | null;
        };
        /** @description A Game as a Business or a player may read it. Never its bounds: a client must not be able to read the limits it is judged by. */
        CatalogueGame: {
            /** Format: uuid */
            id: string;
            /** @example memory-match */
            slug: string;
            name: {
                fa: string;
                en: string;
            };
            /**
             * @description Where the Game is served. An exact `https` origin.
             * @example https://games.stage.vit-rin.com
             */
            origin: string;
            /** @example /memory-match/ */
            path: string;
        };
        Error: {
            error: {
                /**
                 * @description Stable machine-readable identifier, e.g. campaign.budget_exceeded. Clients switch on this. It never changes once shipped. The codes every surface can return are `rate_limited` (429, with `Retry-After`), `rate_limit_unavailable` (503), `idempotency.key_invalid`, `idempotency.key_reused` and `idempotency.body_too_large` (422), and `idempotency.in_progress` (409, with `Retry-After`).
                 *     Codes of attaching a mechanic to a Campaign, all `campaign.*` and `422` on `target_id`: `game_not_active`, `competition_not_found` and `reward_not_found`.
                 *     Codes of a Campaign's landing fields, `campaign.*` and `422`: `cover_image_invalid` (not an `https` URL, or longer than 2048 characters) and `sign_in_invalid` (not `on_load` or `on_action`).
                 *     Codes of publishing a Campaign that carries a `reward` mechanic, `campaign.*` and `422`: `no_budget` (no budget in an active registry asset) and `budget_below_liability` (the budget is less than the tiers' maximum liability). A funding balance short of the liability is `wallet.insufficient_balance` (409). A refused publish moves nothing.
                 *     Codes of entering a Campaign, all `campaign.*`: - 403: `entry_code_invalid`, `entry_not_invited`; - 409: `not_active`, `outside_schedule`, `already_entered`,
                 *       `entry_allowance_reached`, `entries_full`,
                 *       `budget_exhausted`;
                 *     - 422: `entry_code_required`.
                 *     Reward rule codes, all `reward.*`: - 422: `tiers_required`, `tier_rank_invalid`,
                 *       `tier_range_inverted`, `tiers_overlap`,
                 *       `tier_amount_invalid`, `tier_assets_mixed` (a rule pays one
                 *       asset), `tier_asset_invalid` (not an active `value` asset),
                 *       `tier_asset_not_budget_asset` (not the asset of the Campaign's
                 *       budget, or, until it has one, of the Rewards its `reward`
                 *       mechanics name), `rules_assets_mixed` (publishing a Campaign
                 *       whose attached Rewards pay different assets);
                 *     - 404: `not_found`; - 409: `campaign_not_editable`, `already_exists` (a
                 *       Competition has one rule), `concurrent_update`, `busy`.
                 *
                 *     Competition and play-session codes, all `competition.*`: - 422: `kind_not_supported`, `window_invalid`,
                 *       `window_outside_campaign`, `game_not_active`, and the four
                 *       reasons a finalize is judged and refused (each closes the
                 *       session): `session_expired`, `too_fast`, `too_slow`,
                 *       `score_out_of_bounds`;
                 *     - 404: `not_found`, `session_not_found`; - 409: `campaign_not_editable`, `not_open`, `entry_required`
                 *       (opening a session without an Entry in the Campaign),
                 *       `session_already_finalized`, `concurrent_update`, `busy`.
                 *
                 *     The Game registry's codes, all `game.*`: - 422: `slug_required`, `slug_invalid`, `name_required`,
                 *       `name_too_long`, `origin_required`, `origin_invalid`,
                 *       `path_invalid`, `mode_invalid`, `allow_invalid`,
                 *       `bounds_invalid`, `activation_incomplete`,
                 *       `mode_not_supported`;
                 *     - 404: `not_found`; - 409: `slug_taken`, `slug_locked`, `mode_locked`,
                 *       `origin_locked`, `retired`, `illegal_transition`,
                 *       `not_a_draft`, `concurrent_update`, `busy`.
                 *
                 *     The Wallet's codes, all `wallet.*`: - 422: `code_required`, `code_invalid`, `kind_invalid`,
                 *       `scale_invalid`, `display_name_required`,
                 *       `display_name_too_long`, `path_required`, `path_too_long`,
                 *       `activation_incomplete`, `conversion_invalid`,
                 *       `conversion_kind_mismatch`, `conversion_target_invalid`,
                 *       `amount_zero`, `amount_negative`, `amount_out_of_range`,
                 *       `reason_required`, `reason_too_long`, `phone_invalid`,
                 *       `idempotency_key_invalid`, `actor_invalid`,
                 *       `transfer_same_account`, `funding_source_invalid`,
                 *       `funding_destination_invalid`, `business_required`;
                 *     - 404: `asset_not_found`, `account_not_found`,
                 *       `transaction_not_found`;
                 *     - 409: `code_taken`, `code_locked`, `scale_locked`,
                 *       `concurrent_update`, `busy`, `illegal_transition`,
                 *       `asset_not_active`, `asset_retired`, `asset_referenced`,
                 *       `insufficient_balance`, `asset_has_reserved_liability` (retiring an
                 *       asset a Campaign's reserve still holds), `idempotency_conflict`,
                 *       `transfer_across_businesses`, `phone_is_member`.
                 *
                 *     The Admin API's operations slice (M5, adr/0025, adr/0026), all `422` unless said otherwise: - Members and clients: `business.member_not_found` (404),
                 *       `business.client_not_found` (404), `business.client_revoked` (409, a
                 *       secret rotated or origins edited on a revoked client),
                 *       `business.client_not_public` (409, origins edited on a confidential
                 *       client), `business.client_origin_invalid` (an origin that is not an exact `https`
                 *       origin, with its position in `fields` as `allowed_origins[n]`; `http://localhost`
                 *       is admitted in development only);
                 *     - Campaigns, as an operator: `campaign.reason_required` and `campaign.reason_too_long` (on
                 *       `reason`; 1 to 500 characters),
                 *       `campaign.paused_by_operator` (409, a Business member resuming a Campaign
                 *       an operator paused), and the existing `campaign.not_found`,
                 *       `campaign.not_paused` and `campaign.already_over`;
                 *     - Reviewing a held Reward: `reward.grant_not_found` (404),
                 *       `reward.grant_not_held` (409, already released or voided),
                 *       `reward.grant_asset_retired` (409, the asset was retired, so no review can
                 *       move it), `reward.review_reason_required` and `reward.review_reason_too_long` (on `reason`; 1 to 500
                 *       characters), `reward.grant_filter_invalid` (a `status` or `reason` the list does not
                 *       know), `reward.review_busy`
                 *       (409, aborted by a concurrent settlement: safe to repeat);
                 *     - The outbox: `ops.delivery_not_found` (404), `ops.delivery_not_dead` (409, only
                 *       a dead delivery is replayed), `ops.delivery_filter_invalid` (422, a `status` the
                 *       list does not know).
                 *
                 *     A customer token that names no Customer is refused with `auth.customer_unresolved` (401).
                 *     The Authentication API's 403 codes: `auth.member_of_business` (a person asking for a customer token of a Business they are a member of), `auth.person_session_required` (a session that is not a person session of the platform client asking for one), and `auth.origin_not_allowed` (a request whose `Origin` is not allowed for the public client it names, or, on the public surface, for its token's client), and `auth.client_revoked` (a client an operator has revoked: it starts no OTP, verifies no code and exchanges or renews no token).
                 * @example campaign.not_found
                 */
                code: string;
                /** @description Human-readable, may be localised. */
                message: string;
                fields?: components["schemas"]["FieldError"][];
                request_id?: string;
            };
        };
        LeaderboardRow: {
            /** @description Score descending, then the earlier finalize first. */
            rank: number;
            /**
             * @description `Player_` and ten characters of Crockford base 32 (fifty bits), computed from the Customer's id in this Business. The same Customer has the same handle on every read; the same person in another Business has an unrelated one. It is not unique and not chosen, though two Customers sharing one is rare even on a Leaderboard of millions.
             * @example Player_K3M9QX7T2V
             */
            handle: string;
            /** Format: int64 */
            score: number;
        };
        FieldError: {
            field: string;
            code: string;
            message: string;
        };
    };
    responses: {
        /** @description Authentication is required. */
        Unauthorized: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description Authenticated, but not permitted: the token is not a customer token with `games:play`, or its `Origin` is not allowed for its client (`auth.origin_not_allowed`). */
        Forbidden: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description No such resource, or it is not the token's own. */
        NotFound: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description The request conflicts with the resource's current state. */
        Conflict: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description Rate limited (`rate_limited`). Retry after the interval in `Retry-After`. */
        TooManyRequests: {
            headers: {
                "Retry-After": components["headers"]["RetryAfter"];
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
    };
    parameters: {
        GameId: string;
        CompetitionId: string;
        SessionId: string;
        /** @description Makes a retried mutation safe. A request repeating a key it already completed receives the original response, marked `Idempotent-Replayed: true`. The same key with a different method, path, query or body is refused with `idempotency.key_reused` (422), and a repeat while the first request is still running with `idempotency.in_progress` (409). Only `2xx` responses are kept, for 24 hours. 1 to 255 characters from `A-Z a-z 0-9 . _ : -`; a UUID is a good choice. */
        IdempotencyKey: string;
    };
    requestBodies: never;
    headers: {
        /** @description Whole seconds to wait before retrying. */
        RetryAfter: number;
    };
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    readGame: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                gameId: components["parameters"]["GameId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The Game. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CatalogueGame"];
                };
            };
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            429: components["responses"]["TooManyRequests"];
        };
    };
    openSession: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                competitionId: components["parameters"]["CompetitionId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The session is open. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PlaySession"];
                };
            };
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
            429: components["responses"]["TooManyRequests"];
        };
    };
    finalizeSession: {
        parameters: {
            query?: never;
            header?: {
                /** @description Makes a retried mutation safe. A request repeating a key it already completed receives the original response, marked `Idempotent-Replayed: true`. The same key with a different method, path, query or body is refused with `idempotency.key_reused` (422), and a repeat while the first request is still running with `idempotency.in_progress` (409). Only `2xx` responses are kept, for 24 hours. 1 to 255 characters from `A-Z a-z 0-9 . _ : -`; a UUID is a good choice. */
                "Idempotency-Key"?: components["parameters"]["IdempotencyKey"];
            };
            path: {
                sessionId: components["parameters"]["SessionId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["FinalizeRequest"];
            };
        };
        responses: {
            /** @description The result was accepted. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SessionResult"];
                };
            };
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
            /** @description The result was refused and the session is closed (`competition.session_expired`, `competition.too_fast`, `competition.too_slow`, `competition.score_out_of_bounds`), or the request was malformed. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            429: components["responses"]["TooManyRequests"];
        };
    };
    getLeaderboard: {
        parameters: {
            query?: {
                /** @description How many rows from the top. */
                limit?: number;
            };
            header?: never;
            path: {
                competitionId: components["parameters"]["CompetitionId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The Leaderboard. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Leaderboard"];
                };
            };
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            429: components["responses"]["TooManyRequests"];
        };
    };
}
