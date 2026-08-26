import React, { Suspense } from "react";

import Header from "./Header.tsx";
import BookmarkList from "./BookmarkList.tsx";
import Sidebar from "./Sidebar.tsx";
import BookmarkTable from "./BookmarkTable.tsx";

import { BookmarksManagerProvider } from "@/context/BookmarksContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { SidebarProvider, useSidebar } from "@/context/SidebarContext";
import { ViewsProvider } from "@/context/ViewsContext";
import { TrackingProvider } from "@/context/TrackingContext";
import { ViewModeProvider } from "@/context/ViewModeContext";
import { useViewMode } from "@/context/ViewModeContext";
import { useEffect } from "react";
import { initAccent } from "@/utils/accent.ts";

function MainContent() {
  const { isOpen } = useSidebar();
  const { mode } = useViewMode();

  return (
    <div className="flex flex-1 overflow-hidden">
      {isOpen && <Sidebar />}
      <div className="flex-1 overflow-hidden">
        {mode === "list" ? <BookmarkList /> : <BookmarkTable />}
      </div>
    </div>
  );
}

export default function App() {
  useEffect(() => {
    initAccent();
  }, []);
  return (
    <div className="bg-background text-foreground">
      <ThemeProvider>
        <TrackingProvider>
          <BookmarksManagerProvider>
            <SidebarProvider>
              <ViewsProvider>
                <ViewModeProvider>
                  <div className="flex h-screen flex-col overflow-hidden">
                    <Header />
                    <MainContent />
                  </div>
                </ViewModeProvider>
              </ViewsProvider>
            </SidebarProvider>
          </BookmarksManagerProvider>
        </TrackingProvider>
      </ThemeProvider>
    </div>
  );
}
