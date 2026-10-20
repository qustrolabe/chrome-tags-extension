import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useTracking } from "@/context/TrackingContext";
import { computeFrecency } from "@/utils/tracking";
import { decodeStored } from "@/utils/storageDecode.ts";
import { buildTagIndex, applyQuery, createMatchContext } from "@queryfield/core";
import type { BookmarkLike } from "@queryfield/core";
import { appRegistry } from "@/utils/queryRegistry.ts";

export type Bookmark = chrome.bookmarks.BookmarkTreeNode;

const SORT_OPTIONS = [
  "id",
  "title",
  "dateAdded",
  "dateLastUsed",
  "lastVisited",
  "frecency",
  "visits",
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number];

const SORT_DIRECTIONS = ["asc", "desc"] as const;

export type SortDirection = (typeof SORT_DIRECTIONS)[number];

const sortOptionSchema = z.enum(SORT_OPTIONS);
const sortDirectionSchema = z.enum(SORT_DIRECTIONS);

/** Decode a sort value from the URL or storage; unknown values are ignored. */
export const parseSortOption = (value: any) =>
  decodeStored(sortOptionSchema, value);

export const parseSortDirection = (value: any) =>
  decodeStored(sortDirectionSchema, value);

interface BookmarksManagerContextType {
  bookmarks: {
    all: Bookmark[];
    display: Bookmark[];
    availableTags: Record<string, number>;
  };
  /** Raw query string — the single source of truth for filtering. */
  query: string;
  setQuery: (query: string) => void;
  sorting: {
    sortOption: SortOption;
    setSortOption: (sortOption: SortOption) => void;
    sortDirection: SortDirection;
    toggleSortDirection: () => void;
  };
}

export const BookmarksManagerContext = createContext<
  BookmarksManagerContextType | undefined
>(undefined);

export const sortBookmarks = (
  input_bookmarks: Bookmark[],
  sortOption: SortOption,
  sortDirection: SortDirection,
  stats: Record<string, { visits: number; score: number; lastVisited: number }>,
): Bookmark[] => {
  const compareFunctions = {
    dateAdded: (a, b) => (b.dateAdded ?? 0) - (a.dateAdded ?? 0),
    dateLastUsed: (a, b) => (b.dateLastUsed ?? 0) - (a.dateLastUsed ?? 0),
    // Tracking-backed, and available on every browser: untracked bookmarks
    // carry no timestamp and therefore sort last (0) in descending order.
    lastVisited: (a, b) => (stats[b.id]?.lastVisited ?? 0) - (stats[a.id]?.lastVisited ?? 0),
    id: (a, b) => b.id.localeCompare(a.id),
    title: (a, b) => b.title.localeCompare(a.title),
    frecency: (a, b) => {
      const aStats = stats[a.id];
      const bStats = stats[b.id];
      const aValue = aStats ? computeFrecency(aStats.score, aStats.lastVisited) : 0;
      const bValue = bStats ? computeFrecency(bStats.score, bStats.lastVisited) : 0;

      return bValue - aValue;
    },
    visits: (a, b) => {
      const aValue = stats[a.id]?.visits ?? 0;
      const bValue = stats[b.id]?.visits ?? 0;

      return bValue - aValue;
    },
  } satisfies Record<SortOption, (a: Bookmark, b: Bookmark) => number>;

  const compareFunction = compareFunctions[sortOption];

  return [...input_bookmarks].sort((a, b) =>
    sortDirection === "desc" ? compareFunction(a, b) : compareFunction(b, a)
  );
};

// Local re-import to avoid circular dependency at module level.

export const BookmarksManagerProvider = (
  { children }: { children: React.ReactNode },
) => {
  const { stats } = useTracking();
  const [allBookmarksFlat, setAllBookmarksFlat] = useState<Bookmark[]>([]);

  const [sortOption, setSortOption] = useState<SortOption>(() => {
    const params = new URLSearchParams(globalThis.location.search);

    return parseSortOption(params.get("sort")) ?? "dateAdded";
  });

  const [sortDirection, setSortDirection] = useState<SortDirection>(() => {
    const params = new URLSearchParams(globalThis.location.search);

    return parseSortDirection(params.get("sortDirection")) ?? "desc";
  });

  const [sortingMounted, setSortingMounted] = useState(false);

  /** The query is persisted in the URL and is the single filter truth. */
  const [query, setQuery] = useState<string>(() => {
    const params = new URLSearchParams(globalThis.location.search);

    return params.get("q") ?? "";
  });

  const toggleSortDirection = () => {
    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
  };

  useEffect(() => {
    const params = new URLSearchParams(globalThis.location.search);
    params.set("sort", sortOption);
    params.set("sortDirection", sortDirection);
    params.set("q", query);
    history.replaceState({}, "", "?" + params.toString());
  }, [sortOption, sortDirection, query]);

  useEffect(() => {
    browser.storage.local.get(["sortOption", "sortDirection"]).then((result) => {
      const storedSort = parseSortOption(result.sortOption);
      const storedDirection = parseSortDirection(result.sortDirection);

      if (storedSort) setSortOption(storedSort);

      if (storedDirection) setSortDirection(storedDirection);
      setSortingMounted(true);
    });
  }, []);

  useEffect(() => {
    if (!sortingMounted) return;
    browser.storage.local.set({
      sortOption,
      sortDirection,
    });
  }, [sortOption, sortDirection, sortingMounted]);

  // Match context only depends on the tree + stats, not the query —
  // building it on every keystroke would re-scan the whole bookmark tree.
  const matchContext = useMemo(
    () => createMatchContext(allBookmarksFlat, stats),
    [allBookmarksFlat, stats],
  );

  // Bookmark leaves only; folder titles can carry "#" too but no tags.
  const bookmarkItems = useMemo(
    () => allBookmarksFlat.filter((b) => b.url !== undefined),
    [allBookmarksFlat],
  );

  // Sort and filter bookmarks into displayBookmarks
  const displayBookmarks = useMemo(() => {
    const filteredBookmarks = applyQuery(query, bookmarkItems, matchContext, appRegistry);

    return sortBookmarks(
      filteredBookmarks,
      sortOption,
      sortDirection,
      stats,
    );
  }, [bookmarkItems, sortOption, sortDirection, query, stats, matchContext]);

  // Suggestion tags come from the whole library, not the current result set.
  // A negative fragment filters its own tag out of displayBookmarks, so the
  // very tag being excluded would stop being suggested (`-godo` lost
  // `-tag:"godot"` while the folder tree, built from `all`, still offered it).
  // Case-merged: "Godot" and "godot" are one entry (most common casing) with
  // a combined count.
  const availableTags = useMemo(
    () => buildTagIndex(bookmarkItems),
    [bookmarkItems],
  );

  const fetchBookmarks = () => {
    browser.bookmarks.getTree().then((bookmarkTreeNodes) => {
      const collected: Bookmark[] = [];

      function traverse(
        nodes: chrome.bookmarks.BookmarkTreeNode[],
      ) {
        nodes.forEach((node) => {
          collected.push(node);

          if (node.children) traverse(node.children);
        });
      }

      traverse(bookmarkTreeNodes);
      setAllBookmarksFlat(collected);
    });
  };

  useEffect(() => {
    fetchBookmarks();

    const handleBookmarkChange = () => {
      fetchBookmarks();
    };

    browser.bookmarks.onChanged.addListener(handleBookmarkChange);
    browser.bookmarks.onMoved.addListener(handleBookmarkChange);
    browser.bookmarks.onRemoved.addListener(handleBookmarkChange);
    browser.bookmarks.onCreated.addListener(handleBookmarkChange);

    return () => {
      browser.bookmarks.onChanged.removeListener(handleBookmarkChange);
      browser.bookmarks.onMoved.removeListener(handleBookmarkChange);
      browser.bookmarks.onRemoved.removeListener(handleBookmarkChange);
      browser.bookmarks.onCreated.removeListener(handleBookmarkChange);
    };
  }, []);

  const value = useMemo(() => ({
    bookmarks: {
      all: allBookmarksFlat,
      display: displayBookmarks,
      availableTags,
    },
    query,
    setQuery,
    sorting: {
      sortOption,
      setSortOption,
      sortDirection,
      toggleSortDirection,
    },
    // toggleSortDirection is stable (useCallback) — adding it would not change memoization
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [
    allBookmarksFlat,
    availableTags,
    displayBookmarks,
    query,
    sortOption,
    sortDirection,
  ]);

  return (
    <BookmarksManagerContext.Provider value={value}>
      {children}
    </BookmarksManagerContext.Provider>
  );
};

export const useBookmarks = (): BookmarksManagerContextType => {
  const context = useContext(BookmarksManagerContext);

  if (!context) {
    throw new Error("useBookmarks must be used within a BookmarksProvider");
  }

  return context;
};

// Re-export for consumers that still reference the type.
export type { BookmarkLike };
