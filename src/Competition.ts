import axios from "axios";
import { Auth } from "./Auth";
import { Score } from "./Score";
import { competitionResultState } from "./states/competitionResultState";
import { competitionDataState } from "./states/competitionDataState";
import { setRecoil } from "recoil-nexus";
import { OptionsType } from "./types/options";
import { Options } from "./Options";
import { translate } from "./i18n/t";
import { resolveLocale } from "./i18n/resolveLocale";

class Competition {
    private static instance: Competition;

    private options: OptionsType;

    private baseURL = "api.vit-rin.com";

    private client;

    private version = "v1";

    private auth;

    private type: string = "solo";

    private id: string | null = null;

    private score = new Score();

    constructor() {
        this.options = Options.getInstance().get();

        this.client = axios.create({
            baseURL: `https://${this.baseURL}`,
        });

        this.auth = Auth.getInstance();

        this.handleCompetitionType();

        this.handleCompetitionId();
    }

    public static getInstance(): Competition {
        if (!this.instance) {
            this.instance = new Competition();
        }

        return this.instance;
    }

    getId() {
        return this.id;
    }

    getType() {
        return this.type;
    }

    private handleCompetitionType() {
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);
        const competitionType = urlParams.get("competition_type");

        if (competitionType) {
            this.type = competitionType;
        } else {
            this.type = "solo";
            console.warn(
                "Competition type is not set. Solo type is set as default."
            );
        }
    }

    private handleCompetitionId() {
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);
        const competitionId = urlParams.get("competition_id");

        if (this.options.autoCheckAuth) {
            if (competitionId) {
                this.id = competitionId;
                this.fetch();
            } else {
                console.warn(
                    "Competition ID is not set. Trying to create new competition."
                );
                this.create();
            }
        }
    }

    async fetch(): Promise<any> {
        try {
            const response = await this.client.get(
                `/${this.version}/competitions/${this.id}`
            );

            setRecoil(competitionDataState, response.data.data);

            this.id = response.data.data.id;
            this.type = response.data.data.type;
        } catch (error) {
            console.error("Error in competition fetch:", error);
            console.log("Trying to create new competition...");

            this.create();

            throw error;
        }
    }

    async create(): Promise<any> {
        try {
            const response = await this.client.post(
                `/${this.version}/competitions`,
                {
                    game_id: this.options.gameId,
                    competition_type: this.type ?? "solo",
                },
                {
                    headers: {
                        Authorization: this.auth.authorizationHeader(),
                    },
                }
            );

            this.id = response.data.data.id;
            this.type = response.data.data.type;

            setRecoil(competitionDataState, response.data.data);

            this.updateQueryStringParameter(
                "competition_id",
                response.data.data.id
            );
        } catch (error) {
            console.error("Error in competition create:", error);
            throw error;
        }
    }

    async finalize(): Promise<any> {
        if (!this.id) {
            throw new Error(
                translate(
                    resolveLocale(this.options.locale),
                    "error-competition-id-not-set"
                )
            );
        }

        try {
            const response = await this.client.post(
                `/${this.version}/competitions/${this.id}/finalize`,
                {
                    score: this.score.get(),
                },
                {
                    headers: {
                        Authorization: this.auth.authorizationHeader(),
                    },
                }
            );

            setRecoil(competitionResultState, response.data.data);
        } catch (error) {
            console.error("Error in competition finalize:", error);
            throw error;
        }
    }

    updateQueryStringParameter(key: string, value: string) {
        // Retrieve current query string
        var queryParams = new URLSearchParams(window.location.search);

        // Update or add the parameter
        queryParams.set(key, value);

        // Build the new URL with updated query string
        var newUrl = window.location.pathname + "?" + queryParams.toString();

        // Push the new URL to the history stack
        history.pushState({}, "", newUrl);
    }
}

export { Competition };
