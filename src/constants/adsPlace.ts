export const AdsPlace = {
    BeforeStartGame: "before-start-game",
    BeforeReplayGame: "before-replay-game",
} as const;

export type AdsPlaceValue = (typeof AdsPlace)[keyof typeof AdsPlace];
