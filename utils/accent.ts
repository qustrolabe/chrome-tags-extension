/** Accent color: persisted and applied as a --primary override. */

const ACCENT_KEY = "accentColor";

export const ACCENT_PRESETS = [
    { name: "Violet", value: "#7c5cff" },
    { name: "Blue", value: "#3b82f6" },
    { name: "Cyan", value: "#06b6d4" },
    { name: "Green", value: "#22c55e" },
    { name: "Amber", value: "#f59e0b" },
    { name: "Red", value: "#ef4444" },
    { name: "Pink", value: "#ec4899" },
    // Toxic tier — full-saturation primaries & neons
    { name: "Pure Red (255,0,0)", value: "#ff0000" },
    { name: "Pure Green", value: "#00ff00" },
    { name: "Pure Blue", value: "#0000ff" },
    { name: "Acid Neon", value: "#39ff14" },
    { name: "Hot Magenta", value: "#ff00ff" },
    { name: "Laser Lemon", value: "#ffff00" },
] as const;

/** Relative luminance of a #rrggbb hex color (0 = dark, 1 = light). */
function luminance(hex: string): number {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if (!m?.[1]) return 0;
    const n = parseInt(m[1], 16);
    const r = (n >> 16) & 0xff;
    const g = (n >> 8) & 0xff;
    const b = n & 0xff;
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/**
 * Override the theme's --primary with a custom accent. The matching
 * foreground is picked automatically for contrast.
 */
export function applyAccent(color: string | null): void {
    const el = document.documentElement;
    if (!color) {
        el.style.removeProperty("--primary");
        el.style.removeProperty("--primary-foreground");
        return;
    }
    el.style.setProperty("--primary", color);
    el.style.setProperty(
        "--primary-foreground",
        luminance(color) > 0.55 ? "#1a1a1a" : "#ffffff",
    );
}

export async function saveAccent(color: string | null): Promise<void> {
    applyAccent(color);
    if (color === null) {
        await browser.storage.local.remove(ACCENT_KEY);
    } else {
        await browser.storage.local.set({ [ACCENT_KEY]: color });
    }
}

/** Load and apply the stored accent; call once at app startup. */
export async function initAccent(): Promise<void> {
    try {
        const result = await browser.storage.local.get([ACCENT_KEY]);
        applyAccent((result[ACCENT_KEY] as string) ?? null);
    } catch {
        // non-extension context: ignore
    }
}
