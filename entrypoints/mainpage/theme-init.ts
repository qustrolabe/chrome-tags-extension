import { applyDevTitle } from "@/utils/version.ts";
import { THEME_PRELOAD_BG, isTheme } from "@/utils/theme.ts";

applyDevTitle();

(() => {
  try {
    const stored = localStorage.getItem("theme");

    if (stored) document.documentElement.classList.add(stored);
    document.documentElement.style.backgroundColor = isTheme(stored)
      ? THEME_PRELOAD_BG[stored]
      : THEME_PRELOAD_BG.light;
  } catch {
    // Ignore theme init errors
  }
})();