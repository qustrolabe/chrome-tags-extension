import React, { Suspense } from "react";

import Header from "./Header.tsx";
import BookmarkList from "./BookmarkList.tsx";
import Sidebar from "./Sidebar.tsx";

import { BookmarksManagerProvider } from "@/context/BookmarksContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { SidebarProvider, useSidebar } from "@/context/SidebarContext";
import { ViewsProvider } from "@/context/ViewsContext";

function MainContent() {
  const { isOpen } = useSidebar();

  return (
    <div className="flex flex-1 overflow-hidden">
      {isOpen && <Sidebar />}
      <div className="flex-1 overflow-hidden">
        <BookmarkList />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div className="bg-background text-foreground">
      <ThemeProvider>
        <BookmarksManagerProvider>
          <SidebarProvider>
            <ViewsProvider>
              <div className="flex flex-col h-screen overflow-hidden">
                <Header />
                <MainContent />
              </div>
            </ViewsProvider>
          </SidebarProvider>
        </BookmarksManagerProvider>
      </ThemeProvider>
    </div>
  );
}
