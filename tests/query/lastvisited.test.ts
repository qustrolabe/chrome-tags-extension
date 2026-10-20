import { describe, expect, test } from "bun:test";
import { applyQuery, createMatchContext, suggest } from "@queryfield/core";
import { appRegistry } from "../../utils/queryRegistry.ts";

type Bookmark = chrome.bookmarks.BookmarkTreeNode;

const NOW = 1_700_000_000_000;
const DAY = 86_400_000;

const bm = (id: string): Bookmark => ({
  id,
  title: id,
  url: `https://example.com/${id}`,
  parentId: "0",
  index: 0,
});

const items = [bm("visited"), bm("untracked")];

/** Only `visited` was ever seen in a tab, two days ago. */
const stats = {
  visited: { visits: 3, score: 3, lastVisited: NOW - 2 * DAY },
};

const ctx = createMatchContext(items, stats, NOW);

const ids = (query: string) =>
  applyQuery(query, items, ctx, appRegistry).map((b) => b.id);

describe("last_visited — tracking-backed date filter", () => {
  test("matches tracked visits by age", () => {
    expect(ids("last_visited:<1w")).toEqual(["visited"]);
    expect(ids("last_visited:>1w")).toEqual([]);
  });

  test("an untracked bookmark matches neither bound", () => {
    // The whole point of treating missing stats as undefined: "older than a
    // year" must not describe something that was never tracked at all.
    expect(ids("last_visited:>1y")).not.toContain("untracked");
    expect(ids("last_visited:<1w")).not.toContain("untracked");
  });

  test("negation keeps the untracked ones", () => {
    expect(ids("-last_visited:<1w")).toEqual(["untracked"]);
  });

  test("a value without a unit is rejected", () => {
    expect(ids("last_visited:<7")).toEqual([]);
  });

  test("is offered by the host registry the search bar uses", () => {
    const inserts = suggest(
      "last_vis",
      8,
      { tags: {}, folderTree: [] },
      appRegistry,
    ).map((s) => s.insert);

    expect(inserts).toContain('last_visited:"');
  });

  test("is suggested next to the other tracking keys", () => {
    const keys = suggest("", 0, { tags: {}, folderTree: [] }, appRegistry)
      .filter((s) => s.type === "key")
      .map((s) => s.label);

    expect(keys[keys.indexOf("last_used:") + 1]).toBe("last_visited:");
    expect(keys[keys.indexOf("last_visited:") + 1]).toBe("visits:");
  });
});
