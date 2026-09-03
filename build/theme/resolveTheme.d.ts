import { ThemeOption } from "../types/options";
/**
 * Resolves the "auto" theme option against the host page's OS-level
 * color-scheme preference. Concrete "dark"/"light" values pass through
 * unchanged.
 */
export declare function resolveTheme(theme: ThemeOption | undefined): "dark" | "light";
