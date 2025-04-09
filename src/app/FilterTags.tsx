import { useEffect, useState } from "preact/hooks";
import { useBookmarks } from "./BookmarksContext.tsx";

export default function FilterTags() {
  const { filterTags, setFilterTags, availableTags } = useBookmarks();
  const [inputValue, setInputValue] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const inputTags = inputValue
    .trim()
    .split(/[,\s]+/)
    .filter((s) => s.length > 0);

  useEffect(() => {
    const lastTag = inputTags[inputTags.length - 1] || "";
    const startsWithNegative = lastTag.startsWith("-");
    const tagToSearch = startsWithNegative ? lastTag.slice(1) : lastTag;
    const suggestions = availableTags
      .filter((tag) =>
        !filterTags.includes(tag) &&
        !filterTags.includes(`${startsWithNegative ? "-" : ""}${tag}`)
      )
      .filter((tag) => tag.toLowerCase().includes(tagToSearch.toLowerCase()));
    setSuggestions(
      startsWithNegative ? suggestions.map((tag) => `-${tag}`) : suggestions,
    );
  }, [inputValue, availableTags, filterTags]);

  const handleFilterTagInput = (e: InputEvent) => {
    const target = e.target as HTMLInputElement;
    setInputValue(target.value);
    setHighlightedIndex(-1);
    setShowDropdown(true);
  };

  const handleFilterTagAdd = () => {
    const newTags = inputTags.filter((tag) => !filterTags.includes(tag));
    setFilterTags([...filterTags, ...newTags]);
    setInputValue("");
    setShowDropdown(false);
    setSuggestions([]);
  };

  const handleFilterTagAddOnEnter = () => {
    if (highlightedIndex !== -1) {
      handleSuggestionClick(suggestions[highlightedIndex]);
    } else {
      handleFilterTagAdd();
    }
  };

  const handleFilterTagRemove = (tag: string) => {
    setFilterTags(filterTags.filter((t) => t !== tag));
  };

  const handleSuggestionClick = (suggestion: string) => {
    const newTags = [suggestion];
    setFilterTags([...filterTags, ...newTags]);
    setInputValue("");
    setShowDropdown(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prevIndex) =>
        prevIndex < suggestions.length - 1 ? prevIndex + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prevIndex) =>
        prevIndex > 0 ? prevIndex - 1 : suggestions.length - 1
      );
    } else if (e.key === "Enter") {
      handleFilterTagAddOnEnter();
    } else if (e.key === "Escape") {
      setHighlightedIndex(-1);
      setShowDropdown(false);
    } else if (e.key === "Backspace") {
      if (!inputValue) {
        setFilterTags(filterTags.slice(0, -1));
      }
    }
  };

  return (
    <div class="tag-input-wrapper relative flex flex-wrap items-center p-2 border border-gray-300 rounded-md bg-gray-700 shadow-sm transition duration-150 ease-in-out">
      <div id="tags-container" class="flex flex-wrap gap-1">
        {filterTags.map((tag) => {
          const isNegative = tag.startsWith("-");
          return (
            <span
              key={tag}
              class={`tag-capsule flex items-center text-sm font-medium px-2.5 py-0.5 rounded-full ${
                isNegative ? "bg-red-900" : "bg-gray-900"
              } text-white`}
              title="Click to remove TailwindCSS"
              onClick={() => handleFilterTagRemove(tag)}
            >
              {isNegative ? tag.slice(1) : tag}
            </span>
          );
        })}
      </div>
      <input
        type="text"
        id="search-input"
        placeholder="Add tags..."
        class="flex-grow p-1 outline-none focus:ring-0 border-none text-sm min-w-[120px] text-white"
        value={inputValue}
        onFocus={() => setShowDropdown(true)}
        onBlur={() => setShowDropdown(false)}
        onClick={() => setShowDropdown(true)}
        onInput={handleFilterTagInput}
        onKeyDown={handleKeyDown}
      />
      <ul
        class={`absolute top-0 left-0 w-full bg-gray-700 shadow-md transition duration-150 ease-in-out ${
          showDropdown ? "block" : "hidden"
        }`}
        style={{ top: `calc(100% + 0.5rem)` }}
      >
        {suggestions.map((suggestion, index) => (
          <li
            key={suggestion}
            class={`px-2 py-1 cursor-pointer hover:bg-gray-600 ${
              highlightedIndex === index ? "bg-gray-600" : ""
            }`}
            onMouseDown={() => handleSuggestionClick(suggestion)}
          >
            {suggestion}
          </li>
        ))}
      </ul>
    </div>
  );
}
