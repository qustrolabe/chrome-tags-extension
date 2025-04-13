import { useEffect, useState } from "preact/hooks";
import type {
  AnyFilter,
  Filter,
  FolderFilter,
  TagFilter,
  TitleFilter,
  UrlFilter,
} from "./BookmarksContext.tsx";
import { useBookmarks } from "./BookmarksContext.tsx";

const makeDisplayString = (filter: Filter) => {
  switch (filter.type) {
    case "tag":
      return `#` + `${filter.tag}`;
    case "folder":
      return `folder:${filter.folderId}`;
    case "title":
      return `title:${filter.title}`;
    case "url":
      return `url:${filter.url}`;
    default:
      return `${filter.value}`;
  }
};

export default function FilterInput() {
  const { filters, addFilter, removeFilter, clearFilters } = useBookmarks();
  const [inputValue, setInputValue] = useState("");

  const handleFilterInput = (e: InputEvent) => {
    const target = e.target as HTMLInputElement;
    setInputValue(target.value);
  };

  const handleFilterAdd = () => {
    const newFilter: Filter = (() => {
      const input = inputValue.trim();
      const isNegative = input.startsWith("-");
      const cleanInput = isNegative ? input.slice(1) : input;
      const isFolder = cleanInput.startsWith("folder:");
      const isTitle = cleanInput.startsWith("title:");
      const isUrl = cleanInput.startsWith("url:");
      const isTag = cleanInput.startsWith("#");
      if (isFolder) {
        return {
          type: "folder",
          folderId: cleanInput.slice(7),
          negative: isNegative,
        } as FolderFilter;
      }
      if (isTitle) {
        return {
          type: "title",
          title: cleanInput.slice(6),
          negative: isNegative,
        } as TitleFilter;
      }
      if (isUrl) {
        return {
          type: "url",
          url: cleanInput.slice(4),
          negative: isNegative,
        } as UrlFilter;
      }
      if (isTag) {
        return {
          type: "tag",
          tag: cleanInput.slice(1),
          negative: isNegative,
        } as TagFilter;
      }
      return {
        type: "any",
        value: cleanInput,
        negative: isNegative,
      } as AnyFilter;
    })();
    addFilter(newFilter);
    setInputValue("");
  };

  const handleFilterAddOnEnter = () => {
    handleFilterAdd();
  };

  const handleFilterRemove = (filter: Filter) => {
    removeFilter(filter);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    console.log("key press", e.key);
    if (e.key === "Enter") {
      handleFilterAddOnEnter();
    } else if (e.key === "Backspace" && inputValue === "") {
      const lastFilter = filters[filters.length - 1];
      if (lastFilter) {
        handleFilterRemove(lastFilter);
      }
    }
  };

  return (
    <div class="flex flex-wrap gap-1 bg-gray-800 rounded p-1  w-full items-center focus-within:outline-none focus-within:ring focus-within:ring-blue-500">
      {filters.map((filter, index) => (
        <span
          class={`bg-gray-500 p-1 rounded ${
            filter.negative
              ? "bg-red-600 hover:bg-red-700"
              : "bg-gray-600 hover:bg-gray-700"
          } cursor-pointer select-none`}
          title={makeDisplayString(filter)}
          key={index}
          onClick={() => handleFilterRemove(filter)}
        >
          {makeDisplayString(filter)}
        </span>
      ))}
      <input
        type="text"
        placeholder="Search (e.g., url:, #tag, title:, -#tag, -url:)"
        class="flex-grow bg-transparent p-1 min-w-[100px] align-middle focus:outline-none"
        value={inputValue}
        onInput={handleFilterInput}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}
