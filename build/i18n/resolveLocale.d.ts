import { LocaleOption } from "../types/options";
/**
 * Resolves the "auto" locale option. Games run inside an iframe, where
 * document.cookie only exposes the frame's own origin and third-party cookie
 * blocking (Safari by default) hides the shared .vit-rin.com cookie
 * altogether — so the ?locale= query parameter the host appends to the game
 * URL is the primary signal, and the NEXT_LOCALE cookie is the fallback.
 * Concrete "en"/"fa" values pass through unchanged.
 */
export declare function resolveLocale(locale: LocaleOption | undefined): "en" | "fa";
