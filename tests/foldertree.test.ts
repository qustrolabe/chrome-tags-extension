import { describe, expect, test } from "bun:test";
import {
    buildFolderTree,
    filterFolderTree,
    folderAncestorIds,
    indexFolderTree,
} from "../utils/folderTree.ts";

type Bookmark = chrome.bookmarks.BookmarkTreeNode;

const folder = (
    id: string,
    title: string,
    parentId?: string,
): Bookmark => ({ id, title, parentId, index: 0, dateAdded: 0 });

const bookmark = (id: string, parentId: string): Bookmark => ({
    id,
    title: `bookmark ${id}`,
    parentId,
    index: 0,
    dateAdded: 0,
    url: "https://example.com",
});

const FLAT: Bookmark[] = [
    folder("0", ""),
    folder("1", "Bookmarks bar", "0"),
    folder("10", "Work", "1"),
    folder("11", "Zeta", "1"),
    folder("2", "Other", "0"),
    folder("20", "Alpha", "2"),
    bookmark("b1", "10"),
];

describe("buildFolderTree", () => {
    test("hides the synthetic root unless asked", () => {
        const tree = buildFolderTree(FLAT);

        expect(tree.map((node) => node.id)).toEqual(["1", "2"]);
        expect(tree[0].children.map((node) => node.id)).toEqual(["10", "11"]);
    });

    test("includeRoot keeps Root as the only top row", () => {
        const tree = buildFolderTree(FLAT, { includeRoot: true });

        expect(tree).toHaveLength(1);
        expect(tree[0].title).toBe("Root");
        expect(tree[0].children.map((node) => node.id)).toEqual(["1", "2"]);
    });

    test("sortAlphabetically sorts every level", () => {
        const tree = buildFolderTree(FLAT, { sortAlphabetically: true });

        expect(tree.map((node) => node.title)).toEqual([
            "Bookmarks bar",
            "Other",
        ]);
        expect(tree[0].children.map((node) => node.title)).toEqual([
            "Work",
            "Zeta",
        ]);
        expect(tree[1].children.map((node) => node.title)).toEqual(["Alpha"]);
    });

    test("excludeId drops the folder and its subtree", () => {
        const tree = buildFolderTree(FLAT, { excludeId: "1" });

        expect(tree.map((node) => node.id)).toEqual(["2"]);
        expect(tree[0].children.map((node) => node.id)).toEqual(["20"]);
    });

    test("bookmarks never become tree nodes", () => {
        const tree = buildFolderTree(FLAT, { includeRoot: true });

        expect(indexFolderTree(tree).has("b1")).toBe(false);
    });
});

describe("filterFolderTree", () => {
    const tree = buildFolderTree(FLAT);

    test("empty query is a no-op", () => {
        expect(filterFolderTree(tree, "   ")).toBe(tree);
    });

    test("keeps matches and their ancestors", () => {
        const filtered = filterFolderTree(tree, "alpha");

        expect(filtered.map((node) => node.id)).toEqual(["2"]);
        expect(filtered[0].children.map((node) => node.id)).toEqual(["20"]);
    });

    test("a matching parent keeps only its matching descendants", () => {
        const filtered = filterFolderTree(tree, "bookmarks");

        expect(filtered.map((node) => node.id)).toEqual(["1"]);
        expect(filtered[0].children).toEqual([]);
    });
});

describe("folderAncestorIds", () => {
    test("walks up to the top visible row", () => {
        const byId = indexFolderTree(buildFolderTree(FLAT));

        expect(folderAncestorIds(byId, "10")).toEqual(["1"]);
        expect(folderAncestorIds(byId, "20")).toEqual(["2"]);
        expect(folderAncestorIds(byId, "1")).toEqual([]);
        expect(folderAncestorIds(byId, "missing")).toEqual([]);
    });
});
