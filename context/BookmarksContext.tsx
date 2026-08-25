import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useTracking } from "@/context/TrackingContext";
import { computeFrecency } from "@/utils/tracking";
import {
  applyQuery,
  createMatchContext,
} from "@/utils/query/index.ts";
import type { BookmarkLike } from "@/utils/query/types.ts";

export type Bookmark = chrome.bookmarks.BookmarkTreeNode;

export type SortOption =
  | "id"
  | "title"
  | "dateAdded"
  | "dateLastUsed"
  | "frecency"
  | "visits";
export type SortDirection = "asc" | "desc";

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
  const compareFunctions: {
    [key in SortOption]: (a: Bookmark, b: Bookmark) => number;
  } = {
    dateAdded: (a, b) => (b.dateAdded ?? 0) - (a.dateAdded ?? 0),
    dateLastUsed: (a, b) => (b.dateLastUsed ?? 0) - (a.dateLastUsed ?? 0),
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
  };
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
    return params.get("sort") as SortOption || "dateAdded";
  });
  const [sortDirection, setSortDirection] = useState<SortDirection>(() => {
    const params = new URLSearchParams(globalThis.location.search);
    return params.get("sortDirection") as SortDirection || "desc";
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
      const storedSort = result.sortOption as SortOption | undefined;
      const storedDirection = result.sortDirection as SortDirection | undefined;
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

  // Sort and filter bookmarks into displayBookmarks
  const displayBookmarks = useMemo(() => {
    const bookmarkOnly = allBookmarksFlat.filter((b) => b.url !== undefined);
    const ctx = createMatchContext(allBookmarksFlat, stats);
    const filteredBookmarks = applyQuery(query, bookmarkOnly, ctx);

    return sortBookmarks(
      filteredBookmarks,
      sortOption,
      sortDirection,
      stats,
    );
  }, [allBookmarksFlat, sortOption, sortDirection, query, stats]);

  // Get all available tags from currently displayed bookmarks
  // (used in displaying tag search suggestion)
  const availableTags = displayBookmarks
    .map((b) => b.title)
    .flatMap((title) => title.split(" "))
    .filter((word) => word.startsWith("#"))
    .map((word) => word.slice(1))
    .reduce((acc, tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

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
