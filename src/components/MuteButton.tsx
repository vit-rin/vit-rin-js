import React from "react";
import MuteIcon from "./MuteIcon";
import { soundState } from "../states/soundState";
import { useRecoilState } from "recoil";
import UnmuteIcon from "./UnmuteIcon";
import { Controls } from "../Controls";
import { SoundState } from "../constants";
import { useTranslation } from "../i18n/t";

export default function MuteButton() {
    const controls = Controls.getInstance();

    const { t } = useTranslation();

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
            type="button"
            aria-label={sound === SoundState.Mute ? t("unmute") : t("mute")}
            className="tw-flex tw-flex-col tw-justify-center tw-items-center tw-w-8 tw-h-8 tw-bg-control tw-text-foreground tw-rounded-lg"
            onClick={muteToggle}
        >
            {sound === SoundState.Mute ? <MuteIcon /> : <UnmuteIcon />}
        </button>
    );
}
