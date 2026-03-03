import { describe, it, expect } from "bun:test";
import { sortBookmarks } from "../context/BookmarksContext";

type Bookmark = chrome.bookmarks.BookmarkTreeNode;

const bm = (
  partial: Partial<Bookmark> & { id: string },
): Bookmark => ({
  title: "",
  index: 0,
  dateAdded: 0,
  parentId: "0",
  ...partial,
});

const A = bm({ id: "1", title: "Apple", dateAdded: 1000, dateLastUsed: 300 });
const B = bm({ id: "2", title: "Banana", dateAdded: 3000, dateLastUsed: 100 });
const C = bm({ id: "3", title: "Cherry", dateAdded: 2000, dateLastUsed: 200 });

describe("sortBookmarks — dateAdded", () => {
  it("desc: newest first", () => {
    const result = sortBookmarks([A, B, C], "dateAdded", "desc");
    expect(result.map((b) => b.id)).toEqual(["2", "3", "1"]);
  });

  it("asc: oldest first", () => {
    const result = sortBookmarks([A, B, C], "dateAdded", "asc");
    expect(result.map((b) => b.id)).toEqual(["1", "3", "2"]);
  });
});

describe("sortBookmarks — dateLastUsed", () => {
  it("desc: most recently used first", () => {
    const result = sortBookmarks([A, B, C], "dateLastUsed", "desc");
    expect(result.map((b) => b.id)).toEqual(["1", "3", "2"]);
  });

  it("asc: least recently used first", () => {
    const result = sortBookmarks([A, B, C], "dateLastUsed", "asc");
    expect(result.map((b) => b.id)).toEqual(["2", "3", "1"]);
  });
});

describe("sortBookmarks — title", () => {
  it("desc: Z→A", () => {
    const result = sortBookmarks([A, B, C], "title", "desc");
    expect(result.map((b) => b.title)).toEqual(["Cherry", "Banana", "Apple"]);
  });

  it("asc: A→Z", () => {
    const result = sortBookmarks([A, B, C], "title", "asc");
    expect(result.map((b) => b.title)).toEqual(["Apple", "Banana", "Cherry"]);
  });
});

describe("sortBookmarks — id", () => {
  it("desc: lexicographically largest id first", () => {
    const result = sortBookmarks([A, B, C], "id", "desc");
    expect(result.map((b) => b.id)).toEqual(["3", "2", "1"]);
  });

  it("asc: lexicographically smallest id first", () => {
    const result = sortBookmarks([A, B, C], "id", "asc");
    expect(result.map((b) => b.id)).toEqual(["1", "2", "3"]);
  });
});

describe("sortBookmarks — does not mutate input", () => {
  it("returns a new array", () => {
    const input = [A, B, C];
    const result = sortBookmarks(input, "title", "asc");
    expect(result).not.toBe(input);
  });
});
