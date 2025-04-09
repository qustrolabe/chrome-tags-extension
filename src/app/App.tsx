import { useEffect, useState } from "preact/hooks";

import Header from "./Header.tsx";
import BookmarkList from "./BookmarkList.tsx";

import { BookmarksManagerProvider } from "./BookmarksContext.tsx";

// type Bookmark = chrome.bookmarks.BookmarkTreeNode;

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

// export default function App() {
//   const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
//   const [darkMode, setDarkMode] = useState(true);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [sortOption, setSortOption] = useState<"date" | "id" | "title">("date");

//   useEffect(() => {
//     chrome.bookmarks.getTree((bookmarkTreeNodes) => {
//       const bookmarks: Bookmark[] = [];
//       function traverse(nodes: chrome.bookmarks.BookmarkTreeNode[]) {
//         nodes.forEach((node) => {
//           if (node.url) {
//             bookmarks.push({
//               id: node.id,
//               title: node.title,
//               url: node.url,
//               dateAdded: node.dateAdded,
//               dateGroupModified: node.dateGroupModified,
//               dateLastUsed: node.dateLastUsed,
//               syncing: node.syncing,
//             });
//           }
//           if (node.children) {
//             traverse(node.children);
//           }
//         });
//       }
//       traverse(bookmarkTreeNodes);
//       setBookmarks(bookmarks);
//     });
//   }, []);

//   const filteredBookmarks = bookmarks
//     .filter((bookmark) =>
//       bookmark.title.toLowerCase().includes(searchQuery.toLowerCase())
//     )
//     .sort((a, b) => {
//       if (sortOption === "date") return b.dateAdded - a.dateAdded;
//       if (sortOption === "id") return a.id.localeCompare(b.id);
//       if (sortOption === "title") return a.title.localeCompare(b.title);
//       return 0;
//     });

//   return (
//     <div
//       class={`mx-auto p-4 ${darkMode ? "bg-gray-900 text-white" : "bg-white"}`}
//     >
//       {/* <h1 class="font-bold">Bookmarks</h1> */}
//       <div class="flex space-x-4 my-4">
//         <input
//           type="text"
//           value={searchQuery}
//           onInput={(e) => setSearchQuery(e.currentTarget.value)}
//           placeholder="Search bookmarks..."
//           class={`rounded p-2 ${
//             darkMode ? "bg-gray-800 text-white" : "bg-white"
//           } border`}
//         />
//         <select
//           value={sortOption}
//           onChange={(e) =>
//             setSortOption(e.currentTarget.value as "date" | "id" | "title")}
//           class={`rounded p-2 ${
//             darkMode ? "bg-gray-800 text-white" : "bg-white"
//           } border`}
//         >
//           <option value="date">Sort by Date</option>
//           <option value="id">Sort by ID</option>
//           <option value="title">Sort by Title</option>
//         </select>
//       </div>
//       <ul class="mt-4 space-y-2">
//         {filteredBookmarks.map((bookmark) => (
//           <li
//             key={bookmark.id}
//             class={`rounded p-2 ${
//               darkMode ? "bg-gray-800" : "bg-white"
//             } shadow-md`}
//           >
//             <BookmarkCard
//               bookmark={bookmark}
//               darkMode={darkMode}
//               onEdit={(newTitle) => {
//                 chrome.bookmarks.update(bookmark.id, { title: newTitle });
//                 setBookmarks(
//                   bookmarks.map((b) =>
//                     b.id === bookmark.id ? { ...b, title: newTitle } : b
//                   ),
//                 );
//               }}
//             />
//           </li>
//         ))}
//       </ul>
//     </div>
//   );
// }
