import React, { useEffect, useMemo, useState } from "react";
import {
    AiFillStar,
    AiOutlineFolder,
    AiOutlineFolderOpen,
    AiOutlineMinus,
    AiOutlinePlus,
    AiOutlineStar,
} from "react-icons/ai";
import { RiArrowDownSLine, RiArrowRightSLine } from "react-icons/ri";
import {
    buildFolderTree,
    filterFolderTree,
    folderAncestorIds,
    indexFolderTree,
    type FolderNode,
} from "@/utils/folderTree.ts";

export type FolderFilterState = "positive" | "negative" | "strict" | null;

/** Shared by every surface, so a favorite set in one shows up in all three. */
const FAVORITES_STORAGE_KEY = "folderFavorites";

const ROW_BASE =
    "group flex cursor-pointer items-center gap-1 rounded-sm border-l-3 p-1";

function readFavorites(value: any): Set<string> {
    if (!Array.isArray(value)) return new Set();

    return new Set(value);
}

function rowClassName(
    filterState: FolderFilterState,
    selected: boolean,
): string {
    if (filterState === "positive") {
        return `${ROW_BASE} border-l-token-folder bg-token-folder-fill/20 font-medium text-token-folder`;
    }

    if (filterState === "negative") {
        return `${ROW_BASE} border-l-token-negative bg-token-negative-fill/20 text-token-negative line-through opacity-70`;
    }

    if (filterState === "strict") {
        return `${ROW_BASE} border-dashed border-l-token-folder-strict bg-token-folder-strict-fill/20 font-medium text-token-folder-strict`;
    }

    if (selected) {
        return `${ROW_BASE} border-l-primary bg-primary/20 font-medium text-foreground`;
    }

    return `${ROW_BASE} border-l-transparent hover:bg-muted`;
}

interface FolderRowProps {
    node: FolderNode;
    depth: number;
    expanded: boolean;
    selected: boolean;
    favorite: boolean;
    filterState: FolderFilterState;
    /** Favorites render as a flat shortcut: no chevron, no children. */
    flat?: boolean;
    onToggleExpand: (id: string) => void;
    onSelect?: (id: string) => void;
    onFilter?: (node: FolderNode, negative: boolean, strict: boolean) => void;
    onToggleFavorite: (id: string) => void;
}

function FolderRow({
    node,
    depth,
    expanded,
    selected,
    favorite,
    filterState,
    flat = false,
    onToggleExpand,
    onSelect,
    onFilter,
    onToggleFavorite,
}: FolderRowProps) {
    const hasChildren = node.children.length > 0;

    return (
        <div
            className={rowClassName(filterState, selected)}
            style={{ paddingLeft: `${depth * 6 + 2}px` }}
        >
            {flat
                ? <span className="size-5 shrink-0" />
                : (
                    <button
                        type="button"
                        onClick={() => onToggleExpand(node.id)}
                        title={expanded ? "Collapse" : "Expand"}
                        className={`shrink-0 rounded p-0.5 hover:bg-muted-foreground/20 ${
                            hasChildren ? "" : "invisible"
                        }`}
                    >
                        {expanded
                            ? <RiArrowDownSLine className="size-4" />
                            : <RiArrowRightSLine className="size-4" />}
                    </button>
                )}

            {expanded && !flat
                ? (
                    <AiOutlineFolderOpen className="size-4 shrink-0 text-muted-foreground" />
                )
                : (
                    <AiOutlineFolder className="size-4 shrink-0 text-muted-foreground" />
                )}

            <button
                type="button"
                className="min-w-0 flex-1 truncate border-0 bg-transparent p-0 text-left text-sm"
                title={node.title}
                onClick={() =>
                    onSelect ? onSelect(node.id) : onToggleExpand(node.id)}
            >
                {node.title}
            </button>

            <div className="flex shrink-0 items-center gap-0.5">
                {onFilter && (
                    <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                onFilter(node, false, event.altKey);
                            }}
                            title="Add folder filter (Alt+Click for this folder only • click again to remove)"
                            className="rounded p-1 text-token-folder hover:bg-token-folder-fill/30"
                        >
                            <AiOutlinePlus className="size-3" />
                        </button>
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                onFilter(node, true, event.altKey);
                            }}
                            title="Exclude folder (Alt+Click for this folder only • click again to remove)"
                            className="rounded p-1 text-destructive hover:bg-destructive/30"
                        >
                            <AiOutlineMinus className="size-3" />
                        </button>
                    </div>
                )}

                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        onToggleFavorite(node.id);
                    }}
                    title={favorite ? "Remove from favorites" : "Add to favorites"}
                    aria-label={favorite
                        ? `Remove ${node.title} from favorites`
                        : `Add ${node.title} to favorites`}
                    aria-pressed={favorite}
                    className={`rounded p-1 hover:bg-muted-foreground/20 ${
                        favorite
                            ? "text-primary"
                            : "text-muted-foreground/50 hover:text-foreground"
                    }`}
                >
                    {favorite
                        ? <AiFillStar className="size-3" />
                        : <AiOutlineStar className="size-3" />}
                </button>
            </div>
        </div>
    );
}

export interface FolderTreeProps {
    /** Flat bookmark tree; folders are the nodes without a url. */
    allBookmarks: chrome.bookmarks.BookmarkTreeNode[];
    /** Picker mode: the folder currently chosen. */
    selectedId?: string;
    onSelect?: (id: string) => void;
    /** Hide this folder and its subtree (a folder cannot move into itself). */
    excludeId?: string;
    /** Filter mode: paint rows the query already filters on. */
    getFilterState?: (node: FolderNode) => FolderFilterState;
    /** Filter mode: the + / − row buttons. */
    onFilter?: (node: FolderNode, negative: boolean, strict: boolean) => void;
    /** Keep the browser's synthetic root ("Root") as the top row. */
    includeRoot?: boolean;
    /** Sort folders by title instead of browser order. */
    sortAlphabetically?: boolean;
    /** localStorage key for the expanded set; omit to keep it in memory. */
    persistExpandedKey?: string;
    /** Expanded on first mount when nothing is persisted. */
    defaultExpandedIds?: string[];
    /** Expand the ancestors of this folder whenever the tree changes. */
    revealId?: string;
    /** "picker" adds the bordered panel and the Collapse button. */
    variant?: "picker" | "sidebar";
    emptyLabel?: string;
}

export default function FolderTree({
    allBookmarks,
    selectedId,
    onSelect,
    excludeId,
    getFilterState,
    onFilter,
    includeRoot = false,
    sortAlphabetically = false,
    persistExpandedKey,
    defaultExpandedIds,
    revealId,
    variant = "sidebar",
    emptyLabel = "No folders found",
}: FolderTreeProps) {
    const tree = useMemo(
        () =>
            buildFolderTree(allBookmarks, {
                includeRoot,
                sortAlphabetically,
                excludeId,
            }),
        [allBookmarks, includeRoot, sortAlphabetically, excludeId],
    );

    const byId = useMemo(() => indexFolderTree(tree), [tree]);
    const rootIds = useMemo(() => tree.map((node) => node.id), [tree]);
    const reveal = revealId ?? selectedId;

    const [search, setSearch] = useState("");

    const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
        if (persistExpandedKey !== undefined) {
            try {
                const raw = localStorage.getItem(persistExpandedKey);

                if (raw !== null) {
                    const parsed = JSON.parse(raw);

                    if (Array.isArray(parsed) && parsed.length > 0) {
                        return new Set(parsed);
                    }
                }
            } catch {}
        }

        if (defaultExpandedIds !== undefined) {
            return new Set(defaultExpandedIds);
        }

        if (persistExpandedKey === undefined) return new Set(rootIds);

        return new Set([
            ...rootIds,
            ...folderAncestorIds(byId, reveal ?? ""),
        ]);
    });

    const [favorites, setFavorites] = useState<Set<string>>(new Set());

    // Favorites live in storage.local so the quick-bookmark window and the
    // editors (which do not share a React tree) see the same list.
    useEffect(() => {
        browser.storage.local.get(FAVORITES_STORAGE_KEY).then((result) => {
            setFavorites(readFavorites(result[FAVORITES_STORAGE_KEY]));
        });

        const onChanged = (
            changes: Record<string, { newValue?: any }>,
            area: string,
        ) => {
            if (area !== "local" || !(FAVORITES_STORAGE_KEY in changes)) return;

            setFavorites(
                readFavorites(changes[FAVORITES_STORAGE_KEY]?.newValue),
            );
        };

        browser.storage.onChanged.addListener(onChanged);

        return () => browser.storage.onChanged.removeListener(onChanged);
    }, []);

    // Async editors mount with an empty list; once folders arrive, reopen the
    // roots and the path to the current value.
    useEffect(() => {
        if (persistExpandedKey === undefined) return;

        setExpandedIds((previous) => {
            let next = previous;

            const expand = (id: string) => {
                if (!byId.has(id) || next.has(id)) return;

                if (next === previous) next = new Set(previous);
                next.add(id);
            };

            if (!rootIds.some((id) => next.has(id))) {
                for (const id of rootIds) expand(id);
            }

            for (const id of folderAncestorIds(byId, reveal ?? "")) {
                expand(id);
            }

            return next;
        });
    }, [byId, rootIds, reveal, persistExpandedKey]);

    useEffect(() => {
        if (persistExpandedKey === undefined) return;

        try {
            localStorage.setItem(
                persistExpandedKey,
                JSON.stringify([...expandedIds]),
            );
        } catch {}
    }, [expandedIds, persistExpandedKey]);

    const filtered = useMemo(() => filterFolderTree(tree, search), [tree, search]);
    const forceExpanded = search.trim() !== "";

    const favoriteNodes = useMemo(() => {
        const nodes: FolderNode[] = [];

        for (const id of favorites) {
            const node = byId.get(id);

            if (node) nodes.push(node);
        }

        return nodes;
    }, [favorites, byId]);

    const toggleExpanded = (id: string) => {
        setExpandedIds((previous) => {
            const next = new Set(previous);

            if (next.has(id)) next.delete(id);
            else next.add(id);

            return next;
        });
    };

    const toggleFavorite = (id: string) => {
        const next = new Set(favorites);

        if (next.has(id)) next.delete(id);
        else next.add(id);

        setFavorites(next);
        browser.storage.local
            .set({ [FAVORITES_STORAGE_KEY]: [...next] })
            .catch(() => {});
    };

    const collapseToRoots = () => {
        setExpandedIds(new Set(rootIds));
    };

    const renderNode = (node: FolderNode, depth: number): React.ReactNode => {
        const expanded = forceExpanded || expandedIds.has(node.id);

        return (
            <div key={node.id}>
                <FolderRow
                    node={node}
                    depth={depth}
                    expanded={expanded}
                    selected={onSelect !== undefined && node.id === selectedId}
                    favorite={favorites.has(node.id)}
                    filterState={getFilterState ? getFilterState(node) : null}
                    onToggleExpand={toggleExpanded}
                    onSelect={onSelect}
                    onFilter={onFilter}
                    onToggleFavorite={toggleFavorite}
                />
                {expanded && node.children.map((child) => renderNode(child, depth + 1))}
            </div>
        );
    };

    const rows = (
        <>
            {favoriteNodes.length > 0 && (
                <div className="mb-1 border-b border-border pb-1">
                    <div className="px-2 py-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                        Favorites
                    </div>
                    {favoriteNodes.map((node) => (
                        <FolderRow
                            key={`favorite-${node.id}`}
                            node={node}
                            depth={0}
                            flat
                            expanded={false}
                            selected={onSelect !== undefined && node.id === selectedId}
                            favorite
                            filterState={getFilterState ? getFilterState(node) : null}
                            onToggleExpand={toggleExpanded}
                            onSelect={onSelect}
                            onFilter={onFilter}
                            onToggleFavorite={toggleFavorite}
                        />
                    ))}
                </div>
            )}

            {tree.length === 0
                ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                        {emptyLabel}
                    </div>
                )
                : filtered.map((node) => renderNode(node, 0))}
        </>
    );

    if (variant === "picker") {
        return (
            <div className="flex h-full flex-col rounded-md border border-border bg-input/50 p-1">
                <div className="flex items-center justify-between border-b border-border px-1 pb-1">
                    <input
                        type="text"
                        value={search}
                        placeholder="search folders…"
                        onChange={(event) => setSearch(event.target.value)}
                        className="min-w-0 flex-1 bg-transparent p-1 text-xs outline-none placeholder:text-muted-foreground/50"
                    />
                    <button
                        type="button"
                        onClick={collapseToRoots}
                        title="Collapse to top-level folders"
                        className="shrink-0 cursor-pointer rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                        Collapse
                    </button>
                </div>
                <div className="scrollbar-slim mt-1 min-h-0 flex-1 overflow-y-auto">
                    {rows}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col p-2">
            <input
                type="text"
                value={search}
                placeholder="search folders…"
                onChange={(event) => setSearch(event.target.value)}
                className="mb-1 w-full rounded-md border border-border bg-input px-2 py-1 text-xs outline-none placeholder:text-muted-foreground/50"
            />
            <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto">
                {rows}
            </div>
        </div>
    );
}
