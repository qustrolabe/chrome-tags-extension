import React, { useMemo, useState } from "react";
import { buildTagIndex, extractTags } from "@queryfield/core";
import { buildTagRows } from "@/utils/tagsuggest.ts";
import { sortTagsRight } from "@/utils/titleTags.ts";

type Bookmark = chrome.bookmarks.BookmarkTreeNode;

interface TagFieldProps {
  title: string;
  setTitle: (v: string) => void;
  allBookmarks: Bookmark[];
}

/**
 * Tag chips + an add-tag field with a keyboard-navigable suggestion list.
 *
 * Key handling mirrors the main search bar (`SearchBar.tsx`):
 *   ArrowDown / ArrowUp  move the highlight (Down wraps, Up past the top
 *                        returns to plain typing); typing also drops back to -1.
 *   Enter                toggles the highlighted row, or creates the typed
 *                        text when nothing is highlighted.
 *   Escape               closes the list without closing the window.
 *
 * Deliberately NOT copied from SearchBar: the `e.nativeEvent.isComposing`
 * early-return. It is meant to let an IME own its candidate keys, but a
 * composition that never ends leaves it stuck true and silently swallows
 * every key while plain typing still works — the field looks alive but does
 * nothing. Losing IME candidate arrows on a one-token tag field is a much
 * smaller cost than an input that can't be operated.
 */
export default function TagField({ title, setTitle, allBookmarks }: TagFieldProps) {
  const [text, setText] = useState("");
  const [highlighted, setHighlighted] = useState(-1);
  const [dismissed, setDismissed] = useState(false);
  const [focused, setFocused] = useState(false);

  const tags = useMemo(
    () => Array.from(new Set(extractTags(title).map((t) => t.toLowerCase()))),
    [title],
  );

  const tagSet = useMemo(() => new Set(tags), [tags]);

  const knownTags = useMemo(() => {
    const withUrl = allBookmarks.filter((b) => b.url !== undefined);

    return Object.entries(buildTagIndex(withUrl))
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  }, [allBookmarks]);

  const query = text.trim().replace(/^#/, "");

  const rows = useMemo(
    () =>
      focused && !dismissed
        ? buildTagRows({ knownTags, currentTags: tagSet, query })
        : [],
    [knownTags, tagSet, query, focused, dismissed],
  );

  // Derived rather than reset in an effect, so the list never renders with a
  // highlight pointing past its own end.
  const activeIndex =
    highlighted >= 0 && highlighted < rows.length ? highlighted : -1;

  const removeTag = (tag: string) => {
    const idx = title.toLowerCase().indexOf(`#${tag.toLowerCase()}`);

    if (idx === -1) return;
    let end = idx;

    while (end < title.length && !/\s/.test(title[end] ?? "")) end++;
    setTitle((title.slice(0, idx) + " " + title.slice(end)).replace(/\s+/g, " ").trim());
  };

  const addTag = (raw: string) => {
    const tag = raw.trim().replace(/^#/, "").replace(/\s+/g, "");
    setText("");

    if (!tag || tagSet.has(tag.toLowerCase())) return;
    const base = sortTagsRight(title).trim();
    setTitle(base ? `${base} #${tag}` : `#${tag}`);
  };

  const toggleTag = (tag: string) => {
    if (tagSet.has(tag.toLowerCase())) removeTag(tag);
    else addTag(tag);
  };

  const accept = (index: number | undefined) => {
    setHighlighted(-1);
    const row = index === undefined ? undefined : rows[index];

    if (row) {
      // Accepting a row always clears the box, otherwise a toggle leaves the
      // just-applied text behind and the next Enter would re-add it.
      setText("");

      if (row.isNew) addTag(row.tag);
      else toggleTag(row.tag);
    } else if (query) {
      addTag(query);
    } else {
      setText("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setDismissed(false);
      setHighlighted((prev) => {
        if (rows.length === 0) return -1;
        const next = Math.max(prev, -1) + 1;

        return next >= rows.length ? 0 : next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((prev) => (prev <= 0 ? -1 : prev - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      accept(activeIndex);
    } else if (e.key === "Escape" && !dismissed && rows.length > 0) {
      // Consume Escape only while the list is open; otherwise let it bubble
      // to the window handler, which closes the popup.
      e.preventDefault();
      e.stopPropagation();
      setDismissed(true);
      setHighlighted(-1);
    }
  };

  return (
    <div className="relative">
      <label htmlFor="qb-tag-input" className="mb-1 block text-xs font-medium">
        Tags
        <span className="ml-1 font-normal text-muted-foreground">
          — ↑↓ to pick, Enter to toggle
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-1 rounded-md border border-border bg-input/50 p-1">
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-[3px] bg-primary/10 px-1 py-0.5 text-[10px] font-bold text-primary"
          >
            #{tag}
            <button
              type="button"
              aria-label={`Remove tag ${tag}`}
              className="cursor-pointer rounded-sm px-0.5 hover:bg-destructive/30"
              onClick={() => removeTag(tag)}
            >
              ×
            </button>
          </span>
        ))}
        <input
          id="qb-tag-input"
          type="text"
          value={text}
          spellCheck={false}
          placeholder="add tag…"
          onChange={(e) => {
            setText(e.target.value);
            setHighlighted(-1);
            setDismissed(false);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setFocused(true);
            setDismissed(false);
          }}
          onBlur={() => {
            setFocused(false);
            // Delay so a mousedown on a row still lands before we unmount.
            setTimeout(() => setDismissed(true), 150);
          }}
          className="min-w-[90px] flex-1 bg-transparent px-1 text-xs outline-none placeholder:text-muted-foreground/50"
        />
      </div>

      {rows.length > 0 && (
        <ul
          className="scrollbar-slim absolute top-full right-0 z-50 mt-1 max-h-56 w-full min-w-[280px] overflow-y-auto overscroll-contain rounded-md border border-border bg-popover p-1 text-popover-foreground"
        >
          {rows.map((row, index) => {
            const present = tagSet.has(row.tag.toLowerCase());

            return (
              <li
                key={`${row.tag}-${row.isNew ? "new" : "known"}`}
                className={`flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1 ${
                  index === activeIndex ? "bg-muted" : "hover:bg-muted"
                }`}
                onMouseDown={(e) => {
                  // Accept on mousedown: immune to the blur/dismiss race.
                  e.preventDefault();
                  accept(index);
                }}
                ref={(el) => {
                  if (index === activeIndex && el) {
                    el.scrollIntoView({ block: "nearest" });
                  }
                }}
              >
                <span
                  className={`w-4 shrink-0 text-center text-xs font-bold ${
                    present ? "text-destructive" : "text-primary"
                  }`}
                >
                  {present ? "−" : "+"}
                </span>
                <span className="flex-1 truncate text-xs font-medium">
                  {row.isNew && (
                    <span className="mr-1 font-bold text-primary">#</span>
                  )}
                  {row.tag}
                </span>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {row.isNew ? "new" : row.count}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}