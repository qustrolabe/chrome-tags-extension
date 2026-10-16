import React, { createContext, useContext, useEffect, useState } from "react";

export type TagColorMode = "none" | "v1";

export const TAG_COLOR_MODE_STORAGE_KEY = "tagColorMode";

const MODES: readonly TagColorMode[] = ["none", "v1"];

function isMode(value: unknown): value is TagColorMode {
  // SAFETY: a validated value is narrowed to the TagColorMode union
  return MODES.includes(value as TagColorMode);
}

export const TagColorContext = createContext<{
  mode: TagColorMode;
  setMode: (mode: TagColorMode) => void;
}>({
  mode: "v1",
  setMode: () => {},
});

export const TagColorProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [mode, setMode] = useState<TagColorMode>("v1");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    browser.storage.local.get(TAG_COLOR_MODE_STORAGE_KEY).then((result) => {
      if (isMode(result[TAG_COLOR_MODE_STORAGE_KEY])) {
        // SAFETY: guarded by isMode above, so the cast is bounded
        setMode(result[TAG_COLOR_MODE_STORAGE_KEY] as TagColorMode);
      }

      setMounted(true);
    });
  }, []);

  useEffect(() => {
    if (mounted) {
      browser.storage.local.set({
        [TAG_COLOR_MODE_STORAGE_KEY]: mode,
      });
      localStorage.setItem(TAG_COLOR_MODE_STORAGE_KEY, mode);
    }
  }, [mode, mounted]);

  if (!mounted) return children;

  return (
    <TagColorContext.Provider value={{ mode, setMode }}>
      {children}
    </TagColorContext.Provider>
  );
};

export const useTagColor = (): TagColorMode =>
  useContext(TagColorContext).mode;

export const useTagColorSetter = (): ((mode: TagColorMode) => void) =>
  useContext(TagColorContext).setMode;
