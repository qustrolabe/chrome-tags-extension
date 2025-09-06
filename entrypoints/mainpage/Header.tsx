import React from "react";

import FilterInput from "./FilterInput.tsx";

import { useBookmarks } from "@/context/BookmarksContext.tsx";
import SortOptions from "./SortOptions.tsx";

function BookmarksCounter() {
  const { bookmarks: { all: bookmarks, display: displayBookmarks } } =
    useBookmarks();

  return (
    <div className="text-neutral-500 flex items-center">
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
    <div className="flex bg-neutral-900 p-2 rounded-b gap-2">
      <div className="flex space-x-2 flex-1">
        <FilterInput />
      </div>
      <SortOptions />
      <BookmarksCounter />
    </div>
  );
}
