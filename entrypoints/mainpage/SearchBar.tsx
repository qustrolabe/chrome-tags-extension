import React, { useMemo, useRef, useState } from "react";
import { useBookmarks } from "@/context/BookmarksContext.tsx";
import { parseQuery } from "@/utils/query/parser.ts";
import type { FilterToken, QueryToken } from "@/utils/query/types.ts";
import { buildFolderTree } from "@/utils/query/folders.ts";
import {
  invertTokenAt,
  removeTokenAt,
  suggestFor,
} from "@/utils/query/index.ts";
import type { Suggestion } from "@/utils/query/suggest.ts";

/**
 * Query-language search bar.
 *
 * The <input> stays a fully native single-line input (selection,
 * Ctrl+A, copy/paste, undo all work). Token highlighting uses a mirror
 * layer BEHIND the input: the input's own text is transparent (caret
 * and selection still paint), while the mirror draws the same text
 * with colored token spans. Both layers are pinned to monospace with
 * identical metrics, and horizontal scroll is synced.
 */

/**
 * Query-token colours.
 *
 * These are theme tokens (`--token-*` in `assets/global.css`), not literal
 * Tailwind hues: hardcoding the palette here made the capsules and suggestion
 * pills impossible to restyle per theme. Each theme defines the full set —
 * see the light / dark / `.automata` blocks in global.css.
 */
const TOKEN_COLORS: Record<string, string> = {
  tag: "bg-token-tag-fill/15 text-token-tag",
  url: "bg-token-url-fill/15 text-token-url",
  title: "bg-token-title-fill/15 text-token-title",
  folder: "bg-token-folder-fill/15 text-token-folder",
  folder_strict: "bg-token-folder-strict-fill/15 text-token-folder-strict",
  added: "bg-token-date-fill/15 text-token-date",
  last_used: "bg-token-date-fill/15 text-token-date",
  visits: "bg-token-tracking-fill/15 text-token-tracking",
  frecency: "bg-token-tracking-fill/15 text-token-tracking",
  id: "bg-token-id-fill/15 text-token-id",
};

// Keyed by the category strings `suggest.ts` actually emits, which are two
// different vocabularies: value suggestions pass an explicit family ("date",
// "visits") while key suggestions pass the KeySpec label ("added", "last
// used"). Both have to be listed or one of the two paths falls back to the
// neutral action pill and the same key changes colour depending on whether
// you are picking the key or its value.
const CATEGORY_STYLES: Record<string, string> = {
  tag: "bg-token-tag-pill text-token-tag",
  url: "bg-token-url-pill text-token-url",
  title: "bg-token-title-pill text-token-title",
  folder: "bg-token-folder-pill text-token-folder",
  folder_strict: "bg-token-folder-strict-pill text-token-folder-strict",
  date: "bg-token-date-pill text-token-date",
  added: "bg-token-date-pill text-token-date",
  "last used": "bg-token-date-pill text-token-date",
  visits: "bg-token-tracking-pill text-token-tracking",
  frecency: "bg-token-tracking-pill text-token-tracking",
  id: "bg-token-id-pill text-token-id",
  action: "bg-token-action-pill text-token-action",
};

const capsuleStyle = (category?: string) =>
  CATEGORY_STYLES[category ?? ""] ??
  "bg-token-action-pill text-token-action";

const tokenStyle = (token: FilterToken): string => {
  // px-1 -mx-1 widens the painted capsule without shifting the text
  // after it (negative margin cancels the padding's layout advance),
  // which keeps the mirror layer aligned with the real input text.
  const base =
    TOKEN_COLORS[token.key] ?? "bg-token-action-pill/15 text-token-action";
  const shape = "rounded-[5px] px-0.5 -mx-0.5 -my-1 py-1.5";
  return token.negated
    ? `${base} ${shape} line-through opacity-80`
    : `${base} ${shape}`;
};

/** Split query into segments; filter tokens get highlighted. */
const splitSegmentsForMirror = (
  query: string,
): { text: string; token?: QueryToken }[] => {
  const parts: { text: string; token?: QueryToken }[] = [];
  let pos = 0;
  for (const token of parseQuery(query).tokens) {
    if (token.start > pos) {
      parts.push({ text: query.slice(pos, token.start) });
    }
    parts.push({ text: query.slice(token.start, token.end), token });
    pos = token.end;
  }
  if (pos < query.length) parts.push({ text: query.slice(pos) });
  return parts;
};

export default function SearchBar() {
  const {
    query,
    setQuery,
    bookmarks: { availableTags, all: allBookmarks },
  } = useBookmarks();

  const inputRef = useRef<HTMLInputElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const [caret, setCaret] = useState(0);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dismissed, setDismissed] = useState(false);
  const [focused, setFocused] = useState(false);

  const folderTree = useMemo(
    () => buildFolderTree(allBookmarks),
    [allBookmarks],
  );

  // Recompute suggestions on every query/caret change.
  const suggestions: Suggestion[] = useMemo(
    () =>
      focused && !dismissed
        ? suggestFor(query, caret, { tags: availableTags, folderTree })
        : [],
    [query, caret, availableTags, folderTree, dismissed, focused],
  );

  // Derived: keep the highlight within bounds instead of resetting via effect.
  const activeIndex =
    highlightedIndex >= 0 && highlightedIndex < suggestions.length
      ? highlightedIndex
      : -1;

  const mirrorParts = useMemo(() => splitSegmentsForMirror(query), [query]);

  const updateQuery = (next: string, caretAfter?: number) => {
    // Compute the final caret synchronously and clamp it: the suggestion
    // memo must never recompute with a stale or out-of-range caret.
    const pos = Math.min(caretAfter ?? next.length, next.length);
    setQuery(next);
    setCaret(pos);
    setDismissed(false);
    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) return;
      // Don't yank caret/focus if the user already typed past our insert.
      if (input.value !== next || document.activeElement !== input) return;
      input.setSelectionRange(pos, pos);
    });
  };

  const acceptSuggestion = (suggestion: Suggestion) => {
    if (suggestion.type === "action") {
      if (suggestion.action === "invert") {
        const next = invertTokenAt(query, suggestion.replaceTo);
        if (next !== null) updateQuery(next);
        return;
      }
      if (suggestion.action === "remove") {
        updateQuery(removeTokenAt(query, suggestion.replaceTo));
        return;
      }
    }
    if (suggestion.insert !== undefined) {
      const next =
        query.slice(0, suggestion.replaceFrom) +
        suggestion.insert +
        query.slice(suggestion.replaceTo);
      updateQuery(
        next,
        suggestion.replaceFrom + suggestion.insert.length,
      );
    }
  };

  const syncCaret = () => {
    const input = inputRef.current;
    if (input) setCaret(input.selectionStart ?? input.value.length);
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    // Let IME composition (e.g. CJK candidates) handle its own keys.
    if (e.nativeEvent.isComposing) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setDismissed(false);
      setHighlightedIndex((prev) => {
        const len = suggestions.length;
        if (len === 0) return -1;
        const next = Math.max(prev, -1) + 1;
        return next >= len ? 0 : next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        const len = suggestions.length;
        if (len === 0 || prev <= 0) return -1; // leaving the list / nothing selected
        return prev - 1;
      });
    } else if (e.key === "Enter" || e.key === "Tab") {
      const index = e.key === "Enter"
        ? activeIndex
        : activeIndex === -1
        ? 0
        : activeIndex;
      const suggestion = suggestions[index];
      if (suggestion) {
        e.preventDefault();
        acceptSuggestion(suggestion);
      } else if (e.key === "Enter") {
        setDismissed(true);
      }
    } else if (e.key === "Escape") {
      setDismissed(true);
      // Deactivate the field entirely: blur so suggestions stay hidden
      // until the user deliberately focuses again.
      inputRef.current?.blur();
    }
  };

  return (
    <div className="relative w-full">
      <div className="ring-focus-within relative flex w-full items-center rounded bg-input text-foreground focus-within:outline-none">
        {/* Highlight mirror behind the input: identical metrics */}
        <div
          ref={mirrorRef}
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden px-2 py-[7px] font-mono text-sm leading-5 whitespace-pre"
        >
          {mirrorParts.map((part, i) =>
            part.token &&
            part.token.kind === "filter" &&
            !part.token.incomplete
              ? (
                <span key={i} className={`rounded-[3px] ${tokenStyle(part.token)}`}>
                  {part.text}
                </span>
              )
              : (
                <span key={i}>{part.text}</span>
              )
          )}
          {/* trailing space so the mirror width tracks the input */}
          {"\u200b"}
        </div>

        <input
          ref={inputRef}
          type="text"
          spellCheck={false}
          placeholder='Search — tag:"tech" url:"google" last_used:<1w -folder:"Archive"'
          className="relative z-10 w-full min-w-[100px] grow bg-transparent px-2 py-[7px] font-mono text-sm leading-5 text-transparent caret-foreground selection:bg-token-selection selection:text-transparent placeholder:text-muted-foreground/70 focus:outline-none"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setDismissed(false);
          }}
          onKeyUp={syncCaret}
          onClick={syncCaret}
          onSelect={syncCaret}
          onKeyDown={handleKeyDown}
          onScroll={(e) => {
            if (mirrorRef.current) {
              mirrorRef.current.scrollLeft = e.currentTarget.scrollLeft;
            }
          }}
          onBlur={() => {
            setFocused(false);
            setTimeout(() => setDismissed(true), 150);
          }}
          onFocus={() => {
            setFocused(true);
            setDismissed(false);
          }}
        />

        {suggestions.length > 0 && (
          <ul className="absolute top-full left-0 z-50 mt-1 max-h-80 w-full max-w-[560px] min-w-[380px] overflow-auto rounded-md border border-border bg-popover p-1 text-popover-foreground">
            {suggestions.map((suggestion, index) => (
              <li
                key={`${index}-${suggestion.label}`}
                className={`flex cursor-pointer items-center gap-2 rounded-sm p-1 ${
                  suggestion.action === "invert"
                    ? index === activeIndex
                      ? "bg-token-invert font-medium text-token-invert-fg ring-1 ring-ring"
                      : "bg-token-invert text-token-invert-fg"
                    : suggestion.action === "remove"
                    ? index === activeIndex
                      ? "bg-token-remove font-medium text-token-remove-fg ring-1 ring-ring"
                      : "bg-token-remove text-token-remove-fg"
                    : index === activeIndex
                    ? "bg-muted"
                    : "hover:bg-muted"
                }`}
                onMouseDown={(e) => {
                  // Accept on mousedown: immune to blur/dismiss races.
                  e.preventDefault();
                  acceptSuggestion(suggestion);
                }}
                ref={(el) => {
                  // Keep the highlighted option visible while arrowing
                  // through a scrolled list.
                  if (index === activeIndex && el) {
                    el.scrollIntoView({ block: "nearest" });
                  }
                }}
              >
                {suggestion.category && (
                  <span
                    className={`shrink-0 rounded-[4px] px-2 py-0.5 text-xs font-medium ${capsuleStyle(suggestion.category)}`}
                  >
                    {suggestion.category}
                  </span>
                )}
                <span className="truncate font-mono text-sm">
                  {suggestion.label}
                </span>
                {suggestion.comment && (
                  <span className="ml-auto shrink-0 pl-2 text-xs whitespace-nowrap text-muted-foreground">
                    {suggestion.comment}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
