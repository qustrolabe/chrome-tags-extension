/**
 * Core types for the bookmark query language.
 *
 * A query is a plain string, e.g.:
 *   url:"google" tag:"tech" -tag:"web" last_used:<1w visits:>10
 *
 * It parses into tokens; each token has its position in the raw string so
 * the suggestion engine can operate on caret position.
 */

/** A bare term (no key) — matches title or url substring. */
export interface TermToken {
  kind: "term";
  negated: boolean;
  text: string;
  /** [start, end) offsets in the raw query string. */
  start: number;
  end: number;
}

export type FilterToken = {
  kind: "filter";
  key: string;
  value: string;
  negated: boolean;
  /** Original value was quoted; keep quoting on re-serialization. */
  quoted?: boolean;
  /**
   * Unterminated quoted value (e.g. typing `tag:"new`). Incomplete
   * tokens never filter anything and never trigger token-actions.
   */
  incomplete?: boolean;
  start: number;
  end: number;
};

export type QueryToken = TermToken | FilterToken;

export interface ParsedQuery {
  tokens: QueryToken[];
  /** Syntax errors found while parsing (valueless tokens etc). */
  errors: string[];
}

/** Context needed to match a bookmark against a query. */
export interface MatchContext {
  now: number;
  /** Tag extraction, e.g. "#foo bar" -> ["foo"]. */
  tagsOf: (bookmark: BookmarkLike) => string[];
  /** Folder id chain from root to immediate parent (exclusive of the node itself). */
  ancestorIdsOf: (bookmark: BookmarkLike) => string[];
  /** Ids of top-level folders (direct children of the browser root). */
  rootFolderIds?: Set<string>;
  /** Folder name lookup by id. */
  folderNameById: Map<string, string>;
  stats: Record<string, { visits: number; score: number; lastVisited: number }>;
}

/** Minimal structural shape we need from chrome.bookmarks.BookmarkTreeNode. */
export interface BookmarkLike {
  id: string;
  title: string;
  url?: string;
  parentId?: string;
  dateAdded?: number;
  dateLastUsed?: number;
}
