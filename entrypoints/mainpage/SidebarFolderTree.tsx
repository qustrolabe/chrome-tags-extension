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
                className={`flex items-center gap-1 py-1 px-1 rounded-sm group cursor-pointer border-l-3 ${
                    filterState === "positive"
                        ? "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-l-blue-500 font-medium"
                        : filterState === "negative"
                        ? "bg-red-500/20 text-red-700 dark:text-red-300 border-l-red-500 line-through opacity-70"
                        : filterState === "strict"
                        ? "bg-teal-500/20 text-teal-700 dark:text-teal-300 border-l-teal-500 font-medium border-dashed"
                        : "hover:bg-muted border-l-transparent"
                }`}
                style={{ paddingLeft: `${depth * 12 + 4}px` }}
            >
                {/* Expand/Collapse */}
                <button
                    onClick={() => toggleExpanded(node.id)}
                    className={`p-0.5 rounded hover:bg-muted-foreground/20 ${
                        !hasChildren ? "invisible" : ""
                    }`}
                >
                    {isExpanded
                        ? <RiArrowDownSLine className="w-4 h-4" />
                        : <RiArrowRightSLine className="w-4 h-4" />}
                </button>

                {/* Folder Icon */}
                {isExpanded
                    ? (
                        <AiOutlineFolderOpen className="w-4 h-4 text-muted-foreground shrink-0" />
                    )
                    : (
                        <AiOutlineFolder className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}

                {/* Title */}
                <span
                    className="flex-1 truncate text-sm"
                    onClick={() => toggleExpanded(node.id)}
                >
                    {node.title}
                </span>

                {/* Filter buttons */}
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onFilter(node.id, false, e.altKey);
                        }}
                        className="p-1 rounded hover:bg-green-500/30 text-green-600 dark:text-green-400"
                        title="Add folder filter (Alt+Click for strict)"
                    >
                        <AiOutlinePlus className="w-3 h-3" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onFilter(node.id, true, e.altKey);
                        }}
                        className="p-1 rounded hover:bg-destructive/30 text-destructive"
                        title="Exclude folder (Alt+Click for strict)"
                    >
                        <AiOutlineMinus className="w-3 h-3" />
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
            <div className="p-4 text-sm text-muted-foreground text-center">
                No folders found
            </div>
        );
    }

    return (
        <div className="p-2">
            <div className="text-xs text-muted-foreground px-2 py-1 mb-1">
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
