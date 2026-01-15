import React from "react";
import * as Select from "@radix-ui/react-select";
import { SortOption, useBookmarks } from "@/context/BookmarksContext.tsx";

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
  const {
    sorting: { sortOption, setSortOption, sortDirection, toggleSortDirection },
  } = useBookmarks();

  return (
    <div className="flex items-center gap-2">
      <Select.Root
        value={sortOption}
        onValueChange={(value) => setSortOption(value as SortOption)}
      >
        <Select.Trigger className="inline-flex items-center justify-between rounded-md p-2 bg-secondary text-secondary-foreground hover:opacity-90 transition-opacity gap-1 outline-none">
          <Select.Value />
          <Select.Icon>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
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
          </Select.Icon>
        </Select.Trigger>

        <Select.Portal>
          <Select.Content className="z-50 min-w-32 bg-popover text-popover-foreground shadow-lg rounded-md border border-border overflow-hidden">
            <Select.Viewport className="p-1">
              {SORT_OPTIONS.map(({ value, label }) => (
                <Select.Item
                  key={value}
                  value={value}
                  className="relative flex items-center p-2 rounded-sm text-sm hover:bg-muted cursor-pointer transition-colors outline-none data-[state=checked]:bg-muted data-[state=checked]:font-medium"
                >
                  <Select.ItemText>{label}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>

      <button
        type="button"
        className="rounded-md p-2 bg-secondary text-secondary-foreground hover:opacity-90"
        onClick={toggleSortDirection}
      >
        {sortDirection === "desc" ? "↓" : "↑"}
      </button>
    </div>
  );
};

export default SortOptions;
