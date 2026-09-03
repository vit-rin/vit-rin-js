export type ThemeOption = "dark" | "light" | "auto";
export type LocaleOption = "en" | "fa" | "auto";
export type OptionsType = Readonly<{
    gameId?: string | null;
    startCallback?: () => void;
    pauseCallback?: () => void;
    resumeCallback?: () => void;
    replayCallback?: () => void;
    muteCallback?: () => void;
    unmuteCallback?: () => void;
    useUI?: boolean;
    preventDefault?: boolean | string | ReadonlyArray<string>;
    autoCheckAuth?: boolean;
    autoOpenAds?: boolean;
    /** Color scheme for the SDK's UI. "auto" follows the host's prefers-color-scheme. Defaults to "dark". */
    theme?: ThemeOption;
    /** Language for the SDK's UI. "auto" follows the host's NEXT_LOCALE cookie. Defaults to "en". */
    locale?: LocaleOption;
}>;
