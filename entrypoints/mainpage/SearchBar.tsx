import React, { useMemo, useRef, useState } from "react";
import { useBookmarks } from "@/context/BookmarksContext.tsx";
import { parseQuery } from "@/utils/query/parser.ts";
import type { FilterToken } from "@/utils/query/types.ts";
import {
  invertTokenAt,
  removeTokenAt,
  suggestFor,
} from "@/utils/query/index.ts";
import type { Suggestion } from "@/utils/query/suggest.ts";
import { AiOutlineClose } from "react-icons/ai";

/**
 * Query-language search bar.
 *
 * - One input holding the raw query string (the single source of truth).
 * - Caret-aware suggestions: key names, values with category capsules and
 *   grey comments, plus Invert/Remove actions when the caret is inside an
 *   existing token.
 * - Arrow keys navigate, Enter accepts, Tab completes, Esc dismisses.
 */

const CATEGORY_STYLES: Record<string, string> = {
  tag: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  url: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100",
  title: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
  folder: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  date: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100",
  action: "bg-neutral-200 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-100",
};

const capsuleStyle = (category?: string) =>
  CATEGORY_STYLES[category ?? ""] ??
  "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200";

export default function SearchBar() {
  const {
    query,
    setQuery,
    bookmarks: { availableTags, all: allBookmarks },
  } = useBookmarks();

  const inputRef = useRef<HTMLInputElement>(null);
  const [caret, setCaret] = useState(0);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dismissed, setDismissed] = useState(false);
  const [focused, setFocused] = useState(false);

  const folderNames = useMemo(
    () =>
      [...new Set(
        allBookmarks
          .filter((b) => b.url === undefined && b.title)
          .map((b) => b.title),
      )].sort(),
    [allBookmarks],
  );

  // Recompute suggestions on every query/caret change.
  const suggestions: Suggestion[] = useMemo(
    () =>
      focused && !dismissed
        ? suggestFor(query, caret, { tags: availableTags, folderNames })
        : [],
    [query, caret, availableTags, folderNames, dismissed, focused],
  );

  // Derived: keep the highlight within bounds instead of resetting via effect.
  const activeIndex =
    highlightedIndex >= 0 && highlightedIndex < suggestions.length
      ? highlightedIndex
      : -1;
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
      // Don't yank caret/focus if the user already typed on or moved past
      // the text we inserted.
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
        if (len === 0) return -1;
        const next = Math.min(prev, len) - 1;
        return next < 0 ? len - 1 : next;
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

  /** Active filter tokens shown as removable chips under the input. */
  const chips = useMemo(
    () => parseQuery(query).tokens.filter(
      (t): t is FilterToken => t.kind === "filter",
    ),
    [query],
  );

  return (
    <div className="flex w-full flex-col gap-1">
      {/* relative wrapper anchors the dropdown directly below the input */}
      <div className="focus-within:ring-focus relative flex w-full items-center gap-1 rounded bg-input p-1 text-foreground focus-within:ring focus-within:outline-none">
        <input
          ref={inputRef}
          type="text"
          placeholder='Search — tag:"tech" url:"google" last_used:<1w -folder:"Archive"'
          className="w-full min-w-[100px] grow bg-transparent p-1 align-middle focus:outline-none"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setDismissed(false);
          }}
          onKeyUp={syncCaret}
          onClick={syncCaret}
          onSelect={syncCaret}
          onKeyDown={handleKeyDown}
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
          <ul className="absolute top-full left-0 z-50 mt-1 max-h-80 w-full max-w-[560px] min-w-[380px] overflow-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg">
            {suggestions.map((suggestion, index) => (
              <li
                key={`${index}-${suggestion.label}`}
                className={`flex cursor-pointer items-center gap-2 rounded-sm p-1 ${
                  suggestion.action === "invert"
                    ? "bg-yellow-100 dark:bg-yellow-900/40"
                    : suggestion.action === "remove"
                    ? "bg-red-100 dark:bg-red-900/40"
                    : index === activeIndex
                    ? "bg-muted"
                    : "hover:bg-muted"
                }`}
                onMouseDown={(e) => {
                  // Accept on mousedown: immune to blur/dismiss races.
                  e.preventDefault();
                  acceptSuggestion(suggestion);
                }}
              >
                {suggestion.category && (
                  <span
                    className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${capsuleStyle(suggestion.category)}`}
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

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          {chips.map((token) => (
            <span
              key={`${token.start}-${token.key}-${token.value}`}
              className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs select-none ${
                token.negated
                  ? `${capsuleStyle(token.key)} line-through opacity-70 outline-1 outline-destructive`
                  : capsuleStyle(token.key)
              }`}
            >
              <span className="font-medium">{token.key}</span>
              <span>{token.value}</span>
              <button
                className="cursor-pointer opacity-60 hover:opacity-100"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() =>
                  updateQuery(removeTokenAt(query, token.end))
                }
              >
                <AiOutlineClose className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
