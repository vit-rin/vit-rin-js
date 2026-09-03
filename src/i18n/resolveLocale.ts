import { LocaleOption } from "../types/options";

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
 * Resolves the "auto" locale option against the NEXT_LOCALE cookie set by
 * the VIT-RIN webapps on the shared .vit-rin.com domain. Concrete "en"/"fa"
 * values pass through unchanged.
 */
export function resolveLocale(locale: LocaleOption | undefined): "en" | "fa" {
    if (locale === "fa") {
        return "fa";
    }

    if (locale === "auto") {
        return readCookie("NEXT_LOCALE") === "fa" ? "fa" : "en";
    }

    return "en";
}
