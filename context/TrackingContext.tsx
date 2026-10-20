import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_MAX_AGE,
  DEFAULT_SHOW_STATS,
  DEFAULT_TRACKING_ENABLED,
  TRACKING_STORAGE_KEYS,
  type TrackingStat,
  type TrackingStatsMap,
  clampNonNegative,
} from "@/utils/tracking";
import {
  decodeStored,
  storedBoolean,
  storedNumber,
  trackingStatsSchema,
} from "@/utils/storageDecode.ts";

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
      const enabled = decodeStored(storedBoolean, result[TRACKING_STORAGE_KEYS.enabled]);
      const showStats = decodeStored(storedBoolean, result[TRACKING_STORAGE_KEYS.showStats]);
      const maxAge = decodeStored(storedNumber, result[TRACKING_STORAGE_KEYS.maxAge]);

      const storedStats = decodeStored(
        trackingStatsSchema,
        result[TRACKING_STORAGE_KEYS.stats],
      );

      if (enabled !== undefined) setEnabledState(enabled);

      if (showStats !== undefined) setShowStatsState(showStats);

      if (maxAge !== undefined) setMaxAgeState(maxAge);

      setStats(normalizeStats(storedStats));
      setMounted(true);
    });
  }, []);

  useEffect(() => {
    const handleStorageChange = (
      changes: Record<string, { newValue?: unknown; oldValue?: unknown }>,
    ) => {
      const getChange = (key: string) =>
        key in changes ? changes[key]?.newValue : undefined;

      const enabledChange = decodeStored(
        storedBoolean,
        getChange(TRACKING_STORAGE_KEYS.enabled),
      );

      if (enabledChange !== undefined) setEnabledState(enabledChange);

      const showStatsChange = decodeStored(
        storedBoolean,
        getChange(TRACKING_STORAGE_KEYS.showStats),
      );

      if (showStatsChange !== undefined) setShowStatsState(showStatsChange);

      const maxAgeChange = decodeStored(
        storedNumber,
        getChange(TRACKING_STORAGE_KEYS.maxAge),
      );

      if (maxAgeChange !== undefined) setMaxAgeState(maxAgeChange);

      const statsChange = decodeStored(
        trackingStatsSchema,
        getChange(TRACKING_STORAGE_KEYS.stats),
      );

      if (statsChange !== undefined) setStats(normalizeStats(statsChange));
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

