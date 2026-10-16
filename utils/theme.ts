/**
 * Theme registry — the single list of selectable themes.
 *
 * A theme is just a class on <html>; the actual colors live in
 * `assets/global.css`. Keep the three in sync: adding an id here without a
 * matching CSS block leaves the UI on the default light palette.
 *
 * `automata` is deliberately unlike the others: a light, flat, square-cornered
 * palette that zeroes every radius token (see the `.automata` block in
 * global.css). It is never matched by the `dark` variant.
 */

/** Selectable themes, in the order the pickers render them. */
export const THEME_IDS = ["light", "dark", "automata"] as const;

export type Theme = (typeof THEME_IDS)[number];

/**
 * Background painted on <html> by each entrypoint's `theme-init` IIFE, before
 * React mounts, so switching themes never flashes the wrong canvas color.
 */
export const THEME_PRELOAD_BG: Record<Theme, string> = {
    light: "#fcfcfc",
    dark: "#000000",
    automata: "#c3bda8",
};

/**
 * Membership set for `isTheme`. Holding it as `ReadonlySet<unknown>` lets the
 * guard answer for an untrusted value directly, so no `typeof` narrowing and
 * no cast of `THEME_IDS` to a wider array is needed to make the check.
 */
const THEME_ID_SET: ReadonlySet<unknown> = new Set(THEME_IDS);

/** Narrow an untrusted value (localStorage / storage.local) to a Theme. */
export function isTheme(value: unknown): value is Theme {
    return THEME_ID_SET.has(value);
}

/** Classes that may be left on <html> by older builds; cleared on every apply. */
export const THEME_CLASSES = [
    "light",
    "dark",
    "automata",
    "brutalism",
    "brutalism-dark",
];