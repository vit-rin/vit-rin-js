import { LocaleOption } from "../types/options";

function readQueryParameter(name: string): string | undefined {
    if (typeof window === "undefined") {
        return undefined;
    }

    return (
        new URLSearchParams(window.location.search).get(name) ?? undefined
    );
}

function readCookie(name: string): string | undefined {
    if (typeof document === "undefined") {
        return undefined;
    }

    const cookies = document.cookie.split(";");

    for (const cookie of cookies) {
        const [cookieName, value] = cookie.trim().split("=");

        if (cookieName === name) {
            return decodeURIComponent(value);
        }
    }

    return undefined;
}

/**
 * Resolves the "auto" locale option. Games run inside an iframe, where
 * document.cookie only exposes the frame's own origin and third-party cookie
 * blocking (Safari by default) hides the shared .vit-rin.com cookie
 * altogether — so the ?locale= query parameter the host appends to the game
 * URL is the primary signal, and the NEXT_LOCALE cookie is the fallback.
 * Concrete "en"/"fa" values pass through unchanged.
 */
export function resolveLocale(locale: LocaleOption | undefined): "en" | "fa" {
    if (locale === "fa") {
        return "fa";
    }

    if (locale === "auto") {
        const signal =
            readQueryParameter("locale") ?? readCookie("NEXT_LOCALE");

        return signal === "fa" ? "fa" : "en";
    }

    return "en";
}
