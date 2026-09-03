import React from "react";
import { createRoot } from "react-dom/client";
import ReactApp from "./ReactApp";
import { OptionsType } from "./types/options";
import "./styles/index.scss";
import { Options } from "./Options";
import { resolveTheme } from "./theme/resolveTheme";
import { resolveLocale } from "./i18n/resolveLocale";

class UI {
    private options: OptionsType;

    constructor() {
        this.options = Options.getInstance().get();

        if (this.options.useUI !== false) {
            this.init();
        }
    }

    private init() {
        // Init react app
        const container = document.createElement("div");
        container.id = "vtgrar"; // vitgames-react-app-root

        // Resolve theme/locale once, up front, so the container carries the
        // correct data-vg-theme/dir/lang before the first paint — no flash.
        const theme = resolveTheme(this.options.theme);
        const locale = resolveLocale(this.options.locale);

        container.setAttribute("data-vg-theme", theme);
        container.setAttribute("dir", locale === "fa" ? "rtl" : "ltr");
        container.setAttribute("lang", locale);

        document.body.appendChild(container);

        const root = createRoot(container!);
        root.render(<ReactApp />);
    }

    destroy() {}
}

export default UI;
