// The types the SDK exports, named as they always were and taken from the generated schemas of the
// specifications the API serves (scripts/generate-types.mjs). Nothing here describes a wire shape by hand:
// a name is an alias of a schema, so the API changing a field changes the type, and CI fails if the
// generated files differ from what the API serves.
import type { components as PublicComponents } from './generated/public';
import type { components as AuthComponents } from './generated/auth';

export type PlaySession = PublicComponents['schemas']['PlaySession'];
export type FinalizeRequest = PublicComponents['schemas']['FinalizeRequest'];
export type SessionOutcome = PublicComponents['schemas']['SessionOutcome'];
export type SessionResult = PublicComponents['schemas']['SessionResult'];
export type Leaderboard = PublicComponents['schemas']['Leaderboard'];
export type LeaderboardRow = PublicComponents['schemas']['LeaderboardRow'];

export type StartOtpRequest = AuthComponents['schemas']['StartOtpRequest'];
export type OtpChallenge = AuthComponents['schemas']['OtpChallenge'];
export type VerifyOtpRequest = AuthComponents['schemas']['VerifyOtpRequest'];
export type TokenPair = AuthComponents['schemas']['TokenPair'];
export type GrantType = AuthComponents['schemas']['GrantType'];
/** `POST /oauth/token` with the `refresh_token` grant: the form's two required fields. */
export type RefreshTokenRequest = AuthComponents['schemas']['TokenRequest'] & {
  grant_type: 'refresh_token';
  refresh_token: string;
};
