// Generated from the specification the API serves at /openapi/auth.json, by scripts/generate-types.mjs, with openapi-typescript.
// Never edited by hand: `npm run types:generate` rewrites it, and CI fails if it differs from what the API serves.
export interface paths {
    "/api/v1/auth/otp": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Request a one-time code
         * @description Sends a code to the phone through `core/identity`'s `Sender` port.
         *     `client_id` decides who is signing in: a `pk_live_*` client signs in
         *     a Customer of that client's Business. The platform client signs in the
         *     phone's role: a Business member, a super-admin, or, for any other phone,
         *     a `person` — a visitor of the consumer site who is a Customer of no
         *     Business until they act inside one (`customer_context` on
         *     `/oauth/token`). Business-member and super-admin roles are provisioned
         *     by an admin and never self-register.
         *
         *     A request naming a public client of a Business with an `Origin` that is
         *     not on that client's allowlist is refused with `auth.origin_not_allowed`
         *     (403), and no code is sent
         *     ([adr/0016](../../docs/adr/0016-public-surface-cross-origin.md)). So is a
         *     request naming the platform client with any `Origin`: the platform client
         *     signs in through the frontend's server, which sends none, and no browser
         *     origin may use it. A request with no `Origin` is never refused for lacking
         *     one.
         */
        post: operations["startOtp"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/otp/verify": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Verify a one-time code and issue tokens
         * @description The session depends on the client the challenge was started for. A
         *     public client of a Business issues a Customer token of that Business
         *     (`roles: ["customer"]`). The platform client issues the roles the phone
         *     holds, always with `person` beside them: `["person"]` for a phone that
         *     holds nothing else (no `bid`), `["business", "person"]` for a Business
         *     member, `["super-admin", "person"]` for an operator
         *     ([adr/0011](../../docs/adr/0011-consumer-sign-in.md)).
         *
         *     As for `startOtp`, a request whose `Origin` is not on the allowlist of
         *     the public client the challenge names is refused with
         *     `auth.origin_not_allowed` (403)
         *     ([adr/0016](../../docs/adr/0016-public-surface-cross-origin.md)).
         */
        post: operations["verifyOtp"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/oauth/token": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Exchange a refresh token, switch Business or operator mode, get a customer token, or authenticate a confidential client
         * @description Five grants share this endpoint, distinguished by `grant_type`:
         *
         *     - `refresh_token` — `refresh_token` is required. The token is
         *       consumed: a new one is returned and the one presented stops
         *       working. Presenting a token a second time revokes every token
         *       issued from the same login (`auth.refresh_reused`), because a
         *       spent token being replayed means it was copied.
         *     - `switch_business` — `refresh_token` and `business_id` are required
         *       ([adr/0009](../../docs/adr/0009-active-business-by-token-reissue.md)).
         *       Issues a new access and refresh pair whose `bid` is `business_id`,
         *       and revokes the session the presented token belonged to. A
         *       Business-member session or an operator's session of the platform
         *       client can switch, and only into a Business the person is a member of
         *       (`auth.not_a_member`, 403). An operator who switches receives a token
         *       with the `business` role alone: the operator role stays behind, so the
         *       session acts for that Business like any member's. A refused switch
         *       changes nothing: the presented token keeps working. Presenting a
         *       token that is not the session's current one is reuse, as for
         *       `refresh_token`.
         *     - `switch_operator` — `refresh_token` is required. Returns an operator
         *       to operator mode: a new pair whose role is `super-admin` alone, acting
         *       for no Business, and the presented session is revoked. Only a session
         *       that began as an operator's can switch (`auth.cannot_switch_operator`,
         *       403), and its person must still be a super-admin
         *       (`auth.not_an_operator`, 403): both are asked on every switch. A
         *       refused switch changes nothing.
         *     - `customer_context` — `refresh_token` and `business_id` are required
         *       ([adr/0011](../../docs/adr/0011-consumer-sign-in.md)). Exchanges a
         *       **person session** of the platform client for a token that acts as
         *       the person's Customer of that Business: `roles: ["customer"]`, `sub`
         *       the pseudonym that Business holds for the person's phone (the same
         *       one the Business's own public-client sign-in gives the same phone),
         *       `bid` the Business, the customer scopes, 15 minutes. The response
         *       carries an **access token only**: no `refresh_token` is issued, no
         *       session is created, and the presented refresh token is **not spent**
         *       and stays valid. Renewing a customer token is another exchange, so
         *       logging the person session out ends every customer token's renewal at
         *       once. The Customer is created at the first exchange for a Business.
         *
         *       Refused, and creating no Customer: a refresh token that is invalid,
         *       expired or revoked (401); a token that is not the session's current
         *       one, which is reuse as for `refresh_token`, revokes the session
         *       (`auth.refresh_reused`, 401); a session that is not a person session
         *       of the platform client (`auth.person_session_required`, 403); a
         *       `business_id` that names no Business (`business.not_found`, 404); a
         *       person who is a member of that Business
         *       (`auth.member_of_business`, 403): someone who administers a
         *       Business's Campaigns must not enter them as a Customer, and remains
         *       free to be a Customer of every other Business.
         *     - `client_credentials` — `client_id` and `client_secret` are
         *       required, and the client must be confidential (`cid_live_*`).
         *       Issues a token with no `sub` and no `bid` beyond what the client
         *       itself carries, for the client acting as itself.
         */
        post: operations["issueToken"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/logout": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Revoke a refresh family
         * @description Idempotent. Logging out twice, or with an already-revoked token, still answers 204.
         */
        post: operations["logout"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/.well-known/jwks.json": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Publish the public keys access tokens are signed with
         * @description Includes the current signing key and, during a rotation window, the
         *     previous one, so a token signed just before a rotation still
         *     verifies. Standard JWK Set (RFC 7517).
         */
        get: operations["getJwks"];
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
        StartOtpRequest: {
            /**
             * @description A public client id, e.g. `pk_live_...`.
             * @example pk_live_9f2c1a
             */
            client_id: string;
            /**
             * @description E.164.
             * @example +989121234567
             */
            phone: string;
        };
        OtpChallenge: {
            /** Format: uuid */
            challenge_id: string;
            /** @description Seconds until the code expires. */
            expires_in: number;
        };
        VerifyOtpRequest: {
            /** Format: uuid */
            challenge_id: string;
            /** @example 482913 */
            code: string;
        };
        /** @enum {string} */
        GrantType: "refresh_token" | "client_credentials" | "switch_business" | "switch_operator" | "customer_context";
        /**
         * @description Which further fields are required depends on `grant_type`; see the
         *     operation description. Validated in the application layer per
         *     ARCHITECTURE.md §7, since this shape is reachable from more than a
         *     single fixed combination of fields.
         */
        TokenRequest: {
            grant_type: components["schemas"]["GrantType"];
            refresh_token?: string;
            /**
             * Format: uuid
             * @description The Business to act for. Only meaningful for `switch_business` and `customer_context`.
             */
            business_id?: string;
            client_id?: string;
            client_secret?: string;
            /** @description Space-separated. Only meaningful for `client_credentials`. */
            scope?: string;
        };
        TokenPair: {
            access_token: string;
            /** @description Absent from a `client_credentials` and a `customer_context` response: neither starts a session, so there is nothing to refresh. */
            refresh_token?: string;
            /** @enum {string} */
            token_type: "Bearer";
            /** @description Seconds until `access_token` expires. */
            expires_in: number;
        };
        /**
         * @description - `super-admin` — a VIT-RIN operator.
         *     - `business` — a member of a Business, acting for the one in `bid`.
         *     - `customer` — a Customer of the Business in `bid`; `sub` is that
         *       Business's pseudonym for them.
         *     - `person` — a signed-in visitor of the consumer site. `sub` is the
         *       person id, there is no `bid`, and the scopes are the narrow set a
         *       visitor needs to browse and manage their own profile
         *       (`profile:read`, `profile:write`, `campaigns:read`). A person token is
         *       accepted only by the consumer surface's person-level routes and by the
         *       token endpoint; it is never sent to a game or to a Business's surfaces.
         * @enum {string}
         */
        Role: "super-admin" | "business" | "customer" | "person";
        /** @description The claims of an `access_token` (JWT, RS256, 15 minutes), documented here because clients read them. `roles` is a list; see [adr/0007](../../docs/adr/0007-token-model.md) for the rest. */
        AccessTokenClaims: {
            iss: string;
            /** @description The client id the token was issued to. */
            aud: string;
            /** @description For `customer`, the per-Business pseudonym. For `business`, `super-admin` and `person`, the person id. */
            sub: string;
            exp: number;
            iat: number;
            jti: string;
            /** @description One or more roles. Sign-in on the platform client yields the role the phone holds plus `person`: `["person"]`, `["business", "person"]` or `["super-admin", "person"]`. A `customer` token carries `["customer"]` alone. */
            roles: components["schemas"]["Role"][];
            /** @description Space-separated scopes. */
            scope: string;
            /**
             * Format: uuid
             * @description The Business the token acts for. Absent for `super-admin` and `person`.
             */
            bid?: string;
            /** @description The client id (`cid_live_*` or `pk_live_*`) that requested the token. */
            cid: string;
        };
        JsonWebKey: {
            /** @enum {string} */
            kty: "RSA";
            kid: string;
            /** @enum {string} */
            use: "sig";
            /** @enum {string} */
            alg: "RS256";
            n: string;
            e: string;
        };
        JsonWebKeySet: {
            keys: components["schemas"]["JsonWebKey"][];
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
        FieldError: {
            field: string;
            code: string;
            message: string;
        };
    };
    responses: {
        /** @description The request was malformed or failed validation. */
        BadRequest: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description No such resource. */
        NotFound: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description Authenticated, but not permitted. */
        Forbidden: {
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
    startOtp: {
        parameters: {
            query?: never;
            header?: {
                /** @description Makes a retried mutation safe. A request repeating a key it already completed receives the original response, marked `Idempotent-Replayed: true`. The same key with a different method, path, query or body is refused with `idempotency.key_reused` (422), and a repeat while the first request is still running with `idempotency.in_progress` (409). Only `2xx` responses are kept, for 24 hours. 1 to 255 characters from `A-Z a-z 0-9 . _ : -`; a UUID is a good choice. */
                "Idempotency-Key"?: components["parameters"]["IdempotencyKey"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["StartOtpRequest"];
            };
        };
        responses: {
            /** @description A code was sent. The response never reveals whether the phone was already known. */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OtpChallenge"];
                };
            };
            400: components["responses"]["BadRequest"];
            /** @description The request's `Origin` is not on the allowlist of the public client it names (`auth.origin_not_allowed`). Nothing was sent. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            404: components["responses"]["NotFound"];
            /** @description The phone is not a number the provider can deliver to (`auth.phone_invalid`). */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            429: components["responses"]["TooManyRequests"];
            /** @description The code could not be sent (`auth.otp_delivery_failed`), or the limiter that protects sending is unavailable (`rate_limit_unavailable`). Nothing was sent in the second case. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    verifyOtp: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["VerifyOtpRequest"];
            };
        };
        responses: {
            /** @description The code was correct. A session was issued. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TokenPair"];
                };
            };
            400: components["responses"]["BadRequest"];
            /** @description The code is wrong, expired, or attempts on this challenge are exhausted. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description The request's `Origin` is not on the allowlist of the public client the challenge names (`auth.origin_not_allowed`), or that client cannot start a customer session (`auth.client_not_public`). */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            404: components["responses"]["NotFound"];
            429: components["responses"]["TooManyRequests"];
        };
    };
    issueToken: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/x-www-form-urlencoded": components["schemas"]["TokenRequest"];
            };
        };
        responses: {
            /** @description A new token pair (`refresh_token`, `switch_business` and `switch_operator` grants) or a new access token with no `refresh_token` (`client_credentials` and `customer_context`). */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TokenPair"];
                };
            };
            400: components["responses"]["BadRequest"];
            /** @description The refresh token is invalid, expired, or was already spent — see `error.code`. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Authenticated, but not permitted: `auth.member_of_business` and `auth.person_session_required` (`customer_context`), `auth.not_a_member`, `auth.cannot_switch_business`, `auth.cannot_switch_operator` and `auth.not_an_operator` (the switch grants), or `auth.origin_not_allowed`: the request names a public client of a Business and its `Origin` is not on that client's allowlist, or names the platform client with any `Origin`. A request names its client directly (`client_id`) or through the session whose `refresh_token` it presents ([adr/0016](../../docs/adr/0016-public-surface-cross-origin.md)). */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            404: components["responses"]["NotFound"];
            429: components["responses"]["TooManyRequests"];
        };
    };
    logout: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    refresh_token: string;
                };
            };
        };
        responses: {
            /** @description The family is revoked, or was already revoked. */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            400: components["responses"]["BadRequest"];
        };
    };
    getJwks: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The current key set. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["JsonWebKeySet"];
                };
            };
        };
    };
}
