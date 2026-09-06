import React from "react";
import { useRecoilState } from "recoil";
import { gamePlayingState } from "../states/gamePlayingState";
import { gameCurrentState } from "../states/gameCurrentState";
import { gamePausedState } from "../states/gamePausedState";
import { gameDataState } from "../states/gameDataState";
import { Controls } from "../Controls";
import { Competition } from "../Competition";
import { useTranslation } from "../i18n/t";
import { GameState, CompetitionType } from "../constants";

export default function StartScreen() {
    const controls = Controls.getInstance();
    const competition = Competition.getInstance();
    const { t } = useTranslation();

    const [gamePlaying] = useRecoilState(gamePlayingState);
    const [gamePaused] = useRecoilState(gamePausedState);
    const [gameCurrent] = useRecoilState(gameCurrentState);
    const [gameData] = useRecoilState<any>(gameDataState);

    const start = () => {
        controls.start();
    };

    return (
        <>
            {gameCurrent === GameState.Initialized &&
                !gamePlaying &&
                !gamePaused &&
                gameData && (
                    <div className="tw-flex tw-justify-center tw-items-center tw-fixed tw-h-dvh tw-w-full tw-top-0 tw-inset-x-0 tw-bottom-0 tw-bg-scrim/80 tw-z-overlay">
                        <div className="tw-container tw-text-center">
                            <div className="tw-text-5xl tw-text-foreground tw-font-capsule tw-mb-8">
                                {gameData.name}
                            </div>

                            <div className="tw-text-2xl tw-text-foreground tw-font-capsule tw-mb-8">
                                <span className="tw-text-gold">
                                    {t("winner")}
                                </span>

                                {/* The ">" is a bidi-mirrored neutral: isolated
                                    as LTR so it keeps its shape and its place
                                    between the label and the target in RTL. */}
                                <bdi
                                    dir="ltr"
                                    className="tw-text-gold tw-mx-2"
                                >
                                    &gt;
                                </bdi>

                                {competition.getType() ==
                                    CompetitionType.Solo && (
                                    <bdi dir="ltr">
                                        {gameData.metadata.min_score_to_reward}
                                    </bdi>
                                )}
                                {competition.getType() ==
                                    CompetitionType.Pvp && t("max-score")}
                            </div>

                            <button
                                type="button"
                                className="tw-bg-primary tw-font-capsule tw-font-bold tw-text-on-dark tw-text-lg tw-px-4 tw-w-full tw-h-14 tw-rounded-xl"
                                onClick={start}
                            >
                                {t("start")}
                            </button>
                        </div>
                    </div>
                )}
        </>
    );
}
