import { Options } from "./Options";
import { translate } from "./i18n/t";
import { resolveLocale } from "./i18n/resolveLocale";

class Auth {
    private static instance: Auth;

    private constructor() {}

    public static getInstance(): Auth {
        if (!this.instance) {
            this.instance = new Auth();
        }

        return this.instance;
    }

    getSessionToken(): string {
        const cookies = document.cookie.split(";");

        for (const cookie of cookies) {
            const [name, value] = cookie.trim().split("=");

            if (name === "sessionToken") {
                return decodeURI(value);
            }
        }

        throw new Error(
            translate(
                resolveLocale(Options.getInstance().get().locale),
                "error-session-token-not-set"
            )
        );
    }

    authorizationHeader() {
        try {
            const sessionToken = this.getSessionToken();
            return "Bearer " + sessionToken;
        } catch (error) {
            console.error("Error in authorization header:", error);
        }
    }
}

export { Auth };
