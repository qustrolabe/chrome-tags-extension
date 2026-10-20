/**
 * Folder-tree shaping shared by the sidebar folder list and both bookmark
 * editors. Pure data only: building, searching and walking the tree.
 */

export type FolderBookmark = chrome.bookmarks.BookmarkTreeNode;

export interface FolderNode {
    id: string;
    title: string;
    parentId?: string;
    children: FolderNode[];
}

export interface FolderTreeOptions {
    /** Keep the browser's synthetic root ("Root") as the top row. */
    includeRoot?: boolean;
    /** Sort every level by title instead of browser order. */
    sortAlphabetically?: boolean;
    /** Drop this folder and everything below it (a folder cannot move into itself). */
    excludeId?: string;
}

const isFolder = (node: FolderBookmark): boolean => node.url === undefined;

/** Every folder id in `excludeId`'s subtree, the folder itself included. */
function folderSubtreeIds(
    bookmarks: FolderBookmark[],
    excludeId: string,
): Set<string> {
    const childrenByParent = new Map<string, string[]>();

    for (const node of bookmarks) {
        if (!isFolder(node) || node.parentId === undefined) continue;

        const siblings = childrenByParent.get(node.parentId) ?? [];

        siblings.push(node.id);
        childrenByParent.set(node.parentId, siblings);
    }

    const ids = new Set<string>();
    const stack = [excludeId];

    while (stack.length > 0) {
        const id = stack.pop();

        if (id === undefined || ids.has(id)) continue;

        ids.add(id);

        for (const child of childrenByParent.get(id) ?? []) stack.push(child);
    }

    return ids;
}

function sortFolderTree(nodes: FolderNode[]): void {
    nodes.sort((a, b) => a.title.localeCompare(b.title));

    for (const node of nodes) sortFolderTree(node.children);
}

export function buildFolderTree(
    bookmarks: FolderBookmark[],
    { includeRoot = false, sortAlphabetically = false, excludeId }: FolderTreeOptions = {},
): FolderNode[] {
    const excluded = excludeId === undefined
        ? new Set<string>()
        : folderSubtreeIds(bookmarks, excludeId);

    const nodes = new Map<string, FolderNode>();

    for (const folder of bookmarks) {
        if (!isFolder(folder) || excluded.has(folder.id)) continue;

        const fallback = folder.id === "0" ? "Root" : "…";

        nodes.set(folder.id, {
            id: folder.id,
            title: folder.title || fallback,
            parentId: folder.parentId,
            children: [],
        });
    }

    const roots: FolderNode[] = [];

    for (const node of nodes.values()) {
        const parent = node.parentId === undefined
            ? undefined
            : nodes.get(node.parentId);

        if (parent) parent.children.push(node);
        else roots.push(node);
    }

    if (sortAlphabetically) sortFolderTree(roots);

    if (includeRoot) return roots;

    // Editors pick a destination, not the browser itself: the synthetic root
    // is not a folder you can move into, so its children are the top level.
    return roots.flatMap((root) => root.children);
}

/**
 * Keep folders whose name matches `query`, plus their ancestors. Children of a
 * match stay visible because the matching branches render expanded.
 */
export function filterFolderTree(
    nodes: FolderNode[],
    query: string,
): FolderNode[] {
    const needle = query.trim().toLowerCase();

    if (needle === "") return nodes;

    const keepMatching = (list: FolderNode[]): FolderNode[] => {
        const result: FolderNode[] = [];

        for (const node of list) {
            const children = keepMatching(node.children);

            if (node.title.toLowerCase().includes(needle) || children.length > 0) {
                result.push({ ...node, children });
            }
        }

        return result;
    };

    return keepMatching(nodes);
}

export function indexFolderTree(nodes: FolderNode[]): Map<string, FolderNode> {
    const byId = new Map<string, FolderNode>();
    const stack = [...nodes];

    while (stack.length > 0) {
        const node = stack.pop();

        if (node === undefined) continue;

        byId.set(node.id, node);

        for (const child of node.children) stack.push(child);
    }

    return byId;
}

/** Parent ids of `id`, nearest first; stops at the top row of this tree. */
export function folderAncestorIds(
    byId: ReadonlyMap<string, FolderNode>,
    id: string,
): string[] {
    const ids: string[] = [];
    let current = byId.get(id);

    while (current?.parentId !== undefined) {
        const parent = byId.get(current.parentId);

        if (parent === undefined) break;

        ids.push(parent.id);
        current = parent;
    }

    return ids;
}
