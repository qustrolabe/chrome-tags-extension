import { useEffect, useMemo, useState } from "react";
import { extractTags } from "@/utils/query/tags.ts";
import { sortTagsRight } from "@/components/BookmarkEditDialog.tsx";

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
        // second promise already resolved above, but we need allBookmarks separately
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

  // ESC closes window
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
    return [...index.entries()].filter(([t]) => t.startsWith(prefix) && !tags.includes(t)).sort(([, a], [, b]) => b - a).slice(0, 6).map(([t]) => t);
  }, [newTag, allBookmarks, tags]);

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

  return (
    <div className="flex h-screen max-h-screen flex-col bg-popover text-popover-foreground">
      {isExisting && (
        <div className="shrink-0 bg-amber-500/15 px-4 py-2 text-xs font-medium text-amber-700 dark:text-amber-300 border-b border-amber-500/20">
          Already bookmarked — editing existing bookmark. Changes will update it. ESC or Cancel to close without creating a duplicate.
        </div>
      )}
      <div className="grid flex-1 min-h-0 grid-cols-[260px_1fr] overflow-hidden">
        {/* LEFT: folder picker */}
        <div className="flex min-h-0 flex-col gap-1 border-r border-border p-4">
          <label className="block text-xs font-medium">Move to</label>
          <div className="min-h-0 flex-1">
            <FolderPicker allBookmarks={allBookmarks} selfId={bookmark.id} value={folderId} onChange={setFolderId} />
          </div>
        </div>
        {/* RIGHT: fields */}
        <div className="flex min-h-0 flex-col overflow-y-auto p-4">
          <h1 className="text-sm font-bold">{isExisting ? "Edit bookmark" : "Bookmark created — edit & save"}</h1>
          <p className="mt-0.5 block text-xs text-muted-foreground">
            {isExisting ? "This URL is already bookmarked." : "Bookmark was created immediately. Edit and Save, or press ESC to keep it as-is."}
          </p>

          <label className="mt-3 block text-xs font-medium">Title</label>
          <div className="flex gap-1">
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-md border border-border bg-input px-2 py-1 text-sm" />
            <button type="button" title="Move all #tags to the right" disabled={sortTagsRight(title) === title.trim()} onClick={() => setTitle(sortTagsRight(title))} className="shrink-0 cursor-pointer rounded-md bg-secondary px-2 text-xs font-medium hover:bg-secondary/80 disabled:opacity-40">tags →</button>
          </div>

          <label className="mt-3 block text-xs font-medium">Tags</label>
          <div className="mt-1 flex flex-wrap items-center gap-1 rounded-md border border-border bg-input/50 p-1.5">
            {tags.length === 0 && <span className="px-1 text-xs text-muted-foreground/60">no tags</span>}
            {tags.map((tag) => (
              <span key={tag} className="flex items-center gap-1 rounded-[3px] bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">#{tag}<button type="button" className="cursor-pointer rounded-sm px-0.5 hover:bg-destructive/30" onClick={() => removeTag(tag)}>×</button></span>
            ))}
            <input type="text" value={newTag} placeholder="add tag…" onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(newTag); } }} className="min-w-[90px] flex-1 bg-transparent px-1 text-xs outline-none placeholder:text-muted-foreground/50" />
          </div>
          {tagSuggestions.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">{tagSuggestions.map((t) => (<button key={t} type="button" className="cursor-pointer rounded-[3px] bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground" onMouseDown={(e) => { e.preventDefault(); addTag(t); }}>+#{t}</button>))}</div>
          )}

          <label className="mt-3 block text-xs font-medium">URL</label>
          <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} spellCheck={false} className="w-full rounded-md border border-border bg-input px-2 py-1 font-mono text-xs" />

          <div className="mt-auto flex justify-end gap-2 pt-4">
            <button type="button" onClick={closeWindow} className="cursor-pointer rounded-md bg-secondary px-3 py-1.5 text-xs font-medium hover:bg-secondary/80">{isExisting ? "Cancel" : "Close (keep)"}</button>
            <button type="button" disabled={!dirty || saving} onClick={save} className="cursor-pointer rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/80 disabled:opacity-40">{saving ? "Saving…" : "Save"}</button>
          </div>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">ESC to close</p>
        </div>
      </div>
    </div>
  );
}

// Inline FolderPicker - mirrors components/BookmarkEditDialog.tsx FolderPicker
interface FolderNode { id: string; title: string; children: FolderNode[]; }

function FolderPicker({ allBookmarks, selfId, value, onChange }: { allBookmarks: Bookmark[]; selfId: string; value: string; onChange: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const tree = useMemo(() => {
    const folders = allBookmarks.filter((b) => b.url === undefined);
    const byId = new Map(folders.map((f) => [f.id, f]));
    const inOwnSubtree = (f: Bookmark): boolean => {
      let cur: Bookmark | undefined = f;
      while (cur) { if (cur.id === selfId) return true; cur = cur.parentId ? byId.get(cur.parentId) : undefined; }
      return false;
    };
    const byParent = new Map<string, Bookmark[]>();
    for (const f of folders) {
      if (f.id === "0") continue;
      if (inOwnSubtree(f)) continue;
      const key = f.parentId ?? "0";
      const list = byParent.get(key) ?? [];
      list.push(f);
      byParent.set(key, list);
    }
    const seen = new Set<string>();
    const build = (nodes: Bookmark[]): FolderNode[] => nodes.filter((f) => { if (seen.has(f.id)) return false; seen.add(f.id); return true; }).map((f) => ({ id: f.id, title: f.title || "…", children: build(byParent.get(f.id) ?? []) })).sort((a, b) => a.title.localeCompare(b.title));
    return build(byParent.get("0") ?? []);
  }, [allBookmarks, selfId]);

  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const f of allBookmarks) if (f.url === undefined && f.parentId === "0") initial.add(f.id);
    let cur = allBookmarks.find((b) => b.id === value);
    while (cur?.parentId) { initial.add(cur.parentId); cur = allBookmarks.find((b) => b.id === cur!.parentId); }
    return initial;
  });

  const toggle = (id: string) => setExpanded((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const filteredTree = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q === "") return null;
    const filter = (nodes: FolderNode[]): FolderNode[] => {
      const res: FolderNode[] = [];
      for (const node of nodes) { const kids = filter(node.children); if (node.title.toLowerCase().includes(q) || kids.length > 0) res.push({ ...node, children: kids }); }
      return res;
    };
    return filter(tree);
  }, [query, tree]);

  const Row = ({ id, title }: { id: string; title: string }) => (
    <button type="button" onClick={() => onChange(id)} className={`flex w-full cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-left text-xs ${id === value ? "bg-primary/20 font-medium text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
      {id === value && <span className="text-primary">✓</span>}<span className="truncate">{title}</span>
    </button>
  );

  const renderTree = (nodes: FolderNode[], depth: number) => (
    <>
      {nodes.map((node) => (
        <div key={node.id}>
          <div className={`flex w-full items-center gap-0.5 rounded px-0.5 ${node.id === value ? "bg-primary/20" : ""}`} style={{ paddingLeft: depth * 8 }}>
            <button type="button" className={`cursor-pointer rounded p-0.5 text-muted-foreground hover:text-foreground ${expanded.has(node.id) ? "rotate-90" : ""} ${node.children.length === 0 ? "invisible" : ""}`} onClick={() => toggle(node.id)} tabIndex={-1}>▸</button>
            <Row id={node.id} title={node.title} />
          </div>
          {(expanded.has(node.id) || query.trim() !== "") && renderTree(node.children, depth + 1)}
        </div>
      ))}
    </>
  );

  return (
    <div className="flex h-full flex-col rounded-md border border-border bg-input/50 p-1">
      <input type="text" value={query} placeholder="search folders…" onChange={(e) => setQuery(e.target.value)} className="w-full border-b border-border bg-transparent px-2 py-1 text-xs outline-none placeholder:text-muted-foreground/50" />
      <div className="mt-1 min-h-0 flex-1 overflow-y-auto">{filteredTree ? renderTree(filteredTree, 0) : renderTree(tree, 0)}</div>
    </div>
  );
}
