import React from "react";
import { useBookmarks } from "@/context/BookmarksContext";
import { cycleToken, tokenState } from "@/utils/query/editing.ts";
import { AiOutlineCheck, AiOutlineClose } from "react-icons/ai";

export default function SidebarTagList() {
    const {
        bookmarks: { availableTags },
        query,
        setQuery,
    } = useBookmarks();

    // Tags referenced anywhere in the current query (either polarity)
    const activeTags = new Set(
      [...query.matchAll(/-?tag:"?([^\s"]+)"?/g)]
        .map((m) => m[1])
        .filter((t): t is string => t !== undefined),
    );

    // Merge availableTags with tags from the query so they stay visible
    const displayTags = { ...availableTags };
    activeTags.forEach((tag) => {
        if (displayTags[tag] === undefined) {
            displayTags[tag] = 0;
        }
    });

    const getTagState = (tag: string): "positive" | "negative" | null =>
        tokenState(query, "tag", tag);

    // Sort: positive filters, then negative, then by count
    const sortedTags = Object.entries(displayTags).sort(
        ([tagA, countA], [tagB, countB]) => {
            const score = (state: string | null) => {
                if (state === "positive") return 2;
                if (state === "negative") return 1;
                return 0;
            };

            const scoreA = score(getTagState(tagA));
            const scoreB = score(getTagState(tagB));

            if (scoreA !== scoreB) {
                return scoreB - scoreA;
            }

            return countB - countA;
        },
    );

    const handleTagClick = (tag: string) => {
        setQuery(cycleToken(query, "tag", tag));
    };

    if (sortedTags.length === 0) {
        return (
            <div className="p-4 text-center text-sm text-muted-foreground">
                No tags found in current results
            </div>
        );
    }

    return (
        <div className="p-2">
            <div className="mb-1 px-2 py-1 text-xs text-muted-foreground">
                Click to filter • click again to exclude • once more to clear
            </div>
            <div className="flex flex-col gap-0.5">
                {sortedTags.map(([tag, count]) => {
                    const state = getTagState(tag);
                    return (
                        <button
                            key={tag}
                            onClick={() => handleTagClick(tag)}
                            className={`flex cursor-pointer items-center gap-1.5 rounded-md border-2 px-2 py-1.5 text-left text-sm transition-colors ${
                                state === "positive"
                                    ? "border-green-500 bg-green-500/20 font-medium text-green-700 dark:text-green-300"
                                    : state === "negative"
                                    ? "border-red-500 bg-red-500/20 text-red-700 line-through opacity-70 dark:text-red-300"
                                    : "border-transparent text-foreground hover:bg-muted"
                            }`}
                        >
                            {state === "positive" && (
                                <AiOutlineCheck className="size-3.5 shrink-0 text-green-600 dark:text-green-400" />
                            )}
                            {state === "negative" && (
                                <AiOutlineClose className="size-3.5 shrink-0 text-red-600 dark:text-red-400" />
                            )}
                            <span className="flex-1 truncate">#{tag}</span>
                            {!state && (
                                <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
