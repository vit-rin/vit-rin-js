import React from "react";
import { useRecoilState, useSetRecoilState } from "recoil";
import { gameCurrentState } from "../states/gameCurrentState";
import PlayIcon from "./PlayIcon";
import ReplayIcon from "./ReplayIcon";
import { OptionsType } from "../types/options";
import { Options } from "../Options";
import ExitIcon from "./ExitIcon";
import { gameDataState } from "../states/gameDataState";
import { scoreState } from "../states/scoreState";
import { Controls } from "../Controls";
import { Check } from "../Check";
import { adsShowingState } from "../states/adsShowingState";
import { useTranslation } from "../i18n/t";
import { GameState } from "../constants";

export default function PauseScreen() {
    const options: OptionsType = Options.getInstance().get();

    const controls = Controls.getInstance();

    const { t } = useTranslation();

    const check = Check.getInstance();

    const [gameCurrent] = useRecoilState(gameCurrentState);
    const [gameData] = useRecoilState<any>(gameDataState);
    const [score] = useRecoilState(scoreState);
    const setAdsShowing = useSetRecoilState(adsShowingState);

    const resume = () => {
        controls.resume();
    };

    const replay = () => {
        setAdsShowing(true);
        replayAfterAdsWatched();
    };

    const replayAfterAdsWatched = () => {
        let interval = setInterval(async () => {
            if (await check.isViewedAds()) {
                setAdsShowing(false);
                controls.replay();
                clearInterval(interval);
            }
        }, 1000);

        return interval;
    };

    const exit = () => {
        window.location.href = `https://games.vit-rin.com/games/${gameData.slug}`;
    };

    return (
        <>
            {gameCurrent === GameState.Paused && (
                <div className="tw-flex tw-justify-center tw-items-center tw-fixed tw-h-screen tw-w-full tw-top-0 tw-inset-x-0 tw-bottom-0 tw-bg-scrim/80 tw-z-overlay">
                    <div className="tw-container">
                        <div className="tw-text-5xl tw-text-on-dark tw-text-center tw-font-capsule tw-mb-8">
                            {gameData.name}
                        </div>

                        <div className="tw-text-2xl tw-text-on-dark tw-font-capsule tw-text-center tw-mb-8">
                            {score}
                        </div>

                        <button
                            className="tw-bg-primary tw-font-capsule tw-font-bold tw-text-on-dark tw-text-lg tw-p-4.25 tw-w-full tw-h-14 tw-rounded-xl tw-flex tw-justify-center tw-items-center tw-mb-4"
                            onClick={resume}
                        >
                            <PlayIcon />
                            <span className="tw-ms-2">{t("continue")}</span>
                        </button>

                        <button
                            className="tw-border-2 tw-border-on-dark tw-font-capsule tw-font-bold tw-text-on-dark tw-text-lg tw-p-4.25 tw-w-full tw-h-14 tw-rounded-xl tw-flex tw-justify-center tw-items-center tw-mb-4"
                            onClick={replay}
                        >
                            <ReplayIcon />
                            <span className="tw-ms-2">{t("replay")}</span>
                        </button>

                        <button
                            className="tw-border-2 tw-border-on-dark tw-font-capsule tw-font-bold tw-text-on-dark tw-text-lg tw-p-4.25 tw-w-full tw-h-14 tw-rounded-xl tw-flex tw-justify-center tw-items-center"
                            onClick={exit}
                        >
                            <ExitIcon />
                            <span className="tw-ms-2">{t("exit")}</span>
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
