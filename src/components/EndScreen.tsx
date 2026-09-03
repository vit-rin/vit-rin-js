import React from "react";
import { useRecoilState, useSetRecoilState } from "recoil";
import { gameCurrentState } from "../states/gameCurrentState";
import ReplayIcon from "./ReplayIcon";
import ExitIcon from "./ExitIcon";
import { scoreState } from "../states/scoreState";
import { Controls } from "../Controls";
import WinIcon from "./WinIcon";
import { competitionResultState } from "../states/competitionResultState";
import { gameDataState } from "../states/gameDataState";
import VTonIcon from "./VTonIcon";
import XPIcon from "./XPIcon";
import LoadingSpinner from "./LoadingSpinner";
import { Competition } from "../Competition";
import { competitionDataState } from "../states/competitionDataState";
import { Check } from "../Check";
import { adsShowingState } from "../states/adsShowingState";
import { adsCurrentPlaceState } from "../states/adsCurrentPlaceState";
import { useTranslation } from "../i18n/t";
import {
    GameState,
    CompetitionResult,
    CompetitionType,
    AdsPlace,
} from "../constants";

export default function EndScreen() {
    const controls = Controls.getInstance();
    const competition = Competition.getInstance();
    const { t } = useTranslation();

    const [gameCurrent] = useRecoilState(gameCurrentState);
    const [gameData] = useRecoilState<any>(gameDataState);
    const [competitionResult] = useRecoilState<any>(competitionResultState);
    const [score] = useRecoilState(scoreState);
    const [competitionData] = useRecoilState<any>(competitionDataState);
    const setAdsShowing = useSetRecoilState(adsShowingState);
    const setAdsCurrentPlace = useSetRecoilState(adsCurrentPlaceState);
    const check = Check.getInstance();

    const replay = () => {
        setAdsCurrentPlace(AdsPlace.BeforeReplayGame);
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

    const rematch = () => {
        window.location.href = `https://games.vit-rin.com/games/${gameData.slug}/pvp`;
    };

    const exit = () => {
        window.location.href = `https://games.vit-rin.com/games/${gameData.slug}`;
    };

    return (
        <>
            {gameCurrent === GameState.Ended && competitionResult && (
                <div className="tw-flex tw-justify-center tw-items-center tw-fixed tw-h-screen tw-w-full tw-top-0 tw-inset-x-0 tw-bottom-0 tw-bg-scrim/60 tw-z-overlay">
                    <div className="tw-container">
                        <div className="tw-bg-surface tw-rounded-[2rem] tw-pt-16 tw-pb-4 tw-px-4">
                            {competitionResult.result ===
                                CompetitionResult.Win && (
                                <div className="tw-mb-4">
                                    <WinIcon className="tw-mx-auto" />
                                </div>
                            )}

                            {competitionResult.result !==
                            CompetitionResult.Unknown ? (
                                <>
                                    <div
                                        className={`tw-text-5xl tw-text-center tw-font-capsule tw-mb-4 ${
                                            competitionResult.result ===
                                            CompetitionResult.Win
                                                ? "tw-text-gold"
                                                : "tw-text-muted"
                                        }`}
                                    >
                                        {t(
                                            `result-${competitionResult.result}`
                                        )}
                                    </div>

                                    <div
                                        className="tw-text-2xl tw-text-foreground tw-text-center tw-font-capsule tw-mb-8"
                                        dir="ltr"
                                    >
                                        <span
                                            className={`${
                                                competitionResult.result ===
                                                CompetitionResult.Win
                                                    ? "tw-text-gold"
                                                    : "tw-text-muted"
                                            }`}
                                        ></span>
                                        <span
                                            className={`${
                                                competitionResult.result ===
                                                CompetitionResult.Win
                                                    ? "tw-text-gold"
                                                    : "tw-text-muted"
                                            }`}
                                        >
                                            {score}
                                            <span className="tw-mx-2">
                                                {competitionResult.result ===
                                                CompetitionResult.Win
                                                    ? ">"
                                                    : competitionResult.result ===
                                                      CompetitionResult.Tie
                                                    ? "="
                                                    : "<"}
                                            </span>
                                        </span>
                                        {competition.getType() ==
                                            CompetitionType.Solo &&
                                            gameData.metadata
                                                .min_score_to_reward}
                                        {competition.getType() ==
                                            CompetitionType.Pvp &&
                                            competitionData.target_score}
                                    </div>

                                    {competitionResult.transaction && (
                                        <div className="tw-bg-surface-sunken tw-text-surface-sunken-foreground tw-rounded-2xl tw-p-4 tw-mb-4 tw-flex tw-justify-start tw-items-center tw-font-capsule tw-w-full">
                                            {competitionResult.transaction.data
                                                .wallet.data.slug ===
                                                "v-ton" && <VTonIcon />}

                                            <span className="tw-ms-4 tw-text-2xl">
                                                +
                                                {
                                                    competitionResult
                                                        .transaction.data.amount
                                                }
                                            </span>
                                        </div>
                                    )}

                                    {competitionResult.rewards && (
                                        <div className="tw-bg-surface-sunken tw-text-surface-sunken-foreground tw-rounded-2xl tw-p-4 tw-mb-4 tw-flex tw-justify-start tw-items-center tw-font-capsule tw-w-full">
                                            <XPIcon />

                                            <span className="tw-ms-4 tw-text-2xl">
                                                +{competitionResult.rewards.xp}
                                            </span>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="tw-flex tw-justify-center tw-mb-8">
                                    <LoadingSpinner />
                                </div>
                            )}

                            {competition.getType() ==
                                CompetitionType.Solo && (
                                <button
                                    className="tw-bg-primary tw-font-capsule tw-font-bold tw-text-on-dark tw-text-lg tw-p-4.25 tw-w-full tw-h-14 tw-rounded-xl tw-flex tw-justify-center tw-items-center tw-mb-4"
                                    onClick={replay}
                                >
                                    <ReplayIcon />
                                    <span className="tw-ms-2">{t("replay")}</span>
                                </button>
                            )}

                            {competition.getType() ==
                                CompetitionType.Pvp && (
                                <button
                                    className="tw-bg-primary tw-font-capsule tw-font-bold tw-text-on-dark tw-text-lg tw-p-4.25 tw-w-full tw-h-14 tw-rounded-xl tw-flex tw-justify-center tw-items-center tw-mb-4"
                                    onClick={rematch}
                                >
                                    <ReplayIcon />
                                    <span className="tw-ms-2">{t("rematch")}</span>
                                </button>
                            )}

                            <button
                                className="tw-border-2 tw-border-foreground tw-font-capsule tw-font-bold tw-text-foreground tw-text-lg tw-p-4.25 tw-w-full tw-h-14 tw-rounded-xl tw-flex tw-justify-center tw-items-center"
                                onClick={exit}
                            >
                                <ExitIcon />
                                <span className="tw-ms-2">{t("exit")}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
