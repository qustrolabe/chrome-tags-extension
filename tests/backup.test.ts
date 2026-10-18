import { describe, expect, test } from "bun:test";
import {
  BACKUP_KIND,
  BACKUP_VERSION,
  parseBackup,
  serializeBackup,
} from "../utils/backup.ts";
import type {
  JsonValue,
  SettingsBackup,
  SettingsBackupFile,
  TrackingBackup,
} from "../utils/backup.ts";

const settings: SettingsBackup = {
  accentColor: "#7c5cff",
  lastBookmarkFolderId: "42",
  savedViews: [{ id: "v1", name: "Recent", query: "last_used:<1w" }],
  sidebarMode: "folders",
  sidebarOpen: true,
  sortDirection: "asc",
  sortOption: "title",
  tableColumnSizing: { title: 220 },
  tableColumnVisibility: { url: false },
  tagColorMode: "v1",
  theme: "dark",
  viewMode: "table",
};

const tracking: TrackingBackup = {
  trackingEnabled: true,
  trackingMaxAge: 10000,
  trackingShowStats: false,
  trackingStats: {
    "10": { lastVisited: 1_700_000_000_000, score: 3.5, visits: 4 },
  },
};

const settingsFile: SettingsBackupFile = {
  appVersion: "0.0.0-test",
  data: settings,
  exportedAt: 1_700_000_000_000,
  kind: BACKUP_KIND,
  scope: "settings",
  version: BACKUP_VERSION,
};

/** Wrap a payload the way an export would, without typing the envelope. */
const wrap = (scope: string, data: JsonValue) =>
  JSON.stringify({
    appVersion: "0.0.0-test",
    data,
    exportedAt: 1_700_000_000_000,
    kind: BACKUP_KIND,
    scope,
    version: BACKUP_VERSION,
  });

describe("parseBackup — accepted", () => {
  test("round-trips a settings backup", () => {
    const parsed = parseBackup(serializeBackup(settingsFile));

    expect(parsed?.scope).toBe("settings");
    expect(parsed?.data).toEqual(settings);
    expect(parsed?.exportedAt).toBe(1_700_000_000_000);
  });

  test("round-trips tracking data", () => {
    const parsed = parseBackup(wrap("tracking", tracking));

    expect(parsed?.scope).toBe("tracking");
    expect(parsed?.data).toEqual(tracking);
  });

  test("ignores unknown keys in the envelope and the payload", () => {
    const parsed = parseBackup(
      JSON.stringify({
        appVersion: "0.0.0-test",
        data: { ...settings, futureSetting: 1 },
        exportedAt: 1,
        extra: "ignored",
        kind: BACKUP_KIND,
        scope: "settings",
        version: BACKUP_VERSION,
      }),
    );

    expect(parsed?.scope).toBe("settings");
    expect(parsed?.data).toEqual(settings);
  });

  test("tolerates a missing exportedAt", () => {
    const parsed = parseBackup(
      JSON.stringify({
        data: settings,
        kind: BACKUP_KIND,
        scope: "settings",
        version: BACKUP_VERSION,
      }),
    );

    expect(parsed?.scope).toBe("settings");
    expect(parsed?.exportedAt).toBe(0);
  });

  test("accepts an empty stats map", () => {
    const parsed = parseBackup(wrap("tracking", { ...tracking, trackingStats: {} }));

    expect(parsed?.data).toEqual({ ...tracking, trackingStats: {} });
  });
});

describe("parseBackup — rejected", () => {
  test("malformed JSON", () => {
    expect(parseBackup("{{{")).toBeUndefined();
  });

  test("JSON that is not an object", () => {
    expect(parseBackup("42")).toBeUndefined();
    expect(parseBackup("null")).toBeUndefined();
    expect(parseBackup("[]")).toBeUndefined();
  });

  test("an unrelated JSON document", () => {
    expect(parseBackup(JSON.stringify({ hello: "world" }))).toBeUndefined();
  });

  test("a foreign kind", () => {
    const foreign = JSON.stringify({
      data: settings,
      kind: "other-tool/backup",
      scope: "settings",
    });

    expect(parseBackup(foreign)).toBeUndefined();
  });

  test("an unknown scope", () => {
    expect(parseBackup(wrap("everything", settings))).toBeUndefined();
  });

  test("a payload that does not match its scope", () => {
    expect(parseBackup(wrap("settings", tracking))).toBeUndefined();
    expect(parseBackup(wrap("tracking", settings))).toBeUndefined();
  });

  test("misspelled or missing fields", () => {
    expect(parseBackup(wrap("settings", { theme: "dark" }))).toBeUndefined();
    expect(parseBackup(wrap("settings", { ...settings, theme: "neon" }))).toBeUndefined();
    expect(parseBackup(wrap("settings", { ...settings, sortOption: "date" }))).toBeUndefined();
    expect(parseBackup(wrap("settings", { ...settings, sidebarOpen: "yes" }))).toBeUndefined();
    expect(parseBackup(wrap("settings", { ...settings, viewMode: null }))).toBeUndefined();
  });

  test("wrong value shapes", () => {
    expect(
      parseBackup(wrap("settings", { ...settings, savedViews: [{ id: "v1" }] })),
    ).toBeUndefined();
    expect(
      parseBackup(wrap("settings", { ...settings, tableColumnSizing: { title: "wide" } })),
    ).toBeUndefined();
    expect(
      parseBackup(wrap("settings", { ...settings, tableColumnVisibility: { url: 1 } })),
    ).toBeUndefined();
    expect(
      parseBackup(wrap("settings", { ...settings, accentColor: 7 })),
    ).toBeUndefined();
  });

  test("a malformed tracking stat", () => {
    expect(
      parseBackup(
        wrap("tracking", {
          ...tracking,
          trackingStats: { "10": { visits: "4" } },
        }),
      ),
    ).toBeUndefined();
  });

  test("tracking options that are not numbers or booleans", () => {
    expect(parseBackup(wrap("tracking", { ...tracking, trackingMaxAge: null }))).toBeUndefined();
    expect(
      parseBackup(wrap("tracking", { ...tracking, trackingEnabled: "yes" })),
    ).toBeUndefined();
  });
});
