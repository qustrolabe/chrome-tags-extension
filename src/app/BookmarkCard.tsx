import { useEffect, useRef, useState } from "preact/hooks";
import { useBookmarks } from "./BookmarksContext.tsx";

type Bookmark = chrome.bookmarks.BookmarkTreeNode;

interface BookmarkCardProps {
  bookmark: Bookmark;
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

  const { bookmarks, searchQuery, setSearchQuery } = useBookmarks();

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

  return (
    <div class="flex flex-col space-y-1 border border-gray-900 rounded p-2 bg-gray-800">
      <div class="flex items-center">
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
          : <span class="flex-1 font-bold text-xl">{title}</span>}
        <button
          type="button"
          class="ml-2 rounded p-2 bg-gray-800"
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
                <span key={node.id} class="hover:underline">
                  <a
                    href="#"
                    class="text-gray-300 hover:text-blue-500"
                    onClick={() =>
                      setSearchQuery(searchQuery + `folder_id:${node.id}`)}
                  >
                    {node.title}/
                  </a>
                </span>
              ))}
            </span>
          )}
        </div>
      </div>
      <ul class="list-disc pl-4 space-y-1">
        <li>ID: {bookmark.id}</li>
        <li>Created: {formatDateTime(bookmark.dateAdded)}</li>
        <li>Last used: {formatDateTime(bookmark.dateLastUsed)}</li>
        <li>Modified: {formatDateTime(bookmark.dateGroupModified)}</li>
      </ul>
      <div class="flex items-center space-x-2 text-sm">
        <span class="text-gray-600">Tags:</span>
        <span class="flex items-center space-x-1">
          {bookmark.title
            .match(/#(\w+)/g)
            ?.map((tag) => <BookmarkTagCapsule key={tag} tag={tag.slice(1)} />)}
        </span>
      </div>
    </div>
  );
}

function BookmarkTagCapsule({ tag }: { tag: string }) {
  return <span class="rounded px-2 py-1 bg-gray-600 ">{tag}</span>;
}
