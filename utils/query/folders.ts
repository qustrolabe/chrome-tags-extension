import type { BookmarkLike } from "./types.ts";
import { patternMatch } from "./glob.ts";

/**
 * Folder tree used for suggestions.
 *
 * Built once per bookmark snapshot; lets us answer "what are the
 * subfolders of X" without rescanning bookmarks, and lets folder
 * suggestions be scoped by folder tokens already in the query.
 */
export interface FolderSuggestNode {
  name: string;
  children: FolderSuggestNode[];
}

/** Build the folder tree from a bookmark snapshot. */
export const buildFolderTree = (
  bookmarks: BookmarkLike[],
): FolderSuggestNode[] => {
  const byId = new Map<string, FolderSuggestNode>();
  const parentOf = new Map<string, string>();

  for (const bookmark of bookmarks) {
    if (bookmark.url !== undefined) continue;
    byId.set(bookmark.id, { name: bookmark.title, children: [] });
    if (bookmark.parentId) parentOf.set(bookmark.id, bookmark.parentId);
  }

  const roots: FolderSuggestNode[] = [];
  for (const [id, node] of byId) {
    const parentId = parentOf.get(id);
    const parent = parentId ? byId.get(parentId) : undefined;
    if (parent && parent !== node) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
};

/**
 * Resolve a segment chain (globs allowed) starting under the given
 * root nodes. Returns every node reachable by matching the chain.
 */
export const resolveChain = (
  roots: FolderSuggestNode[],
  segments: string[],
): FolderSuggestNode[] => {
  let current = roots;
  for (const segment of segments) {
    const next = current.flatMap((node) =>
      node.children.filter((child) => patternMatch(segment, child.name)),
    );
    if (next.length === 0) return [];
    current = next;
  }
  return current;
};

/** Unique child names of the given nodes. */
export const childNames = (nodes: FolderSuggestNode[]): string[] => [
  ...new Set(nodes.flatMap((node) => node.children.map((c) => c.name))),
];

/** Unique names of the nodes and all their descendants. */
export const descendantNames = (nodes: FolderSuggestNode[]): string[] => {
  const names = new Set<string>();
  const visit = (node: FolderSuggestNode) => {
    names.add(node.name);
    node.children.forEach(visit);
  };
  nodes.forEach(visit);
  return [...names];
};

/** Flatten the whole tree into a node list (for anywhere-anchored chains). */
export const allNodes = (nodes: FolderSuggestNode[]): FolderSuggestNode[] => {
  const out: FolderSuggestNode[] = [];
  const visit = (node: FolderSuggestNode) => {
    out.push(node);
    node.children.forEach(visit);
  };
  nodes.forEach(visit);
  return out;
};
