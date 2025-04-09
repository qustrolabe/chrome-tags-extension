import { useEffect, useState } from "preact/hooks";

import { SortOption, useBookmarks } from "./BookmarksContext.tsx";

export default function SortOptions() {
  const { sortOption, setSortOption, sortDirection, setSortDirection } =
    useBookmarks();

  const handleSortOptionChange = (
    option: SortOption,
  ) => {
    if (option !== sortOption) {
      setSortOption(option);
    } else {
      setSortDirection(sortDirection === "desc" ? "asc" : "desc");
    }
  };

  const options = [
    { value: "dateAdded", label: "Date Added" },
    { value: "dateLastUsed", label: "Last Used" },
    { value: "id", label: "ID" },
    { value: "title", label: "Title" },
  ];

  return (
    <div class="flex space-x-2">
      {options.map(({ value, label }) => (
        <button
          type="button"
          key={value}
          class={`rounded p-2 ${
            sortOption === value ? "bg-gray-800 text-white" : "bg-gray-700"
          }`}
          onClick={() => handleSortOptionChange(value as SortOption)}
        >
          {sortOption === value ? (sortDirection === "desc" ? "↓" : "↑") : ""}
          {" "}
          {label}
        </button>
      ))}
    </div>
  );
}
