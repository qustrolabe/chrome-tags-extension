import { ComponentChildren } from "preact";
import { createContext } from "preact";
import { useContext, useEffect, useMemo, useState } from "preact/hooks";

export type Bookmark = chrome.bookmarks.BookmarkTreeNode;

export type SortOption = "id" | "title" | "dateAdded" | "dateLastUsed";
export type SortDirection = "asc" | "desc";

interface BookmarksManagerContextType {
  bookmarks: {
    all: Bookmark[];
    display: Bookmark[];
    availableTags: Record<string, number>;
  };
  filters: {
    list: Filter[];
    add: (filter: Filter) => void;
    remove: (filter: Filter) => void;
    clear: () => void;
  };
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

type BaseFilter = {
  type: string;
  negative: boolean;
};

// Filter that matches url or title or folder name
export type AnyFilter = BaseFilter & {
  type: "any";
  value: string;
};

export type TagFilter = BaseFilter & {
  type: "tag";
  tag: string;
};

export type TitleFilter = BaseFilter & {
  type: "title";
  title: string;
};

export type UrlFilter = BaseFilter & {
  type: "url";
  url: string;
};

export type FolderFilter = BaseFilter & {
  type: "folder";
  folderId: string;
};

// export type DateFilter = BaseFilter & {
//   type: "date";
//   // implement for filtering before/after a certain date of last used or added or modified property
// };

export type Filter =
  | TagFilter
  | TitleFilter
  | UrlFilter
  | FolderFilter
  | AnyFilter;

const serializeFilters = (filters: Filter[]) => JSON.stringify(filters);
const deserializeFilters = (filters: string) => JSON.parse(filters);

const applyFilter = (filter: Filter, bookmarks: Bookmark[]): Bookmark[] => {
  return bookmarks.filter((bookmark) => {
    const match = (value: string, target?: string) =>
      target?.toLowerCase().includes(value.toLowerCase());

    switch (filter.type) {
      case "any":
        return (
          match(filter.value, bookmark.title) ||
          match(filter.value, bookmark.url)
        ) !== filter.negative;
      case "tag":
        return match(`#${filter.tag}`, bookmark.title) !== filter.negative;
      case "title":
        return match(filter.title, bookmark.title) !== filter.negative;
      case "url":
        return match(filter.url, bookmark.url) !== filter.negative;
      case "folder":
        return (
          (bookmark.parentId === filter.folderId) !== filter.negative
        );
      default:
        return true;
    }
  });
};

export const BookmarksManagerProvider = (
  { children }: { children: ComponentChildren },
) => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  const [sortOption, setSortOption] = useState<SortOption>("dateAdded");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const [displayBookmarks, setDisplayBookmarks] = useState<Bookmark[]>([]);

  const [filters, setFilters] = useState<Filter[]>([]);

  const addFilter = (filter: Filter) => {
    const oppositeFilter = { ...filter, negative: !filter.negative };
    const existingFilter = filters.find((f) =>
      JSON.stringify(f) === JSON.stringify(filter)
    );
    const existingOppositeFilter = filters.find((f) =>
      JSON.stringify(f) === JSON.stringify(oppositeFilter)
    );

    if (existingFilter) {
      return;
    } else if (existingOppositeFilter) {
      setFilters(
        filters.filter((f) => f !== existingOppositeFilter).concat(filter),
      );
    } else {
      setFilters([...filters, filter]);
    }
  };

  const removeFilter = (filter: Filter) => {
    setFilters(filters.filter((f) => f !== filter));
  };

  const clearFilters = () => {
    setFilters([]);
  };

  const toggleSortDirection = () => {
    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
  };

  // Get all available tags from currently displayed bookmarks
  const availableTags = displayBookmarks
    .map((b) => b.title)
    .flatMap((title) => title.split(" "))
    .filter((word) => word.startsWith("#"))
    .map((word) => word.slice(1))
    .reduce((acc, tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  useEffect(() => {
    const params = new URLSearchParams(globalThis.location.search);
    setSortOption(params.get("sort") as SortOption || "dateAdded");
    setSortDirection(params.get("sortDirection") as SortDirection || "desc");
    setFilters(deserializeFilters(params.get("filterTags") || "[]"));
  }, []);
  useEffect(() => {
    const params = new URLSearchParams(globalThis.location.search);
    params.set("sort", sortOption);
    params.set("sortDirection", sortDirection);
    params.set("filterTags", serializeFilters(filters));
    history.replaceState({}, "", "?" + params.toString());
  }, [sortOption, sortDirection, filters]);

  // Sort and filter bookmarks into displayBookmarks
  useEffect(() => {
    const filterFolders = (
      input_bookmarks: Bookmark[],
    ) => input_bookmarks.filter((b) => b.url !== undefined);

    const applyFilters = (
      input_bookmarks: Bookmark[],
    ) => {
      return filters.reduce(
        (acc, filter) => applyFilter(filter, acc),
        input_bookmarks,
      );
    };

    const sortBookmarks = (
      input_bookmarks: Bookmark[],
      sortOption: SortOption,
      sortDirection: SortDirection,
    ) => {
      const compareFunctions: {
        [key in SortOption]: (a: Bookmark, b: Bookmark) => number;
      } = {
        dateAdded: (a, b) => (b.dateAdded ?? 0) - (a.dateAdded ?? 0),
        dateLastUsed: (a, b) => (b.dateLastUsed ?? 0) - (a.dateLastUsed ?? 0),
        id: (a, b) => b.id.localeCompare(a.id),
        title: (a, b) => b.title.localeCompare(a.title),
      };
      const compareFunction = compareFunctions[sortOption];
      return input_bookmarks.sort((a, b) =>
        sortDirection === "desc" ? compareFunction(a, b) : compareFunction(b, a)
      );
    };

    const nonFolderBookmarks = filterFolders(bookmarks);
    const filteredBookmarks = applyFilters(nonFolderBookmarks);

    const sortedBookmarks = sortBookmarks(
      filteredBookmarks,
      sortOption,
      sortDirection,
    );

    setDisplayBookmarks(sortedBookmarks);
  }, [bookmarks, sortOption, sortDirection, filters]);

  const fetchBookmarks = () => {
    chrome.bookmarks.getTree((bookmarkTreeNodes) => {
      const bookmarks: Bookmark[] = [];
      function traverse(nodes: chrome.bookmarks.BookmarkTreeNode[]) {
        nodes.forEach((node) => {
          bookmarks.push(node);
          if (node.children) {
            traverse(node.children);
          }
        });
      }
      traverse(bookmarkTreeNodes);
      setBookmarks(bookmarks);
    });
  };

  useEffect(() => {
    fetchBookmarks();

    const handleBookmarkChange = () => {
      fetchBookmarks();
    };

    chrome.bookmarks.onChanged.addListener(handleBookmarkChange);
    chrome.bookmarks.onMoved.addListener(handleBookmarkChange);
    chrome.bookmarks.onRemoved.addListener(handleBookmarkChange);
    chrome.bookmarks.onCreated.addListener(handleBookmarkChange);

    return () => {
      chrome.bookmarks.onChanged.removeListener(handleBookmarkChange);
      chrome.bookmarks.onMoved.removeListener(handleBookmarkChange);
      chrome.bookmarks.onRemoved.removeListener(handleBookmarkChange);
      chrome.bookmarks.onCreated.removeListener(handleBookmarkChange);
    };
  }, []);

  const value = useMemo(() => ({
    bookmarks: {
      all: bookmarks,
      display: displayBookmarks,
      availableTags,
    },
    filters: {
      list: filters,
      add: addFilter,
      remove: removeFilter,
      clear: clearFilters,
    },
    sorting: {
      sortOption,
      setSortOption,
      sortDirection,
      toggleSortDirection,
    },
  }), [
    bookmarks,
    availableTags,
    displayBookmarks,
    filters,
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
