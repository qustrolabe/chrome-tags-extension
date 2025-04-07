import { useEffect, useState } from "preact/hooks";

import { useBookmarks } from "./BookmarksContext.tsx";
import SortOptions from "./SortOptions.tsx";

function SearchBar() {
  const { bookmarks, setBookmarks } = useBookmarks();

  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: InputEvent) => {
    const target = e.target as HTMLInputElement;
    setSearchQuery(target.value);
  };

  return (
    <input
      type="text"
      value={searchQuery}
      onInput={handleSearch}
      placeholder="Search bookmarks..."
      class="rounded p-2 border bg-gray-800 text-white"
    />
  );
}

export default function Header() {
  const { bookmarks, setBookmarks } = useBookmarks();

  return (
    <div class="flex justify-between items-center mb-4 bg-gray-900 p-4 rounded">
      <div class="flex space-x-2">
        <SearchBar />
        <SortOptions />
      </div>
    </div>
  );
}
