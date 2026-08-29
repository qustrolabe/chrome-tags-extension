import React, { useEffect, useMemo, useState } from "react";

type Bookmark = chrome.bookmarks.BookmarkTreeNode;

interface FolderNode {
    id: string;
    title: string;
    children: FolderNode[];
}

export default function FolderPicker(
    { allBookmarks, selfId, value, onChange }: {
        allBookmarks: Bookmark[];
        selfId: string;
        value: string;
        onChange: (id: string) => void;
    },
) {
    const [query, setQuery] = useState("");

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
            if (f.id === "0") continue;
            if (inOwnSubtree(f)) continue;
            const key = f.parentId ?? "0";
            const list = byParent.get(key) ?? [];
            list.push(f);
            byParent.set(key, list);
        }
        const seen = new Set<string>();
        const build = (nodes: Bookmark[]): FolderNode[] =>
            nodes
                .filter((f) => {
                    if (seen.has(f.id)) return false;
                    seen.add(f.id);
                    return true;
                })
                .map((f) => ({
                    id: f.id,
                    title: f.title || "…",
                    children: build(byParent.get(f.id) ?? []),
                }))
                .sort((a, b) => a.title.localeCompare(b.title));
        return build(byParent.get("0") ?? []);
    }, [allBookmarks, selfId]);

    const STORAGE_KEY = "folderPickerExpanded";

    const computeInitial = (bookmarks: typeof allBookmarks, val: string): Set<string> => {
        const initial = new Set<string>();
        for (const f of bookmarks) {
            if (f.url === undefined && f.parentId === "0") initial.add(f.id);
        }
        let cur = bookmarks.find((b) => b.id === val);
        while (cur?.parentId) {
            initial.add(cur.parentId);
            cur = bookmarks.find((b) => b.id === cur!.parentId);
        }
        return initial;
    };

    const [expanded, setExpanded] = useState<Set<string>>(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const arr = JSON.parse(raw) as string[];
                if (Array.isArray(arr) && arr.length > 0) return new Set(arr);
            }
        } catch {}
        return computeInitial(allBookmarks, value);
    });

    // Keep expanded in sync when bookmarks/value load async (quick-bookmark case) and persist
    useEffect(() => {
        if (allBookmarks.length === 0) return;
        setExpanded((prev) => {
            // If we have a persisted non-empty set, ensure current value's ancestors are expanded
            // (covers case where bookmark's folder changed or storage predates it).
            // If prev is empty (initial mount with empty bookmarks), populate with defaults.
            if (prev.size === 0) return computeInitial(allBookmarks, value);
            const next = new Set(prev);
            let added = false;
            // Ensure at least root folders are present if none are expanded (user hasn't intentionally collapsed all roots)
            const hasRoot = [...next].some((id) => {
                const f = allBookmarks.find((b) => b.id === id);
                return f?.parentId === "0";
            });
            if (!hasRoot) {
                for (const f of allBookmarks) if (f.url === undefined && f.parentId === "0") { next.add(f.id); added = true; }
            }
            // Ensure ancestors of current value are expanded
            let cur = allBookmarks.find((b) => b.id === value);
            while (cur?.parentId) {
                if (!next.has(cur.parentId)) { next.add(cur.parentId); added = true; }
                cur = allBookmarks.find((b) => b.id === cur!.parentId);
            }
            return added ? next : prev;
        });
        // computeInitial is a stable pure helper; listing it would recreate effect each render
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allBookmarks, value]);

    useEffect(() => {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...expanded])); } catch {}
    }, [expanded]);

    const toggle = (id: string) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const collapseAll = () => {
        const roots = new Set<string>();
        for (const f of allBookmarks) if (f.url === undefined && f.parentId === "0") roots.add(f.id);
        setExpanded(roots);
    };

    const filteredTree = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (q === "") return null;
        const filter = (nodes: FolderNode[]): FolderNode[] => {
            const result: FolderNode[] = [];
            for (const node of nodes) {
                const kids = filter(node.children);
                if (node.title.toLowerCase().includes(q) || kids.length > 0) {
                    result.push({ ...node, children: kids });
                }
            }
            return result;
        };
        return filter(tree);
    }, [query, tree]);

    const Row = ({ id, title }: { id: string; title: string }) => (
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
            <span className="truncate">{title}</span>
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
                        style={{ paddingLeft: depth * 8 }}
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
                        <Row id={node.id} title={node.title} />
                    </div>
                    {(expanded.has(node.id) || query.trim() !== "") &&
                        renderTree(node.children, depth + 1)}
                </div>
            ))}
        </>
    );

    return (
        <div className="flex h-full flex-col rounded-md border border-border bg-input/50 p-1">
            <div className="flex items-center justify-between border-b border-border px-1 pb-1">
                <input
                    type="text"
                    value={query}
                    placeholder="search folders…"
                    onChange={(e) => setQuery(e.target.value)}
                    className="flex-1 bg-transparent p-1 text-xs outline-none placeholder:text-muted-foreground/50"
                />
                <button
                    type="button"
                    onClick={collapseAll}
                    title="Collapse to Bookmarks bar"
                    className="shrink-0 cursor-pointer rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                    Collapse
                </button>
            </div>
            <div className="scrollbar-slim mt-1 min-h-0 flex-1 overflow-y-auto">
                {filteredTree
                    ? renderTree(filteredTree, 0)
                    : renderTree(tree, 0)}
            </div>
        </div>
    );
}
