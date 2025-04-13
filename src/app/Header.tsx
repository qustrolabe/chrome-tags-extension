import { useEffect, useState } from "preact/hooks";

import FilterInput from "./FilterInput.tsx";

import { useBookmarks } from "./BookmarksContext.tsx";
import SortOptions from "./SortOptions.tsx";

function BookmarksCounter() {
  const { displayBookmarks, bookmarks } = useBookmarks();

  return (
    <div class="text-gray-500 flex items-center">
      <span title="Displayed filtered bookmarks">
        {displayBookmarks.length}
      </span>{" "}
      /{" "}
      <span title="Total number of bookmarks (including folders)">
        {bookmarks.length}
      </span>
    </div>
  );
}

export default function Header() {
  return (
    <div class="flex bg-gray-900 p-2 rounded gap-2">
      <div class="flex space-x-2 flex-1">
        <FilterInput />
      </div>
      <SortOptions />
      <BookmarksCounter />
    </div>
  );
}
