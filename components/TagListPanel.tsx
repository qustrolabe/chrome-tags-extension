import React, { useMemo, useState, useRef, useEffect } from "react";
import { AiOutlinePlus, AiOutlineMinus } from "react-icons/ai";
import { extractTags, buildTagIndex } from "@/utils/query/tags.ts";
import { sortTagsRight } from "@/components/BookmarkEditDialog.tsx";

type Bookmark = chrome.bookmarks.BookmarkTreeNode;

interface TagListPanelProps {
  title: string;
  setTitle: (v: string) => void;
  allBookmarks: Bookmark[];
  autoFocus?: boolean;
}

export default function TagListPanel({ title, setTitle, allBookmarks, autoFocus }: TagListPanelProps) {
  const [tagSearch, setTagSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) requestAnimationFrame(() => searchRef.current?.focus());
  }, [autoFocus]);

  const tags = useMemo(() => Array.from(new Set(extractTags(title).map((t) => t.toLowerCase()))), [title]);
  const tagSet = useMemo(() => new Set(tags), [tags]);

  const removeTag = (tag: string) => {
    const idx = title.toLowerCase().indexOf(`#${tag.toLowerCase()}`);
    if (idx === -1) return;
    let end = idx;
    while (end < title.length && !/\s/.test(title[end] ?? "")) end++;
    setTitle((title.slice(0, idx) + " " + title.slice(end)).replace(/\s+/g, " ").trim());
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

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 p-3 pb-2">
        <label className="block text-xs font-medium">Tags</label>
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
          className="mt-1 w-full rounded-md border border-border bg-input px-2 py-1.5 text-xs outline-none placeholder:text-muted-foreground/50"
        />
        <p className="mt-1 text-[10px] text-muted-foreground">Click row to add/remove • Enter to create</p>
      </div>
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
                  <span className={`flex items-center justify-center rounded-md p-1.5 text-xs font-bold ${present ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"}`}>
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
    </div>
  );
}
