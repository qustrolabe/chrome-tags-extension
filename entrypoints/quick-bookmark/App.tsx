import { useEffect, useMemo, useState } from "react";
import { extractTags } from "@/utils/query/tags.ts";
import { sortTagsRight } from "@/components/BookmarkEditDialog.tsx";
import TagListPanel from "@/components/TagListPanel.tsx";
import FolderPicker from "@/components/FolderPicker.tsx";

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
    if (!id) { setError("Missing bookmark id"); return; }
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
        while (stack2.length) { const n = stack2.pop(); if (!n) continue; flat.push(n as Bookmark); if (n.children) for (const c of n.children) stack2.push(c as Bookmark); }
        setAllBookmarks(flat);
      } catch (e: any) {
        setError(e?.message ?? String(e));
      }
    };
    load();
  }, [id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") window.close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (error) return <div className="p-6 text-sm text-destructive">{error}</div>;
  if (!bookmark) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  return <QuickEditor bookmark={bookmark} allBookmarks={allBookmarks} isExisting={existing} />;
}

function QuickEditor({ bookmark, allBookmarks, isExisting }: { bookmark: Bookmark; allBookmarks: Bookmark[]; isExisting: boolean }) {
  const [title, setTitle] = useState(bookmark.title);
  const [url, setUrl] = useState(bookmark.url ?? "");
  const [folderId, setFolderId] = useState(bookmark.parentId ?? "");
  const [newTag, setNewTag] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const tags = useMemo(() => Array.from(new Set(extractTags(title).map((t) => t.toLowerCase()))), [title]);

  const removeTag = (tag: string) => {
    const idx = title.toLowerCase().indexOf(`#${tag.toLowerCase()}`);
    if (idx === -1) return;
    let end = idx;
    while (end < title.length && !/\s/.test(title[end] ?? "")) end++;
    setTitle((title.slice(0, idx) + " " + title.slice(end)).replace(/\s+/g, " ").trim());
  };

  const addTag = (raw: string) => {
    const tag = raw.trim().replace(/^#/, "").replace(/\s+/g, "");
    if (!tag || tags.includes(tag.toLowerCase())) { setNewTag(""); return; }
    const base = sortTagsRight(title).trim();
    setTitle(base ? `${base} #${tag}` : `#${tag}`);
    setNewTag("");
  };

  const dirty = title !== bookmark.title || url !== (bookmark.url ?? "") || folderId !== (bookmark.parentId ?? "");

  const closeWindow = () => window.close();

  const save = async () => {
    setSaving(true);
    try {
      if (title !== bookmark.title) await browser.bookmarks.update(bookmark.id, { title });
      if (url !== (bookmark.url ?? "")) await browser.bookmarks.update(bookmark.id, { url });
      if (folderId !== (bookmark.parentId ?? "") && folderId) await browser.bookmarks.move(bookmark.id, { parentId: folderId });
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
      {isExisting && (
        <div className="shrink-0 bg-amber-500/15 px-4 py-2 text-xs font-medium text-amber-700 dark:text-amber-300 border-b border-amber-500/20">
          Already bookmarked — editing existing bookmark. Changes will update it. Close without saving to keep as-is.
        </div>
      )}
      <div className="grid flex-1 min-h-0 grid-cols-[260px_1fr_300px] overflow-hidden">
        {/* LEFT: folder picker */}
        <div className="flex min-h-0 flex-col gap-1 border-r border-border p-4">
          <label className="block text-xs font-medium">Move to</label>
          <div className="min-h-0 flex-1">
            <FolderPicker allBookmarks={allBookmarks} selfId={bookmark.id} value={folderId} onChange={setFolderId} />
          </div>
        </div>
        {/* CENTER: fields */}
        <div className="flex min-h-0 flex-col overflow-y-auto p-4">
          <h1 className="text-sm font-bold">{isExisting ? "Edit bookmark" : "Bookmark created — edit & save"}</h1>
          <p className="mt-0.5 block text-xs text-muted-foreground">
            {isExisting ? "This URL is already bookmarked." : "Bookmark was created immediately. Edit and Save, or close without saving to keep it as-is."}
          </p>

          <label className="mt-3 block text-xs font-medium">Title</label>
          <div className="flex gap-1">
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-md border border-border bg-input px-2 py-1 text-sm" />
            <button type="button" title="Move all #tags to the right" disabled={sortTagsRight(title) === title.trim()} onClick={() => setTitle(sortTagsRight(title))} className="shrink-0 cursor-pointer rounded-md bg-secondary px-2 text-xs font-medium hover:bg-secondary/80 disabled:opacity-40">tags →</button>
          </div>

          <label className="mt-3 block text-xs font-medium">Tags</label>
          <div className="mt-1 flex flex-wrap items-center gap-1 rounded-md border border-border bg-input/50 p-1.5">
            {tags.map((tag) => (
              <span key={tag} className="flex items-center gap-1 rounded-[3px] bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">#{tag}<button type="button" className="cursor-pointer rounded-sm px-0.5 hover:bg-destructive/30" onClick={() => removeTag(tag)}>×</button></span>
            ))}
            <input type="text" value={newTag} placeholder="add tag…" onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(newTag); } }} className="min-w-[90px] flex-1 bg-transparent px-1 text-xs outline-none placeholder:text-muted-foreground/50" />
          </div>

          <label className="mt-3 block text-xs font-medium">URL</label>
          <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} spellCheck={false} className="w-full rounded-md border border-border bg-input px-2 py-1 font-mono text-xs" />

          <div className="mt-auto flex items-center justify-between gap-2 pt-4">
            <button type="button" disabled={deleting} onClick={handleDelete} title="Permanently delete this bookmark" className="cursor-pointer rounded-md bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground hover:bg-destructive/80 disabled:opacity-40">{deleting ? "Deleting…" : "Delete"}</button>
            <div className="flex gap-2">
              <button type="button" onClick={closeWindow} title="Close this window without saving changes — bookmark stays as it was (ESC also closes)" className="cursor-pointer rounded-md bg-secondary px-3 py-1.5 text-xs font-medium hover:bg-secondary/80">Close without saving</button>
              <button type="button" disabled={!dirty || saving} onClick={save} className="cursor-pointer rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/80 disabled:opacity-40">{saving ? "Saving…" : "Save"}</button>
            </div>
          </div>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">ESC to close without saving</p>
        </div>
        {/* RIGHT: tag picker */}
        <div className="flex min-h-0 flex-col border-l border-border bg-popover">
          <TagListPanel title={title} setTitle={setTitle} allBookmarks={allBookmarks} />
        </div>
      </div>
    </div>
  );
}
