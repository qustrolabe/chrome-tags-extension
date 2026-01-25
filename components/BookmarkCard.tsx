import React, { useEffect, useRef, useState } from "react";
import { Tooltip } from "radix-ui";

type Bookmark = chrome.bookmarks.BookmarkTreeNode;

interface BookmarkCardProps {
    bookmark: Bookmark;
    isSettingsPreview?: boolean;
    onAddFolderFilter?: (
        folderId: string,
        negative: boolean,
        strict: boolean,
    ) => void;
    onAddTagFilter?: (tag: string, negative: boolean) => void;
    onEdit?: (id: string, title: string) => void;
    allBookmarks?: Bookmark[]; // Needed for path calculation if in preview
}

function faviconURL(u: string) {
    try {
        const url = new URL(chrome.runtime.getURL("/_favicon/"));
        url.searchParams.set("pageUrl", u);
        url.searchParams.set("size", "16");
        return url.toString();
    } catch (e) {
        return "";
    }
}

const formatDateTime = (date: number | undefined): string => {
    if (date === undefined || date === null) return "Unknown";

    const now = Date.now();
    const diff = now - date;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(diff / 1000 / 60);
    const hours = Math.floor(diff / 1000 / 60 / 60);
    const days = Math.floor(diff / 1000 / 60 / 60 / 24);

    if (seconds < 5) return "now";
    if (minutes < 1) return `${seconds} sec ago`;
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
    return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    }).format(new Date(date));
};

const cleanLink = (url: string): string => {
    let cleaned = url.replace(/^https?:\/\//i, "");
    cleaned = cleaned.replace(/^www\./i, "");
    return cleaned;
};

export default function BookmarkCard({
    bookmark,
    isSettingsPreview = false, // if previewing in settings, don't update onEdit
    onAddFolderFilter,
    onAddTagFilter,
    onEdit,
    allBookmarks = [],
}: BookmarkCardProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState(bookmark.title);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleEdit = () => {
        if (isEditing) {
            if (title !== bookmark.title && !isSettingsPreview) {
                if (onEdit) {
                    onEdit(bookmark.id, title);
                } else {
                    chrome.bookmarks.update(bookmark.id, { title });
                }
            }
        }
        setIsEditing(!isEditing);
    };

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    const handleEnter: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
        if (e.key === "Enter") {
            handleEdit();
        }
    };

    const path: Bookmark[] = (() => {
        let currentId = bookmark.parentId;
        const p: Bookmark[] = [];
        const source = allBookmarks.length > 0 ? allBookmarks : [];

        // Path calculation requires allBookmarks.
        // In main app, it's passed from BookmarkList.
        while (currentId) {
            const folder = source.find((b) => b.id === currentId);
            if (!folder) break;
            p.unshift(folder);
            currentId = folder.parentId;
        }

        if (p.length > 2) {
            p.shift();
            p.shift();
        }

        return p;
    })();

    const tags = bookmark.title.match(/#(\w+)/g)?.map((tag) => tag.slice(1));

    return (
        <div
            className={`h-[105px] max-h flex flex-col border border-border rounded-lg p-2 bg-card text-card-foreground shadow-sm transition-shadow ${
                isSettingsPreview ? "" : "m-1 hover:shadow-md"
            }`}
        >
            <div className="flex items-center">
                <Tooltip.Provider>
                    <Tooltip.Root delayDuration={200}>
                        <Tooltip.Trigger asChild>
                            <div className="mr-2 shrink-0">
                                <img
                                    loading="lazy"
                                    className="rounded-sm w-4 h-4 bg-muted"
                                    src={faviconURL(bookmark.url ?? "")}
                                    alt=""
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style
                                            .visibility = "hidden";
                                    }}
                                />
                            </div>
                        </Tooltip.Trigger>
                        <Tooltip.Portal>
                            <Tooltip.Content side="right" className="z-100">
                                <div className="bg-popover text-popover-foreground p-1.5 rounded-md border border-border shadow-lg text-xs font-medium">
                                    ID: {bookmark.id}
                                </div>
                            </Tooltip.Content>
                        </Tooltip.Portal>
                    </Tooltip.Root>
                </Tooltip.Provider>

                {isEditing
                    ? (
                        <input
                            ref={inputRef}
                            type="text"
                            value={title}
                            onInput={(e) => setTitle(e.currentTarget.value)}
                            onKeyDown={handleEnter}
                            className="w-full rounded-md bg-input text-foreground border border-border px-2 text-sm"
                        />
                    )
                    : (
                        <span
                            className="flex-1 font-bold truncate text-sm"
                            title={title}
                        >
                            {title}
                        </span>
                    )}
                <button
                    type="button"
                    className="ml-2 rounded-md bg-secondary text-secondary-foreground px-2.5 py-1 text-xs font-medium hover:bg-secondary/80 transition-colors cursor-pointer"
                    onClick={handleEdit}
                >
                    {isEditing ? "Submit" : "Edit"}
                </button>
            </div>

            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 overflow-hidden">
                <div className="flex items-center text-muted-foreground/60 shrink-0">
                    {path.length > 0 && (
                        <span className="flex items-center">
                            {path.map((node) => (
                                <span
                                    key={node.id}
                                    className="flex items-center"
                                >
                                    <span
                                        className="hover:text-primary transition-colors cursor-pointer"
                                        onClick={(e) =>
                                            onAddFolderFilter?.(
                                                node.id,
                                                e.shiftKey,
                                                e.altKey as any,
                                            )}
                                    >
                                        {node.title}
                                    </span>
                                    <span className="mx-0.5 opacity-40">/</span>
                                </span>
                            ))}
                        </span>
                    )}
                </div>
                <div className="truncate">
                    <a
                        href={isSettingsPreview ? "#" : bookmark.url}
                        onClick={(e) => isSettingsPreview && e.preventDefault()}
                        className="hover:underline text-primary/80 hover:text-primary transition-colors"
                        title={bookmark.url}
                    >
                        {bookmark.url
                            ? cleanLink(bookmark.url)
                            : "URL not available"}
                    </a>
                </div>
            </div>

            <div className="flex flex-row space-x-3 mt-1.5 text-[10px] text-muted-foreground font-medium">
                <div className="flex items-center gap-1">
                    <span
                        title={bookmark.dateAdded
                            ? new Date(bookmark.dateAdded).toLocaleString()
                            : undefined}
                    >
                        Created {formatDateTime(bookmark.dateAdded)}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <span
                        title={bookmark.dateLastUsed
                            ? new Date(bookmark.dateLastUsed).toLocaleString()
                            : undefined}
                    >
                        Last used {formatDateTime(bookmark.dateLastUsed)}
                    </span>
                </div>
            </div>

            {tags?.length
                ? (
                    <div
                        className="w-full flex truncate gap-x-1 mt-auto pt-1"
                        title={tags.map((tag) => `#${tag}`).join(" ")}
                    >
                        {tags?.map((tag) => (
                            <div
                                className="select-none cursor-pointer"
                                onClick={(e) =>
                                    onAddTagFilter?.(tag, e.shiftKey)}
                                key={tag}
                            >
                                <BookmarkTagCapsule tag={tag} />
                            </div>
                        ))}
                    </div>
                )
                : null}
        </div>
    );
}

function BookmarkTagCapsule(
    { tag }: { tag: string },
) {
    return (
        <div className="rounded-md px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-bold hover:bg-primary/20 transition-colors">
            #{tag}
        </div>
    );
}
