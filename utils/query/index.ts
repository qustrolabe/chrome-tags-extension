export * from "./types.ts";
export * from "./parser.ts";
export * from "./engine.ts";
export * from "./registry.ts";
export * from "./bounds.ts";
export * from "./glob.ts";
export * from "./suggest.ts";
export * from "./editing.ts";

import type { BookmarkLike, MatchContext } from "./types.ts";
import { parseQuery } from "./parser.ts";
import { matchBookmark } from "./engine.ts";
import { extractTags } from "./tags.ts";
import type { SuggestData, Suggestion } from "./suggest.ts";
import { suggest } from "./suggest.ts";

/** Build a MatchContext from a full bookmark tree snapshot. */
export const createMatchContext = (
  allBookmarks: BookmarkLike[],
  stats: MatchContext["stats"],
  now: number = Date.now(),
): MatchContext => {
  const folderNameById = new Map(
    allBookmarks
      .filter((b) => b.url === undefined)
      .map((b) => [b.id, b.title]),
  );
  const ancestorsByNodeId = new Map<string, string[]>();
  const byId = new Map(allBookmarks.map((node) => [node.id, node]));

  return {
    now,
    tagsOf: (b) => extractTags(b.title),
    ancestorIdsOf: (b) => {
      const cached = ancestorsByNodeId.get(b.id);
      if (cached) return cached;
      // Walk parents via the hoisted lookup (built once per snapshot).
      const ids: string[] = [];
      let current = b.parentId ? byId.get(b.parentId) : undefined;
      while (current) {
        ids.push(current.id);
        current = current.parentId ? byId.get(current.parentId) : undefined;
      }
      ids.reverse(); // root -> parent
      ancestorsByNodeId.set(b.id, ids);
      return ids;
    },
    folderNameById,
    stats,
  };
};

/** Convenience: filter bookmarks with a raw query string. */
export const applyQuery = <T extends BookmarkLike>(
  query: string,
  bookmarks: T[],
  ctx: MatchContext,
): T[] => {
  const parsed = parseQuery(query);
  return bookmarks.filter((b) => matchBookmark(parsed, b, ctx));
};

/** Convenience: suggestions for a query + caret. */
export const suggestFor = (
  query: string,
  caret: number,
  data: SuggestData,
): Suggestion[] => suggest(query, caret, data);
