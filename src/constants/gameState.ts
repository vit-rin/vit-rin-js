export const GameState = {
    Initialized: "initialized",
    Playing: "playing",
    Paused: "paused",
    Ended: "ended",
} as const;

export type GameStateValue = (typeof GameState)[keyof typeof GameState];
