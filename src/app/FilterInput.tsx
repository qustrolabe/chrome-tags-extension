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

const makeFilterCapsuleData = (filter: Filter) => {
  let displayString = "";
  let titleString = "";
  let color = "";
  const prefix = filter.negative ? "Negative filter for" : "Filter for";

  switch (filter.type) {
    case "tag":
      displayString = `#${filter.tag}`;
      titleString = `${prefix} tag: #${filter.tag}`;
      color = "bg-green-500 text-white";
      break;
    case "folder":
      displayString = `folder:${filter.folderId}`;
      titleString = `${prefix} folder: ${filter.folderId}`;
      color = "bg-blue-500 text-white";
      break;
    case "title":
      displayString = `title:${filter.title}`;
      titleString = `${prefix} title: '${filter.title}'`;
      color = "bg-purple-200 text-black";
      break;
    case "url":
      displayString = `url:${filter.url}`;
      titleString = `${prefix} URL: ${filter.url}`;
      color = "bg-orange-200 text-black";
      break;
    default:
      displayString = `${filter.value}`;
      titleString = `${prefix} title or URL: ${filter.value}`;
      color = "bg-gray-200 text-black";
  }

  color = filter.negative
    ? `${color} outline outline-2 outline-red-500`
    : color;

  return { displayString, titleString, color };
};

export default function FilterInput() {
  const { filters, addFilter, removeFilter, clearFilters, availableTags } =
    useBookmarks();
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  useEffect(() => {
    const generateSuggestions = () => {
      if (inputValue.startsWith("#") || inputValue.startsWith("-#")) {
        const tag = inputValue.startsWith("-#")
          ? inputValue.slice(2).trim()
          : inputValue.slice(1).trim();
        const filteredTags = Object.entries(availableTags)
          .filter(([t]) => t.startsWith(tag))
          .sort(([, a], [, b]) => b - a)
          .slice(0, 20)
          .map(([t]) => t);
        return filteredTags.map((t) =>
          inputValue.startsWith("-") ? `-${t}` : `#${t}`
        );
      }
      return [];
    };

    setSuggestions(generateSuggestions());
  }, [inputValue, availableTags]);

  const handleFilterInput = (e: InputEvent) => {
    const target = e.target as HTMLInputElement;
    setInputValue(target.value);
    setHighlightedIndex(-1);
  };

  const handleFilterAdd = (filter: Filter) => {
    addFilter(filter);
    setInputValue("");
    setSuggestions([]);
  };

  const handleFilterRemove = (filter: Filter) => {
    removeFilter(filter);
  };

  const clearSuggestions = () => {
    setSuggestions([]);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      if (highlightedIndex !== -1) {
        const suggestion = suggestions[highlightedIndex];
        const newFilter: Filter = {
          type: "tag",
          tag: suggestion.slice(1),
          negative: suggestion.startsWith("-"),
        } as TagFilter;
        handleFilterAdd(newFilter);
      } else {
        const newFilter: Filter = (() => {
          const suggestion = inputValue;
          const isNegative = suggestion.startsWith("-");
          const cleanInput = isNegative ? suggestion.slice(1) : suggestion;
          const isFolder = cleanInput.startsWith("folder:");
          const isTitle = cleanInput.startsWith("title:");
          const isUrl = cleanInput.startsWith("url:");
          const isTag = cleanInput.startsWith("#");
          if (isTag) {
            return {
              type: "tag",
              tag: cleanInput.slice(1),
              negative: isNegative,
            } as TagFilter;
          }
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
          return {
            type: "any",
            value: cleanInput,
            negative: isNegative,
          } as AnyFilter;
        })();
        handleFilterAdd(newFilter);
      }
    } else if (e.key === "ArrowDown") {
      setHighlightedIndex((prevIndex) =>
        prevIndex === suggestions.length - 1 ? 0 : prevIndex + 1
      );
    } else if (e.key === "ArrowUp") {
      setHighlightedIndex((prevIndex) =>
        prevIndex <= 0 ? suggestions.length - 1 : prevIndex - 1
      );
    } else if (e.key === "Escape") {
      clearSuggestions();
    } else if (e.key === "Backspace" && inputValue === "") {
      const lastFilter = filters[filters.length - 1];
      if (lastFilter) {
        handleFilterRemove(lastFilter);
      }
    } else if (e.key === "Tab") {
      const highlightedSuggestion = suggestions[highlightedIndex];
      if (highlightedSuggestion) {
        setInputValue(highlightedSuggestion);
      }
    }
  };

  const handleClickSuggestion = (s: string) => {
    const newFilter: Filter = {
      type: "tag",
      tag: s.slice(1),
      negative: s.startsWith("-"),
    } as TagFilter;
    handleFilterAdd(newFilter);
    setInputValue("");
  };

  return (
    <div class="flex flex-wrap gap-1 bg-gray-800 rounded p-1 w-full items-center focus-within:outline-none focus-within:ring focus-within:ring-blue-500">
      {filters.map((filter, index) => {
        const { displayString, titleString, color } = makeFilterCapsuleData(
          filter,
        );
        return (
          <span
            class={`bg-gray-500 p-1 rounded cursor-pointer select-none ${color}`}
            title={titleString}
            key={index}
            onClick={() => handleFilterRemove(filter)}
          >
            {displayString}
          </span>
        );
      })}
      <div class="flex-1">
        <input
          type="text"
          placeholder="Search (e.g., url:, #tag, title:, -#tag, -url:)"
          class="flex-grow bg-transparent w-full p-1 min-w-[100px] align-middle focus:outline-none"
          value={inputValue}
          onInput={handleFilterInput}
          onKeyDown={handleKeyDown}
        />
        {suggestions.length > 0 && (
          <ul class="absolute bg-gray-900 rounded p-1 max-w-[200px]">
            {suggestions.map((s, index) => (
              <li
                class={`p-1 cursor-pointer hover:bg-gray-700 ${
                  index === highlightedIndex ? "bg-gray-700" : ""
                } overflow-hidden`}
                key={s}
                onClick={() => handleClickSuggestion(s)}
              >
                {s} ({availableTags[s.slice(1)]})
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
