type Locale = "en" | "fa";
type Vars = Record<string, string | number>;
/**
 * Translates `key` for `locale`, falling back to English and then to the
 * key itself if a translation is missing. Usable outside React (e.g. the
 * dev-facing Error messages in Game.ts/Competition.ts/Auth.ts).
 */
export declare function translate(locale: Locale, key: string, vars?: Vars): string;
/**
 * React hook wiring translate() to the active locale from ThemeProvider.
 */
export declare function useTranslation(): {
    t: (key: string, vars?: Vars) => string;
    locale: "en" | "fa";
};
export {};
