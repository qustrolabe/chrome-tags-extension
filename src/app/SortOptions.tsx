import { useEffect, useState } from "preact/hooks";

import { useBookmarks } from "./BookmarksContext.tsx";

export default function SortOptions() {
  const { bookmarks, setBookmarks } = useBookmarks();
  const [sortOption, setSortOption] = useState<
    "dateAdded" | "dateLastUsed" | "id" | "title"
  >("dateAdded");

  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const handleSortOptionChange = (
    option: "dateAdded" | "dateLastUsed" | "id" | "title",
  ) => {
    if (option !== sortOption) {
      setSortOption(option);
      //   setSortDirection("desc");
    } else {
      setSortDirection(sortDirection === "desc" ? "asc" : "desc");
    }
  };

  useEffect(() => {
    const sortedBookmarks = [...bookmarks];
    sortedBookmarks.sort((a, b) => {
      if (sortOption === "dateAdded") {
        const aDate = a.dateAdded ?? 0;
        const bDate = b.dateAdded ?? 0;
        return sortDirection === "desc" ? bDate - aDate : aDate - bDate;
      } else if (sortOption === "dateLastUsed") {
        const aDate = a.dateLastUsed ?? 0;
        const bDate = b.dateLastUsed ?? 0;
        return sortDirection === "desc" ? bDate - aDate : aDate - bDate;
      } else if (sortOption === "id") {
        return sortDirection === "desc"
          ? b.id.localeCompare(a.id)
          : a.id.localeCompare(b.id);
      } else if (sortOption === "title") {
        return sortDirection === "desc"
          ? b.title.localeCompare(a.title)
          : a.title.localeCompare(b.title);
      }
      return 0;
    });
    setBookmarks(sortedBookmarks);
  }, [sortOption, sortDirection]);

  const options = [
    ["dateAdded", "Date Added"],
    ["dateLastUsed", "Last Used"],
    ["id", "ID"],
    ["title", "Title"],
  ] as const;

  return (
    <div class="flex space-x-2">
      {options.map(([option, label]) => (
        <button
          type="button"
          key={option}
          class={`rounded p-2 ${
            sortOption === option ? "bg-gray-800 text-white" : "bg-gray-700"
          }`}
          onClick={() => handleSortOptionChange(option)}
        >
          {sortOption === option ? (sortDirection === "desc" ? "↓" : "↑") : ""}
          {" "}
          {label}
        </button>
      ))}
    </div>
  );
}
