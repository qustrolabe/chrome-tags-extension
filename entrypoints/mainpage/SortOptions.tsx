import React from "react";
import * as Select from "@radix-ui/react-select";
import { SortOption, useBookmarks } from "@/context/BookmarksContext.tsx";
import { AiOutlineArrowDown, AiOutlineArrowUp } from "react-icons/ai";

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
    <div
      className="flex items-center bg-secondary rounded-md p-0.5 gap-0.5"
      style={{ width: "120px" }}
    >
      <Select.Root
        value={sortOption}
        onValueChange={(value) => setSortOption(value as SortOption)}
      >
        <Select.Trigger className="flex-1 inline-flex items-center justify-between rounded-sm px-2 h-7 bg-inherit text-secondary-foreground hover:bg-input cursor-pointer transition-colors gap-1 outline-none">
          <Select.Value className="text-sm" />
        </Select.Trigger>

        <button
          type="button"
          className="h-7 w-7 flex items-center justify-center rounded hover:bg-input cursor-pointer transition-colors"
          onClick={toggleSortDirection}
        >
          {sortDirection === "desc"
            ? <AiOutlineArrowDown className="w-4 h-4" />
            : <AiOutlineArrowUp className="w-4 h-4" />}
        </button>

        <Select.Portal>
          <Select.Content className="z-50 min-w-[150px] bg-popover text-popover-foreground shadow-lg rounded-md border border-border overflow-hidden">
            <Select.Viewport className="p-2">
              {SORT_OPTIONS.map(({ value, label }) => (
                <Select.Item
                  key={value}
                  value={value}
                  className="relative flex items-center p-2 rounded-sm text-sm hover:bg-muted cursor-pointer transition-colors outline-none data-[state=checked]:bg-muted data-[state=checked]:font-medium mb-1 last:mb-0"
                >
                  <Select.ItemText>{label}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  );
};

export default SortOptions;
