import { describe, it, expect } from "bun:test";
import { applyFilter } from "../context/BookmarksContext";
import type { Filter } from "../context/BookmarksContext";

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

const noAncestors = new Map<string, Set<string>>();

describe("applyFilter — tag", () => {
  const bookmarks: Bookmark[] = [
    bm({ id: "1", title: "Hello #typescript world" }),
    bm({ id: "2", title: "No tags here" }),
    bm({ id: "3", title: "#typescript #react" }),
  ];

  it("matches bookmarks containing the tag", () => {
    const f: Filter = { type: "tag", tag: "typescript", negative: false };
    const result = applyFilter(f, bookmarks, noAncestors);
    expect(result.map((b) => b.id)).toEqual(["1", "3"]);
  });

  it("excludes matching bookmarks when negative=true", () => {
    const f: Filter = { type: "tag", tag: "typescript", negative: true };
    const result = applyFilter(f, bookmarks, noAncestors);
    expect(result.map((b) => b.id)).toEqual(["2"]);
  });
});

describe("applyFilter — title", () => {
  const bookmarks: Bookmark[] = [
    bm({ id: "1", title: "React guide" }),
    bm({ id: "2", title: "Vue handbook" }),
  ];

  it("matches by title substring (case-insensitive)", () => {
    const f: Filter = { type: "title", title: "react", negative: false };
    expect(applyFilter(f, bookmarks, noAncestors).map((b) => b.id)).toEqual(["1"]);
  });

  it("negative title filter excludes matching", () => {
    const f: Filter = { type: "title", title: "react", negative: true };
    expect(applyFilter(f, bookmarks, noAncestors).map((b) => b.id)).toEqual(["2"]);
  });
});

describe("applyFilter — url", () => {
  const bookmarks: Bookmark[] = [
    bm({ id: "1", title: "A", url: "https://github.com/foo" }),
    bm({ id: "2", title: "B", url: "https://example.com" }),
  ];

  it("matches by url substring", () => {
    const f: Filter = { type: "url", url: "github", negative: false };
    expect(applyFilter(f, bookmarks, noAncestors).map((b) => b.id)).toEqual(["1"]);
  });

  it("negative url filter excludes matching", () => {
    const f: Filter = { type: "url", url: "github", negative: true };
    expect(applyFilter(f, bookmarks, noAncestors).map((b) => b.id)).toEqual(["2"]);
  });
});

describe("applyFilter — folder (recursive)", () => {
  // ancestors: bm "3" lives inside folder "f1" (which is inside "root")
  const ancestors = new Map<string, Set<string>>([
    ["f1", new Set(["root"])],
    ["3", new Set(["root", "f1"])],
    ["4", new Set(["root"])],
  ]);
  const bookmarks: Bookmark[] = [
    bm({ id: "3", title: "Inside f1", parentId: "f1" }),
    bm({ id: "4", title: "Inside root only", parentId: "root" }),
  ];

  it("matches descendants of the specified folder", () => {
    const f: Filter = { type: "folder", folderId: "f1", negative: false };
    expect(applyFilter(f, bookmarks, ancestors).map((b) => b.id)).toEqual(["3"]);
  });

  it("negative folder filter excludes descendants", () => {
    const f: Filter = { type: "folder", folderId: "f1", negative: true };
    expect(applyFilter(f, bookmarks, ancestors).map((b) => b.id)).toEqual(["4"]);
  });
});

describe("applyFilter — strict_folder", () => {
  const bookmarks: Bookmark[] = [
    bm({ id: "1", title: "Child", parentId: "folder-a" }),
    bm({ id: "2", title: "Other", parentId: "folder-b" }),
  ];

  it("matches only direct children of the folder", () => {
    const f: Filter = { type: "strict_folder", folderId: "folder-a", negative: false };
    expect(applyFilter(f, bookmarks, noAncestors).map((b) => b.id)).toEqual(["1"]);
  });

  it("negative strict_folder excludes direct children", () => {
    const f: Filter = { type: "strict_folder", folderId: "folder-a", negative: true };
    expect(applyFilter(f, bookmarks, noAncestors).map((b) => b.id)).toEqual(["2"]);
  });
});

describe("applyFilter — any", () => {
  const bookmarks: Bookmark[] = [
    bm({ id: "1", title: "React docs", url: "https://react.dev" }),
    bm({ id: "2", title: "Vue docs", url: "https://vuejs.org" }),
    bm({ id: "3", title: "Something", url: "https://react-query.tanstack.com" }),
  ];

  it("matches title or url", () => {
    const f: Filter = { type: "any", value: "react", negative: false };
    expect(applyFilter(f, bookmarks, noAncestors).map((b) => b.id)).toEqual(["1", "3"]);
  });

  it("negative any filter excludes matches", () => {
    const f: Filter = { type: "any", value: "react", negative: true };
    expect(applyFilter(f, bookmarks, noAncestors).map((b) => b.id)).toEqual(["2"]);
  });
});
