import React, { createContext, useContext } from "react";
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

    const theme = resolveTheme(options.theme);
    const locale = resolveLocale(options.locale);
    const dir = locale === "fa" ? "rtl" : "ltr";

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
