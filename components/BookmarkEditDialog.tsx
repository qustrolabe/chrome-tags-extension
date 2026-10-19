import { useState } from "react";
import { Dialog } from "radix-ui";
import TagListPanel from "@/components/TagListPanel.tsx";
import TagField from "@/components/TagField.tsx";
import UrlParams from "@/components/UrlParams.tsx";
import FolderPicker from "@/components/FolderPicker.tsx";
import { sortTagsRight } from "@/utils/titleTags.ts";

type Bookmark = chrome.bookmarks.BookmarkTreeNode;

interface BookmarkEditDialogProps {
  bookmark: Bookmark;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Flat list of all nodes for folder picking; empty disables it. */
  allBookmarks?: Bookmark[];
}

/**
 * Full editor: title, URL, parent folder and a dedicated tag chips UI (tags
 * are #tokens inside the title, so everything edits the same string
 * underneath).
 *
 * Laid out like the quick-bookmark window — title and URL across the top at
 * full width, then folder | tags + URL params | tag catalogue — and built from
 * the same three components, so the two editors cannot drift apart again.
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
        <Dialog.Content className="fixed top-1/2 left-1/2 z-100 h-[620px] max-h-[calc(100vh-2rem)] w-[1020px] max-w-[calc(100vw-2rem)] -translate-1/2 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground">
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
  const [saving, setSaving] = useState(false);

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
        await browser.bookmarks.move(bookmark.id, { parentId: folderId });

        // Only persist last folder when it actually changed (Chrome-like)
        try { await browser.storage.local.set({ lastBookmarkFolderId: folderId }); } catch {}
      }
    } finally {
      setSaving(false);
      onOpenChange(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-popover text-popover-foreground">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* TOP: title and URL get the full dialog width */}
        <div className="shrink-0 border-b border-border p-2">
          {/* One line, so the header never changes height. */}
          <div className="mb-1 flex items-center gap-2">
            <Dialog.Title className="shrink-0 text-sm font-bold">
              Edit bookmark
            </Dialog.Title>
            <Dialog.Description className="min-w-0 truncate text-[10px] text-muted-foreground">
              Changes apply when you press Save
            </Dialog.Description>
          </div>

          <div className="flex items-center gap-1">
            <label htmlFor="adv-edit-title" className="w-10 shrink-0 text-xs font-medium">Title</label>
            <input
              id="adv-edit-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="min-w-0 flex-1 rounded-md border border-border bg-input px-2 py-1 text-sm"
            />
            <button
              type="button"
              title="Move all #tags to the right"
              disabled={sortTagsRight(title) === title.trim()}
              onClick={() => setTitle(sortTagsRight(title))}
              className="shrink-0 cursor-pointer rounded-md bg-secondary px-2 py-1 text-xs font-medium hover:bg-secondary/80 disabled:opacity-40"
            >
              tags →
            </button>
          </div>

          <div className="mt-1 flex items-center gap-1">
            <label htmlFor="adv-edit-url" className="w-10 shrink-0 text-xs font-medium">URL</label>
            <input
              id="adv-edit-url"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              spellCheck={false}
              className="min-w-0 flex-1 rounded-md border border-border bg-input px-2 py-1 font-mono text-xs"
            />
          </div>
        </div>

        {/* MIDDLE ROW: folder tree | tags + url params | tag catalogue */}
        {/* Equal thirds, matching the quick-bookmark window exactly. */}
        <div className="grid min-h-0 flex-1 grid-cols-3 overflow-hidden">
          <div className="flex min-h-0 min-w-0 flex-col gap-1 overflow-hidden border-r border-border p-2">
            <label className="shrink-0 text-xs font-medium">Move to</label>
            <div className="min-h-0 flex-1">
              <FolderPicker
                allBookmarks={allBookmarks}
                selfId={bookmark.id}
                value={folderId}
                onChange={setFolderId}
              />
            </div>
          </div>

          <div className="flex min-h-0 min-w-0 flex-col gap-1 border-r border-border p-2">
            <TagField title={title} setTitle={setTitle} allBookmarks={allBookmarks} />
            <UrlParams url={url} />
          </div>

          <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
            <TagListPanel title={title} setTitle={setTitle} allBookmarks={allBookmarks} />
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border p-2">
        <span className="text-[10px] text-muted-foreground">ESC closes without saving</span>
        <div className="flex items-center gap-1">
          <Dialog.Close asChild>
            <button
              type="button"
              className="cursor-pointer rounded-md bg-secondary px-2 py-1 text-xs font-medium hover:bg-secondary/80"
            >
              Cancel
            </button>
          </Dialog.Close>
          <button
            type="button"
            disabled={!dirty || saving}
            onClick={save}
            className="cursor-pointer rounded-md bg-primary px-2 py-1 text-xs font-bold text-primary-foreground hover:bg-primary/80 disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
