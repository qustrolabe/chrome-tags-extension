import React from "react";
import { List, type RowComponentProps } from "react-window";

import { useBookmarks } from "@/context/BookmarksContext.tsx";
import { useTracking } from "@/context/TrackingContext";
import { computeFrecency } from "@/utils/tracking";
import { setTokenState } from "@/utils/query/editing.ts";
import BookmarkCard from "@/components/BookmarkCard";

export default function BookmarkList() {
  const {
    bookmarks: { display: displayBookmarks, all: allBookmarks },
    query,
    setQuery,
  } = useBookmarks();
  const { stats, settings } = useTracking();

  const Row = ({ index, style }: RowComponentProps) => {
    const bookmark = displayBookmarks[index];
    return (
      <div style={style}>
        <BookmarkCard
          key={bookmark.id}
          bookmark={bookmark}
          allBookmarks={allBookmarks}
          trackingStats={stats[bookmark.id]}
          trackingFrecency={stats[bookmark.id]
            ? computeFrecency(stats[bookmark.id].score, stats[bookmark.id].lastVisited)
            : 0}
          showTracking={settings.enabled && settings.showStats}
          onAddFolderFilter={(folderId, negative, strict) => {
            const folder = allBookmarks.find((b) => b.id === folderId);
            if (!folder?.title) return;
            setQuery(
              setTokenState(
                query,
                strict ? "folder" : "in",
                folder.title,
                negative ? "negative" : "positive",
              ),
            );
          }}
          onAddTagFilter={(tag, negative) =>
            setQuery(
              setTokenState(query, "tag", tag, negative ? "negative" : "positive"),
            )}
          onEdit={(id, title) => browser.bookmarks.update(id, { title })}
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
