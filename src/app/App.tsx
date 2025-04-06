import { useEffect, useState } from "preact/hooks";

type Bookmark = chrome.bookmarks.BookmarkTreeNode;

export default function App() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [darkMode, setDarkMode] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<"date" | "id" | "title">("date");

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

  const filteredBookmarks = bookmarks
    .filter((bookmark) =>
      bookmark.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortOption === "date") return b.dateAdded - a.dateAdded;
      if (sortOption === "id") return a.id.localeCompare(b.id);
      if (sortOption === "title") return a.title.localeCompare(b.title);
      return 0;
    });

  return (
    <div
      class={`mx-auto p-4 ${darkMode ? "bg-gray-900 text-white" : "bg-white"}`}
    >
      {/* <h1 class="font-bold">Bookmarks</h1> */}
      <div class="flex space-x-4 my-4">
        <input
          type="text"
          value={searchQuery}
          onInput={(e) => setSearchQuery(e.currentTarget.value)}
          placeholder="Search bookmarks..."
          class={`rounded p-2 ${
            darkMode ? "bg-gray-800 text-white" : "bg-white"
          } border`}
        />
        <select
          value={sortOption}
          onChange={(e) =>
            setSortOption(e.currentTarget.value as "date" | "id" | "title")}
          class={`rounded p-2 ${
            darkMode ? "bg-gray-800 text-white" : "bg-white"
          } border`}
        >
          <option value="date">Sort by Date</option>
          <option value="id">Sort by ID</option>
          <option value="title">Sort by Title</option>
        </select>
      </div>
      <ul class="mt-4 space-y-2">
        {filteredBookmarks.map((bookmark) => (
          <li
            key={bookmark.id}
            class={`rounded p-2 ${
              darkMode ? "bg-gray-800" : "bg-white"
            } shadow-md`}
          >
            <BookmarkCard
              bookmark={bookmark}
              darkMode={darkMode}
              onEdit={(newTitle) => {
                chrome.bookmarks.update(bookmark.id, { title: newTitle });
                setBookmarks(
                  bookmarks.map((b) =>
                    b.id === bookmark.id ? { ...b, title: newTitle } : b
                  ),
                );
              }}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

interface BookmarkCardProps {
  bookmark: Bookmark;
  darkMode: boolean;
  onEdit: (newTitle: string) => void;
}

function BookmarkCard({ bookmark, darkMode, onEdit }: BookmarkCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(bookmark.title);

  const handleEdit = () => {
    if (isEditing) {
      onEdit(title);
    }
    setIsEditing(!isEditing);
  };

  const handleEnter = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      handleEdit();
    }
  };

  return (
    <div
      class={`flex flex-col space-y-1 ${
        darkMode ? "bg-gray-800 text-white" : "bg-white"
      }`}
    >
      <div class="flex items-center">
        {isEditing
          ? (
            <input
              type="text"
              value={title}
              onInput={(e) => setTitle(e.currentTarget.value)}
              onKeyDown={handleEnter}
              class={`w-full rounded p-2 ${
                darkMode ? "bg-gray-700 text-white" : "bg-gray-200"
              }`}
            />
          )
          : <span class="flex-1 font-bold text-xl">{title}</span>}
        <button
          class={`ml-2 rounded p-2 ${
            darkMode ? "bg-gray-700 text-white" : "bg-gray-200"
          }`}
          onClick={handleEdit}
        >
          {isEditing ? "Submit" : "Edit"}
        </button>
      </div>
      <div class="text-sm text-gray-600">
        <a
          href={bookmark.url}
          class="hover:underline text-blue-500 dark:text-blue-300"
        >
          {bookmark.url.length > 50
            ? `${bookmark.url.slice(0, 47)}...`
            : bookmark.url}
        </a>
      </div>
      <ul class="list-disc pl-4 space-y-1">
        <li>ID: {bookmark.id}</li>
        <li>Created: {new Date(bookmark.dateAdded).toLocaleString()}</li>
        <li>
          Last used: {bookmark.dateLastUsed
            ? new Date(bookmark.dateLastUsed).toLocaleString()
            : "Never"}
        </li>
      </ul>
      <div class="flex items-center space-x-2 text-sm">
        <span class="text-gray-600">Tags:</span>
        <span class="flex items-center space-x-1">
          {bookmark.title
            .match(/#(\w+)/g)
            ?.map((tag) => (
              <span
                key={tag}
                class={`rounded px-2 py-1 ${
                  darkMode ? "bg-gray-700 text-white" : "bg-gray-200"
                }`}
              >
                {tag}
              </span>
            ))}
        </span>
      </div>
    </div>
  );
}
