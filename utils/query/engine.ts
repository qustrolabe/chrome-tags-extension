import { matchFilterToken } from "./registry.ts";
import type {
  BookmarkLike,
  MatchContext,
  ParsedQuery,
} from "./types.ts";

/** True when a bookmark matches one token (negation applied). */
const matchToken = (
  token: ParsedQuery["tokens"][number],
  bookmark: BookmarkLike,
  ctx: MatchContext,
): boolean => {
  const positive =
    token.kind === "term"
      ? (bookmark.title.toLowerCase().includes(token.text.toLowerCase()) ||
        (bookmark.url?.toLowerCase().includes(token.text.toLowerCase()) ??
          false))
      : matchFilterToken(token, bookmark, ctx);
  return positive !== token.negated;
};

/**
 * A bookmark matches the whole query when it matches every token
 * (AND semantics; multiple values for the same key are ANDed,
 * negated tokens exclude).
 */
export const matchBookmark = (
  parsed: ParsedQuery,
  bookmark: BookmarkLike,
  ctx: MatchContext,
): boolean => parsed.tokens.every((token) => matchToken(token, bookmark, ctx));

export const filterBookmarks = <T extends BookmarkLike>(
  parsed: ParsedQuery,
  bookmarks: T[],
  ctx: MatchContext,
): T[] => bookmarks.filter((bookmark) => matchBookmark(parsed, bookmark, ctx));
