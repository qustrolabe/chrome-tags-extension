import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark";

export type ThemeContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

export const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  setTheme: () => {},
});

export const ThemeProvider = (
  { children }: { children: React.ReactNode },
) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("theme");
    return (saved as Theme) || "light";
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Initial sync with chrome storage
    chrome.storage.local.get("theme", (result) => {
      if (result.theme && result.theme !== theme) {
        setTheme(result.theme as Theme);
        localStorage.setItem("theme", result.theme as string);
      }
      setMounted(true);
    });
  }, []);

  useEffect(() => {
    // Mirror to both storages
    chrome.storage.local.set({ theme });
    localStorage.setItem("theme", theme);

    const root = document.documentElement;
    const themes: Theme[] = ["light", "dark"];
    root.classList.remove("light", "dark", "brutalism", "brutalism-dark");
    root.classList.add(theme);
  }, [theme]);

  if (!mounted) return null;

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
