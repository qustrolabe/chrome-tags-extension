import React, { useEffect, useState } from "react";
import { useBookmarks } from "@/context/BookmarksContext";
import TagListPanel from "@/components/TagListPanel.tsx";
import { useTagColor, useTagColorSetter } from "@/context/TagColorContext";
import {
    TAG_COLOR_MODES,
    TAG_COLOR_MODE_LABELS,
} from "@/utils/tagColor.ts";

export default function SidebarTagList() {
    const { query, setQuery, bookmarks: { all: allBookmarks } } = useBookmarks();
    const [title, setTitleState] = useState(query);

    useEffect(() => {
        setTitleState(query);
    }, [query]);

    const setTitle = (value: string) => {
        setTitleState(value);
        setQuery(value);
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
                <TagListPanel title={title} setTitle={setTitle} allBookmarks={allBookmarks} nativeScroll compact />
            </div>
        </div>
    );
}
