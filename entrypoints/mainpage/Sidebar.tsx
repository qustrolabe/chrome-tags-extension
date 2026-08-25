import React from "react";
import { type SidebarMode, useSidebar } from "@/context/SidebarContext";
import SidebarTagList from "./SidebarTagList.tsx";
import SidebarFolderTree from "./SidebarFolderTree.tsx";
import SidebarViews from "./SidebarViews.tsx";

import { AiOutlineEye, AiOutlineFolder, AiOutlineTags } from "react-icons/ai";

const MODE_TABS: { id: SidebarMode; label: string; icon: React.ElementType }[] =
    [
        { id: "tags", label: "Tags", icon: AiOutlineTags },
        { id: "folders", label: "Folders", icon: AiOutlineFolder },
        { id: "views", label: "Views", icon: AiOutlineEye },
    ];

export default function Sidebar() {
    const { mode, setMode } = useSidebar();

    return (
        <div className="flex h-full w-64 max-w-64 min-w-64 flex-col overflow-hidden border-r border-border bg-card">
            {/* Mode Tabs */}
            <div className="flex border-b border-border">
                {MODE_TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = mode === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setMode(tab.id)}
                            className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 px-2 py-1 text-sm font-medium transition-colors ${
                                isActive
                                    ? "-mb-px border-b-2 border-primary bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            }`}
                            title={tab.label}
                        >
                            <Icon className="size-4" />
                            <span className="hidden sm:inline">
                                {tab.label}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto">
                {mode === "tags" && <SidebarTagList />}
                {mode === "folders" && <SidebarFolderTree />}
                {mode === "views" && <SidebarViews />}
            </div>
        </div>
    );
}
