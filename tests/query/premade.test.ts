import { describe, expect, test } from "bun:test";
import { matchBookmark, filterBookmarks } from "../../utils/query/engine.ts";
import { parseQuery } from "../../utils/query/parser.ts";
import { suggest } from "../../utils/query/suggest.ts";
import { createMatchContext } from "../../utils/query/index.ts";

/**
 * Premade state: a small bookmark collection with tags, and the user
 * has typed exactly `tag:"` (opening quote, nothing else).
 */
const BOOKMARKS = [
  { id: "1", title: "Godot docs #godot #gamedev", url: "https://docs.godot.org" },
  { id: "2", title: "Rust book #rust #lang", url: "https://doc.rust-lang.org" },
  { id: "3", title: "Hacker News #news", url: "https://news.ycombinator.com" },
];

const CTX = createMatchContext(BOOKMARKS, {}, 1_800_000_000_000);
const DATA = {
  tags: { godot: 1, gamedev: 1, rust: 1, lang: 1, news: 1 },
  folderNames: ["Bookmarks Bar"],
};

const results = (query: string) =>
  filterBookmarks(parseQuery(query), BOOKMARKS, CTX).map((b) => b.id);

describe('premade state: typing tag:"', () => {
  test("incomplete token does not filter anything — bookmarks stay visible", () => {
    expect(results('tag:"')).toEqual(["1", "2", "3"]);
    // same mid-word inside the quotes
    expect(results('tag:"go')).toEqual(["1", "2", "3"]);
    // and with an existing filter alongside
    expect(results('docs tag:"')).toEqual(["1"]);
  });

  test("completed quoted value filters again", () => {
    expect(results('tag:"godot"')).toEqual(["1"]);
  });

  test("suggestions at tag:\" list all tags as quoted completions", () => {
    const s = suggest('tag:"', 5, DATA);
    const values = s.filter((x) => x.type === "value");
    expect(values.length).toBeGreaterThanOrEqual(5);
    for (const tag of ["godot", "gamedev", "rust", "lang", "news"]) {
      expect(values.some((v) => v.insert === `tag:"${tag}"`)).toBe(true);
    }
    // no actions — we're not inside a complete token
    expect(s.every((x) => x.type === "value")).toBe(true);
  });

  test("typing further narrows suggestions and keeps matching bookmarks", () => {
    const query = 'tag:"go';
    // bookmarks unaffected by incomplete token
    expect(results(query)).toEqual(["1", "2", "3"]);
    const s = suggest(query, query.length, DATA);
    expect(s.some((x) => x.insert === 'tag:"godot"')).toBe(true);
    expect(s.every((x) => !x.insert?.includes("rust"))).toBe(true);
  });

  test("accepting a completion yields a filtering query", () => {
    // simulate accept of tag:"godot" from 'tag:"'
    const accepted = 'tag:"godot"';
    expect(matchBookmark(parseQuery(accepted), BOOKMARKS[0], CTX)).toBe(true);
    expect(matchBookmark(parseQuery(accepted), BOOKMARKS[1], CTX)).toBe(false);
  });
});
