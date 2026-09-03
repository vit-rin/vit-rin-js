export declare const CompetitionResult: {
    readonly Win: "win";
    readonly Loss: "loss";
    readonly Tie: "tie";
    readonly Unknown: "unknown";
};
export type CompetitionResultValue = (typeof CompetitionResult)[keyof typeof CompetitionResult];
