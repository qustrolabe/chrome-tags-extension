import React, { useEffect, useRef, useState } from "react";
import { Tooltip } from "radix-ui";

import {
  FolderFilter,
  StrictFolderFilter,
  TagFilter,
  useBookmarks,
} from "@/context/BookmarksContext.tsx";

type Bookmark = chrome.bookmarks.BookmarkTreeNode;

interface BookmarkCardProps {
  bookmark: Bookmark;
}

function faviconURL(u: string) {
  const url = new URL(chrome.runtime.getURL("/_favicon/"));
  url.searchParams.set("pageUrl", u);
  url.searchParams.set("size", "16");
  return url.toString();
}

/**
 * Formats a Unix timestamp into a human-readable string.
 * - Shows relative time for recent dates (seconds, minutes, hours, days)
 * - Falls back to absolute date for older timestamps
 * @param date Unix timestamp in milliseconds or undefined
 * @returns Formatted string
 */
const formatDateTime = (date: number | undefined): string => {
  if (date === undefined || date === null) return "Unknown";

  const now = Date.now();
  const diff = now - date;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(diff / 1000 / 60);
  const hours = Math.floor(diff / 1000 / 60 / 60);
  const days = Math.floor(diff / 1000 / 60 / 60 / 24);

  if (seconds < 5) return "now";
  if (minutes < 1) return `${seconds} sec ago`;
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(date));
};

const cleanLink = (url: string): string => {
  // Remove protocol (http:// or https://) case-insensitive
  let cleaned = url.replace(/^https?:\/\//i, "");
  // Remove www. if present
  cleaned = cleaned.replace(/^www\./i, "");
  return cleaned;
};

export default function BookmarkCard({ bookmark }: { bookmark: Bookmark }) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(bookmark.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const { bookmarks: { all: allBookmarks }, filters: { add: addFilter } } =
    useBookmarks();

  const handleAddFolderFilter = (
    folderId: string,
    negative: boolean,
    strict: boolean = false,
  ) => {
    addFilter(
      {
        type: strict ? "strict_folder" : "folder",
        folderId: folderId,
        negative,
      } as FolderFilter | StrictFolderFilter,
    );
  };

  const handleAddTagFilter = (tag: string, negative: boolean) => {
    addFilter({ type: "tag", tag: tag, negative } as TagFilter);
  };

  const handleEdit = () => {
    if (isEditing) {
      if (title !== bookmark.title) {
        chrome.bookmarks.update(bookmark.id, { title });
      }
    }
    setIsEditing(!isEditing);
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleEnter: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter") {
      handleEdit();
    }
  };

  const path: Bookmark[] = (() => {
    let currentId = bookmark.parentId;
    const p: Bookmark[] = [];
    while (currentId) {
      const folder = allBookmarks.find((b) => b.id === currentId);
      if (!folder) break;
      p.unshift(folder);
      currentId = folder.parentId;
    }

    p.shift();
    p.shift();

    return p;
  })();

  const tags = bookmark.title.match(/#(\w+)/g)?.map((tag) => tag.slice(1));

  return (
    <div className="h-[105px] max-h flex flex-col border border-border rounded-lg m-1 p-2 bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center">
        <Tooltip.Provider>
          <Tooltip.Root delayDuration={200}>
            <Tooltip.Trigger>
              <div className="mr-2">
                <img
                  loading="lazy"
                  className="rounded-sm"
                  src={faviconURL(bookmark.url ?? "")}
                  alt=""
                />
              </div>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content side="right">
                <div className="bg-popover text-popover-foreground p-1 rounded-md border border-border shadow-sm">
                  ID: {bookmark.id}
                </div>
                {/* <Tooltip.Arrow /> */}
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </Tooltip.Provider>

        {isEditing
          ? (
            <input
              ref={inputRef}
              type="text"
              value={title}
              onInput={(e) => setTitle(e.currentTarget.value)}
              onKeyDown={handleEnter}
              className="w-full rounded-md bg-input text-foreground border border-border px-2"
            />
          )
          : (
            <span className="flex-1 font-bold truncate" title={title}>
              {title}
            </span>
          )}
        <button
          type="button"
          className="ml-2 rounded-md bg-secondary text-secondary-foreground px-3 py-1 hover:opacity-90"
          onClick={handleEdit}
        >
          {isEditing ? "Submit" : "Edit"}
        </button>
      </div>
      <div className="text-sm text-muted-foreground flex ">
        <div className="text-muted-foreground/80">
          {path.length > 0 && (
            <span className="flex items-center ml-2">
              {path.map((node) => (
                <span key={node.id} className="hover:underline cursor-pointer">
                  <span
                    className="text-muted-foreground hover:text-primary transition-colors"
                    onClick={(e) =>
                      handleAddFolderFilter(
                        node.id,
                        e.shiftKey,
                        e.altKey,
                      )}
                  >
                    {node.title}/
                  </span>
                </span>
              ))}
            </span>
          )}
        </div>
        <div className="truncate">
          <a
            href={bookmark.url}
            className="hover:underline text-primary/80 hover:text-primary transition-colors"
            title={bookmark.url}
          >
            {bookmark.url
              ? cleanLink(bookmark.url).length > 100
                ? `${cleanLink(bookmark.url).slice(0, 97)}...`
                : cleanLink(bookmark.url)
              : "URL not available"}
            {/* {bookmark.url} */}
          </a>
        </div>
      </div>
      <div className="flex flex-row space-x-2 justify-between">
        <div className="flex space-x-2 text-muted-foreground text-xs">
          <div className="flex items-center space-x-1">
            <span
              title={bookmark.dateAdded
                ? new Date(bookmark.dateAdded).toLocaleString()
                : undefined}
            >
              Created {formatDateTime(bookmark.dateAdded)}
            </span>
          </div>
          <span>•</span>
          <div className="flex items-center space-x-1">
            <span
              title={bookmark.dateLastUsed
                ? new Date(bookmark.dateLastUsed).toLocaleString()
                : undefined}
            >
              Last used {formatDateTime(bookmark.dateLastUsed)}
            </span>
          </div>
        </div>
      </div>
      {tags?.length
        ? (
          <div
            className="w-full flex truncate gap-x-1 gap-y-1"
            title={tags.map((tag) => `#${tag}`).join(" ")}
          >
            {tags?.map((tag) => (
              <div
                className="select-none cursor-pointer"
                onClick={(e) => handleAddTagFilter(tag, e.shiftKey)}
                key={tag}
              >
                <BookmarkTagCapsule tag={tag} />
              </div>
            ))}
          </div>
        )
        : null}
    </div>
  );
}

function BookmarkTagCapsule(
  { tag }: { tag: string },
) {
  return (
    <div className="rounded-md px-2 py-0.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
      #{tag}
    </div>
  );
}
