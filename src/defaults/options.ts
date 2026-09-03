import { OptionsType } from "../types/options";

export const DefaultOptions: OptionsType = {
    gameId: null,
    
    startCallback: undefined,

    pauseCallback: undefined,
    resumeCallback: undefined,

    replayCallback: undefined,

    muteCallback: undefined,
    unmuteCallback: undefined,

    useUI: true,

    preventDefault: true,

    autoCheckAuth: true,

    autoOpenAds: true,

    theme: "dark",

    locale: "en",
};
