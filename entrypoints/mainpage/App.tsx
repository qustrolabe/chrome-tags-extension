import React, { Suspense } from "react";

import Header from "./Header.tsx";
import BookmarkList from "./BookmarkList.tsx";

import { BookmarksManagerProvider } from "@/context/BookmarksContext.tsx";

export default function App() {
  return (
    <BookmarksManagerProvider>
      <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
        <Header />
        {/* <Suspense fallback={<div>Loading bookmarks...</div>}> */}
        <BookmarkList />
        {/* </Suspense> */}
      </div>
    </BookmarksManagerProvider>
  );
}
