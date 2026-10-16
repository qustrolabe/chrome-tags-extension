import React, { useEffect, useState } from "react";
import { useBookmarks } from "@/context/BookmarksContext";
import TagListPanel from "@/components/TagListPanel.tsx";
import { useTagColor, useTagColorSetter } from "@/context/TagColorContext";
import {
    TAG_COLOR_MODES,
    TAG_COLOR_MODE_LABELS,
} from "@/utils/tagColor.ts";

const TAG_TOKEN = /-?\s*tag:"([^"]+)"|-?\s*tag:([^\s]+)/gi;

function stripTagTokens(value: string): string {
    return value.replace(TAG_TOKEN, " ").replace(/\s+/g, " ").trim();
}

function tagTokensToHash(value: string): string {
    let match: RegExpExecArray | null;
    const tags: string[] = [];
    const regex = new RegExp(TAG_TOKEN.source, "gi");

    while ((match = regex.exec(value)) !== null) {
        const tag = match[1] ?? match[2];

        if (tag) tags.push(`#${tag}`);
    }

    return tags.join(" ");
}

function hashToTagQuery(value: string): string {
    const hashes = value.match(/#([^\s]+)/g);

    return (hashes ?? [])
        .map((item) => `tag:"${item.slice(1)}"`)
        .join(" ");
}

export default function SidebarTagList() {
    const { query, setQuery, bookmarks: { all: allBookmarks } } = useBookmarks();
    const [title, setTitleState] = useState(tagTokensToHash(query));

    useEffect(() => {
        setTitleState(tagTokensToHash(query));
    }, [query]);

    const setTitle = (value: string) => {
        setTitleState(value);

        const base = stripTagTokens(query);
        const tags = hashToTagQuery(value);
        const next = [base, tags].filter(Boolean).join(" ");

        setQuery(next);
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
                    title={title}
                    setTitle={setTitle}
                    allBookmarks={allBookmarks}
                    nativeScroll
                    compact
                />
            </div>
        </div>
    );
}
