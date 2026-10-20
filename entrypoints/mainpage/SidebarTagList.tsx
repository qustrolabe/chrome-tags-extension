import React, { useMemo } from "react";
import {
    invertTokenAt,
    parseQuery,
    setTokenState,
} from "@queryfield/core";
import type { FilterToken } from "@queryfield/core";
import { useBookmarks } from "@/context/BookmarksContext";
import TagListPanel from "@/components/TagListPanel.tsx";
import { useTagColor, useTagColorSetter } from "@/context/TagColorContext";
import {
    TAG_COLOR_MODES,
    TAG_COLOR_MODE_LABELS,
} from "@/utils/tagColor.ts";

/** Row polarity, in the order a click steps through it. */
const ORDER = [null, "positive", "negative"] as const;

type Polarity = (typeof ORDER)[number];

/** One step forward, or two when Shift is held: with three states that is a
 *  step backwards. */
const step = (state: Polarity, reverse: boolean): Polarity =>
    ORDER[(ORDER.indexOf(state) + (reverse ? 2 : 1)) % ORDER.length] ?? null;

/** The `tag:` token for this tag, if the query carries one. */
const findTagToken = (query: string, tag: string): FilterToken | undefined => {
    for (const token of parseQuery(query).tokens) {
        if (token.kind !== "filter" || token.key !== "tag") continue;

        if (token.value.toLowerCase() === tag.toLowerCase()) return token;
    }

    return undefined;
};

export default function SidebarTagList() {
    const { query, setQuery, bookmarks: { all: allBookmarks } } = useBookmarks();

    /** Polarity per tag: parsed once per query instead of once per row. */
    const filterStates = useMemo(() => {
        const states = new Map<string, "positive" | "negative">();

        for (const token of parseQuery(query).tokens) {
            if (token.kind !== "filter" || token.key !== "tag") continue;

            states.set(
                token.value.toLowerCase(),
                token.negated ? "negative" : "positive",
            );
        }

        return states;
    }, [query]);

    /**
     * A click advances one state: absent → required → excluded → absent.
     * Shift advances two, which in a three-state cycle is one step back.
     *
     * A token that already exists keeps its place: the polarity flip goes
     * through `invertTokenAt`, which rewrites the token where it stands. Only
     * a token that was absent gets appended.
     */
    const toggleTag = (tag: string, reverse: boolean) => {
        const token = findTagToken(query, tag);

        const current: Polarity = token
            ? (token.negated ? "negative" : "positive")
            : null;

        const next = step(current, reverse);

        if (next === null) {
            setQuery(setTokenState(query, "tag", tag, null));

            return;
        }

        setQuery(
            token
                ? invertTokenAt(query, token.end) ?? query
                : setTokenState(query, "tag", tag, next),
        );
    };

    const tagColorMode = useTagColor();
    const setTagColorMode = useTagColorSetter();

    return (
        <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border px-2 py-1">
                <span className="text-[10px] text-muted-foreground">
                    Tag colors
                </span>
                <div className="flex flex-wrap gap-1">
                    {TAG_COLOR_MODES.map((mode) => (
                        <button
                            key={mode}
                            type="button"
                            onClick={() => setTagColorMode(mode)}
                            className={`rounded-md border px-2 py-0.5 text-[10px] font-medium transition-all ${
                                tagColorMode === mode
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            {TAG_COLOR_MODE_LABELS[mode]}
                        </button>
                    ))}
                </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
                <TagListPanel
                    allBookmarks={allBookmarks}
                    nativeScroll
                    compact
                    filter={{ states: filterStates, toggle: toggleTag }}
                />
            </div>
        </div>
    );
}
