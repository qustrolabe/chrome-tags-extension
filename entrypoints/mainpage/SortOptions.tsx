import React from "react";
import * as Select from "@radix-ui/react-select";
import { type SortOption, parseSortOption, useBookmarks } from "@/context/BookmarksContext.tsx";
import { AiOutlineArrowDown, AiOutlineArrowUp } from "react-icons/ai";

type SortOptionType = {
  value: SortOption;
  label: string;
  /** Alt text: shown on hover and read out by screen readers. */
  hint: string;
};

const LAST_USED_OPTIONS: SortOptionType[] = import.meta.env.FIREFOX
  ? []
  : [
      {
        value: "dateLastUsed",
        label: "Last Used",
        hint:
          "Chrome's own time, written only when you open the bookmark from Chrome's own interface",
      },
    ];

const SORT_OPTIONS: SortOptionType[] = [
  {
    value: "dateAdded",
    label: "Date Added",
    hint: "when the bookmark was saved",
  },
  ...LAST_USED_OPTIONS,
  {
    value: "lastVisited",
    label: "Last Visited",
    hint:
      "time this extension recorded the bookmark's URL showing up in a tab, so it also sees visits Chrome's own time misses",
  },
  {
    value: "frecency",
    label: "Frecency",
    hint: "how often and how recently it was visited",
  },
  {
    value: "visits",
    label: "Visits",
    hint: "how many times it was seen in a tab",
  },
  {
    value: "id",
    label: "ID",
    hint: "bookmark id, in creation order",
  },
  {
    value: "title",
    label: "Title",
    hint: "alphabetical by title",
  },
];

const SortOptions = () => {
  const {
    sorting: { sortOption, setSortOption, sortDirection, toggleSortDirection },
  } = useBookmarks();

  const currentHint = SORT_OPTIONS.find(
    (option) => option.value === sortOption,
  )?.hint;

  return (
    <div
      className="flex items-center gap-0.5 rounded-md bg-secondary p-0.5"
      style={{ width: "140px" }}
    >
      <Select.Root
        value={sortOption}
        onValueChange={(value) => {
          const next = parseSortOption(value);

          if (next) setSortOption(next);
        }}
      >
        <Select.Trigger
          className="flex h-7 min-w-0 flex-1 cursor-pointer items-center justify-between gap-1 overflow-hidden rounded-sm bg-inherit px-2 text-secondary-foreground transition-colors outline-none hover:bg-input"
          title={currentHint}
        >
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
            className="z-50 min-w-[150px] overflow-hidden rounded-md border border-border bg-popover text-popover-foreground"
            style={{ minWidth: "var(--radix-select-trigger-width)" }}
          >
            <Select.Viewport className="p-2">
              {SORT_OPTIONS.map(({ value, label, hint }) => (
                <Select.Item
                  key={value}
                  value={value}
                  title={hint}
                  className="relative mb-1 flex cursor-pointer items-center rounded-sm p-2 transition-colors outline-none last:mb-0 hover:bg-muted data-[state=checked]:bg-muted data-[state=checked]:font-medium"
                >
                  <Select.ItemText>{label}</Select.ItemText>
                  <span className="sr-only">{hint}</span>
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
