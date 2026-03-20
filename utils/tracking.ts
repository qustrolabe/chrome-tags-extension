export const TRACKING_STORAGE_KEYS = {
  enabled: "trackingEnabled",
  maxAge: "trackingMaxAge",
  showStats: "trackingShowStats",
  stats: "trackingStats",
} as const;

export const DEFAULT_TRACKING_ENABLED = true;
export const DEFAULT_SHOW_STATS = true;
export const DEFAULT_MAX_AGE = 10000;

const HOUR_MS = 1000 * 60 * 60;
const DAY_MS = HOUR_MS * 24;
const WEEK_MS = DAY_MS * 7;

export type TrackingStat = {
  visits: number;
  score: number;
  lastVisited: number;
};

export type TrackingStatsMap = Record<string, TrackingStat>;

export const computeFrecency = (
  score: number,
  lastVisited: number | undefined,
  now: number = Date.now(),
) => {
  if (!score || !lastVisited) return 0;
  const age = Math.max(0, now - lastVisited);
  if (age < HOUR_MS) return score * 4;
  if (age < DAY_MS) return score * 2;
  if (age < WEEK_MS) return score * 0.5;
  return score * 0.25;
};

export const clampNonNegative = (value: number) =>
  Number.isFinite(value) ? Math.max(0, value) : 0;

