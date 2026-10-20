/**
 * Backup and restore for the extension's own persisted state.
 *
 * Everything the extension stores lives in `browser.storage.local` as plain
 * JSON. Tags do not — they are part of bookmark titles — so a backup never
 * touches `browser.bookmarks`.
 *
 * A backup file is a small envelope around one scope of the store:
 *
 *   { kind, version, scope, exportedAt, appVersion, data }
 *
 * `settings` covers every key the UI can change, `tracking` the visit
 * accumulator. Imported files are untrusted input, so every field is decoded
 * at this boundary through type predicates: a file that does not decode is
 * rejected whole rather than half-applied, and unknown keys are ignored.
 */

import type { SortDirection, SortOption } from "@/context/BookmarksContext";
import type { SidebarMode } from "@/context/SidebarContext";
import type { ViewMode } from "@/context/ViewModeContext";
import { TAG_COLOR_MODES, type TagColorMode } from "@/utils/tagColor.ts";
import { isTheme, type Theme } from "@/utils/theme.ts";
import {
  DEFAULT_MAX_AGE,
  DEFAULT_SHOW_STATS,
  DEFAULT_TRACKING_ENABLED,
  TRACKING_STORAGE_KEYS,
  type TrackingStat,
  type TrackingStatsMap,
} from "@/utils/tracking.ts";

export const BACKUP_KIND = "bookmark-tags/backup";

/** Bumped only when the envelope or a payload changes shape. */
export const BACKUP_VERSION = 1;

export type BackupScope = "settings" | "tracking";

/* -------------------------------------------------------------------------
 * JSON boundary — the shapes a parsed document can take.
 * ---------------------------------------------------------------------- */

export type JsonValue = string | number | boolean | null | JsonObject | JsonArray;

export type JsonObject = { [key: string]: JsonValue };

export type JsonArray = JsonValue[];

/** A value at the boundary: parsed JSON, or a key that was not there. */
export type JsonInput = JsonValue | undefined;

/**
 * Structural tags for a parsed value. `typeof` cannot establish a contract for
 * untrusted input (anti-slop/no-runtime-typeof), so the boundary reads the
 * prototype tag instead — same spirit as the `ReadonlySet` guard in theme.ts.
 * Each decoder takes `JsonInput` because it is the thing giving a shape back.
 */
const isJsonString = (value: JsonInput): value is string =>
  Object.prototype.toString.call(value) === "[object String]";

const isJsonNumber = (value: JsonInput): value is number => Number.isFinite(value);

const isJsonBoolean = (value: JsonInput): value is boolean =>
  value === true || value === false;

const isJsonArray = (value: JsonInput): value is JsonArray =>
  Object.prototype.toString.call(value) === "[object Array]";

const isJsonObject = (value: JsonInput): value is JsonObject =>
  Object.prototype.toString.call(value) === "[object Object]";

const isNullableString = (value: JsonInput): value is string | null =>
  value === null || isJsonString(value);

/* -------------------------------------------------------------------------
 * Field decoders.
 * ---------------------------------------------------------------------- */

const SORT_OPTION_SET: ReadonlySet<unknown> = new Set<SortOption>([
  "dateAdded",
  "dateLastUsed",
  "frecency",
  "id",
  "lastVisited",
  "title",
  "visits",
]);

const SORT_DIRECTION_SET: ReadonlySet<unknown> = new Set<SortDirection>([
  "asc",
  "desc",
]);

const VIEW_MODE_SET: ReadonlySet<unknown> = new Set<ViewMode>(["list", "table"]);

const SIDEBAR_MODE_SET: ReadonlySet<unknown> = new Set<SidebarMode>([
  "folders",
  "tags",
  "views",
]);

const TAG_COLOR_MODE_SET: ReadonlySet<unknown> = new Set(TAG_COLOR_MODES);

const isSortOption = (value: JsonInput): value is SortOption =>
  SORT_OPTION_SET.has(value);

const isSortDirection = (value: JsonInput): value is SortDirection =>
  SORT_DIRECTION_SET.has(value);

const isViewMode = (value: JsonInput): value is ViewMode => VIEW_MODE_SET.has(value);

const isSidebarMode = (value: JsonInput): value is SidebarMode =>
  SIDEBAR_MODE_SET.has(value);

const isTagColorMode = (value: JsonInput): value is TagColorMode =>
  TAG_COLOR_MODE_SET.has(value);

const isBooleanRecord = (value: JsonInput): value is Record<string, boolean> =>
  isJsonObject(value) && Object.values(value).every(isJsonBoolean);

const isNumberRecord = (value: JsonInput): value is Record<string, number> =>
  isJsonObject(value) && Object.values(value).every(isJsonNumber);

const isSavedView = (value: JsonInput): value is BackupSavedView =>
  isJsonObject(value) &&
  isJsonString(value["id"]) &&
  isJsonString(value["name"]) &&
  isJsonString(value["query"]);

const isSavedViewArray = (value: JsonInput): value is BackupSavedView[] =>
  isJsonArray(value) && value.every(isSavedView);

const isTrackingStat = (value: JsonInput): value is TrackingStat =>
  isJsonObject(value) &&
  isJsonNumber(value["visits"]) &&
  isJsonNumber(value["score"]) &&
  isJsonNumber(value["lastVisited"]);

const isTrackingStatsMap = (value: JsonInput): value is TrackingStatsMap =>
  isJsonObject(value) && Object.values(value).every(isTrackingStat);

/* -------------------------------------------------------------------------
 * Scopes.
 * ---------------------------------------------------------------------- */

/**
 * A saved view as a backup stores it: only the three fields the format knows
 * about. It is deliberately its own shape rather than `SavedView`, so a view
 * type that grows fields does not silently change what an import accepts.
 */
export type BackupSavedView = {
  id: string;
  name: string;
  query: string;
};

/**
 * The `settings` scope. Field names are the `storage.local` keys, so restoring
 * is a plain `set` of the decoded payload; the two nullable fields remove their
 * key when `null`, matching how a cleared accent and folder are stored.
 */
export type SettingsBackup = {
  accentColor: string | null;
  lastBookmarkFolderId: string | null;
  savedViews: BackupSavedView[];
  sidebarMode: SidebarMode;
  sidebarOpen: boolean;
  sortDirection: SortDirection;
  sortOption: SortOption;
  tableColumnSizing: Record<string, number>;
  tableColumnVisibility: Record<string, boolean>;
  tagColorMode: TagColorMode;
  theme: Theme;
  viewMode: ViewMode;
};

/** The `tracking` scope; field names are the `TRACKING_STORAGE_KEYS` values. */
export type TrackingBackup = {
  trackingEnabled: boolean;
  trackingMaxAge: number;
  trackingShowStats: boolean;
  trackingStats: TrackingStatsMap;
};

/**
 * Values used when a key is absent or unreadable at export time. Holding the
 * defaults here also derives `SETTINGS_STORAGE_KEYS`, so the two cannot drift;
 * `SettingsBackup` makes a forgotten field a compile error.
 */
const SETTINGS_DEFAULTS: SettingsBackup = {
  accentColor: null,
  lastBookmarkFolderId: null,
  savedViews: [],
  sidebarMode: "tags",
  sidebarOpen: false,
  sortDirection: "desc",
  sortOption: "dateAdded",
  tableColumnSizing: {},
  tableColumnVisibility: {},
  tagColorMode: "v1",
  theme: "light",
  viewMode: "list",
};

const TRACKING_DEFAULTS: TrackingBackup = {
  trackingEnabled: DEFAULT_TRACKING_ENABLED,
  trackingMaxAge: DEFAULT_MAX_AGE,
  trackingShowStats: DEFAULT_SHOW_STATS,
  trackingStats: {},
};

const SETTINGS_STORAGE_KEYS = Object.keys(SETTINGS_DEFAULTS);

/** `storage.local` keys the `tracking` scope writes, in payload field names. */
const TRACKING_KEYS = [
  TRACKING_STORAGE_KEYS.enabled,
  TRACKING_STORAGE_KEYS.maxAge,
  TRACKING_STORAGE_KEYS.showStats,
  TRACKING_STORAGE_KEYS.stats,
];

const isSettingsBackup = (value: JsonInput): value is SettingsBackup =>
  isJsonObject(value) &&
  isNullableString(value["accentColor"]) &&
  isNullableString(value["lastBookmarkFolderId"]) &&
  isSavedViewArray(value["savedViews"]) &&
  isSidebarMode(value["sidebarMode"]) &&
  isJsonBoolean(value["sidebarOpen"]) &&
  isSortDirection(value["sortDirection"]) &&
  isSortOption(value["sortOption"]) &&
  isNumberRecord(value["tableColumnSizing"]) &&
  isBooleanRecord(value["tableColumnVisibility"]) &&
  isTagColorMode(value["tagColorMode"]) &&
  isTheme(value["theme"]) &&
  isViewMode(value["viewMode"]);

const isTrackingBackup = (value: JsonInput): value is TrackingBackup =>
  isJsonObject(value) &&
  isJsonBoolean(value[TRACKING_STORAGE_KEYS.enabled]) &&
  isJsonNumber(value[TRACKING_STORAGE_KEYS.maxAge]) &&
  isJsonBoolean(value[TRACKING_STORAGE_KEYS.showStats]) &&
  isTrackingStatsMap(value[TRACKING_STORAGE_KEYS.stats]);

/* -------------------------------------------------------------------------
 * Normalize — rebuild a decoded payload field by field.
 *
 * The predicates above answer "does this have the shape I need", which is true
 * for an object carrying extra keys as well. Rebuilding is what keeps a stray
 * key in a hand-edited file from being written into storage, and makes the
 * "unknown keys are ignored" contract literal.
 * ---------------------------------------------------------------------- */

const toSettings = (source: SettingsBackup): SettingsBackup => ({
  accentColor: source.accentColor,
  lastBookmarkFolderId: source.lastBookmarkFolderId,
  savedViews: source.savedViews.map((view) => ({
    id: view.id,
    name: view.name,
    query: view.query,
  })),
  sidebarMode: source.sidebarMode,
  sidebarOpen: source.sidebarOpen,
  sortDirection: source.sortDirection,
  sortOption: source.sortOption,
  tableColumnSizing: source.tableColumnSizing,
  tableColumnVisibility: source.tableColumnVisibility,
  tagColorMode: source.tagColorMode,
  theme: source.theme,
  viewMode: source.viewMode,
});

const toTrackingStats = (stats: TrackingStatsMap): TrackingStatsMap => {
  const normalized: TrackingStatsMap = {};

  for (const [bookmarkId, stat] of Object.entries(stats)) {
    normalized[bookmarkId] = {
      lastVisited: stat.lastVisited,
      score: stat.score,
      visits: stat.visits,
    };
  }

  return normalized;
};

const toTracking = (source: TrackingBackup): TrackingBackup => ({
  trackingEnabled: source.trackingEnabled,
  trackingMaxAge: source.trackingMaxAge,
  trackingShowStats: source.trackingShowStats,
  trackingStats: toTrackingStats(source.trackingStats),
});

/* -------------------------------------------------------------------------
 * Envelope.
 * ---------------------------------------------------------------------- */

type BackupEnvelope<TScope extends BackupScope, TData> = {
  appVersion: string;
  data: TData;
  exportedAt: number;
  kind: typeof BACKUP_KIND;
  scope: TScope;
  version: number;
};

export type SettingsBackupFile = BackupEnvelope<"settings", SettingsBackup>;

export type TrackingBackupFile = BackupEnvelope<"tracking", TrackingBackup>;

export type BackupFile = SettingsBackupFile | TrackingBackupFile;

/** A decoded file, reduced to what an import needs. */
export type ParsedBackup =
  | { data: SettingsBackup; exportedAt: number; scope: "settings" }
  | { data: TrackingBackup; exportedAt: number; scope: "tracking" };

/* -------------------------------------------------------------------------
 * Encode.
 * ---------------------------------------------------------------------- */

/** Decode one stored value, falling back when it is absent or malformed. */
const decodeOr = <T extends JsonValue>(
  value: JsonInput,
  is: (candidate: JsonInput) => candidate is T,
  fallback: T,
): T => (is(value) ? value : fallback);

/** Read keys as a JSON object — the shape everything in storage has. */
const readStorage = async (keys: string[]): Promise<JsonObject> => {
  // SAFETY: storage.local is written only by this extension, always as JSON;
  // decodeOr rejects anything that does not decode.
  const stored = (await browser.storage.local.get(keys)) as JsonObject;

  return stored;
};

const collectSettings = async (): Promise<SettingsBackup> => {
  const stored = await readStorage(SETTINGS_STORAGE_KEYS);

  return {
    accentColor: decodeOr(
      stored["accentColor"],
      isNullableString,
      SETTINGS_DEFAULTS.accentColor,
    ),
    lastBookmarkFolderId: decodeOr(
      stored["lastBookmarkFolderId"],
      isNullableString,
      SETTINGS_DEFAULTS.lastBookmarkFolderId,
    ),
    savedViews: decodeOr(
      stored["savedViews"],
      isSavedViewArray,
      SETTINGS_DEFAULTS.savedViews,
    ),
    sidebarMode: decodeOr(
      stored["sidebarMode"],
      isSidebarMode,
      SETTINGS_DEFAULTS.sidebarMode,
    ),
    sidebarOpen: decodeOr(
      stored["sidebarOpen"],
      isJsonBoolean,
      SETTINGS_DEFAULTS.sidebarOpen,
    ),
    sortDirection: decodeOr(
      stored["sortDirection"],
      isSortDirection,
      SETTINGS_DEFAULTS.sortDirection,
    ),
    sortOption: decodeOr(
      stored["sortOption"],
      isSortOption,
      SETTINGS_DEFAULTS.sortOption,
    ),
    tableColumnSizing: decodeOr(
      stored["tableColumnSizing"],
      isNumberRecord,
      SETTINGS_DEFAULTS.tableColumnSizing,
    ),
    tableColumnVisibility: decodeOr(
      stored["tableColumnVisibility"],
      isBooleanRecord,
      SETTINGS_DEFAULTS.tableColumnVisibility,
    ),
    tagColorMode: decodeOr(
      stored["tagColorMode"],
      isTagColorMode,
      SETTINGS_DEFAULTS.tagColorMode,
    ),
    theme: decodeOr(stored["theme"], isTheme, SETTINGS_DEFAULTS.theme),
    viewMode: decodeOr(stored["viewMode"], isViewMode, SETTINGS_DEFAULTS.viewMode),
  };
};

const collectTracking = async (): Promise<TrackingBackup> => {
  const stored = await readStorage(TRACKING_KEYS);

  return {
    trackingEnabled: decodeOr(
      stored[TRACKING_STORAGE_KEYS.enabled],
      isJsonBoolean,
      TRACKING_DEFAULTS.trackingEnabled,
    ),
    trackingMaxAge: decodeOr(
      stored[TRACKING_STORAGE_KEYS.maxAge],
      isJsonNumber,
      TRACKING_DEFAULTS.trackingMaxAge,
    ),
    trackingShowStats: decodeOr(
      stored[TRACKING_STORAGE_KEYS.showStats],
      isJsonBoolean,
      TRACKING_DEFAULTS.trackingShowStats,
    ),
    trackingStats: decodeOr(
      stored[TRACKING_STORAGE_KEYS.stats],
      isTrackingStatsMap,
      TRACKING_DEFAULTS.trackingStats,
    ),
  };
};

/**
 * Snapshot the store for one scope. `appVersion` is passed in rather than read
 * from `utils/version.ts` so this module stays import-safe outside the bundle.
 */
export const collectBackup = async (
  scope: BackupScope,
  appVersion: string,
): Promise<BackupFile> => {
  if (scope === "tracking") {
    return {
      appVersion,
      data: await collectTracking(),
      exportedAt: Date.now(),
      kind: BACKUP_KIND,
      scope: "tracking",
      version: BACKUP_VERSION,
    };
  }

  return {
    appVersion,
    data: await collectSettings(),
    exportedAt: Date.now(),
    kind: BACKUP_KIND,
    scope: "settings",
    version: BACKUP_VERSION,
  };
};

/** Pretty-printed so a backup stays reviewable and diffable. */
export const serializeBackup = (file: BackupFile): string =>
  JSON.stringify(file, null, 2);

/* -------------------------------------------------------------------------
 * Decode.
 * ---------------------------------------------------------------------- */

/** `JSON.parse` that reports failure as `undefined` instead of throwing. */
const parseJson = (text: string): JsonValue | undefined => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

/** Decode a backup file, or `undefined` when the text is not one. */
export const parseBackup = (text: string): ParsedBackup | undefined => {
  const parsed = parseJson(text);

  if (!isJsonObject(parsed)) return undefined;

  if (parsed["kind"] !== BACKUP_KIND) return undefined;

  const exportedAt = isJsonNumber(parsed["exportedAt"]) ? parsed["exportedAt"] : 0;
  const data = parsed["data"];

  if (parsed["scope"] === "settings" && isSettingsBackup(data)) {
    return { data: toSettings(data), exportedAt, scope: "settings" };
  }

  if (parsed["scope"] === "tracking" && isTrackingBackup(data)) {
    return { data: toTracking(data), exportedAt, scope: "tracking" };
  }

  return undefined;
};

/* -------------------------------------------------------------------------
 * Apply.
 * ---------------------------------------------------------------------- */

/**
 * Restore `settings`. Pages hydrate settings once on mount rather than through
 * `storage.onChanged`, so the caller has to reload before they take effect.
 */
export const applySettingsBackup = async (
  data: SettingsBackup,
): Promise<void> => {
  const cleared: string[] = [];

  if (data.accentColor === null) cleared.push("accentColor");

  if (data.lastBookmarkFolderId === null) cleared.push("lastBookmarkFolderId");

  await browser.storage.local.set(data);

  if (cleared.length > 0) await browser.storage.local.remove(cleared);

  // theme-init reads these mirrors before React mounts; without this the
  // reloaded page paints the previous theme for a frame.
  localStorage.setItem("theme", data.theme);
  localStorage.setItem("tagColorMode", data.tagColorMode);
};

/**
 * Restore `tracking`. TrackingContext and the background worker both watch
 * `storage.onChanged`, so the values apply without a reload.
 */
export const applyTrackingBackup = async (
  data: TrackingBackup,
): Promise<void> => {
  await browser.storage.local.set(data);
};
