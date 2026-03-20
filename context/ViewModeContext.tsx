import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type ViewMode = "list" | "table";

type ViewModeContextType = {
  mode: ViewMode;
  setMode: (mode: ViewMode) => void;
};

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

const STORAGE_KEY = "viewMode";

export const ViewModeProvider = ({ children }: { children: React.ReactNode }) => {
  const [mode, setModeState] = useState<ViewMode>("list");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    browser.storage.local.get([STORAGE_KEY]).then((result) => {
      const saved = result[STORAGE_KEY];
      if (saved === "list" || saved === "table") {
        setModeState(saved);
      }
      setMounted(true);
    });
  }, []);

  const setMode = (next: ViewMode) => {
    setModeState(next);
    browser.storage.local.set({ [STORAGE_KEY]: next });
  };

  const value = useMemo(() => ({ mode, setMode }), [mode]);

  if (!mounted) return null;

  return (
    <ViewModeContext.Provider value={value}>
      {children}
    </ViewModeContext.Provider>
  );
};

export const useViewMode = () => {
  const context = useContext(ViewModeContext);
  if (!context) {
    throw new Error("useViewMode must be used within a ViewModeProvider");
  }
  return context;
};

