import { ComponentChildren } from "preact";
import { createContext } from "preact";
import { useContext, useEffect, useState } from "preact/hooks";

export type Bookmark = chrome.bookmarks.BookmarkTreeNode;

export type SortOption = "id" | "title" | "dateAdded" | "dateLastUsed";
export type SortDirection = "asc" | "desc";

interface BookmarksManagerContextType {
  sortOption: SortOption;
  setSortOption: (sortOption: SortOption) => void;
  sortDirection: SortDirection;
  setSortDirection: (sortDirection: SortDirection) => void;
  searchQuery: string;
  setSearchQuery: (searchQuery: string) => void;
  filterTags: string[];
  setFilterTags: (filterTags: string[]) => void;
  displayBookmarks: Bookmark[];
  availableTags: Record<string, number>;
  bookmarks: Bookmark[];
}

export const BookmarksManagerContext = createContext<
  BookmarksManagerContextType | undefined
>(undefined);

export const BookmarksManagerProvider = (
  { children }: { children: ComponentChildren },
) => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  const [sortOption, setSortOption] = useState<SortOption>("dateAdded");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTags, setFilterTags] = useState<string[]>([]);

  const [displayBookmarks, setDisplayBookmarks] = useState<Bookmark[]>([]);

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

  // Save and load sortOption, sortDirection, searchQuery, and filterTags from GET parameters
  useEffect(() => {
    const params = new URLSearchParams(globalThis.location.search);
    setSortOption(params.get("sort") as SortOption || "dateAdded");
    setSortDirection(params.get("sortDirection") as SortDirection || "desc");
    setSearchQuery(params.get("searchQuery") || "");
    setFilterTags(params.getAll("filterTags"));
  }, []);
  useEffect(() => {
    const params = new URLSearchParams(globalThis.location.search);
    params.set("sort", sortOption);
    params.set("sortDirection", sortDirection);
    params.set("searchQuery", searchQuery);
    params.delete("filterTags");
    filterTags.forEach((tag) => params.append("filterTags", tag));
    history.replaceState({}, "", "?" + params.toString());
  }, [sortOption, sortDirection, searchQuery, filterTags]);

  // Sort and filter bookmarks into displayBookmarks
  useEffect(() => {
    // Filter out folders
    const filterFolders = (input_bookmarks: Bookmark[]) =>
      input_bookmarks.filter((b) => b.url);

    const filterByQuery = (
      input_bookmarks: Bookmark[],
      searchQuery: string,
    ) =>
      input_bookmarks.filter((b) =>
        searchQuery
          ? b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (b.url && b.url.toLowerCase().includes(searchQuery.toLowerCase()))
          : true
      );

    const filterByTags = (
      input_bookmarks: Bookmark[],
      filterTags: string[],
    ) =>
      input_bookmarks.filter((b) =>
        filterTags.length === 0 ||
        filterTags.every((tag) =>
          tag.startsWith("-")
            ? !b.title.toLowerCase().split(" ").some((word) =>
              word === "#" + tag.slice(1)
            )
            : b.title.toLowerCase().split(" ").some((word) =>
              word === "#" + tag
            )
        )
      );

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

    const filteredBookmarks = filterFolders(bookmarks);
    const queryFilteredBookmarks = filterByQuery(
      filteredBookmarks,
      searchQuery,
    );
    const tagFilteredBookmarks = filterByTags(
      queryFilteredBookmarks,
      filterTags,
    );
    const sortedBookmarks = sortBookmarks(
      tagFilteredBookmarks,
      sortOption,
      sortDirection,
    );
    setDisplayBookmarks(sortedBookmarks);
  }, [bookmarks, searchQuery, filterTags, sortOption, sortDirection]);

  useEffect(() => {
    chrome.bookmarks.getTree((bookmarkTreeNodes) => {
      const bookmarks: Bookmark[] = [];
      function traverse(nodes: chrome.bookmarks.BookmarkTreeNode[]) {
        nodes.forEach((node) => {
          // if (node.url) {
          //   bookmarks.push({
          //     id: node.id,
          //     title: node.title,
          //     url: node.url,
          //     dateAdded: node.dateAdded,
          //     dateGroupModified: node.dateGroupModified,
          //     dateLastUsed: node.dateLastUsed,
          //     syncing: node.syncing,
          //   });
          // }
          bookmarks.push(node);
          if (node.children) {
            traverse(node.children);
          }
        });
      }
      traverse(bookmarkTreeNodes);
      setBookmarks(bookmarks);
    });
  }, []);

  return (
    <BookmarksManagerContext.Provider
      value={{
        sortOption,
        setSortOption,
        sortDirection,
        setSortDirection,
        searchQuery,
        setSearchQuery,
        filterTags,
        setFilterTags,
        displayBookmarks,
        availableTags,
        bookmarks,
      }}
    >
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
