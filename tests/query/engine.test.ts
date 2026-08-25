import { describe, expect, test } from "bun:test";
import { matchBookmark } from "../../utils/query/engine.ts";
import { parseQuery } from "../../utils/query/parser.ts";
import type { BookmarkLike, MatchContext } from "../../utils/query/types.ts";

const DAY = 86_400_000;
const NOW = 1_800_000_000_000;

const mkBookmark = (overrides: Partial<BookmarkLike> = {}): BookmarkLike => ({
  id: "10",
  title: "Some page #tech",
  url: "https://example.com/page",
  parentId: "5",
  dateAdded: NOW - 2 * DAY,
  dateLastUsed: NOW - 3 * DAY,
  ...overrides,
});

const FOLDERS: Record<string, string> = {
  "1": "Bookmarks Bar",
  "5": "Projects",
  "7": "dev",
};

const mkCtx = (
  overrides: Partial<MatchContext> = {},
): MatchContext => ({
  now: NOW,
  tagsOf: (b) =>
    b.title.split(/\s+/).filter((w) => w.startsWith("#")).map((w) => w.slice(1)),
  ancestorIdsOf: (b) => {
    // test tree: 1 -> 5 -> 7 -> leaf
    const chains: Record<string, string[]> = {
      "5": ["1"],
      "7": ["1", "5"],
      "10": ["1", "5"],
      "11": ["1", "5", "7"],
    };
    return chains[b.id] ?? [];
  },
  folderNameById: new Map(Object.entries(FOLDERS)),
  stats: { "10": { visits: 12, score: 9.4, lastVisited: NOW - DAY } },
  ...overrides,
});

const matches = (query: string, bookmark: BookmarkLike, ctx = mkCtx()) =>
  matchBookmark(parseQuery(query), bookmark, ctx);

describe("engine — terms", () => {
  test("bare term matches title", () => {
    expect(matches("some page", mkBookmark())).toBe(true);
    expect(matches("nonexistent", mkBookmark())).toBe(false);
  });

  test("bare term matches url", () => {
    expect(matches("example.com", mkBookmark())).toBe(true);
  });

  test("negated term excludes", () => {
    expect(matches("-some", mkBookmark())).toBe(false);
    expect(matches("-nope", mkBookmark())).toBe(true);
  });
});

describe("engine — text keys", () => {
  test("tag positive / negative", () => {
    expect(matches("tag:tech", mkBookmark())).toBe(true);
    expect(matches("-tag:tech", mkBookmark())).toBe(false);
    expect(matches("tag:nope", mkBookmark())).toBe(false);
  });

  test("multiple same-key tokens are ANDed", () => {
    const b = mkBookmark({ title: "x #a #b" });
    expect(matches("tag:a tag:b", b)).toBe(true);
    expect(matches("tag:a tag:c", b)).toBe(false);
  });

  test("tag matching is exact per name, not substring", () => {
    expect(matches("tag:game", mkBookmark({ title: "x #gamedev" }))).toBe(false);
    expect(matches("tag:gamedev", mkBookmark({ title: "x #gamedev" }))).toBe(true);
    // wildcard reaches partial names
    expect(matches("tag:game*", mkBookmark({ title: "x #gamedev" }))).toBe(true);
  });

  test("tags are case-insensitive and flat (slash is a normal char)", () => {
    const b = mkBookmark({ title: "x #Godot #gamedev/abc" });
    expect(matches("tag:godot", b)).toBe(true);
    expect(matches("tag:GODOT", b)).toBe(true);
    expect(matches('tag:"gamedev/abc"', b)).toBe(true);
    // flat model: parent name does NOT match child tag
    expect(matches("tag:gamedev", b)).toBe(false);
    // glob escape hatch reaches children
    expect(matches('tag:"gamedev/*"', b)).toBe(true);
  });

  test("url and title substring + glob", () => {
    expect(matches("url:example.com", mkBookmark())).toBe(true);
    expect(matches("url:*page", mkBookmark())).toBe(true);
    expect(matches("title:some *", mkBookmark())).toBe(false); // anchored glob
    expect(matches("title:Some*", mkBookmark())).toBe(true);
  });

  test("folder_strict — direct parent only", () => {
    // bookmark 10 sits directly in folder 5 ("Projects")
    expect(matches('folder_strict:"Projects"', mkBookmark({ id: "10" }))).toBe(true);
    // bookmark 11 is deeper (inside dev inside Projects)
    expect(matches('folder_strict:"Projects"', mkBookmark({ id: "11" }))).toBe(false);
    expect(
      matches('folder_strict:"Projects/dev"', mkBookmark({ id: "11" })),
    ).toBe(true);
  });

  test("folder — recursive", () => {
    expect(matches('folder:"Projects"', mkBookmark({ id: "10" }))).toBe(true);
    expect(matches('folder:"Projects"', mkBookmark({ id: "11" }))).toBe(true);
    expect(matches('folder:"dev"', mkBookmark({ id: "11" }))).toBe(true);
    expect(matches('folder:"dev"', mkBookmark({ id: "10" }))).toBe(false);
  });

  test("folder/folder_strict support wildcards", () => {
    expect(matches('folder_strict:"Pro*"', mkBookmark({ id: "10" }))).toBe(true);
    expect(matches('folder:"Pro*"', mkBookmark({ id: "11" }))).toBe(true);
    expect(matches('folder:"*jects"', mkBookmark({ id: "10" }))).toBe(true);
  });

  test("negated folder excludes subtree", () => {
    expect(matches('-folder:"Projects"', mkBookmark({ id: "11" }))).toBe(false);
  });

  test("root matches top-level folders", () => {
    const rootCtx = mkCtx({
      rootFolderIds: new Set(["1"]), // "Bookmarks Bar" is top-level
    });
    // bookmark 10's parent is folder 5 (Projects, not a root folder)
    expect(
      matches('folder_strict:"root"', mkBookmark({ id: "10" }), rootCtx),
    ).toBe(false);
    // bookmark directly inside Bookmarks Bar
    expect(
      matches('folder_strict:"root"', mkBookmark({ id: "20", parentId: "1" }), rootCtx),
    ).toBe(true);
    // recursive variant reaches deeper bookmarks of a root folder
    expect(matches('in:"root"', mkBookmark({ id: "11" }), rootCtx)).toBe(true);
  });
});

describe("engine — dates", () => {
  test("last_used within bound", () => {
    // added 3 days ago
    expect(matches("last_used:<1w", mkBookmark())).toBe(true);
    expect(matches("last_used:>2d", mkBookmark())).toBe(true);
    expect(matches("last_used:<1d", mkBookmark())).toBe(false);
  });

  test("added combined range", () => {
    // added 2 days ago
    expect(matches("added:>1d<3d", mkBookmark())).toBe(true);
    expect(matches("added:>3d<1y", mkBookmark())).toBe(false);
  });

  test("missing timestamps never match", () => {
    expect(matches("last_used:<1y", mkBookmark({ dateLastUsed: undefined })))
      .toBe(false);
  });

  test("invalid value never matches", () => {
    expect(matches("last_used:<7", mkBookmark())).toBe(false); // missing unit
  });
});

describe("engine — numbers & stats", () => {
  test("visits from tracking stats", () => {
    expect(matches("visits:>10", mkBookmark())).toBe(true);
    expect(matches("visits:>50", mkBookmark())).toBe(false);
    expect(matches("visits:=12", mkBookmark())).toBe(true);
  });

  test("missing stats count as zero", () => {
    expect(matches("visits:<1", mkBookmark({ id: "99" }))).toBe(true);
    expect(matches("visits:>0", mkBookmark({ id: "99" }))).toBe(false);
  });

  test("frecency decays with recency", () => {
    // lastVisited 1 day ago -> age exactly DAY -> factor 0.5 -> score 4.7
    expect(matches("frecency:>4", mkBookmark())).toBe(true);
    expect(matches("frecency:>5", mkBookmark())).toBe(false);
  });

  test("id exact", () => {
    expect(matches("id:10", mkBookmark())).toBe(true);
    expect(matches("id:99", mkBookmark())).toBe(false);
  });
});

describe("engine — combinations", () => {
  test("full realistic query", () => {
    const query =
      'url:"example" tag:"tech" -tag:"web" folder:"Projects" last_used:<1w visits:>5';
    expect(matches(query, mkBookmark())).toBe(true);

    const failing = 'url:"example" tag:"tech" -tag:"web" title:"zzz"';
    expect(matches(failing, mkBookmark())).toBe(false);
  });

  test("empty query matches everything", () => {
    expect(matches("", mkBookmark())).toBe(true);
  });

  test("unknown keys are ignored, not fatal", () => {
    expect(matches("bogus:value some", mkBookmark())).toBe(true);
  });
});
