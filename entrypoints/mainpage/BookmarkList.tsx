import React from "react";
import { List, RowComponentProps } from "react-window";

import { useBookmarks } from "@/context/BookmarksContext.tsx";
import BookmarkCard from "@/components/BookmarkCard";

export default function BookmarkList() {
  const {
    bookmarks: { display: displayBookmarks, all: allBookmarks },
    filters: { add: addFilter },
  } = useBookmarks();

  const Row = ({ index, style }: RowComponentProps) => {
    const bookmark = displayBookmarks[index];
    return (
      <div style={style}>
        <BookmarkCard
          key={bookmark.id}
          bookmark={bookmark}
          allBookmarks={allBookmarks}
          onAddFolderFilter={(folderId, negative, strict) =>
            addFilter(
              {
                type: strict ? "strict_folder" : "folder",
                folderId,
                negative,
              } as any,
            )}
          onAddTagFilter={(tag, negative) =>
            addFilter({ type: "tag", tag, negative } as any)}
          onEdit={(id, title) => chrome.bookmarks.update(id, { title })}
        />
      </div>
    );
  };

  return (
    <List
      rowComponent={Row}
      rowHeight={110}
      rowCount={displayBookmarks.length}
      rowProps={{}}
    />
  );
}
