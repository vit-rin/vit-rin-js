import React, { useEffect, useState } from "react";
import { useRecoilState } from "recoil";
import { scoreState } from "../states/scoreState";
import { gameDataState } from "../states/gameDataState";
import { Competition } from "../Competition";
import { gameEndedState } from "../states/gameEndedState";
import { competitionDataState } from "../states/competitionDataState";
import { CompetitionType } from "../constants";

export default function ScoreNumber() {
    const competition = Competition.getInstance();

    const [score] = useRecoilState(scoreState);
    const [gameData] = useRecoilState<any>(gameDataState);
    const [gameEnded] = useRecoilState<any>(gameEndedState);
    const [competitionData] = useRecoilState<any>(competitionDataState);
    const [scoreNumberColor, setScoreNumberColor] = useState("");

    useEffect(() => {
        if (competitionData) {
            if (score > competitionData.target_score) {
                setScoreNumberColor("tw-text-gold");
            }
        }
    }, [score]);

    return (
        <div
            className="tw-font-bold tw-font-capsule tw-text-foreground tw-text-xl"
            dir="ltr"
        >
            {gameData && (
                <>
                    <span className={scoreNumberColor}>
                        {score}{" "}
                        {competition.getType() == CompetitionType.Solo &&
                            ">"}
                        {competition.getType() == CompetitionType.Pvp &&
                            score == 0 &&
                            "-"}
                        {competition.getType() == CompetitionType.Pvp &&
                            score > 0 &&
                            ">"}
                    </span>{" "}
                    {competition.getType() == CompetitionType.Solo &&
                        gameData.metadata.min_score_to_reward}
                    {competition.getType() == CompetitionType.Pvp &&
                        !gameEnded &&
                        "..."}
                    {competition.getType() == CompetitionType.Pvp &&
                        gameEnded &&
                        competitionData.target_score}
                </>
            )}
        </div>
    );
}
