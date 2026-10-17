import { useMemo } from "react";
import { buildFolderTree } from "@queryfield/core";
import { QueryInput } from "@queryfield/react";
import { useBookmarks } from "@/context/BookmarksContext.tsx";

/**
 * Query-language search bar.
 *
 * Everything below the surface — token painting, the mirror layer behind the
 * native input, the suggestion list and its keyboard handling — lives in
 * `@queryfield/react`. This file only supplies the app's own state: the raw
 * query string (the single source of truth) and the suggestion sources.
 */
export default function SearchBar() {
  const {
    query,
    setQuery,
    bookmarks: { availableTags, all: allBookmarks },
  } = useBookmarks();

  const folderTree = useMemo(
    () => buildFolderTree(allBookmarks),
    [allBookmarks],
  );

  const data = useMemo(
    () => ({ tags: availableTags, folderTree }),
    [availableTags, folderTree],
  );

  return (
    <div className="relative w-full">
      <QueryInput
        query={query}
        onQueryChange={setQuery}
        data={data}
        aria-label="Search bookmarks"
        placeholder='tag:"tech" url:"google" last_used:<1w -folder:"Archive"'
      />
    </div>
  );
}
