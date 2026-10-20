import { useMemo } from "react";
import { buildFolderTree } from "@queryfield/core";
import { QueryInput } from "@queryfield/react";
import { useBookmarks } from "@/context/BookmarksContext.tsx";
import {
  suggestionCapsuleClassName,
  tokenClassName,
} from "@/utils/queryColors.ts";
import { tokenActions } from "@/utils/queryActions.ts";
import { appRegistry } from "@/utils/queryRegistry.ts";

/**
 * Query-language search bar.
 *
 * Everything below the surface — token painting, the mirror layer behind the
 * native input, the suggestion list and its keyboard handling — lives in
 * `@queryfield/react`. This file only supplies the app's own state: the raw
 * query string (the single source of truth), the suggestion sources and the
 * extra rows for the token dropdown.
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
        registry={appRegistry}
        tokenActions={tokenActions}
        suggestionCapsuleClassName={suggestionCapsuleClassName}
        tokenClassName={tokenClassName}
        aria-label="Search bookmarks"
        placeholder='tag:"tech" url:"google" last_used:<1w -folder:"Archive"'
      />
    </div>
  );
}
