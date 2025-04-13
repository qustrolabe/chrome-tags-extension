import { useEffect, useRef, useState } from "preact/hooks";
import { FolderFilter, TagFilter, useBookmarks } from "./BookmarksContext.tsx";

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

const formatDateTime = (date: number | undefined) => {
  if (!date) return "Unknown";

  const now = new Date().getTime();
  const diff = now - date;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 5) return "<5 min ago";
  if (minutes < 1) return `${seconds} sec ago`;
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hours ago`;
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

export default function BookmarkCard({ bookmark }: { bookmark: Bookmark }) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(bookmark.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const { bookmarks, addFilter } = useBookmarks();

  const handleAddFolderFilter = (folderId: string, negative: boolean) => {
    addFilter(
      { type: "folder", folderId: folderId, negative } as FolderFilter,
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

  const handleEnter = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      handleEdit();
    }
  };

  const path: Bookmark[] = (() => {
    let currentId = bookmark.parentId;
    const p: Bookmark[] = [];
    while (currentId) {
      const folder = bookmarks.find((b) => b.id === currentId);
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
    <div class="flex flex-col border border-gray-900 rounded m-1 p-2 bg-gray-800">
      <div class="flex items-center">
        {bookmark.url && (
          <div class="mr-2">
            <img class="rounded" src={faviconURL(bookmark.url)} alt="" />
          </div>
        )}
        {isEditing
          ? (
            <input
              ref={inputRef}
              type="text"
              value={title}
              onInput={(e) => setTitle(e.currentTarget.value)}
              onKeyDown={handleEnter}
              class="w-full rounded p-2 bg-gray-500"
            />
          )
          : <span class="flex-1 font-bold ">{title}</span>}
        <button
          type="button"
          class="ml-2 rounded bg-gray-800"
          onClick={handleEdit}
        >
          {isEditing ? "Submit" : "Edit"}
        </button>
      </div>
      <div class="text-sm text-gray-600">
        <a
          href={bookmark.url}
          class="hover:underline text-blue-500"
        >
          {bookmark.url
            ? bookmark.url.length > 50
              ? `${bookmark.url.slice(0, 47)}...`
              : bookmark.url
            : "URL not available"}
        </a>
        <div class="text-gray-400">
          {path.length > 0 && (
            <span class="flex items-center ml-2">
              {path.map((node) => (
                <span key={node.id} class="hover:underline cursor-pointer">
                  <span
                    class="text-gray-300 hover:text-blue-500"
                    onClick={(e) =>
                      handleAddFolderFilter(
                        node.id,
                        e.shiftKey,
                      )}
                  >
                    {node.title}/
                  </span>
                </span>
              ))}
            </span>
          )}
        </div>
      </div>
      <div class="flex flex-row space-x-2 justify-between">
        <div>ID: {bookmark.id}</div>
        <div class="flex space-x-2 text-gray-400">
          <div class="flex items-center space-x-1">
            <span>Created: {formatDateTime(bookmark.dateAdded)}</span>
          </div>
          <div class="flex items-center space-x-1">
            <span>Last used: {formatDateTime(bookmark.dateLastUsed)}</span>
          </div>
        </div>
      </div>
      {tags?.length
        ? (
          <div class="w-full flex flex-wrap gap-x-1 gap-y-1">
            {tags?.map((tag) => (
              <div
                class="select-none cursor-pointer"
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
    <div class="rounded p-1.5 bg-gray-600 hover:bg-gray-700 ">
      #{tag}
    </div>
  );
}
