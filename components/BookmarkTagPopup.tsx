import React, { useEffect, useMemo, useRef, useState } from "react";
import { Dialog } from "radix-ui";
import { AiOutlinePlus, AiOutlineMinus } from "react-icons/ai";
import { extractTags, buildTagIndex } from "@/utils/query/tags.ts";
import { sortTagsRight } from "@/components/BookmarkEditDialog.tsx";

type Bookmark = chrome.bookmarks.BookmarkTreeNode;

interface BookmarkTagPopupProps {
    bookmark: Bookmark;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    allBookmarks?: Bookmark[];
}

export default function BookmarkTagPopup({
    bookmark,
    open,
    onOpenChange,
    allBookmarks = [],
}: BookmarkTagPopupProps) {
    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-90 bg-black/60" />
                <Dialog.Content
                    onOpenAutoFocus={(e) => e.preventDefault()}
                    className="fixed top-1/2 left-1/2 z-100 flex max-h-[calc(100vh-2rem)] w-[520px] max-w-[calc(100vw-2rem)] -translate-1/2 flex-col overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground"
                >
                    {open && (
                        <TagForm
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

function TagForm({
    bookmark,
    onOpenChange,
    allBookmarks,
}: {
    bookmark: Bookmark;
    onOpenChange: (open: boolean) => void;
    allBookmarks: Bookmark[];
}) {
    const [title, setTitle] = useState(bookmark.title);
    const [tagSearch, setTagSearch] = useState("");
    const [saving, setSaving] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Focus tag search on open (not title)
        requestAnimationFrame(() => searchRef.current?.focus());
    }, []);

    const tags = useMemo(
        () => Array.from(new Set(extractTags(title).map((t) => t.toLowerCase()))),
        [title],
    );
    const tagSet = useMemo(() => new Set(tags), [tags]);

    const removeTag = (tag: string) => {
        const idx = title.toLowerCase().indexOf(`#${tag.toLowerCase()}`);
        if (idx === -1) return;
        let end = idx;
        while (end < title.length && !/\s/.test(title[end] ?? "")) end++;
        setTitle(
            (title.slice(0, idx) + " " + title.slice(end)).replace(/\s+/g, " ").trim(),
        );
    };

    const addTag = (raw: string) => {
        const tag = raw.trim().replace(/^#/, "").replace(/\s+/g, "");
        if (!tag || tagSet.has(tag.toLowerCase())) return;
        const base = sortTagsRight(title).trim();
        setTitle(base ? `${base} #${tag}` : `#${tag}`);
    };

    const toggleTag = (tag: string) => {
        if (tagSet.has(tag.toLowerCase())) removeTag(tag);
        else addTag(tag);
    };

    const knownTags = useMemo(() => {
        const withUrl = allBookmarks.filter((b) => b.url !== undefined);
        return Object.entries(buildTagIndex(withUrl))
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
    }, [allBookmarks]);

    const filteredTags = useMemo(() => {
        const q = tagSearch.trim().replace(/^#/, "").toLowerCase();
        if (!q) return knownTags;
        return knownTags.filter((e) => e.tag.toLowerCase().includes(q));
    }, [knownTags, tagSearch]);

    const canCreate = useMemo(() => {
        const q = tagSearch.trim().replace(/^#/, "").replace(/\s+/g, "");
        if (!q) return false;
        return !tagSet.has(q.toLowerCase()) && !knownTags.some((e) => e.tag.toLowerCase() === q.toLowerCase());
    }, [tagSearch, tagSet, knownTags]);

    const dirty = title !== bookmark.title;

    const save = async () => {
        if (!dirty) {
            onOpenChange(false);
            return;
        }
        setSaving(true);
        try {
            await browser.bookmarks.update(bookmark.id, { title });
        } finally {
            setSaving(false);
            onOpenChange(false);
        }
    };

    return (
        <div className="flex max-h-[calc(100vh-2rem)] flex-col">
            <div className="shrink-0 p-4 pb-2">
                <Dialog.Title className="text-sm font-bold">Edit tags</Dialog.Title>
                <Dialog.Description className="mt-0.5 block text-xs text-muted-foreground">
                    Add or remove tags — tags are #tokens in the title.
                </Dialog.Description>

                {/* Editable title string */}
                <label className="mt-3 block text-xs font-medium">Title</label>
                <div className="mt-1 flex gap-1">
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Bookmark title with #tags"
                        className="w-full rounded-md border border-border bg-input px-2 py-1.5 text-sm"
                    />
                    <button
                        type="button"
                        title="Move all #tags to the right"
                        disabled={sortTagsRight(title) === title.trim()}
                        onClick={() => setTitle(sortTagsRight(title))}
                        className="shrink-0 cursor-pointer rounded-md bg-secondary px-2 text-xs font-medium transition-colors hover:bg-secondary/80 disabled:cursor-default disabled:opacity-40"
                    >
                        tags →
                    </button>
                </div>

                {/* Current tag chips */}
                <div className="mt-2 flex flex-wrap items-center gap-1 rounded-md border border-border bg-input/50 p-1.5">
                    {tags.length === 0 && (
                        <span className="px-1 text-xs text-muted-foreground/60">no tags</span>
                    )}
                    {tags.map((tag) => (
                        <span
                            key={tag}
                            className="flex items-center gap-1 rounded-[3px] bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary"
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
                </div>

                {/* Search of tags */}
                <input
                    ref={searchRef}
                    type="text"
                    value={tagSearch}
                    onChange={(e) => setTagSearch(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            const q = tagSearch.trim().replace(/^#/, "").replace(/\s+/g, "");
                            if (q) addTag(q);
                        }
                    }}
                    placeholder="search tags… (sorted by count)"
                    className="mt-3 w-full rounded-md border border-border bg-input px-2 py-1.5 text-xs outline-none placeholder:text-muted-foreground/50"
                />
                <p className="mt-1 text-[10px] text-muted-foreground">Click row to add/remove • press Enter to create new tag</p>
            </div>

            {/* Tag list sorted by count */}
            <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto border-y border-border p-2">
                {filteredTags.length === 0 && !canCreate ? (
                    <div className="py-6 text-center text-xs text-muted-foreground">No matching tags</div>
                ) : (
                    <div className="flex flex-col gap-0.5">
                        {filteredTags.map((entry) => {
                            const present = tagSet.has(entry.tag.toLowerCase());
                            return (
                                <button
                                    key={entry.tag}
                                    type="button"
                                    onClick={() => toggleTag(entry.tag)}
                                    className={`flex w-full cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-left text-sm transition-colors ${present ? "border-primary/30 bg-primary/10" : "border-transparent hover:bg-muted"}`}
                                    title={present ? `Remove #${entry.tag}` : `Add #${entry.tag}`}
                                >
                                    <span className="flex-1 truncate text-xs font-medium">
                                        <span className="font-bold text-primary">#</span>{entry.tag}
                                    </span>
                                    <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                        {entry.count} {entry.count === 1 ? "bookmark" : "bookmarks"}
                                    </span>
                                    <span
                                        className={`flex items-center justify-center rounded-md p-1.5 text-xs font-bold transition-colors ${present ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"}`}
                                    >
                                        {present ? <AiOutlineMinus className="size-3" /> : <AiOutlinePlus className="size-3" />}
                                    </span>
                                </button>
                            );
                        })}
                        {canCreate && (
                            <button
                                type="button"
                                onClick={() => {
                                    const q = tagSearch.trim().replace(/^#/, "").replace(/\s+/g, "");
                                    if (q) {
                                        addTag(q);
                                        setTagSearch("");
                                    }
                                }}
                                className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-2 py-1.5 text-left text-xs hover:bg-muted"
                            >
                                <span className="flex-1 truncate"><span className="font-bold text-primary">#</span>{tagSearch.trim().replace(/^#/, "")} <span className="text-muted-foreground">(new)</span></span>
                                <span className="flex items-center justify-center rounded-md bg-primary p-1.5 text-primary-foreground"><AiOutlinePlus className="size-3" /></span>
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className="flex shrink-0 justify-end gap-2 p-4 pt-3">
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
                    onClick={save}
                    className="cursor-pointer rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/80 disabled:cursor-default disabled:opacity-40"
                >
                    {saving ? "Saving…" : "Save"}
                </button>
            </div>
        </div>
    );
}
