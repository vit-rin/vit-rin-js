import React from "react";
import MuteIcon from "./MuteIcon";
import { soundState } from "../states/soundState";
import { useRecoilState } from "recoil";
import UnmuteIcon from "./UnmuteIcon";
import { Controls } from "../Controls";
import { SoundState } from "../constants";

export default function MuteButton() {
    const controls = Controls.getInstance();

    const [sound, setSound] = useRecoilState(soundState);

    const muteToggle = () => {
        if (sound === SoundState.Mute) {
            controls.unmute();
        } else {
            controls.mute();
        }
    };

    return (
        <button
            className="tw-flex tw-flex-col tw-justify-center tw-items-center tw-w-8 tw-h-8 tw-bg-control tw-text-foreground tw-rounded-lg"
            onClick={muteToggle}
        >
            {sound === SoundState.Mute ? <MuteIcon /> : <UnmuteIcon />}
        </button>
    );
}
