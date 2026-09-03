import React from "react";
import { useRecoilState } from "recoil";
import { gamePlayingState } from "../states/gamePlayingState";
import PauseIcon from "./PauseIcon";
import PlayIcon from "./PlayIcon";
import { Controls } from "../Controls";

export default function PauseButton() {
    const controls = Controls.getInstance();

    const [gamePlaying] = useRecoilState(gamePlayingState);

    const puaseToggle = () => {
        if (gamePlaying) {
            controls.pause();
        } else {
            controls.resume();
        }
    };

    return (
        <button
            className="tw-flex tw-flex-col tw-justify-center tw-items-center tw-w-8 tw-h-8 tw-bg-control tw-text-foreground tw-rounded-lg"
            onClick={puaseToggle}
        >
            {gamePlaying ? <PauseIcon /> : <PlayIcon />}
        </button>
    );
}
