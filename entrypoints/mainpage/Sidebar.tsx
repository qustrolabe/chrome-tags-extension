import React from "react";
import { SidebarMode, useSidebar } from "@/context/SidebarContext";
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
        <div className="w-64 min-w-64 max-w-64 h-full flex flex-col bg-card border-r border-border overflow-hidden">
            {/* Mode Tabs */}
            <div className="flex border-b border-border">
                {MODE_TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = mode === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setMode(tab.id)}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                                isActive
                                    ? "bg-primary/10 text-primary border-b-2 border-primary -mb-px"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            }`}
                            title={tab.label}
                        >
                            <Icon className="w-4 h-4" />
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
