import { useTheme } from "../theme/ThemeProvider";
import en from "./locales/en.json";
import fa from "./locales/fa.json";

type Locale = "en" | "fa";

type Vars = Record<string, string | number>;

const locales: Record<Locale, Record<string, string>> = { en, fa };

function interpolate(template: string, vars?: Vars): string {
    if (!vars) {
        return template;
    }

    return template.replace(/\{\{(\w+)\}\}/g, (match, key) =>
        key in vars ? String(vars[key]) : match
    );
}

/**
 * Translates `key` for `locale`, falling back to English and then to the
 * key itself if a translation is missing. Usable outside React (e.g. the
 * dev-facing Error messages in Game.ts/Competition.ts/Auth.ts).
 */
export function translate(locale: Locale, key: string, vars?: Vars): string {
    const dictionary = locales[locale] ?? locales.en;
    const template = dictionary[key] ?? locales.en[key] ?? key;

    return interpolate(template, vars);
}

/**
 * React hook wiring translate() to the active locale from ThemeProvider.
 */
export function useTranslation() {
    const { locale } = useTheme();

    const t = (key: string, vars?: Vars) => translate(locale, key, vars);

    return { t, locale };
}
