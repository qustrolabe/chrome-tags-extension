import React, { useState } from "react";

import SearchBar from "./SearchBar.tsx";
import SettingsPopup from "./SettingsPopup.tsx";

import { useBookmarks } from "@/context/BookmarksContext.tsx";
import { useSidebar } from "@/context/SidebarContext.tsx";
import SortOptions from "./SortOptions.tsx";
import { useViewMode } from "@/context/ViewModeContext";

import { RiSideBarLine } from "react-icons/ri";
import ControlMenu from "./ControlMenu.tsx";

function BookmarksCounter() {
  const { bookmarks: { all: bookmarks, display: displayBookmarks } } =
    useBookmarks();

  return (
    <div className="flex items-center font-medium text-muted-foreground opacity-80">
      <span title="Displayed filtered bookmarks">
        {displayBookmarks.length}
      </span>{" "}
      /{" "}
      <span title="Total number of bookmarks (including folders)">
        {bookmarks.length}
      </span>
    </div>
  );
}

function SidebarToggle() {
  const { isOpen, toggleSidebar } = useSidebar();

  return (
    <button
      onClick={toggleSidebar}
      className={`cursor-pointer rounded-md p-2 transition-colors ${
        isOpen
          ? "bg-primary text-primary-foreground"
          : "text-foreground hover:bg-muted"
      }`}
      title={isOpen ? "Close sidebar" : "Open sidebar"}
    >
      <RiSideBarLine className="size-5" />
    </button>
  );
}

export default function Header() {
  const { mode, setMode } = useViewMode();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="relative z-30 flex items-center gap-2 border-b border-border bg-background p-2 text-foreground shadow-sm">
      <SidebarToggle />
      <div className="flex flex-1 space-x-2">
        <SearchBar />
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center rounded-md bg-secondary p-0.5">
          {(["list", "table"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={`h-7 rounded-sm px-2.5 text-xs font-semibold transition-colors ${
                mode === value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {value === "list" ? "List" : "Table"}
            </button>
          ))}
        </div>
        <SortOptions />
      </div>
      <BookmarksCounter />
      <ControlMenu onOpenSettings={() => setSettingsOpen(true)} />
      <SettingsPopup open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
