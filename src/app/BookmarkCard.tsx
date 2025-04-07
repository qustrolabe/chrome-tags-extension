import { useState } from "preact/hooks";

type Bookmark = chrome.bookmarks.BookmarkTreeNode;

interface BookmarkCardProps {
  bookmark: Bookmark;
}

export default function BookmarkCard({ bookmark }: { bookmark: Bookmark }) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(bookmark.title);

  const handleEdit = () => {
    setIsEditing(!isEditing);
  };

  const handleEnter = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      handleEdit();
    }
  };
  return (
    <div class="flex flex-col space-y-1 border border-gray-900 rounded p-2 bg-gray-800">
      <div class="flex items-center">
        {isEditing
          ? (
            <input
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
      </div>
      <ul class="list-disc pl-4 space-y-1">
        <li>ID: {bookmark.id}</li>
        <li>
          Created: {bookmark.dateAdded
            ? new Intl.DateTimeFormat("en-US", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: false,
            }).format(new Date(bookmark.dateAdded))
            : "Unknown"}
        </li>
        <li>
          Last used: {bookmark.dateLastUsed
            ? (
              new Date(bookmark.dateLastUsed).getTime() >
                  Date.now() - 30 * 24 * 60 * 60 * 1000
                ? (
                  `${
                    Math.ceil(
                      (new Date().getTime() -
                        new Date(bookmark.dateLastUsed).getTime()) /
                        (1000 * 60 * 60 * 24),
                    )
                  } days ago`
                )
                : (
                  new Intl.DateTimeFormat("en-US", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: false,
                  }).format(new Date(bookmark.dateLastUsed))
                )
            )
            : "Never"}
        </li>
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
  return <span class="rounded px-2 py-1 bg-gray-800">{tag}</span>;
}
