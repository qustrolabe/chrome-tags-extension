import React, { useMemo, useState } from "react";
import { Dialog } from "radix-ui";
import { extractTags } from "@/utils/query/tags.ts";
import { sortTagsRight } from "@/components/BookmarkEditDialog.tsx";
import TagListPanel from "@/components/TagListPanel.tsx";

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
    const [saving, setSaving] = useState(false);

    const tags = useMemo(
        () => Array.from(new Set(extractTags(title).map((t) => t.toLowerCase()))),
        [title],
    );

    const removeTag = (tag: string) => {
        const idx = title.toLowerCase().indexOf(`#${tag.toLowerCase()}`);
        if (idx === -1) return;
        let end = idx;
        while (end < title.length && !/\s/.test(title[end] ?? "")) end++;
        setTitle(
            (title.slice(0, idx) + " " + title.slice(end)).replace(/\s+/g, " ").trim(),
        );
    };

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

                <div className="mt-2 flex flex-wrap items-center gap-1 rounded-md border border-border bg-input/50 p-1.5">
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
                    {tags.length === 0 && <span className="px-1 text-xs text-muted-foreground/60">no tags — use panel below</span>}
                </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <TagListPanel title={title} setTitle={setTitle} allBookmarks={allBookmarks} autoFocus />
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
