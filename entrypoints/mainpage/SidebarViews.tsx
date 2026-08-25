import React, { useState } from "react";
import { useViews } from "@/context/ViewsContext";
import { useBookmarks } from "@/context/BookmarksContext";
import {
    AiOutlineCheck,
    AiOutlineCopy,
    AiOutlineDelete,
    AiOutlineEdit,
    AiOutlineFilter,
    AiOutlineSave,
} from "react-icons/ai";

export default function SidebarViews() {
    const {
        views,
        activeViewId,
        saveView,
        loadView,
        deleteView,
        duplicateView,
        clearActiveView,
    } = useViews();
    const { filters, bookmarks } = useBookmarks();
    const [newViewName, setNewViewName] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    const handleSave = () => {
        saveView(newViewName.trim());
        setNewViewName("");
        setIsCreating(false);
    };

    const getViewDisplayName = (view: any) => {
        if (view.name.trim()) return view.name;
        if (view.filters.length === 0) return "Empty View";

        return view.filters.map((f: any) => {
            const prefix = f.negative ? "!" : "";
            switch (f.type) {
                case "tag":
                    return `${prefix}#${f.tag}`;
                case "folder": {
                    const folder = bookmarks.all.find((b: any) =>
                        b.id === f.folderId
                    );
                    return `${prefix}${folder?.title || "Folder"}`;
                }
                case "any":
                    return `${prefix}${f.value}`;
                case "title":
                    return `${prefix}T:${f.title}`;
                case "url":
                    return `${prefix}U:${f.url}`;
                default:
                    return "View";
            }
        }).join(", ");
    };

    const handleDelete = (id: string) => {
        if (confirmDeleteId === id) {
            deleteView(id);
            setConfirmDeleteId(null);
        } else {
            setConfirmDeleteId(id);
            // Auto-clear confirm after 3 seconds
            setTimeout(() => setConfirmDeleteId(null), 3000);
        }
    };

    return (
        <div className="flex flex-col gap-2 p-2">
            {/* Create new view */}
            {!isCreating
                ? (
                    <button
                        onClick={() => setIsCreating(true)}
                        disabled={filters.list.length === 0}
                        className="flex cursor-pointer items-center gap-2 rounded-md bg-primary/10 px-3 py-2 text-sm text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <AiOutlineSave className="size-4" />
                        Save current filters as view
                    </button>
                )
                : (
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newViewName}
                            onChange={(e) => setNewViewName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleSave();
                                if (e.key === "Escape") setIsCreating(false);
                            }}
                            placeholder="View name..."
                            className="flex-1 rounded-md border border-border bg-input px-2 py-1.5 text-sm focus:ring-1 focus:ring-ring focus:outline-none"
                            autoFocus
                        />
                        <button
                            onClick={handleSave}
                            className="rounded-md bg-primary p-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                        >
                            <AiOutlineCheck className="size-4" />
                        </button>
                    </div>
                )}

            {/* Current filters info */}
            <div className="px-1 text-xs text-muted-foreground">
                Current: {filters.list.length}{" "}
                filter{filters.list.length !== 1 ? "s" : ""}
            </div>

            {/* Clear Filters / Default View */}
            <button
                onClick={() => {
                    filters.clear();
                    clearActiveView();
                }}
                className={`group flex w-full items-center gap-2 rounded-md  p-2 text-left transition-colors ${
                    !activeViewId && filters.list.length === 0
                        ? "border border-primary/50 bg-primary/20"
                        : "border border-transparent hover:bg-muted"
                }`}
            >
                <div className="rounded bg-muted p-1.5">
                    <AiOutlineFilter className="size-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                    <div className="text-sm font-medium">Clear View</div>
                    <div className="text-xs whitespace-nowrap text-muted-foreground">
                        Reset all filters
                    </div>
                </div>
            </button>

            {/* Views list */}
            {views.length === 0
                ? (
                    <div className="py-4 text-center text-sm text-muted-foreground">
                        No saved views yet
                    </div>
                )
                : (
                    <div className="flex flex-col gap-1">
                        {views.map((view) => {
                            const isActive = activeViewId === view.id;
                            const isConfirmingDelete =
                                confirmDeleteId === view.id;

                            return (
                                <div
                                    key={view.id}
                                    className={`group flex items-center gap-2 rounded-md p-2 transition-colors ${
                                        isActive
                                            ? "border border-primary/50 bg-primary/20"
                                            : "border border-transparent hover:bg-muted"
                                    }`}
                                >
                                    {/* View info */}
                                    <button
                                        onClick={() => loadView(view.id)}
                                        className="flex-1 cursor-pointer text-left"
                                    >
                                        <div className="truncate text-sm font-medium">
                                            {getViewDisplayName(view)}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {view.filters.length}{" "}
                                            filter{view.filters.length !== 1
                                                ? "s"
                                                : ""}
                                        </div>
                                    </button>

                                    {/* Actions */}
                                    <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                        <button
                                            onClick={() =>
                                                duplicateView(view.id)}
                                            className="rounded p-1.5 hover:bg-muted-foreground/20"
                                            title="Duplicate"
                                        >
                                            <AiOutlineCopy className="size-3.5" />
                                        </button>
                                        <button
                                            onClick={() =>
                                                handleDelete(view.id)}
                                            className={`rounded p-1.5 transition-colors ${
                                                isConfirmingDelete
                                                    ? "bg-destructive text-destructive-foreground"
                                                    : "text-destructive hover:bg-destructive/20"
                                            }`}
                                            title={isConfirmingDelete
                                                ? "Click again to confirm"
                                                : "Delete"}
                                        >
                                            <AiOutlineDelete className="size-3.5" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
        </div>
    );
}
