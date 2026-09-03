import React from "react";
import { useRecoilState } from "recoil";
import { gamePlayingState } from "../states/gamePlayingState";
import { gameCurrentState } from "../states/gameCurrentState";
import { gamePausedState } from "../states/gamePausedState";
import { gameDataState } from "../states/gameDataState";
import { Controls } from "../Controls";
import { Competition } from "../Competition";

export default function StartScreen() {
    const controls = Controls.getInstance();
    const competition = Competition.getInstance();

    const [gamePlaying] = useRecoilState(gamePlayingState);
    const [gamePaused] = useRecoilState(gamePausedState);
    const [gameCurrent] = useRecoilState(gameCurrentState);
    const [gameData] = useRecoilState<any>(gameDataState);

    const start = () => {
        controls.start();
    };

    return (
        <>
            {gameCurrent === "initialized" &&
                !gamePlaying &&
                !gamePaused &&
                gameData && (
                    <div className="tw-flex tw-justify-center tw-items-center tw-fixed tw-h-screen tw-w-full tw-top-0 tw-left-0 tw-right-0 tw-bottom-0 tw-bg-scrim/80 tw-z-overlay">
                        <div className="tw-container tw-text-center">
                            <div className="tw-text-5xl tw-text-on-dark tw-font-capsule tw-mb-8">
                                {gameData.name}
                            </div>

                            <div className="tw-text-2xl tw-text-on-dark tw-font-capsule tw-mb-8">
                                <span className="tw-text-gold">
                                    Winner {">"}
                                </span>{" "}
                                {competition.getType() == "solo" &&
                                    gameData.metadata.min_score_to_reward}
                                {competition.getType() == "pvp" && "Max Score"}
                            </div>

                            <button
                                className="tw-bg-primary tw-font-capsule tw-font-bold tw-text-on-dark tw-text-lg tw-p-4.25 tw-w-full tw-h-14 tw-rounded-xl"
                                onClick={start}
                            >
                                Start
                            </button>
                        </div>
                    </div>
                )}
        </>
    );
}
