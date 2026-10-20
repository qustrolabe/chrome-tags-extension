import { setTokenState, tokenState } from "@queryfield/core";
import FolderTree, { type FolderFilterState } from "@/components/FolderTree.tsx";
import { useBookmarks } from "@/context/BookmarksContext";
import type { FolderNode } from "@/utils/folderTree.ts";

/**
 * Sidebar adapter around the shared `FolderTree`: it only adds the query
 * wiring (row state + the +/− buttons). Everything visual lives in the
 * component the two editors use as well.
 */
export default function SidebarFolderTree() {
    const {
        bookmarks: { all: bookmarks },
        query,
        setQuery,
    } = useBookmarks();

    const getFilterState = (folder: FolderNode): FolderFilterState => {
        const recursiveState = tokenState(query, "folder", folder.title);

        if (recursiveState === "negative") return "negative";

        if (recursiveState === "positive") return "positive";

        if (tokenState(query, "folder_strict", folder.title) !== null) {
            return "strict";
        }

        return null;
    };

    const handleFilter = (
        folder: FolderNode,
        negative: boolean,
        strict: boolean,
    ) => {
        // Clicking the button matching the current state clears the
        // folder's filter entirely.
        const current = getFilterState(folder);

        const requested = negative && strict
            ? "strict"
            : strict
            ? "strict"
            : negative
            ? "negative"
            : "positive";

        let next = setTokenState(query, "folder", folder.title, null);

        next = setTokenState(next, "folder_strict", folder.title, null);

        if (current === requested) {
            setQuery(next);

            return;
        }

        const key = strict ? "folder_strict" : "folder";

        next = setTokenState(
            next,
            key,
            folder.title,
            negative ? "negative" : "positive",
        );
        setQuery(next);
    };

    return (
        <FolderTree
            allBookmarks={bookmarks}
            includeRoot
            defaultExpandedIds={["0", "1", "2"]}
            getFilterState={getFilterState}
            onFilter={handleFilter}
        />
    );
}
