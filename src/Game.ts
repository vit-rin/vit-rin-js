import { gameDataState } from "./states/gameDataState";
import { getRecoil, setRecoil } from "recoil-nexus";
import { Controls } from "./Controls";
import axios from "axios";
import { Options } from "./Options";
import { OptionsType } from "./types/options";
import { isFailedState } from "./states/isFailedState";
import { translate } from "./i18n/t";
import { resolveLocale } from "./i18n/resolveLocale";

class Game {
    private options: OptionsType;

    private controls;

    private baseURL = "api.vit-rin.com";

    private client;

    private version = "v1";

    constructor() {
        this.options = Options.getInstance().get();

        this.controls = Controls.getInstance();

        this.client = axios.create({
            baseURL: `https://${this.baseURL}`,
        });

        if (this.options.gameId) {
            this.fetch();
        } else {
            setRecoil(isFailedState, true);
            throw new Error(
                translate(
                    resolveLocale(this.options.locale),
                    "error-game-id-not-set"
                )
            );
        }
    }

    ended() {
        this.controls.end();
    }

    getData() {
        let gameData = getRecoil(gameDataState);

        if (!gameData) {
            this.fetch();
        }

        return gameData;
    }

    private async fetch() {
        try {
            const response = await this.client.get(
                `/${this.version}/games/${this.options.gameId}`
            );

            setRecoil(gameDataState, response.data.data);
        } catch (error) {
            setRecoil(isFailedState, true);
            console.error("Error in game data fetch:", error);
            throw error;
        }
    }
}

export default Game;
