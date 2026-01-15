import React, { createContext } from "react";

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
    set: (filters: Filter[]) => void;
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

/**
 * Filter that matches a folder and all its subfolders (recursive).
 */
export type FolderFilter = BaseFilter & {
  type: "folder";
  folderId: string;
};

/**
 * Filter that matches ONLY the immediate children of a folder (non-recursive).
 */
export type StrictFolderFilter = BaseFilter & {
  type: "strict_folder";
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
  | StrictFolderFilter
  | AnyFilter;

const serializeFilters = (filters: Filter[]) => JSON.stringify(filters);
const deserializeFilters = (filters: string) => JSON.parse(filters);

const applyFilter = (
  filter: Filter,
  bookmarks: Bookmark[],
  ancestors: Map<string, Set<string>>, // Need ancestors map here
): Bookmark[] => {
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
      case "folder": {
        // Recursive check: true if bookmark's ancestors include the folderId,
        // OR if the bookmark itself IS the folder (optional, but usually we filter items INSIDE)
        // Adjust logic: usually folder filter means "items inside this folder or subfolders".
        // Ancestors map contains all parent folder IDs.
        const bookmarkAncestors = ancestors.get(bookmark.id);
        const isDescendant = bookmarkAncestors?.has(filter.folderId) ?? false;
        // Also check if it is the folder itself? Usually filters show content.
        // If I filter by "FolderA", I want to see bookmarks in FolderA.
        // If I have subfolder "FolderA/B", I want to see bookmarks in B too.
        // "bookmark" here can be a file or a folder.

        return isDescendant !== filter.negative;
      }
      case "strict_folder":
        return (
          (bookmark.parentId === filter.folderId) !== filter.negative
        );
      default:
        return true;
    }
  });
};

export const BookmarksManagerProvider = (
  { children }: { children: React.ReactNode },
) => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [ancestors, setAncestors] = useState<Map<string, Set<string>>>(
    new Map(),
  );

  const [sortOption, setSortOption] = useState<SortOption>(() => {
    const params = new URLSearchParams(globalThis.location.search);
    return params.get("sort") as SortOption || "dateAdded";
  });
  const [sortDirection, setSortDirection] = useState<SortDirection>(() => {
    const params = new URLSearchParams(globalThis.location.search);
    return params.get("sortDirection") as SortDirection || "desc";
  });

  const [displayBookmarks, setDisplayBookmarks] = useState<Bookmark[]>([]);

  const [filters, setFilters] = useState<Filter[]>(() => {
    // Try to get tags from url params
    const params = new URLSearchParams(globalThis.location.search);
    try {
      return deserializeFilters(params.get("filterTags") || "[]");
    } catch (e) {
      console.error("Failed to parse filters", e);
      return [];
    }
  });

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

  // useEffect(() => {
  //   const params = new URLSearchParams(globalThis.location.search);
  // }, []);
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
        (acc, filter) => applyFilter(filter, acc, ancestors),
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
  }, [bookmarks, sortOption, sortDirection, filters, ancestors]);

  const fetchBookmarks = () => {
    chrome.bookmarks.getTree((bookmarkTreeNodes) => {
      const bookmarks: Bookmark[] = [];
      const ancestorMap = new Map<string, Set<string>>();

      function traverse(
        nodes: chrome.bookmarks.BookmarkTreeNode[],
        parentAncestors: Set<string> = new Set(),
      ) {
        nodes.forEach((node) => {
          bookmarks.push(node);

          // Store ancestors for this node
          ancestorMap.set(node.id, parentAncestors);

          if (node.children) {
            // Create new set for children that includes this node
            const currentAncestors = new Set(parentAncestors);
            currentAncestors.add(node.id);
            traverse(node.children, currentAncestors);
          }
        });
      }
      traverse(bookmarkTreeNodes);
      setBookmarks(bookmarks);
      setAncestors(ancestorMap);
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
      set: setFilters,
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
