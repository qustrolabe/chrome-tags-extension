import React, { useMemo, useState } from "react";
import { Dialog } from "radix-ui";
import { extractTags } from "@/utils/query/tags.ts";

type Bookmark = chrome.bookmarks.BookmarkTreeNode;

interface BookmarkEditDialogProps {
    bookmark: Bookmark;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Flat list of all nodes for folder picking; empty disables it. */
    allBookmarks?: Bookmark[];
}

/** A title word that is exactly a #tag token. */
const TAG_TOKEN = /^#[^\s#]+$/;

/** Move all #tags to the right end of the title. */
export const sortTagsRight = (title: string): string => {
    const words = title.trim().split(/\s+/).filter(Boolean);
    const tags = words.filter((w) => TAG_TOKEN.test(w));
    const rest = words.filter((w) => !TAG_TOKEN.test(w));
    return [...rest, ...tags].join(" ");
};

/**
 * Experimental full editor: title, URL, parent folder and a dedicated
 * tag chips UI (tags are #tokens inside the title, so everything edits
 * the same string underneath).
 */
export default function BookmarkEditDialog({
    bookmark,
    open,
    onOpenChange,
    allBookmarks = [],
}: BookmarkEditDialogProps) {
    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-90 bg-black/60" />
                <Dialog.Content className="fixed top-1/2 left-1/2 z-100 max-h-[85vh] w-[680px] max-w-[calc(100vw-2rem)] -translate-1/2 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-xl">
                    {/* Remounts on every open -> state resets naturally. */}
                    {open && (
                        <EditForm
                            bookmark={bookmark}
                            onOpenChange={onOpenChange}
                            allBookmarks={allBookmarks}
                        />
                    )}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

function EditForm({
    bookmark,
    onOpenChange,
    allBookmarks,
}: {
    bookmark: Bookmark;
    onOpenChange: (open: boolean) => void;
    allBookmarks: Bookmark[];
}) {
    const [title, setTitle] = useState(bookmark.title);
    const [url, setUrl] = useState(bookmark.url ?? "");
    const [folderId, setFolderId] = useState(bookmark.parentId ?? "");
    const [newTag, setNewTag] = useState("");
    const [saving, setSaving] = useState(false);

    // Folder navigation state now lives in <FolderPicker> below.

    const tags = useMemo(
        () =>
            Array.from(new Set(extractTags(title).map((t) => t.toLowerCase()))),
        [title],
    );

    const removeTag = (tag: string) => {
        // Remove the FIRST "#tag" token occurrence.
        const idx = title.toLowerCase().indexOf(`#${tag.toLowerCase()}`);
        if (idx === -1) return;
        let end = idx;
        while (end < title.length && !/\s/.test(title[end] ?? "")) end++;
        setTitle(
            (title.slice(0, idx) + " " + title.slice(end))
                .replace(/\s+/g, " ")
                .trim(),
        );
    };

    const addTag = (raw: string) => {
        const tag = raw.trim().replace(/^#/, "").replace(/\s+/g, "");
        if (!tag || tags.includes(tag.toLowerCase())) {
            setNewTag("");
            return;
        }
        const base = sortTagsRight(title).trim();
        setTitle(base ? `${base} #${tag}` : `#${tag}`);
        setNewTag("");
    };

    const tagSuggestions = useMemo(() => {
        if (newTag.trim() === "") return [];
        const prefix = newTag.trim().replace(/^#/, "").toLowerCase();
        const index = new Map<string, number>();
        allBookmarks.forEach((b) => {
            if (b.url === undefined) return;
            extractTags(b.title).forEach((t) => {
                const key = t.toLowerCase();
                index.set(key, (index.get(key) ?? 0) + 1);
            });
        });
        return [...index.entries()]
            .filter(([t]) => t.startsWith(prefix) && !tags.includes(t))
            .sort(([, a], [, b]) => b - a)
            .slice(0, 6)
            .map(([t]) => t);
    }, [newTag, allBookmarks, tags]);

    const dirty =
        title !== bookmark.title ||
        url !== (bookmark.url ?? "") ||
        folderId !== (bookmark.parentId ?? "");

    const save = async () => {
        setSaving(true);
        try {
            if (title !== bookmark.title) {
                await browser.bookmarks.update(bookmark.id, { title });
            }
            if (url !== (bookmark.url ?? "")) {
                await browser.bookmarks.update(bookmark.id, { url });
            }
            if (folderId !== (bookmark.parentId ?? "") && folderId) {
                await browser.bookmarks.move(bookmark.id, {
                    parentId: folderId,
                });
            }
        } finally {
            setSaving(false);
            onOpenChange(false);
        }
    };

    return (
        <div className="grid max-h-[85vh] grid-cols-[260px_1fr] overflow-hidden">
            {/* LEFT: folder navigator */}
            <div className="flex min-h-0 flex-col gap-1 border-r border-border p-4">
                <label className="block text-xs font-medium">
                    Move to
                </label>
                <div className="min-h-0 flex-1">
                    <FolderPicker
                        allBookmarks={allBookmarks}
                        selfId={bookmark.id}
                        value={folderId}
                        onChange={setFolderId}
                    />
                </div>
            </div>

            {/* RIGHT: fields */}
            <div className="flex min-h-0 flex-col overflow-y-auto p-4">
                <Dialog.Title className="text-sm font-bold">
                    Edit bookmark
                </Dialog.Title>
                <Dialog.Description className="mt-0.5 block text-xs text-muted-foreground">
                    Changes apply when you press Save.
                </Dialog.Description>

                {/* Title */}
                <label className="mt-3 block text-xs font-medium">
                    Title
                </label>
                <div className="flex gap-1">
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full rounded-md border border-border bg-input px-2 py-1 text-sm"
                    />
                    <button
                        type="button"
                        title="Move all #tags to the right of the title"
                        disabled={sortTagsRight(title) === title.trim()}
                        onClick={() => setTitle(sortTagsRight(title))}
                        className="shrink-0 cursor-pointer rounded-md bg-secondary px-2 text-xs font-medium transition-colors hover:bg-secondary/80 disabled:cursor-default disabled:opacity-40"
                    >
                        tags →
                    </button>
                </div>

                {/* Tag chips */}
                <label className="mt-3 block text-xs font-medium">
                    Tags
                </label>
                <div className="mt-1 flex flex-wrap items-center gap-1 rounded-md border border-border bg-input/50 p-1.5">
                    {tags.length === 0 && (
                        <span className="px-1 text-xs text-muted-foreground/60">
                            no tags
                        </span>
                    )}
                    {tags.map((tag) => (
                        <span
                            key={tag}
                            className="flex cursor-default items-center gap-1 rounded-[3px] bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary"
                        >
                            #{tag}
                            <button
                                type="button"
                                className="cursor-pointer rounded-sm px-0.5 hover:bg-destructive/30"
                                title={`Remove ${tag}`}
                                onClick={() => removeTag(tag)}
                            >
                                ×
                            </button>
                        </span>
                    ))}
                    <input
                        type="text"
                        value={newTag}
                        placeholder="add tag…"
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                addTag(newTag);
                            }
                        }}
                        className="min-w-[90px] flex-1 bg-transparent px-1 text-xs outline-none placeholder:text-muted-foreground/50"
                    />
                </div>
                {tagSuggestions.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                        {tagSuggestions.map((t) => (
                            <button
                                key={t}
                                type="button"
                                className="cursor-pointer rounded-[3px] bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-muted-foreground/20 hover:text-foreground"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    addTag(t);
                                }}
                            >
                                +#{t}
                            </button>
                        ))}
                    </div>
                )}

                {/* URL */}
                <label className="mt-3 block text-xs font-medium">
                    URL
                </label>
                <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    spellCheck={false}
                    className="w-full rounded-md border border-border bg-input px-2 py-1 font-mono text-xs"
                />

                {/* Actions */}
                <div className="mt-auto flex justify-end gap-2 pt-4">
                    <Dialog.Close asChild>
                        <button
                            type="button"
                            className="cursor-pointer rounded-md bg-secondary px-3 py-1.5 text-xs font-medium transition-colors hover:bg-secondary/80"
                        >
                            Cancel
                        </button>
                    </Dialog.Close>
                    <button
                        type="button"
                        disabled={!dirty || saving}
                        className="cursor-pointer rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/80 disabled:cursor-default disabled:opacity-40"
                        onClick={save}
                    >
                        {saving ? "Saving…" : "Save"}
                    </button>
                </div>
            </div>
        </div>
    );
}
interface FolderNode {
    id: string;
    title: string;
    children: FolderNode[];
}

/** Case-insensitive subsequence match; null when no match. */
const fuzzyMatch = (query: string, text: string): boolean => {
    if (query === "") return true;
    let i = 0;
    const q = query.toLowerCase();
    const t = text.toLowerCase();
    for (const ch of t) {
        if (ch === q[i]) i++;
        if (i === q.length) return true;
    }
    return false;
};

/**
 * Tree navigator for picking a destination folder. Browse by unfolding,
 * or type to fuzzy-filter — matches are then shown as full branch paths.
 */
function FolderPicker(
    { allBookmarks, selfId, value, onChange }: {
        allBookmarks: Bookmark[];
        selfId: string;
        value: string;
        onChange: (id: string) => void;
    },
) {
    const [query, setQuery] = useState("");

    // Build the folder tree once, excluding self + own subtree.
    const tree = useMemo(() => {
        const folders = allBookmarks.filter((b) => b.url === undefined);
        const byId = new Map(folders.map((f) => [f.id, f]));
        const inOwnSubtree = (f: Bookmark): boolean => {
            let cur: Bookmark | undefined = f;
            while (cur) {
                if (cur.id === selfId) return true;
                cur = cur.parentId ? byId.get(cur.parentId) : undefined;
            }
            return false;
        };
        const byParent = new Map<string, Bookmark[]>();
        for (const f of folders) {
            if (inOwnSubtree(f)) continue;
            const key = f.parentId ?? "";
            const list = byParent.get(key) ?? [];
            list.push(f);
            byParent.set(key, list);
        }
        const build = (nodes: Bookmark[]): FolderNode[] =>
            nodes
                .map((f) => ({
                    id: f.id,
                    title: f.title || "…",
                    children: build(byParent.get(f.id) ?? []),
                }))
                .sort((a, b) => a.title.localeCompare(b.title));
        return build(byParent.get("") ?? []);
    }, [allBookmarks, selfId]);

    // Full path for every folder (used by fuzzy search results).
    const pathsById = useMemo(() => {
        const map = new Map<string, string[]>();
        const walk = (node: FolderNode, prefix: string[]) => {
            const path = [...prefix, node.title];
            map.set(node.id, path);
            node.children.forEach((c) => walk(c, path));
        };
        tree.forEach((root) => walk(root, []));
        return map;
    }, [tree]);

    // Start with the bookmark's current location unfolded.
    const [expanded, setExpanded] = useState<Set<string>>(() => {
        const initial = new Set<string>();
        let cur = allBookmarks.find((b) => b.id === value);
        while (cur?.parentId) {
            initial.add(cur.parentId);
            cur = allBookmarks.find((b) => b.id === cur!.parentId);
        }
        return initial;
    });

    const toggle = (id: string) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    // Fuzzy-filtered flat results with full branch paths.
    const matches = useMemo(() => {
        if (query.trim() === "") return [];
        const out: { id: string; path: string[] }[] = [];
        for (const [id, path] of pathsById) {
            if (fuzzyMatch(query.trim(), path.join(" / "))) out.push({ id, path });
        }
        out.sort((a, b) =>
            a.path.join("/").length - b.path.join("/").length ||
            a.path.join("/").localeCompare(b.path.join("/")),
        );
        return out.slice(0, 30);
    }, [query, pathsById]);

    const Row = ({ id }: { id: string }) => (
        <button
            type="button"
            onClick={() => onChange(id)}
            className={`flex w-full cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-left text-xs ${
                id === value
                    ? "bg-primary/20 font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
        >
            {id === value && <span className="text-primary">✓</span>}
            <span className="truncate">
                {(pathsById.get(id) ?? []).join(" / ") || "…"}
            </span>
        </button>
    );

    const renderTree = (nodes: FolderNode[], depth: number) => (
        <>
            {nodes.map((node) => (
                <div key={node.id}>
                    <div
                        className={`flex w-full items-center gap-0.5 rounded px-0.5 ${
                            node.id === value ? "bg-primary/20" : ""
                        }`}
                        style={{ paddingLeft: depth * 12 }}
                    >
                        <button
                            type="button"
                            className={`cursor-pointer rounded p-0.5 text-muted-foreground transition-transform hover:text-foreground ${
                                expanded.has(node.id) ? "rotate-90" : ""
                            } ${node.children.length === 0 ? "invisible" : ""}`}
                            onClick={() => toggle(node.id)}
                            tabIndex={-1}
                        >
                            ▸
                        </button>
                        <Row id={node.id} />
                    </div>
                    {expanded.has(node.id) &&
                        renderTree(node.children, depth + 1)}
                </div>
            ))}
        </>
    );

    return (
        <div className="flex h-full flex-col rounded-md border border-border bg-input/50 p-1">
            <input
                type="text"
                value={query}
                placeholder="search folders…"
                onChange={(e) => setQuery(e.target.value)}
                className="w-full border-b border-border bg-transparent px-2 py-1 text-xs outline-none placeholder:text-muted-foreground/50"
            />
            <div className="mt-1 min-h-0 flex-1 overflow-y-auto">
                {query.trim() !== ""
                    ? matches.map((m) => <Row key={m.id} id={m.id} />)
                    : renderTree(tree, 0)}
            </div>
        </div>
    );
}
