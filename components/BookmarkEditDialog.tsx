import React, { useMemo, useState } from "react";
import { Dialog } from "radix-ui";
import { extractTags } from "@/utils/query/tags.ts";
import TagListPanel from "@/components/TagListPanel.tsx";
import FolderPicker from "@/components/FolderPicker.tsx";

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
                <Dialog.Content className="fixed top-1/2 left-1/2 z-100 h-[560px] max-h-[calc(100vh-2rem)] w-[960px] max-w-[calc(100vw-2rem)] -translate-1/2 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground">
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

    // Tag suggestions now handled by TagListPanel on the right.

    const dirty =
        title !== bookmark.title ||
        url !== (bookmark.url ?? "") ||
        folderId !== (bookmark.parentId ?? "");

    const save = async () => {
        const folderChanged = folderId !== (bookmark.parentId ?? "") && !!folderId;
        setSaving(true);
        try {
            if (title !== bookmark.title) {
                await browser.bookmarks.update(bookmark.id, { title });
            }
            if (url !== (bookmark.url ?? "")) {
                await browser.bookmarks.update(bookmark.id, { url });
            }
            if (folderChanged) {
                await browser.bookmarks.move(bookmark.id, {
                    parentId: folderId,
                });
                // Only persist last folder when it actually changed (Chrome-like)
                try { await browser.storage.local.set({ lastBookmarkFolderId: folderId }); } catch {}
            }
        } finally {
            setSaving(false);
            onOpenChange(false);
        }
    };

    return (
        <div className="grid h-full grid-cols-[260px_1fr_300px] overflow-hidden">
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

            {/* CENTER: fields */}
            <div className="scrollbar-slim flex min-h-0 flex-col overflow-y-auto p-4">
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

            {/* RIGHT: tag picker (same as Edit tags popup) */}
            <div className="flex min-h-0 flex-col overflow-hidden border-l border-border bg-popover">
                <TagListPanel title={title} setTitle={setTitle} allBookmarks={allBookmarks} />
            </div>
        </div>
    );
}
