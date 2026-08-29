import React, { useMemo, useState } from "react";

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

    const [expanded, setExpanded] = useState<Set<string>>(() => {
        const initial = new Set<string>();
        for (const f of allBookmarks) {
            if (f.url === undefined && f.parentId === "0") initial.add(f.id);
        }
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
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
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
            <input
                type="text"
                value={query}
                placeholder="search folders…"
                onChange={(e) => setQuery(e.target.value)}
                className="w-full border-b border-border bg-transparent px-2 py-1 text-xs outline-none placeholder:text-muted-foreground/50"
            />
            <div className="scrollbar-slim mt-1 min-h-0 flex-1 overflow-y-auto">
                {filteredTree
                    ? renderTree(filteredTree, 0)
                    : renderTree(tree, 0)}
            </div>
        </div>
    );
}
