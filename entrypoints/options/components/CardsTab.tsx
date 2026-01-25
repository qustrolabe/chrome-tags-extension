import React from "react";
import { AiOutlineLayout } from "react-icons/ai";
import BookmarkCard from "@/components/BookmarkCard";
import SettingsCard from "./SettingsCard";

export default function CardsTab() {
    const MOCK_BOOKMARKS = [
        {
            id: "1",
            title: "Introduction to React #react #tutorial #js",
            url: "https://react.dev/learn",
            dateAdded: Date.now() - 172800000,
            dateLastUsed: Date.now() - 3600000,
            parentId: "10",
        },
        {
            id: "2",
            title: "GitHub - Tailwind CSS #css #framework #oss",
            url: "https://github.com/tailwindlabs/tailwindcss",
            dateAdded: Date.now() - 86400000,
            dateLastUsed: Date.now() - 7200000,
            parentId: "11",
        },
        {
            id: "3",
            title: "MDN Web Docs #docs #web #api",
            url: "https://developer.mozilla.org",
            dateAdded: Date.now() - 604800000,
            dateLastUsed: Date.now() - 86400000,
            parentId: "12",
        },
        {
            id: "4",
            title: "Dribbble - Design Inspiration #design #ui #inspiration",
            url: "https://dribbble.com",
            dateAdded: Date.now() - 3600000,
            dateLastUsed: Date.now() - 600000,
            parentId: "13",
        },
    ] as chrome.bookmarks.BookmarkTreeNode[];

    const MOCK_FOLDERS = [
        { id: "10", title: "Frontend", parentId: "100" },
        { id: "100", title: "Knowledge", parentId: "1" },
        { id: "11", title: "Stars", parentId: "110" },
        { id: "110", title: "Resources", parentId: "1" },
        { id: "12", title: "Reference", parentId: "1" },
        { id: "13", title: "Inspo", parentId: "130" },
        { id: "130", title: "Art", parentId: "1" },
        { id: "1", title: "Bookmarks Menu", parentId: "0" },
    ] as chrome.bookmarks.BookmarkTreeNode[];

    return (
        <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-2xl font-bold mb-2">Bookmark Cards</h2>
                <p className="text-muted-foreground">
                    Customize how your bookmarks are displayed in the main list.
                </p>
            </div>

            <div className="grid gap-6">
                <SettingsCard
                    title="Card Preview"
                    description="This is how your bookmarks currently look. Future settings will allow you to toggle specific elements."
                >
                    <div className="flex flex-col gap-3 mt-2">
                        {MOCK_BOOKMARKS.map((bookmark) => (
                            <BookmarkCard
                                key={bookmark.id}
                                bookmark={bookmark}
                                isSettingsPreview={true}
                                allBookmarks={MOCK_FOLDERS}
                            />
                        ))}
                    </div>
                </SettingsCard>

                <div className="p-4 rounded-xl border border-dashed border-border bg-muted/20 flex flex-col items-center justify-center text-center py-12">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
                        <AiOutlineLayout className="w-6 h-6" />
                    </div>
                    <h3 className="font-medium">
                        More customization coming soon
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                        Soon you'll be able to toggle favicons, tags,
                        timestamps, and compact modes.
                    </p>
                </div>
            </div>
        </section>
    );
}
