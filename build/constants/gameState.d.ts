export declare const GameState: {
    readonly Initialized: "initialized";
    readonly Playing: "playing";
    readonly Paused: "paused";
    readonly Ended: "ended";
};
export type GameStateValue = (typeof GameState)[keyof typeof GameState];
