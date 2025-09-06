import { useState, useEffect } from "react";
import type {
  AnyFilter,
  Filter,
  FolderFilter,
  TagFilter,
  TitleFilter,
  UrlFilter,
} from "@/context/BookmarksContext.tsx";
import { useBookmarks } from "@/context/BookmarksContext.tsx";

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
      color = "bg-neutral-200 text-black";
  }

  color = filter.negative
    ? `${color} outline outline-2 outline-red-500`
    : color;

  return { displayString, titleString, color };
};

export default function FilterInput() {
  const {
    filters: {
      list: filters,
      add: addFilter,
      remove: removeFilter,
      clear: clearFilters,
    },
    bookmarks: { availableTags },
  } = useBookmarks();

  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  useEffect(() => {
    if (inputValue.startsWith("#") || inputValue.startsWith("-#")) {
      const isNegative = inputValue.startsWith("-#");
      const tagPrefix = isNegative ? inputValue.slice(2).trim() : inputValue.slice(1).trim();

      // Exclude tags already in filters from suggestions
      const tagsInFilters = new Set(
        filters.filter((f): f is TagFilter => f.type === "tag").map((f) => f.tag)
      );

      const suggestions = Object.entries(availableTags)
        .filter(([tag]) => tag.startsWith(tagPrefix) && !tagsInFilters.has(tag))
        .sort(([, a], [, b]) => b - a)
        .slice(0, 20)
        .map(([tag]) => (isNegative ? `-${tag}` : `#${tag}`));

      setSuggestions(suggestions);
    } else {
      setSuggestions([]);
    }
  }, [inputValue, availableTags, filters]);

  const handleFilterInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
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

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
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
    <div className="flex flex-wrap gap-1 bg-neutral-800 rounded p-1 w-full items-center focus-within:outline-none focus-within:ring focus-within:ring-blue-500">
      {filters.map((filter, index) => {
        const { displayString, titleString, color } = makeFilterCapsuleData(
          filter,
        );
        return (
          <span
            className={`bg-neutral-500 p-1 rounded cursor-pointer select-none ${color}`}
            title={titleString}
            key={index}
            onClick={() => handleFilterRemove(filter)}
          >
            {displayString}
          </span>
        );
      })}
      <div className="flex-1">
        <input
          type="text"
          placeholder="Search (e.g., url:, #tag, title:, -#tag, -url:)"
          className="flex-grow bg-transparent w-full p-1 min-w-[100px] align-middle focus:outline-none"
          value={inputValue}
          onInput={handleFilterInput}
          onKeyDown={handleKeyDown}
        />
        {suggestions.length > 0 && (
          <ul className="absolute bg-neutral-900 rounded p-1 max-w-[200px] z-10">
            {suggestions.map((s, index) => (
              <li
                className={`p-1 cursor-pointer hover:bg-neutral-700 ${index === highlightedIndex ? "bg-neutral-700" : ""
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
