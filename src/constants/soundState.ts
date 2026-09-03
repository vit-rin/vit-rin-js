export const SoundState = {
    Mute: "mute",
    Unmute: "unmute",
} as const;

export type SoundStateValue = (typeof SoundState)[keyof typeof SoundState];
