export const CompetitionResult = {
    Win: "win",
    Loss: "loss",
    Tie: "tie",
    Unknown: "unknown",
} as const;

export type CompetitionResultValue =
    (typeof CompetitionResult)[keyof typeof CompetitionResult];
