import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Tooltip, AlertDialog } from "radix-ui";
import { AiOutlineDelete } from "react-icons/ai";
import { extractTags, buildTagIndex } from "@/utils/query/tags.ts";
import { faviconURL } from "@/utils/favicon.ts";

type Bookmark = chrome.bookmarks.BookmarkTreeNode;

interface BookmarkCardProps {
    bookmark: Bookmark;
    isSettingsPreview?: boolean;
    trackingStats?: {
        visits: number;
        score: number;
        lastVisited: number;
    };
    trackingFrecency?: number;
    showTracking?: boolean;
    onAddFolderFilter?: (
        folderId: string,
        negative: boolean,
        strict: boolean,
    ) => void;
    onAddTagFilter?: (tag: string, negative: boolean) => void;
    onEdit?: (id: string, title: string) => void;
    onDelete?: (id: string) => void;
    allBookmarks?: Bookmark[]; // Needed for path calculation if in preview
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
    trackingStats,
    trackingFrecency = 0,
    showTracking = false,
    onAddFolderFilter,
    onAddTagFilter,
    onEdit,
    onDelete,
    allBookmarks = [],
}: BookmarkCardProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState(bookmark.title);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    /** Tag suggestions shown while a `#fragment` is being typed. */
    const [suggest, setSuggest] = useState<{
        start: number; // index of first char after '#'
        caret: number;
        left: number;
        top: number;
        matches: { tag: string; count: number }[];
        highlighted: number;
    } | null>(null);

    const handleEdit = () => {
        if (isEditing) {
            if (title !== bookmark.title && !isSettingsPreview) {
                if (onEdit) {
                    onEdit(bookmark.id, title);
                } else {
                    browser.bookmarks.update(bookmark.id, { title });
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

    // Known tags across ALL bookmarks (case-merged), most popular first.
    // Only computed while editing.
    const knownTags = useMemo(() => {
        if (!isEditing) return [] as { tag: string; count: number }[];
        const withUrl = allBookmarks.filter((b) => b.url !== undefined);
        return Object.entries(buildTagIndex(withUrl))
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
    }, [isEditing, allBookmarks]);

    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    /** Approximate pixel X of the caret inside the input. */
    const measureCaretX = (text: string): number => {
        const input = inputRef.current;
        if (!input || !text) return 0;
        if (!canvasRef.current) canvasRef.current = document.createElement("canvas");
        const ctx = canvasRef.current.getContext("2d");
        if (!ctx) return 0;
        const style = globalThis.getComputedStyle(input);
        ctx.font = `${style.fontSize} ${style.fontFamily}`;
        // account for horizontal scrolling of long titles
        return Math.max(0, ctx.measureText(text).width - input.scrollLeft);
    };

    /** Detect `#fragment` right before the caret; null = no suggestion mode.
     *  Dropdown renders in a body portal (fixed) so following cards can't
     *  paint over it. */
    const computeSuggest = (value: string, caret: number) => {
        const input = inputRef.current;
        const upto = value.slice(0, caret);
        const match = /(?:^|\s)#([^\s#]*)$/.exec(upto);
        if (!match || match[1] === undefined || !input) return null;
        const prefix = match[1].toLowerCase();
        const matches = knownTags
            .filter((entry) => entry.tag.startsWith(prefix))
            .slice(0, 8);
        const rect = input.getBoundingClientRect();
        const left = Math.min(
            rect.left + measureCaretX(value.slice(0, caret - match[1].length - 1)),
            globalThis.innerWidth - 220,
        );
        return {
            start: caret - match[1].length,
            left,
            top: rect.bottom + 4,
            caret,
            matches,
            highlighted: 0,
        };
    };

    const updateSuggestions = () => {
        const input = inputRef.current;
        if (!input) return;
        setSuggest(computeSuggest(input.value, input.selectionStart ?? 0));
    };

    const acceptSuggestion = (tag: string) => {
        if (!suggest || !inputRef.current) return;
        const caret = suggest.caret;
        const next =
            title.slice(0, suggest.start) + tag + " " + title.slice(caret);
        setTitle(next);
        setSuggest(null);
        const pos = suggest.start + tag.length + 1;
        requestAnimationFrame(() => {
            inputRef.current?.focus();
            inputRef.current?.setSelectionRange(pos, pos);
        });
    };

    const handleTitleKeyDown: React.KeyboardEventHandler<
        HTMLInputElement
    > = (e) => {
        if (suggest && suggest.matches.length > 0) {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setSuggest({
                    ...suggest,
                    highlighted:
                        (suggest.highlighted + 1) % suggest.matches.length,
                });
                return;
            }
            if (e.key === "ArrowUp") {
                e.preventDefault();
                setSuggest({
                    ...suggest,
                    highlighted: suggest.highlighted <= 0
                        ? -1
                        : suggest.highlighted - 1,
                });
                return;
            }
            if (
                (e.key === "Tab" || e.key === "Enter") &&
                suggest.highlighted >= 0
            ) {
                e.preventDefault();
                e.stopPropagation();
                const tag = suggest.matches[suggest.highlighted]?.tag;
                if (tag === undefined) return;
                acceptSuggestion(tag);
                return;
            }
            if (e.key === "Escape") {
                e.stopPropagation();
                setSuggest(null);
                return;
            }
        }
        handleEnter(e);
    };

    const handleDelete = () => {
        setConfirmOpen(false);
        if (isSettingsPreview) return;
        if (onDelete) onDelete(bookmark.id);
        else browser.bookmarks.remove(bookmark.id);
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

    const tags = extractTags(bookmark.title)
        .map((tag) => tag.toLowerCase())
        .filter((tag, i, arr) => arr.indexOf(tag) === i);

    return (
        <div
            className={`flex min-h-[100px] flex-col rounded-lg border border-border bg-card p-2 text-card-foreground shadow-sm transition-shadow ${
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
                                    className="size-4 rounded-sm bg-muted"
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
                                <div className="rounded-md border border-border bg-popover p-1.5 text-xs font-medium text-popover-foreground shadow-lg">
                                    ID: {bookmark.id}
                                </div>
                            </Tooltip.Content>
                        </Tooltip.Portal>
                    </Tooltip.Root>
                </Tooltip.Provider>

                {isEditing
                    ? (
                        <div className="relative w-full">
                            <input
                                ref={inputRef}
                                type="text"
                                value={title}
                                onInput={(e) => {
                                    setTitle(e.currentTarget.value);
                                    updateSuggestions();
                                }}
                                onKeyDown={handleTitleKeyDown}
                                onSelect={updateSuggestions}
                                onBlur={() => setSuggest(null)}
                                className="w-full rounded-md border border-border bg-input px-2 text-sm text-foreground"
                            />
                            {suggest && suggest.matches.length > 0 &&
                                createPortal(
                                    <div
                                        className="fixed z-100 max-h-[180px] min-w-[160px] overflow-y-auto rounded-md border border-border bg-popover py-1 shadow-lg"
                                        style={{
                                            left: suggest.left,
                                            top: suggest.top,
                                        }}
                                    >
                                        <div className="px-2 pb-1 text-[10px] text-muted-foreground/60">
                                            Tags — Tab to insert
                                        </div>
                                        {suggest.matches.map((entry, i) => (
                                            <button
                                                key={entry.tag}
                                                className={`flex w-full cursor-pointer items-center gap-1.5 px-2 py-1 text-left text-xs ${
                                                    i === suggest.highlighted
                                                        ? "bg-muted text-foreground"
                                                        : "text-muted-foreground hover:bg-muted"
                                                }`}
                                                onMouseDown={(e) => {
                                                    // prevent blur before accept
                                                    e.preventDefault();
                                                    acceptSuggestion(
                                                        entry.tag,
                                                    )
                                                }}
                                                onMouseEnter={() =>
                                                    setSuggest({
                                                        ...suggest,
                                                        highlighted: i,
                                                    })}
                                            >
                                                <span className="font-bold text-primary">
                                                    #
                                                </span>
                                                <span className="truncate">
                                                    {entry.tag}
                                                </span>
                                                <span className="ml-auto shrink-0 pl-2 text-xs whitespace-nowrap text-muted-foreground">
                                                    {entry.count}
                                                    {" "}
                                                    {entry.count === 1
                                                        ? "bookmark"
                                                        : "bookmarks"}
                                                </span>
                                            </button>
                                        ))}
                                    </div>,
                                    document.body,
                                )}
                        </div>
                    )
                    : (
                        <span
                            className="flex-1 truncate text-sm font-bold"
                            title={title}
                        >
                            {title}
                        </span>
                    )}
                <button
                    type="button"
                    className="ml-2 cursor-pointer rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
                    onClick={handleEdit}
                >
                    {isEditing ? "Submit" : "Edit"}
                </button>
                {!isEditing && !isSettingsPreview && (
                    <Tooltip.Provider>
                        <Tooltip.Root delayDuration={300}>
                            <Tooltip.Trigger asChild>
                                <button
                                    type="button"
                                    className="ml-1 cursor-pointer rounded-md p-1 text-muted-foreground/50 transition-colors hover:bg-destructive/20 hover:text-destructive"
                                    onClick={() => setConfirmOpen(true)}
                                    title="Delete bookmark"
                                >
                                    <AiOutlineDelete className="size-3.5" />
                                </button>
                            </Tooltip.Trigger>
                            <Tooltip.Portal>
                                <Tooltip.Content side="left" className="z-100">
                                    <div className="rounded-md border border-border bg-popover px-1.5 py-0.5 text-xs font-medium text-popover-foreground shadow-lg">
                                        Delete
                                    </div>
                                </Tooltip.Content>
                            </Tooltip.Portal>
                        </Tooltip.Root>
                    </Tooltip.Provider>
                )}
            </div>

            <div className="mt-0.5 flex items-center gap-1 overflow-hidden text-xs text-muted-foreground">
                <div className="flex shrink-0 items-center text-muted-foreground/60">
                    {path.length > 0 && (
                        <span className="flex items-center">
                            {path.map((node) => (
                                <span
                                    key={node.id}
                                    className="flex items-center"
                                >
                                    <span
                                        className="cursor-pointer transition-colors hover:text-primary"
                                        onClick={(e) =>
                                            onAddFolderFilter?.(
                                                node.id,
                                                e.shiftKey,
                                                e.altKey as boolean,
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
                        className="text-primary/80 transition-colors hover:text-primary hover:underline"
                        title={bookmark.url}
                    >
                        {bookmark.url
                            ? cleanLink(bookmark.url)
                            : "URL not available"}
                    </a>
                </div>
            </div>

            <div className="mt-1.5 flex flex-row flex-wrap gap-x-3 gap-y-1 text-[10px] font-medium text-muted-foreground">
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
                {showTracking && trackingStats
                    ? (
                        <>
                            <div className="flex items-center gap-1">
                                <span
                                    title={`Visits ${trackingStats.visits}`}
                                >
                                    Visits {trackingStats.visits}
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span
                                    title={`Frecency ${trackingFrecency.toFixed(2)} • Score ${trackingStats.score.toFixed(2)}`}
                                >
                                    Frecency {trackingFrecency.toFixed(2)}
                                </span>
                            </div>
                        </>
                    )
                    : null}
            </div>

            {tags?.length
                ? (
                    <div
                        className="mt-1 flex w-full gap-x-1 truncate"
                        title={tags.map((tag) => `#${tag}`).join(" ")}
                    >
                        {tags?.map((tag) => (
                            <div
                                className="cursor-pointer select-none"
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

            <AlertDialog.Root
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
            >
                <AlertDialog.Portal>
                    <AlertDialog.Overlay className="fixed inset-0 z-90 bg-black/60" />
                    <AlertDialog.Content className="fixed top-1/2 left-1/2 z-100 w-[320px] -translate-1/2 rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-xl">
                        <AlertDialog.Title className="text-sm font-bold">
                            Delete bookmark?
                        </AlertDialog.Title>
                        <AlertDialog.Description
                            asChild
                            className="mt-2 block text-xs text-muted-foreground"
                        >
                            <div>
                                <span className="line-clamp-2 font-semibold text-foreground">
                                    {bookmark.title || bookmark.url}
                                </span>
                                <span className="mt-1 block">
                                    This permanently removes it from your
                                    bookmarks. This cannot be undone.
                                </span>
                            </div>
                        </AlertDialog.Description>
                        <div className="mt-4 flex justify-end gap-2">
                            <AlertDialog.Cancel asChild>
                                <button
                                    type="button"
                                    className="cursor-pointer rounded-md bg-secondary px-3 py-1.5 text-xs font-medium transition-colors hover:bg-secondary/80"
                                >
                                    Cancel
                                </button>
                            </AlertDialog.Cancel>
                            <button
                                type="button"
                                autoFocus
                                className="cursor-pointer rounded-md bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground transition-colors hover:bg-destructive/80"
                                onClick={handleDelete}
                            >
                                Delete
                            </button>
                        </div>
                    </AlertDialog.Content>
                </AlertDialog.Portal>
            </AlertDialog.Root>
        </div>
    );
}

function BookmarkTagCapsule(
    { tag }: { tag: string },
) {
    return (
        <div className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary transition-colors hover:bg-primary/20">
            #{tag}
        </div>
    );
}
