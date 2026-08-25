import React, { useMemo, useState } from "react";
import type { Bookmark, FolderFilter } from "@/context/BookmarksContext";
import { useBookmarks } from "@/context/BookmarksContext";
import {
    AiOutlineFolder,
    AiOutlineFolderOpen,
    AiOutlineMinus,
    AiOutlinePlus,
} from "react-icons/ai";
import { RiArrowDownSLine, RiArrowRightSLine } from "react-icons/ri";

interface FolderNode {
    id: string;
    title: string;
    parentId?: string;
    children: FolderNode[];
}

function buildFolderTree(bookmarks: Bookmark[]): FolderNode[] {
    const folders = bookmarks.filter((b) => b.url === undefined);
    const folderMap = new Map<string, FolderNode>();

    // Create nodes
    folders.forEach((folder) => {
        folderMap.set(folder.id, {
            id: folder.id,
            title: folder.title || "(Untitled)",
            parentId: folder.parentId,
            children: [],
        });
    });

    // Build tree
    const rootNodes: FolderNode[] = [];
    folderMap.forEach((node) => {
        if (node.parentId && folderMap.has(node.parentId)) {
            folderMap.get(node.parentId)!.children.push(node);
        } else {
            rootNodes.push(node);
        }
    });

    return rootNodes;
}

interface FolderItemProps {
    node: FolderNode;
    depth: number;
    expandedIds: Set<string>;
    toggleExpanded: (id: string) => void;
    onFilter: (folderId: string, negative: boolean, strict: boolean) => void;
    getFilterState: (
        folderId: string,
    ) => "positive" | "negative" | "strict" | null;
}

function FolderItem({
    node,
    depth,
    expandedIds,
    toggleExpanded,
    onFilter,
    getFilterState,
}: FolderItemProps) {
    const isExpanded = expandedIds.has(node.id);
    const hasChildren = node.children.length > 0;
    const filterState = getFilterState(node.id);

    return (
        <div>
            <div
                className={`group flex cursor-pointer items-center gap-1 rounded-sm border-l-3 p-1 ${
                    filterState === "positive"
                        ? "border-l-blue-500 bg-blue-500/20 font-medium text-blue-700 dark:text-blue-300"
                        : filterState === "negative"
                        ? "border-l-red-500 bg-red-500/20 text-red-700 line-through opacity-70 dark:text-red-300"
                        : filterState === "strict"
                        ? "border-dashed border-l-teal-500 bg-teal-500/20 font-medium text-teal-700 dark:text-teal-300"
                        : "border-l-transparent hover:bg-muted"
                }`}
                style={{ paddingLeft: `${depth * 12 + 4}px` }}
            >
                {/* Expand/Collapse */}
                <button
                    onClick={() => toggleExpanded(node.id)}
                    className={`rounded p-0.5 hover:bg-muted-foreground/20 ${
                        !hasChildren ? "invisible" : ""
                    }`}
                >
                    {isExpanded
                        ? <RiArrowDownSLine className="size-4" />
                        : <RiArrowRightSLine className="size-4" />}
                </button>

                {/* Folder Icon */}
                {isExpanded
                    ? (
                        <AiOutlineFolderOpen className="size-4 shrink-0 text-muted-foreground" />
                    )
                    : (
                        <AiOutlineFolder className="size-4 shrink-0 text-muted-foreground" />
                    )}

                {/* Title */}
                <span
                    className="flex-1 truncate text-sm"
                    onClick={() => toggleExpanded(node.id)}
                >
                    {node.title}
                </span>

                {/* Filter buttons */}
                <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onFilter(node.id, false, e.altKey);
                        }}
                        className="rounded p-1 text-green-600 hover:bg-green-500/30 dark:text-green-400"
                        title="Add folder filter (Alt+Click for strict)"
                    >
                        <AiOutlinePlus className="size-3" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onFilter(node.id, true, e.altKey);
                        }}
                        className="rounded p-1 text-destructive hover:bg-destructive/30"
                        title="Exclude folder (Alt+Click for strict)"
                    >
                        <AiOutlineMinus className="size-3" />
                    </button>
                </div>
            </div>

            {/* Children */}
            {isExpanded &&
                node.children.map((child) => (
                    <FolderItem
                        key={child.id}
                        node={child}
                        depth={depth + 1}
                        expandedIds={expandedIds}
                        toggleExpanded={toggleExpanded}
                        onFilter={onFilter}
                        getFilterState={getFilterState}
                    />
                ))}
        </div>
    );
}

export default function SidebarFolderTree() {
    const {
        bookmarks: { all: bookmarks },
        filters: { list: filters, add: addFilter, remove: removeFilter },
    } = useBookmarks();

    const [expandedIds, setExpandedIds] = useState<Set<string>>(
        new Set(["0", "1", "2"]),
    );

    const tree = useMemo(() => buildFolderTree(bookmarks), [bookmarks]);

    const toggleExpanded = (id: string) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const getFilterState = (
        folderId: string,
    ): "positive" | "negative" | "strict" | null => {
        const filter = filters.find(
            (f) =>
                (f.type === "folder" || f.type === "strict_folder") &&
                f.folderId === folderId,
        );
        if (!filter) return null;
        if (filter.negative) return "negative";
        if (filter.type === "strict_folder") return "strict";
        return "positive";
    };

    const handleFilter = (
        folderId: string,
        negative: boolean,
        strict: boolean,
    ) => {
        const existing = filters.find(
            (f) =>
                (f.type === "folder" || f.type === "strict_folder") &&
                f.folderId === folderId,
        );

        if (existing) {
            removeFilter(existing);
            // If clicking same type/state, just remove (toggle off).
            // If different, add new.
            const isSameType = (strict && existing.type === "strict_folder") ||
                (!strict && existing.type === "folder");
            const isSameNeg = existing.negative === negative;

            if (!isSameType || !isSameNeg) {
                addFilter({
                    type: strict ? "strict_folder" : "folder",
                    folderId,
                    negative,
                } as any);
            }
        } else {
            addFilter({
                type: strict ? "strict_folder" : "folder",
                folderId,
                negative,
            } as any);
        }
    };

    if (tree.length === 0) {
        return (
            <div className="p-4 text-center text-sm text-muted-foreground">
                No folders found
            </div>
        );
    }

    return (
        <div className="p-2">
            <div className="mb-1 px-2 py-1 text-xs text-muted-foreground">
                + to filter • − to exclude
            </div>
            {tree.map((node) => (
                <FolderItem
                    key={node.id}
                    node={node}
                    depth={0}
                    expandedIds={expandedIds}
                    toggleExpanded={toggleExpanded}
                    onFilter={handleFilter}
                    getFilterState={getFilterState}
                />
            ))}
        </div>
    );
}
