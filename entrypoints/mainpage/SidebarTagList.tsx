import React from "react";
import { TagFilter, useBookmarks } from "@/context/BookmarksContext";
import { AiOutlineCheck, AiOutlineClose } from "react-icons/ai";

export default function SidebarTagList() {
    const {
        bookmarks: { availableTags },
        filters: { list: filters, add: addFilter, remove: removeFilter },
    } = useBookmarks();

    // Get all tags that are currently used in filters
    const activeTagFilters = filters
        .filter((f): f is TagFilter => f.type === "tag")
        .map((f) => f.tag);

    // Merge availableTags with tags from filters to ensure they are displayed
    // even if they have 0 count in the current results (e.g. negative filters)
    const displayTags = { ...availableTags };
    activeTagFilters.forEach((tag) => {
        if (displayTags[tag] === undefined) {
            displayTags[tag] = 0;
        }
    });

    // Check if a tag is already in filters
    const getTagFilterState = (tag: string): "positive" | "negative" | null => {
        const filter = filters.find(
            (f): f is TagFilter => f.type === "tag" && f.tag === tag,
        );
        if (!filter) return null;
        return filter.negative ? "negative" : "positive";
    };

    // Sort tags:
    // 1. Positive filters
    // 2. Negative filters
    // 3. Regular suggestions (sorted by count)
    const sortedTags = Object.entries(displayTags).sort(
        ([tagA, countA], [tagB, countB]) => {
            const stateA = getTagFilterState(tagA);
            const stateB = getTagFilterState(tagB);

            const score = (state: string | null) => {
                if (state === "positive") return 2;
                if (state === "negative") return 1;
                return 0;
            };

            const scoreA = score(stateA);
            const scoreB = score(stateB);

            if (scoreA !== scoreB) {
                return scoreB - scoreA;
            }

            return countB - countA;
        },
    );

    const handleTagClick = (tag: string, e: React.MouseEvent) => {
        const currentState = getTagFilterState(tag);
        const isShiftClick = e.shiftKey;

        if (currentState) {
            // Remove existing filter
            const existingFilter = filters.find(
                (f): f is TagFilter => f.type === "tag" && f.tag === tag,
            );
            if (existingFilter) {
                removeFilter(existingFilter);
            }
        } else {
            // Add new filter
            addFilter({
                type: "tag",
                tag,
                negative: isShiftClick,
            });
        }
    };

    if (sortedTags.length === 0) {
        return (
            <div className="p-4 text-sm text-muted-foreground text-center">
                No tags found in current results
            </div>
        );
    }

    return (
        <div className="p-2">
            <div className="text-xs text-muted-foreground px-2 py-1 mb-1">
                Click to filter • Shift+Click to exclude
            </div>
            <div className="flex flex-col gap-0.5">
                {sortedTags.map(([tag, count]) => {
                    const state = getTagFilterState(tag);
                    return (
                        <button
                            key={tag}
                            onClick={(e) => handleTagClick(tag, e)}
                            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md brutalism:rounded-none! text-sm transition-colors cursor-pointer text-left border-2 ${
                                state === "positive"
                                    ? "bg-green-500/20 text-green-700 dark:text-green-300 border-green-500 font-medium"
                                    : state === "negative"
                                    ? "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500 line-through opacity-70"
                                    : "hover:bg-muted text-foreground border-transparent"
                            }`}
                        >
                            {/* State indicator icon */}
                            {state === "positive" && (
                                <AiOutlineCheck className="w-3.5 h-3.5 text-green-600 dark:text-green-400 shrink-0" />
                            )}
                            {state === "negative" && (
                                <AiOutlineClose className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />
                            )}
                            <span className="truncate flex-1">#{tag}</span>
                            {!state && (
                                <span className="shrink-0 text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
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
