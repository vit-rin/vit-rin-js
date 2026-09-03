import { atom } from "recoil";
import { SoundState, SoundStateValue } from "../constants";

export const soundState = atom<SoundStateValue>({
    key: "soundState",
    default: SoundState.Unmute,
});
