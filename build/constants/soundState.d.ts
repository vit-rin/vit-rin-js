export declare const SoundState: {
    readonly Mute: "mute";
    readonly Unmute: "unmute";
};
export type SoundStateValue = (typeof SoundState)[keyof typeof SoundState];
