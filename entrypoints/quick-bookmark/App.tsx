import { useEffect, useMemo, useState } from "react";
import { sortTagsRight } from "@/utils/titleTags.ts";
import TagListPanel from "@/components/TagListPanel.tsx";
import FolderPicker from "@/components/FolderPicker.tsx";
import TagField from "@/components/TagField.tsx";
import UrlParams from "@/components/UrlParams.tsx";
import { initAccent } from "@/utils/accent.ts";
import {
  THEME_CLASSES,
  THEME_PRELOAD_BG,
  isTheme,
} from "@/utils/theme.ts";

type Bookmark = chrome.bookmarks.BookmarkTreeNode;

function getQuery() {
  const p = new URLSearchParams(window.location.search);

  return { id: p.get("id") ?? "", existing: p.get("existing") === "1" };
}

export default function App() {
  const { id, existing } = useMemo(() => getQuery(), []);
  const [bookmark, setBookmark] = useState<Bookmark | null>(null);
  const [allBookmarks, setAllBookmarks] = useState<Bookmark[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) { setError("Missing bookmark id");

 return; }

    const load = async () => {
      try {
        const [nodes] = await Promise.all([
          browser.bookmarks.get(id),
          browser.bookmarks.getTree().then((tree) => {
            const flat: Bookmark[] = [];
            const stack = [...tree];

            while (stack.length) {
              const n = stack.pop();

              if (!n) continue;
              flat.push(n as Bookmark);

              if (n.children) for (const c of n.children) stack.push(c as Bookmark);
            }

            return flat;
          }),
        ]);

        if (nodes[0]) setBookmark(nodes[0] as Bookmark);
        else setError("Bookmark not found");
        const tree = await browser.bookmarks.getTree();
        const flat: Bookmark[] = [];
        const stack2 = [...tree];

        while (stack2.length) { const n = stack2.pop();

 if (!n) continue; flat.push(n as Bookmark);

 if (n.children) for (const c of n.children) stack2.push(c as Bookmark); }

        setAllBookmarks(flat);
      } catch (e: any) {
        setError(e?.message ?? String(e));
      }
    };

    load();
  }, [id]);

  useEffect(() => {
    initAccent();
    // Sync theme from storage (same logic as ThemeContext initial sync)
    browser.storage.local.get("theme").then((res) => {
      const stored = res.theme;

      if (isTheme(stored)) {
        document.documentElement.classList.remove(...THEME_CLASSES);
        document.documentElement.classList.add(stored);

        try { localStorage.setItem("theme", stored); } catch {}

        document.documentElement.style.backgroundColor = THEME_PRELOAD_BG[stored];
      }
    });
  }, []);

  useEffect(() => {
    // Escape unwinds one layer at a time instead of always closing:
    //
    //   1. the suggestion dropdown, if it is open  (TagField stops propagation)
    //   2. the field you are standing in            (blur it, stay open)
    //   3. nothing left                              (close the window)
    //
    // Without step 2 a stray Escape while typing a URL threw away the whole
    // window, which read as the app hanging up on you rather than backing off.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const active = document.activeElement;

      if (active instanceof HTMLElement && (active.matches("input, textarea, select") || active.isContentEditable)) {
        e.preventDefault();
        active.blur();

        return;
      }

      window.close();
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (error) return <div className="p-2 text-sm text-destructive">{error}</div>;

  if (!bookmark) return <div className="p-2 text-sm text-muted-foreground">Loading…</div>;

  return <QuickEditor bookmark={bookmark} allBookmarks={allBookmarks} isExisting={existing} />;
}

function QuickEditor({ bookmark, allBookmarks, isExisting }: { bookmark: Bookmark; allBookmarks: Bookmark[]; isExisting: boolean }) {
  const [title, setTitle] = useState(bookmark.title);
  const [url, setUrl] = useState(bookmark.url ?? "");
  const [folderId, setFolderId] = useState(bookmark.parentId ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const dirty = title !== bookmark.title || url !== (bookmark.url ?? "") || folderId !== (bookmark.parentId ?? "");

  const closeWindow = () => window.close();

  const save = async () => {
    const folderChanged = folderId !== (bookmark.parentId ?? "") && !!folderId;
    setSaving(true);

    try {
      if (title !== bookmark.title) await browser.bookmarks.update(bookmark.id, { title });

      if (url !== (bookmark.url ?? "")) await browser.bookmarks.update(bookmark.id, { url });

      if (folderChanged) {
        await browser.bookmarks.move(bookmark.id, { parentId: folderId });

        try { await browser.storage.local.set({ lastBookmarkFolderId: folderId }); } catch {}
      }
    } finally {
      setSaving(false);
      window.close();
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete bookmark "${bookmark.title}"?`)) return;
    setDeleting(true);

    try {
      await browser.bookmarks.remove(bookmark.id);
    } finally {
      setDeleting(false);
      window.close();
    }
  };

  return (
    <div className="flex h-screen max-h-screen flex-col bg-popover text-popover-foreground">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* TOP: title and URL get the full window width */}
        <div className="shrink-0 border-b border-border p-2">
          <div className="mb-1 flex items-center gap-2">
            <h1 className="shrink-0 text-sm font-bold">
              {isExisting ? "Edit bookmark" : "Bookmark created"}
            </h1>
            {isExisting && (
              <span className="min-w-0 truncate rounded-sm bg-token-notice-fill/15 px-1.5 py-0.5 text-[10px] font-medium text-token-notice">
                Already bookmarked
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <label htmlFor="qb-title" className="w-10 shrink-0 text-xs font-medium">Title</label>
            <input
              id="qb-title"
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
            <label htmlFor="qb-url" className="w-10 shrink-0 text-xs font-medium">URL</label>
            <input
              id="qb-url"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              spellCheck={false}
              className="min-w-0 flex-1 rounded-md border border-border bg-input px-2 py-1 font-mono text-xs"
            />
          </div>
        </div>

        {/* MIDDLE ROW: folder tree | tags + url params | tag catalogue */}
        {/* Equal thirds, so widening the window grows all three columns
            evenly instead of dumping the slack into the catalogue. minmax(0,…)
            lets each column shrink below its content width when narrow. */}
        <div className="grid min-h-0 flex-1 grid-cols-3 overflow-hidden">
          {/* min-w-0 on each track: grid-cols-3 uses minmax(0,1fr), so without
              it a wide child (long URL, long tag name) pushes the track out
              of alignment with its neighbours. */}
          <div className="flex min-h-0 min-w-0 flex-col gap-1 overflow-hidden border-r border-border p-2">
            <label className="shrink-0 text-xs font-medium">Move to</label>
            <div className="min-h-0 flex-1">
              <FolderPicker allBookmarks={allBookmarks} selfId={bookmark.id} value={folderId} onChange={setFolderId} />
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
        <button
          type="button"
          disabled={deleting}
          onClick={handleDelete}
          title="Permanently delete this bookmark"
          className="cursor-pointer rounded-md bg-destructive px-2 py-1 text-xs font-medium text-destructive-foreground hover:bg-destructive/80 disabled:opacity-40"
        >
          {deleting ? "Deleting…" : "Delete"}
        </button>
        <div className="flex items-center gap-1">
          <span className="mr-1 text-[10px] text-muted-foreground">ESC leaves a field, then closes</span>
          <button
            type="button"
            onClick={closeWindow}
            title="Close without saving"
            className="cursor-pointer rounded-md bg-secondary px-2 py-1 text-xs font-medium hover:bg-secondary/80"
          >
            Close without saving
          </button>
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
