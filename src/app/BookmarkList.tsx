import { useEffect, useState } from "preact/hooks";

import { useBookmarks } from "./BookmarksContext.tsx";
import BookmarkCard from "./BookmarkCard.tsx";

export default function BookmarkList() {
  const { displayBookmarks } = useBookmarks();

  return (
    <div>
      {displayBookmarks.map((bookmark) => (
        <BookmarkCard key={bookmark.id} bookmark={bookmark} />
      ))}
    </div>
  );
}
