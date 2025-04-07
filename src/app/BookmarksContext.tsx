import { ComponentChildren } from "preact";
import { createContext } from "preact";
import { useContext, useEffect, useState } from "preact/hooks";

export type Bookmark = chrome.bookmarks.BookmarkTreeNode;

export type BookmarkContext = {
  bookmarks: Bookmark[];
  setBookmarks: (bookmarks: Bookmark[]) => void;
};

export const BookmarksContext = createContext<BookmarkContext>({
  bookmarks: [],
  setBookmarks: () => {},
});

export const BookmarksProvider = (
  { children }: { children: ComponentChildren },
) => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  useEffect(() => {
    chrome.bookmarks.getTree((bookmarkTreeNodes) => {
      const bookmarks: Bookmark[] = [];
      function traverse(nodes: chrome.bookmarks.BookmarkTreeNode[]) {
        nodes.forEach((node) => {
          if (node.url) {
            bookmarks.push({
              id: node.id,
              title: node.title,
              url: node.url,
              dateAdded: node.dateAdded,
              dateGroupModified: node.dateGroupModified,
              dateLastUsed: node.dateLastUsed,
              syncing: node.syncing,
            });
          }
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
    <BookmarksContext.Provider
      value={{ bookmarks, setBookmarks }}
    >
      {children}
    </BookmarksContext.Provider>
  );
};

export const useBookmarks = () => {
  const context = useContext(BookmarksContext);
  if (!context) {
    throw new Error("useBookmarks must be used within a BookmarksProvider");
  }
  return context;
};
