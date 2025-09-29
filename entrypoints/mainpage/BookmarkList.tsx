import React from "react";
import { List, RowComponentProps } from 'react-window';

import { useBookmarks } from "@/context/BookmarksContext.tsx";
import BookmarkCard from "./BookmarkCard.tsx";

export default function BookmarkList() {
  const { bookmarks: { display: displayBookmarks } } = useBookmarks();
  const Row = ({ index, style }: RowComponentProps) => {
    const bookmark = displayBookmarks[index];
    return (
      <div style={style}>
        <BookmarkCard key={bookmark.id} bookmark={bookmark} />
      </div>
    );
  };

  return (
    <List
      rowComponent={Row}
      rowHeight={110}
      rowCount={displayBookmarks.length}
      rowProps={{}}
      style={{ scrollbarColor: "var(--color-neutral-500) var(--color-neutral-900)" }}
    />
  );
}