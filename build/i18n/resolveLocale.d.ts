import { LocaleOption } from "../types/options";
/**
 * Resolves the "auto" locale option against the NEXT_LOCALE cookie set by
 * the VIT-RIN webapps on the shared .vit-rin.com domain. Concrete "en"/"fa"
 * values pass through unchanged.
 */
export declare function resolveLocale(locale: LocaleOption | undefined): "en" | "fa";
