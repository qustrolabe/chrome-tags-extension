import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_MAX_AGE,
  DEFAULT_SHOW_STATS,
  DEFAULT_TRACKING_ENABLED,
  TRACKING_STORAGE_KEYS,
  TrackingStat,
  TrackingStatsMap,
  clampNonNegative,
} from "@/utils/tracking";

type TrackingSettings = {
  enabled: boolean;
  showStats: boolean;
  maxAge: number;
};

type TrackingContextType = {
  settings: TrackingSettings;
  stats: TrackingStatsMap;
  totalScore: number;
  setEnabled: (enabled: boolean) => void;
  setShowStats: (showStats: boolean) => void;
  setMaxAge: (maxAge: number) => void;
  clearStats: () => void;
};

const TrackingContext = createContext<TrackingContextType | undefined>(undefined);

const normalizeStats = (stats: TrackingStatsMap | undefined | null): TrackingStatsMap => {
  if (!stats) return {};
  const normalized: TrackingStatsMap = {};
  for (const [id, value] of Object.entries(stats)) {
    const visits = clampNonNegative(value?.visits ?? 0);
    const score = clampNonNegative(value?.score ?? 0);
    const lastVisited = clampNonNegative(value?.lastVisited ?? 0);
    normalized[id] = { visits, score, lastVisited };
  }
  return normalized;
};

export const TrackingProvider = ({ children }: { children: React.ReactNode }) => {
  const [mounted, setMounted] = useState(false);
  const [enabled, setEnabledState] = useState(DEFAULT_TRACKING_ENABLED);
  const [showStats, setShowStatsState] = useState(DEFAULT_SHOW_STATS);
  const [maxAge, setMaxAgeState] = useState(DEFAULT_MAX_AGE);
  const [stats, setStats] = useState<TrackingStatsMap>({});

  useEffect(() => {
    browser.storage.local.get([
      TRACKING_STORAGE_KEYS.enabled,
      TRACKING_STORAGE_KEYS.showStats,
      TRACKING_STORAGE_KEYS.maxAge,
      TRACKING_STORAGE_KEYS.stats,
    ]).then((result) => {
      if (typeof result[TRACKING_STORAGE_KEYS.enabled] === "boolean") {
        setEnabledState(result[TRACKING_STORAGE_KEYS.enabled] as boolean);
      }
      if (typeof result[TRACKING_STORAGE_KEYS.showStats] === "boolean") {
        setShowStatsState(result[TRACKING_STORAGE_KEYS.showStats] as boolean);
      }
      if (typeof result[TRACKING_STORAGE_KEYS.maxAge] === "number") {
        setMaxAgeState(result[TRACKING_STORAGE_KEYS.maxAge] as number);
      }
      setStats(normalizeStats(result[TRACKING_STORAGE_KEYS.stats] as TrackingStatsMap));
      setMounted(true);
    });
  }, []);

  useEffect(() => {
    const handleStorageChange = (changes: {
      [key: string]: browser.storage.StorageChange;
    }) => {
      if (TRACKING_STORAGE_KEYS.enabled in changes) {
        setEnabledState(Boolean(changes[TRACKING_STORAGE_KEYS.enabled].newValue));
      }
      if (TRACKING_STORAGE_KEYS.showStats in changes) {
        setShowStatsState(Boolean(changes[TRACKING_STORAGE_KEYS.showStats].newValue));
      }
      if (TRACKING_STORAGE_KEYS.maxAge in changes) {
        const value = changes[TRACKING_STORAGE_KEYS.maxAge].newValue;
        if (typeof value === "number") setMaxAgeState(value);
      }
      if (TRACKING_STORAGE_KEYS.stats in changes) {
        setStats(normalizeStats(changes[TRACKING_STORAGE_KEYS.stats].newValue as TrackingStatsMap));
      }
    };

    browser.storage.onChanged.addListener(handleStorageChange);
    return () => browser.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  const setEnabled = (value: boolean) => {
    setEnabledState(value);
    browser.storage.local.set({ [TRACKING_STORAGE_KEYS.enabled]: value });
  };

  const setShowStats = (value: boolean) => {
    setShowStatsState(value);
    browser.storage.local.set({ [TRACKING_STORAGE_KEYS.showStats]: value });
  };

  const setMaxAge = (value: number) => {
    const safeValue = clampNonNegative(value) || DEFAULT_MAX_AGE;
    setMaxAgeState(safeValue);
    browser.storage.local.set({ [TRACKING_STORAGE_KEYS.maxAge]: safeValue });
  };

  const clearStats = () => {
    setStats({});
    browser.storage.local.set({ [TRACKING_STORAGE_KEYS.stats]: {} });
  };

  const totalScore = useMemo(() => {
    return Object.values(stats).reduce((sum, stat) => sum + (stat.score || 0), 0);
  }, [stats]);

  const value = useMemo(() => ({
    settings: { enabled, showStats, maxAge },
    stats,
    totalScore,
    setEnabled,
    setShowStats,
    setMaxAge,
    clearStats,
  }), [enabled, showStats, maxAge, stats, totalScore]);

  if (!mounted) return null;

  return (
    <TrackingContext.Provider value={value}>
      {children}
    </TrackingContext.Provider>
  );
};

export const useTracking = () => {
  const context = useContext(TrackingContext);
  if (!context) {
    throw new Error("useTracking must be used within a TrackingProvider");
  }
  return context;
};

export type { TrackingSettings, TrackingStat };

