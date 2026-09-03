export const CompetitionType = {
    Solo: "solo",
    Pvp: "pvp",
} as const;

export type CompetitionTypeValue =
    (typeof CompetitionType)[keyof typeof CompetitionType];
