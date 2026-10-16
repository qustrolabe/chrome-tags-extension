import React, { useMemo, useState, useRef, useEffect } from "react";
import { AiOutlinePlus, AiOutlineMinus } from "react-icons/ai";
import { extractTags, buildTagIndex } from "@/utils/query/tags.ts";
import { useTagColor } from "@/context/TagColorContext";
import { tagColorClass } from "@/utils/tagColor.ts";
import { sortTagsRight } from "@/components/BookmarkEditDialog.tsx";

type Bookmark = chrome.bookmarks.BookmarkTreeNode;

interface TagListPanelProps {
  title: string;
  setTitle: (v: string) => void;
  allBookmarks: Bookmark[];
  autoFocus?: boolean;
  compact?: boolean;
  nativeScroll?: boolean;
}

/** A listable row: an existing tag, or the "create this" entry. */
interface Row {
  tag: string;
  count: number;
  isNew: boolean;
}

/** Strip the leading # and whitespace so the raw box and the row agree. */
const normalize = (raw: string): string =>
  raw.trim().replace(/^#/, "").replace(/\s+/g, "");

/**
 * Searchable catalogue of every tag in use, with a keyboard-navigable filter.
 *
 * ↑/↓ move the selection (Down wraps, Up past the top returns to plain
 * typing), typing drops the selection, and Enter toggles the selected row —
 * the same contract as the main search bar and the quick-bookmark tag field.
 *
 * The tricky part is that this panel sorts active tags to the top, so
 * toggling a tag would normally promote it and yank the selection onto a
 * different row. Two rules resolve that, and they are different rules:
 *
 *   - While the selection stays put, the order is frozen, so Enter twice
 *     reliably toggles the same tag back off.
 *   - The moment ↑/↓ moves the selection elsewhere, the freeze is released
 *     and the active-first sort resumes.
 *
 * The selection is therefore tracked by lowercased tag name, never by index:
 * releasing the freeze changes every index, and only the tag survives.
 *
 * Clicking a row is the same operation as pressing Enter on it, not a second
 * mode: the row is toggled, stays selected, and focus goes back to the search
 * box so ↑/↓ and typing carry straight on from there. Moving to a *different*
 * row releases the previous row, so it reflows instead of staying pinned.
 */
export default function TagListPanel({ title, setTitle, allBookmarks, autoFocus, compact, nativeScroll }: TagListPanelProps) {
  const [tagSearch, setTagSearch] = useState("");
  /** Lowercased tag of the selected row; null = nothing selected. */
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  /** Row order captured when a selection starts, replayed until it moves. */
  const [frozen, setFrozen] = useState<string[] | null>(null);
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
    const tag = normalize(raw);

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

  const query = normalize(tagSearch);

  const sortedTags = useMemo(() => {
    const q = query.toLowerCase();
    const base = q ? knownTags.filter((e) => e.tag.toLowerCase().includes(q)) : knownTags;

    // Active tags on top, then by count desc, then alphabetically
    return [...base].sort((a, b) => {
      const aActive = tagSet.has(a.tag.toLowerCase()) ? 1 : 0;
      const bActive = tagSet.has(b.tag.toLowerCase()) ? 1 : 0;

      if (aActive !== bActive) return bActive - aActive;

      if (b.count !== a.count) return b.count - a.count;

      return a.tag.localeCompare(b.tag);
    });
  }, [knownTags, query, tagSet]);

  const canCreate = useMemo(
    () =>
      !!query &&
      !tagSet.has(query.toLowerCase()) &&
      !knownTags.some((e) => e.tag.toLowerCase() === query.toLowerCase()),
    [query, tagSet, knownTags],
  );

  /**
   * The unfrozen active-first order. This is also what a *new* freeze
   * captures, which is why it has to exist separately from `rows` — while a
   * freeze is active, `rows` is a replay and would freeze the next selection
   * onto the previous row's stale order.
   */
  const liveRows = useMemo<Row[]>(() => {
    const live: Row[] = sortedTags.map((e) => ({ tag: e.tag, count: e.count, isNew: false }));

    if (canCreate) live.push({ tag: query, count: 0, isNew: true });

    return live;
  }, [sortedTags, canCreate, query]);

  const rows = useMemo<Row[]>(() => {
    // No selection -> live active-first order. Selection without a captured
    // order can't happen, but fall back to live rather than trusting it.
    if (!selectedTag || !frozen) return liveRows;

    // Replay the captured order, then append anything that appeared since.
    // Keyed by lowercased tag so a row promoted by the toggle still matches.
    const byTag = new Map(liveRows.map((r) => [r.tag.toLowerCase(), r]));
    const kept: Row[] = [];
    const used = new Set<string>();

    for (const t of frozen) {
      const r = byTag.get(t);

      if (r && !used.has(t)) {
        kept.push(r);
        used.add(t);
      }
    }

    for (const r of liveRows) {
      const key = r.tag.toLowerCase();

      if (!used.has(key)) kept.push(r);
    }

    return kept;
  }, [liveRows, selectedTag, frozen]);

  /** Resolved against `rows`, so it survives both frozen and live ordering. */
  const activeIndex = useMemo(() => {
    if (!selectedTag) return -1;

    return rows.findIndex((r) => r.tag.toLowerCase() === selectedTag);
  }, [rows, selectedTag]);

  const clearSelection = () => {
    setSelectedTag(null);
    setFrozen(null);
  };

  /**
   * Keep a click from moving focus onto the row button. Without it the input
   * blurs and every key goes to a <button>, so ↑/↓ and typing would work
   * right up until the first click and then silently stop. `accept` hands
   * focus back explicitly, which covers the case where the input did not have
   * it in the first place.
   */
  const keepFocus = (e: React.MouseEvent) => e.preventDefault();

  /** Enter/click. Stays selected so a second Enter un-toggles the same tag. */
  const accept = (index: number | undefined) => {
    const row = index === undefined ? undefined : rows[index];

    if (!row) {
      // Nothing selected: commit whatever was typed.
      if (query) {
        addTag(query);
        setTagSearch("");
        clearSelection();
      }

      return;
    }

    // Only clear the box when the row stops existing (the create row).
    if (row.isNew) setTagSearch("");

    if (row.isNew) addTag(row.tag);
    else toggleTag(row.tag);

    const key = row.tag.toLowerCase();
    // Re-entering the same row keeps the existing freeze — that is what makes
    // a second Enter (or a second click) toggle the same tag back off.
    //
    // Landing on a *different* row starts a fresh selection instead: the row
    // being left behind is released, so it reflows to its sorted position
    // rather than staying pinned by a freeze that now belongs to someone else.
    // The capture has to come from `liveRows`, not `rows`, which is currently
    // the previous row's frozen replay.
    const reentering = selectedTag === key;
    const liveOrder = liveRows.map((r) => r.tag.toLowerCase());
    setSelectedTag(key);
    setFrozen(reentering ? (prev) => prev ?? liveOrder : liveOrder);

    // A click lands focus on the button, and ↑/↓ plus typing are both handled
    // by the input's onKeyDown — so without this the row would be selected but
    // the keyboard dead, i.e. a different mode from the one typing gives you.
    searchRef.current?.focus();
  };

  /**
   * Move the selection by one row, as seen in the current (possibly frozen)
   * order, then release the freeze. Releasing is what lets the active-first
   * sort run again; carrying the target over by tag name is what keeps the
   * selection on the same tag afterwards.
   */
  const move = (delta: 1 | -1) => {
    if (rows.length === 0) {
      clearSelection();

      return;
    }

    let next: number;

    if (delta === 1) {
      next = activeIndex + 1;

      if (activeIndex === -1) next = 0;
      else if (next >= rows.length) next = 0;
    } else {
      if (activeIndex <= 0) {
        clearSelection();

        return;
      }

      next = activeIndex - 1;
    }

    const target = rows[next];

    if (!target) {
      clearSelection();

      return;
    }

    setFrozen(null);
    setSelectedTag(target.tag.toLowerCase());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      move(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      move(-1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      accept(activeIndex);
    } else if (e.key === "Escape") {
      e.preventDefault();

      if (selectedTag || tagSearch) {
        clearSelection();
        setTagSearch("");
        searchRef.current?.blur();
      }
    }
  };

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${nativeScroll ? "overflow-visible" : "overflow-hidden"}`}>
      <div className="shrink-0 p-3 pb-2">
        <label htmlFor="tag-panel-search" className="block text-xs font-medium">Tags</label>
        <input
          ref={searchRef}
          id="tag-panel-search"
          type="text"
          value={tagSearch}
          spellCheck={false}
          onChange={(e) => {
            setTagSearch(e.target.value);
            clearSelection();
          }}
          onKeyDown={handleKeyDown}
          onBlur={clearSelection}
          placeholder="search tags… (sorted by count)"
          className="mt-1 w-full rounded-md border border-border bg-secondary/80 px-2 py-1.5 text-xs outline-none placeholder:text-muted-foreground/50"
        />
        <p className="mt-1 text-[10px] text-muted-foreground">↑↓ to move • Enter to toggle • Enter on empty to create</p>
      </div>
      <div className={nativeScroll ? "min-h-0 flex-1 p-2" : `scrollbar-slim ${compact ? "min-h-0" : "min-h-[280px]"} flex-1 overflow-y-auto overscroll-contain border-y border-border p-2`}>
        {rows.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">No matching tags</div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {rows.map((row, index) => {
              const selected = index === activeIndex;

              const ref = (el: HTMLButtonElement | null) => {
                if (selected && el) el.scrollIntoView({ block: "nearest" });
              };

              const cls = `w-full cursor-pointer rounded-md border px-2 py-1.5 text-left text-xs transition-colors ${
                selected
                  ? "bg-muted ring-1 ring-ring"
                  : row.isNew
                    ? "border-dashed hover:bg-muted"
                    : "border-transparent hover:bg-muted"
              }`;

              if (row.isNew) {
                return (
                  <button key={`new-${row.tag}`} type="button" ref={ref} onMouseDown={keepFocus} onClick={() => accept(index)} className={`${cls} flex items-center gap-2`}>
                    <span className="flex-1 truncate"><span className="font-bold text-primary">#</span>{row.tag} <span className="text-muted-foreground">(new)</span></span>
                    <span className="flex items-center justify-center rounded-md bg-primary p-1.5 text-primary-foreground"><AiOutlinePlus className="size-3" /></span>
                  </button>
                );
              }

              const present = tagSet.has(row.tag.toLowerCase());

              return (
                <button
                  key={row.tag}
                  type="button"
                  ref={ref}
                  onMouseDown={keepFocus}
                  onClick={() => accept(index)}
                  title={present ? `Remove #${row.tag}` : `Add #${row.tag}`}
                  className={`${cls} flex items-center gap-2 ${present && !selected ? "border-primary/30 bg-primary/10" : ""}`}
                >
                  <span className="flex-1 truncate font-medium">
                    <span className={`inline-block rounded-md px-1.5 py-0.5 font-bold ${tagColorClass(useTagColor(), row.tag)}`}>#{row.tag}</span>
                  </span>
                      <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">

                    {row.count} {row.count === 1 ? "bookmark" : "bookmarks"}
                  </span>
                  <span className={`flex items-center justify-center rounded-md p-1.5 text-xs font-bold ${present ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground dark:bg-primary/50 dark:text-primary-foreground/70"}`}>
                    {present ? <AiOutlineMinus className="size-3" /> : <AiOutlinePlus className="size-3" />}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
