import { useEffect, useState } from "preact/hooks";
import { SortOption, useBookmarks } from "./BookmarksContext.tsx";

type SortOptionType = {
  value: SortOption;
  label: string;
};

const SORT_OPTIONS: SortOptionType[] = [
  { value: "dateAdded", label: "Date Added" },
  { value: "dateLastUsed", label: "Last Used" },
  { value: "id", label: "ID" },
  { value: "title", label: "Title" },
];

const SortOptions = () => {
  const { sortOption, setSortOption, sortDirection, toggleSortDirection } =
    useBookmarks();

  const [isOpen, setIsOpen] = useState(false);

  const handleSortOptionChange = (option: SortOption) => {
    if (option !== sortOption) {
      setSortOption(option);
    }
    setIsOpen(false);
  };

  const currentOptionLabel = SORT_OPTIONS.find((option) =>
    option.value === sortOption
  )?.label;

  return (
    <div class="">
      <button
        type="button"
        class="rounded p-2 bg-gray-700 text-white"
        onClick={() => setIsOpen(!isOpen)}
      >
        {currentOptionLabel}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5 inline-block"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {isOpen && (
        <ul
          class="absolute z-10 w-40 bg-gray-600 shadow-md rounded"
          style={{ width: "8rem" }}
        >
          {SORT_OPTIONS.map(({ value, label }) => (
            <li
              key={value}
              class={`hover:bg-gray-500 p-2 ${
                sortOption === value ? "bg-gray-500" : ""
              }`}
              onClick={() => handleSortOptionChange(value)}
            >
              {label}
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        class="rounded p-2 bg-gray-700 text-white ml-2"
        onClick={toggleSortDirection}
      >
        {sortDirection === "desc" ? "↓" : "↑"}
      </button>
    </div>
  );
};

export default SortOptions;
