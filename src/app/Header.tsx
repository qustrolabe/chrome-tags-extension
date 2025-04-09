import { useEffect, useState } from "preact/hooks";

import { useBookmarks } from "./BookmarksContext.tsx";
import SortOptions from "./SortOptions.tsx";
import FilterTags from "./FilterTags.tsx";

function SearchBar() {
  const { searchQuery, setSearchQuery } = useBookmarks();

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

function BookmarksCounter() {
  const { displayBookmarks } = useBookmarks();

  return (
    <div class="text-gray-500">
      {displayBookmarks.length} bookmarks
    </div>
  );
}

export default function Header() {
  return (
    <div class="flex justify-between items-center mb-4 bg-gray-900 p-4 rounded">
      <div class="flex space-x-2">
        <SearchBar />
        <SortOptions />
        <FilterTags />
      </div>
      <BookmarksCounter />
    </div>
  );
}
