import { setRecoil } from "recoil-nexus";
import { Options } from "./Options";
import { OptionsType } from "./types/options";
import { gameCurrentState } from "./states/gameCurrentState";
import { gamePlayingState } from "./states/gamePlayingState";
import { gamePausedState } from "./states/gamePausedState";
import { Competition } from "./Competition";
import { competitionResultState } from "./states/competitionResultState";
import { soundState } from "./states/soundState";
import { scoreState } from "./states/scoreState";
import { GameState, SoundState } from "./constants";

class Controls {
    private static instance: Controls;

    private options: OptionsType;

    private events = {
        touchstart: "touchstart",
        touchmove: "touchmove",
        touchend: "touchend",
        click: "click",
    };

    private competition;

    constructor() {
        this.options = Options.getInstance().get();

        this.competition = Competition.getInstance();

        this.init();
    }

    public static getInstance(): Controls {
        if (!this.instance) {
            this.instance = new Controls();
        }

        return this.instance;
    }

    private init() {
        if (this.options.preventDefault === true) {
            this.handlePreventDefault();
        }
    }

    private handlePreventDefault() {
        // window.addEventListener(
        //     this.events.touchstart,
        //     this.preventDefaultEvent,
        //     {
        //         passive: false,
        //     }
        // );

        window.addEventListener(
            this.events.touchmove,
            this.preventDefaultEvent,
            {
                passive: false,
            }
        );

        // window.addEventListener(
        //     this.events.touchend,
        //     this.preventDefaultEvent,
        //     {
        //         passive: false,
        //     }
        // );

        // window.addEventListener(this.events.click, this.preventDefaultEvent, {
        //     passive: false,
        // });
    }

    private preventDefaultEvent(event: Event) {
        event.preventDefault();
    }

    start() {
        // TODO: Open ADS modal

        if (typeof this.options.startCallback !== "undefined") {
            this.options.startCallback();
        }

        setRecoil(gameCurrentState, GameState.Playing);
        setRecoil(gamePlayingState, true);
        setRecoil(gamePausedState, false);

        setRecoil(scoreState, 0);
    }

    pause() {
        if (typeof this.options.pauseCallback !== "undefined") {
            this.options.pauseCallback();
        }

        setRecoil(gameCurrentState, GameState.Paused);
        setRecoil(gamePlayingState, false);
        setRecoil(gamePausedState, true);
    }

    resume() {
        if (typeof this.options.resumeCallback !== "undefined") {
            this.options.resumeCallback();
        }

        setRecoil(gameCurrentState, GameState.Playing);
        setRecoil(gamePlayingState, true);
        setRecoil(gamePausedState, false);
    }

    replay() {
        if (typeof this.options.replayCallback !== "undefined") {
            // TODO: Open ADS modal
            this.options.replayCallback();
        } else if (typeof this.options.startCallback !== "undefined") {
            this.options.startCallback();
        }

        setRecoil(gameCurrentState, GameState.Playing);
        setRecoil(gamePlayingState, true);
        setRecoil(gamePausedState, false);

        if (this.competition.getId()) {
            setRecoil(competitionResultState, null);
            this.competition.create();
        }

        setRecoil(scoreState, 0);
    }

    end() {
        setRecoil(gameCurrentState, GameState.Ended);

        if (this.options.autoCheckAuth) {
            this.competition.finalize();
        }
    }

    mute() {
        if (typeof this.options.muteCallback !== "undefined") {
            this.options.muteCallback();
        }

        setRecoil(soundState, SoundState.Mute);
    }

    unmute() {
        if (typeof this.options.unmuteCallback !== "undefined") {
            this.options.unmuteCallback();
        }

        setRecoil(soundState, SoundState.Unmute);
    }

    destroy() {
        // window.removeEventListener(
        //     this.events.touchstart,
        //     this.preventDefaultEvent
        // );
        window.removeEventListener(
            this.events.touchmove,
            this.preventDefaultEvent
        );
        // window.removeEventListener(
        //     this.events.touchend,
        //     this.preventDefaultEvent
        // );
        // window.removeEventListener(this.events.click, this.preventDefaultEvent);
    }
}

export { Controls };
