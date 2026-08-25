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
  ...(import.meta.env.FIREFOX ? [] : [{ value: "dateLastUsed" as SortOption, label: "Last Used" }]),
  { value: "frecency", label: "Frecency" },
  { value: "visits", label: "Visits" },
  { value: "id", label: "ID" },
  { value: "title", label: "Title" },
];

const SortOptions = () => {
  const {
    sorting: { sortOption, setSortOption, sortDirection, toggleSortDirection },
  } = useBookmarks();

  return (
    <div
      className="flex items-center gap-0.5 rounded-md bg-secondary p-0.5"
      style={{ width: "140px" }}
    >
      <Select.Root
        value={sortOption}
        onValueChange={(value) => setSortOption(value as SortOption)}
      >
        <Select.Trigger className="flex h-7 min-w-0 flex-1 cursor-pointer items-center justify-between gap-1 overflow-hidden rounded-sm bg-inherit px-2 text-secondary-foreground transition-colors outline-none hover:bg-input">
          <Select.Value className="truncate text-sm whitespace-nowrap" />
        </Select.Trigger>

        <button
          type="button"
          className="flex size-7 cursor-pointer items-center justify-center rounded transition-colors hover:bg-input"
          onClick={toggleSortDirection}
        >
          {sortDirection === "desc"
            ? <AiOutlineArrowDown className="size-4" />
            : <AiOutlineArrowUp className="size-4" />}
        </button>

        <Select.Portal>
          <Select.Content
            position="popper"
            side="bottom"
            align="end"
            sideOffset={6}
            collisionPadding={8}
            className="z-50 min-w-[150px] overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-lg"
            style={{ minWidth: "var(--radix-select-trigger-width)" }}
          >
            <Select.Viewport className="p-2">
              {SORT_OPTIONS.map(({ value, label }) => (
                <Select.Item
                  key={value}
                  value={value}
                  className="relative mb-1 flex cursor-pointer items-center rounded-sm p-2 transition-colors outline-none last:mb-0 hover:bg-muted data-[state=checked]:bg-muted data-[state=checked]:font-medium"
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
