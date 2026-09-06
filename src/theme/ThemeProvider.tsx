import React, { createContext, useContext, useEffect, useState } from "react";
import { Options } from "../Options";
import { resolveTheme } from "./resolveTheme";
import { resolveLocale } from "../i18n/resolveLocale";

type ThemeContextValue = {
    theme: "dark" | "light";
    locale: "en" | "fa";
    dir: "ltr" | "rtl";
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const options = Options.getInstance().get();

    const [theme, setTheme] = useState(() => resolveTheme(options.theme));

    const locale = resolveLocale(options.locale);
    const dir = locale === "fa" ? "rtl" : "ltr";

    // theme: "auto" should track the OS-level preference live, not just at
    // mount — e.g. the player switches their device's dark mode mid-game.
    useEffect(() => {
        if (
            options.theme !== "auto" ||
            typeof window === "undefined" ||
            typeof window.matchMedia !== "function"
        ) {
            return;
        }

        const query = window.matchMedia("(prefers-color-scheme: dark)");

        const applyTheme = (matchesDark: boolean) => {
            const nextTheme = matchesDark ? "dark" : "light";

            setTheme(nextTheme);

            // UI.tsx sets this attribute once, synchronously, before the
            // first paint to avoid a flash — keep it in sync afterwards too,
            // since it's what the CSS tokens in index.scss key off of.
            document
                .getElementById("vtgrar")
                ?.setAttribute("data-vg-theme", nextTheme);
        };

        const handleChange = (event: MediaQueryListEvent) => {
            applyTheme(event.matches);
        };

        if (typeof query.addEventListener === "function") {
            query.addEventListener("change", handleChange);
        } else {
            // Safari < 14 fallback.
            query.addListener(handleChange);
        }

        return () => {
            if (typeof query.removeEventListener === "function") {
                query.removeEventListener("change", handleChange);
            } else {
                query.removeListener(handleChange);
            }
        };
    }, [options.theme]);

    return (
        <ThemeContext.Provider value={{ theme, locale, dir }}>
            {children}
        </ThemeContext.Provider>
    );
};

function useTheme(): ThemeContextValue {
    const context = useContext(ThemeContext);

    if (!context) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }

    return context;
}

export { ThemeProvider, useTheme };
