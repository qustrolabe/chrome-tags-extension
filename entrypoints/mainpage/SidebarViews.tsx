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
        <div className="p-2 flex flex-col gap-2">
            {/* Create new view */}
            {!isCreating
                ? (
                    <button
                        onClick={() => setIsCreating(true)}
                        disabled={filters.list.length === 0}
                        className="flex items-center gap-2 px-3 py-2 text-sm bg-primary/10 hover:bg-primary/20 text-primary rounded-md brutalism:rounded-none! transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <AiOutlineSave className="w-4 h-4" />
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
                            className="flex-1 px-2 py-1.5 text-sm border border-border rounded-md brutalism:rounded-none! bg-input focus:outline-none focus:ring-1 focus:ring-ring"
                            autoFocus
                        />
                        <button
                            onClick={handleSave}
                            className="p-2 bg-primary text-primary-foreground rounded-md brutalism:rounded-none! hover:bg-primary/90 disabled:opacity-50"
                        >
                            <AiOutlineCheck className="w-4 h-4" />
                        </button>
                    </div>
                )}

            {/* Current filters info */}
            <div className="text-xs text-muted-foreground px-1">
                Current: {filters.list.length}{" "}
                filter{filters.list.length !== 1 ? "s" : ""}
            </div>

            {/* Clear Filters / Default View */}
            <button
                onClick={() => {
                    filters.clear();
                    clearActiveView();
                }}
                className={`flex items-center gap-2 px-2 py-2 rounded-md brutalism:rounded-none! group transition-colors w-full text-left ${
                    !activeViewId && filters.list.length === 0
                        ? "bg-primary/20 border border-primary/50"
                        : "hover:bg-muted border border-transparent"
                }`}
            >
                <div className="p-1.5 rounded bg-muted">
                    <AiOutlineFilter className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                    <div className="text-sm font-medium">Clear View</div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                        Reset all filters
                    </div>
                </div>
            </button>

            {/* Views list */}
            {views.length === 0
                ? (
                    <div className="text-sm text-muted-foreground text-center py-4">
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
                                    className={`flex items-center gap-2 px-2 py-2 rounded-md brutalism:rounded-none! group transition-colors ${
                                        isActive
                                            ? "bg-primary/20 border border-primary/50"
                                            : "hover:bg-muted border border-transparent"
                                    }`}
                                >
                                    {/* View info */}
                                    <button
                                        onClick={() => loadView(view.id)}
                                        className="flex-1 text-left cursor-pointer"
                                    >
                                        <div className="text-sm font-medium truncate">
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
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() =>
                                                duplicateView(view.id)}
                                            className="p-1.5 rounded hover:bg-muted-foreground/20"
                                            title="Duplicate"
                                        >
                                            <AiOutlineCopy className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() =>
                                                handleDelete(view.id)}
                                            className={`p-1.5 rounded transition-colors ${
                                                isConfirmingDelete
                                                    ? "bg-destructive text-destructive-foreground"
                                                    : "hover:bg-destructive/20 text-destructive"
                                            }`}
                                            title={isConfirmingDelete
                                                ? "Click again to confirm"
                                                : "Delete"}
                                        >
                                            <AiOutlineDelete className="w-3.5 h-3.5" />
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
