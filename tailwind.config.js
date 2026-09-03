/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./src/**/*.{html,js,ts,jsx,tsx}"],
    prefix: "tw-",
    theme: {
        container: {
            center: true,
            padding: "1rem",
        },
        screens: {
            sm: "390px",
            md: "390px",
            lg: "390px",
            xl: "390px",
            "2xl": "390px",
        },
        extend: {
            colors: {
                background: "rgb(var(--vg-color-background) / <alpha-value>)",
                foreground: "rgb(var(--vg-color-foreground) / <alpha-value>)",
                surface: "rgb(var(--vg-color-surface) / <alpha-value>)",
                "surface-sunken":
                    "rgb(var(--vg-color-surface-sunken) / <alpha-value>)",
                "surface-sunken-foreground":
                    "rgb(var(--vg-color-surface-sunken-foreground) / <alpha-value>)",
                control: "rgb(var(--vg-color-control) / <alpha-value>)",
                scrim: "rgb(var(--vg-color-scrim) / <alpha-value>)",
                primary: "rgb(var(--vg-color-primary) / <alpha-value>)",
                gold: "rgb(var(--vg-color-gold) / <alpha-value>)",
                muted: "rgb(var(--vg-color-muted) / <alpha-value>)",
                warning: "rgb(var(--vg-color-warning) / <alpha-value>)",
                crown: "rgb(var(--vg-color-crown) / <alpha-value>)",
                vton: "rgb(var(--vg-color-vton) / <alpha-value>)",
                "vton-stroke": "rgb(var(--vg-color-vton-stroke) / <alpha-value>)",
                xp: "rgb(var(--vg-color-xp) / <alpha-value>)",
                "xp-stroke": "rgb(var(--vg-color-xp-stroke) / <alpha-value>)",
                "on-dark": "rgb(var(--vg-color-on-dark) / <alpha-value>)",
            },
            fontFamily: {
                capsule: [
                    "capsule",
                    "iransansxv",
                    "iransansx",
                    "tahoma",
                    "sans-serif",
                ],
            },
            zIndex: {
                topbar: "50",
                overlay: "50",
                ads: "50",
            },
        },
    },
    plugins: [],
};
