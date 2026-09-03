import { atom } from "recoil";
import { CompetitionResult } from "../constants";

export const competitionResultState: any = atom({
    key: "competitionResultState",
    default: {
        result: CompetitionResult.Unknown,
    },
});
