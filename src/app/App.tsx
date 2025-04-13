import { useEffect, useState } from "preact/hooks";

import Header from "./Header.tsx";
import BookmarkList from "./BookmarkList.tsx";

import { BookmarksManagerProvider } from "./BookmarksContext.tsx";

export default function App() {
  return (
    <BookmarksManagerProvider>
      <div class="">
        <Header />
        <BookmarkList />
      </div>
    </BookmarksManagerProvider>
  );
}
