import React from "react";
type ThemeContextValue = {
    theme: "dark" | "light";
    locale: "en" | "fa";
    dir: "ltr" | "rtl";
};
declare const ThemeProvider: React.FC<{
    children: React.ReactNode;
}>;
declare function useTheme(): ThemeContextValue;
export { ThemeProvider, useTheme };
