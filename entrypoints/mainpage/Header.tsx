import React from "react";

import FilterInput from "./FilterInput.tsx";

import { useBookmarks } from "@/context/BookmarksContext.tsx";
import { useSidebar } from "@/context/SidebarContext.tsx";
import SortOptions from "./SortOptions.tsx";

import { AiOutlineMenu } from "react-icons/ai";
import { RiSideBarLine } from "react-icons/ri";
import { Popover } from "radix-ui";
import ControlMenu from "./ControlMenu.tsx";

function BookmarksCounter() {
  const { bookmarks: { all: bookmarks, display: displayBookmarks } } =
    useBookmarks();

  return (
    <div className="text-muted-foreground flex items-center font-medium opacity-80">
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
      className={`p-2 rounded-md brutalism:rounded-none! transition-colors cursor-pointer ${
        isOpen
          ? "bg-primary text-primary-foreground"
          : "hover:bg-muted text-foreground"
      }`}
      title={isOpen ? "Close sidebar" : "Open sidebar"}
    >
      <RiSideBarLine className="w-5 h-5" />
    </button>
  );
}

export default function Header() {
  return (
    <div className="flex items-center bg-background text-foreground border-b border-border p-2 gap-2 shadow-sm z-10 relative">
      <SidebarToggle />
      <div className="flex space-x-2 flex-1">
        <FilterInput />
      </div>
      <SortOptions />
      <BookmarksCounter />
      <ControlMenu />
    </div>
  );
}
