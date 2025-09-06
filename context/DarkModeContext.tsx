import React, { createContext } from "react";

export type DarkModeContextType = {
  darkMode: boolean;
  setDarkMode: (darkMode: boolean) => void;
};

export const DarkModeContext = createContext<DarkModeContextType>({
  darkMode: false,
  setDarkMode: () => { },
});

export const DarkModeProvider = (
  { children }: { children: React.ReactNode },
) => {
  const [darkMode, setDarkMode] = useState<boolean>(true);

  useEffect(() => {
    chrome.storage.local.get("darkMode", (result) => {
      if (result.darkMode !== undefined) {
        setDarkMode(result.darkMode);
      }
    });
  }, []);

  useEffect(() => {
    chrome.storage.local.set({ darkMode });

    const root = document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [darkMode]);

  return (
    <DarkModeContext.Provider
      value={{ darkMode, setDarkMode }}
    >
      {children}
    </DarkModeContext.Provider>
  );
};

export const useDarkMode = () => {
  const context = useContext(DarkModeContext);
  if (!context) {
    throw new Error("useDarkMode must be used within a DarkModeProvider");
  }
  return context;
};
