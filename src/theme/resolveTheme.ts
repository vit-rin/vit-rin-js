import { ThemeOption } from "../types/options";

/**
 * Resolves the "auto" theme option against the host page's OS-level
 * color-scheme preference. Concrete "dark"/"light" values pass through
 * unchanged.
 */
export function resolveTheme(theme: ThemeOption | undefined): "dark" | "light" {
    if (theme === "light") {
        return "light";
    }

    if (theme === "auto") {
        if (
            typeof window !== "undefined" &&
            typeof window.matchMedia === "function" &&
            window.matchMedia("(prefers-color-scheme: dark)").matches === false
        ) {
            return "light";
        }

        return "dark";
    }

    return "dark";
}
