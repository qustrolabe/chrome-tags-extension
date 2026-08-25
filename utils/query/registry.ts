import { globMatch, splitSegments } from "./glob.ts";
import { matchesBounds, parseBounds } from "./bounds.ts";
import type {
  BookmarkLike,
  FilterToken,
  MatchContext,
} from "./types.ts";

export type ValueKind = "text" | "date" | "number" | "id";

export interface KeySpec {
  /** Canonical key name used in queries. */
  key: string;
  /** Capsule label shown in suggestions. */
  label: string;
  /** Grey explanatory comment shown under key / value suggestions. */
  description: string;
  kind: ValueKind;
  /**
   * Positive-sense match. Negation is applied by the engine.
   */
  match: (bookmark: BookmarkLike, value: string, ctx: MatchContext) => boolean;
  /** Parse & validate a value; null when invalid. */
  validate?: (value: string) => boolean;
}

const textMatch = (pattern: string, candidates: string[]): boolean =>
  candidates.some((candidate) => globMatch(pattern, candidate));

/**
 * Match a "/"-separated folder pattern chain against a bookmark's ancestry.
 *
 * - Single segment: matched against any single ancestor folder name.
 * - Multi segment ("dev/tools"): segments must match a contiguous run of
 *   folder names along the ancestor path (root -> parent order).
 * - For `strict` chains the LAST segment must be the immediate parent
 *   (bookmarks directly inside, not deeper).
 */
const matchFolderChain = (
  bookmark: BookmarkLike,
  value: string,
  ctx: MatchContext,
  strict: boolean,
): boolean => {
  const segments = splitSegments(value);
  if (segments.length === 0) return false;

  const ancestorIds = ctx.ancestorIdsOf(bookmark);
  const names = ancestorIds
    .map((id) => ctx.folderNameById.get(id))
    .filter((n): n is string => n !== undefined);

  // Try to anchor the chain at each position of the ancestry path.
  for (let offset = 0; offset <= names.length - segments.length; offset++) {
    const ok = segments.every(
      (segment, i) => globMatch(segment, names[offset + i] ?? ""),
    );
    if (!ok) continue;

    if (!strict) return true;
    // strict: chain must end exactly at the immediate parent.
    if (offset + segments.length === names.length) return true;
  }
  return false;
};

const dateMatch = (getter: (b: BookmarkLike) => number | undefined) =>
  (bookmark: BookmarkLike, value: string, ctx: MatchContext): boolean => {
    const bounds = parseBounds(value, { requireUnit: true });
    if (!bounds || bounds.length === 0) return false;
    const timestamp = getter(bookmark);
    if (timestamp === undefined) return false;
    const age = Math.max(0, ctx.now - timestamp);
    return matchesBounds(age, bounds);
  };

const numberMatch = (getter: (b: BookmarkLike, ctx: MatchContext) => number) =>
  (bookmark: BookmarkLike, value: string, ctx: MatchContext): boolean => {
    const bounds = parseBounds(value, { requireUnit: false });
    if (!bounds || bounds.length === 0) return false;
    return matchesBounds(getter(bookmark, ctx), bounds);
  };

/**
 * The key registry. Adding a new filter key = adding one entry here plus
 * suggestion templates if desired — no engine changes required.
 */
export const KEY_SPECS: KeySpec[] = [
  {
    key: "tag",
    label: "tag",
    description: "bookmark tagged #tag in its title",
    kind: "text",
    match: (b, v, ctx) => textMatch(v, ctx.tagsOf(b)),
  },
  {
    key: "url",
    label: "url",
    description: "substring or wildcard match on the URL",
    kind: "text",
    match: (b, v) => (b.url ? textMatch(v, [b.url]) : false),
  },
  {
    key: "title",
    label: "title",
    description: "substring or wildcard match on the title",
    kind: "text",
    match: (b, v) => textMatch(v, [b.title]),
  },
  {
    key: "added",
    label: "added",
    description: "when bookmark was added, e.g. added:<1d",
    kind: "date",
    match: dateMatch((b) => b.dateAdded),
    validate: (v) => parseBounds(v, { requireUnit: true }) !== null,
  },
  {
    key: "last_used",
    label: "last used",
    description: "when last opened, e.g. last_used:>2mo",
    kind: "date",
    match: dateMatch((b) => b.dateLastUsed),
    validate: (v) => parseBounds(v, { requireUnit: true }) !== null,
  },
  {
    key: "visits",
    label: "visits",
    description: "tracked visit count, e.g. visits:>10",
    kind: "number",
    match: numberMatch((b, ctx) => ctx.stats[b.id]?.visits ?? 0),
    validate: (v) => parseBounds(v, { requireUnit: false }) !== null,
  },
  {
    key: "frecency",
    label: "frecency",
    description: "frecency score, e.g. frecency:>5",
    kind: "number",
    match: numberMatch((b, ctx) => {
      const stat = ctx.stats[b.id];
      if (!stat) return 0;
      const HOUR = 3_600_000;
      const DAY = 24 * HOUR;
      const WEEK = 7 * DAY;
      const age = Math.max(0, ctx.now - stat.lastVisited);
      const factor =
        age < HOUR ? 4 : age < DAY ? 2 : age < WEEK ? 0.5 : 0.25;
      return stat.score * factor;
    }),
    validate: (v) => parseBounds(v, { requireUnit: false }) !== null,
  },
  {
    key: "id",
    label: "id",
    description: "numeric bookmark id, e.g. id:123",
    kind: "id",
    match: numberMatch((b) => parseInt(b.id, 10) || 0),
    validate: (v) => parseBounds(v, { requireUnit: false }) !== null,
  },
  {
    key: "folder",
    label: "folder",
    description: "in this folder or any subfolder",
    kind: "text",
    match: (b, v, ctx) => matchFolderChain(b, v, ctx, false),
  },
  {
    key: "folder_strict",
    label: "folder",
    description: "in this folder directly, not deeper",
    kind: "text",
    match: (b, v, ctx) => matchFolderChain(b, v, ctx, true),
  },
];

const specByKey = new Map(KEY_SPECS.map((spec) => [spec.key, spec]));

export const getKeySpec = (key: string): KeySpec | undefined =>
  specByKey.get(key.toLowerCase());

export const findKeySpecsByPrefix = (prefix: string): KeySpec[] =>
  KEY_SPECS.filter((spec) => spec.key.startsWith(prefix.toLowerCase()));

/** Evaluate a single filter token against a bookmark (positive sense flipped by negation). */
export const matchFilterToken = (
  token: FilterToken,
  bookmark: BookmarkLike,
  ctx: MatchContext,
): boolean => {
  const spec = getKeySpec(token.key);
  if (!spec) return true; // unknown keys never exclude anything
  if (spec.validate && !spec.validate(token.value)) return false;
  return spec.match(bookmark, token.value, ctx);
};
