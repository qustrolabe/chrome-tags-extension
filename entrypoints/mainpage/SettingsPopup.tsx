import React, { useState } from "react";
import { Dialog } from "radix-ui";
import {
    AiOutlineInfoCircle,
    AiOutlineLayout,
    AiOutlineSetting,
    AiOutlineBarChart,
} from "react-icons/ai";

import { useTheme, type Theme } from "@/context/ThemeContext";
import GeneralTab from "@/entrypoints/options/components/GeneralTab.tsx";
import CardsTab from "@/entrypoints/options/components/CardsTab.tsx";
import TrackingTab from "@/entrypoints/options/components/TrackingTab.tsx";
import AboutTab from "@/entrypoints/options/components/AboutTab.tsx";

type TabId = "general" | "cards" | "tracking" | "about";

const TABS = [
    { id: "general", label: "General", icon: AiOutlineSetting },
    { id: "cards", label: "Cards", icon: AiOutlineLayout },
    { id: "tracking", label: "Tracking", icon: AiOutlineBarChart },
    { id: "about", label: "About", icon: AiOutlineInfoCircle },
] as const;

/**
 * Floating settings panel: the full options page content, rendered in a
 * fixed-size popup above the main page.
 */
export default function SettingsPopup(
    { open, onOpenChange }: {
        open: boolean;
        onOpenChange: (open: boolean) => void;
    },
) {
    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-90 bg-black/60" />
                <Dialog.Content className="fixed top-1/2 left-1/2 z-100 flex h-[600px] max-h-[calc(100vh-2rem)] w-[640px] max-w-[calc(100vw-2rem)] -translate-1/2 flex-col overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-xl">
                    <Dialog.Title className="sr-only">Settings</Dialog.Title>
                    {open && <SettingsBody />}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

function SettingsBody() {
    const [activeTab, setActiveTab] = useState<TabId>("general");
    const { theme, setTheme } = useTheme();

    return (
        <>
            {/* Tab strip */}
            <div className="flex shrink-0 items-center gap-1 border-b border-border p-2">
                {TABS.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        type="button"
                        onClick={() => setActiveTab(id)}
                        className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                            activeTab === id
                                ? "bg-secondary text-secondary-foreground"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                    >
                        <Icon className="size-3.5" />
                        {label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto p-4">
                {activeTab === "general" && (
                    <GeneralTab
                        theme={theme as Theme}
                        setTheme={setTheme}
                    />
                )}
                {activeTab === "cards" && <CardsTab />}
                {activeTab === "tracking" && <TrackingTab />}
                {activeTab === "about" && <AboutTab />}
            </div>
        </>
    );
}
