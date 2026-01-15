import React, { createContext, useContext, useEffect, useState } from "react";

export type SidebarMode = "tags" | "folders" | "views";

interface SidebarContextType {
    isOpen: boolean;
    toggleSidebar: () => void;
    setIsOpen: (open: boolean) => void;
    mode: SidebarMode;
    setMode: (mode: SidebarMode) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const SidebarProvider = ({
    children,
}: {
    children: React.ReactNode;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [mode, setMode] = useState<SidebarMode>("tags");
    const [mounted, setMounted] = useState(false);

    // Load persisted state
    useEffect(() => {
        chrome.storage.local.get(["sidebarOpen", "sidebarMode"], (result) => {
            if (typeof result.sidebarOpen === "boolean") {
                setIsOpen(result.sidebarOpen);
            }
            if (result.sidebarMode) {
                setMode(result.sidebarMode as SidebarMode);
            }
            setMounted(true);
        });
    }, []);

    // Persist state changes
    useEffect(() => {
        if (!mounted) return;
        chrome.storage.local.set({ sidebarOpen: isOpen, sidebarMode: mode });
    }, [isOpen, mode, mounted]);

    const toggleSidebar = () => setIsOpen((prev) => !prev);

    return (
        <SidebarContext.Provider
            value={{ isOpen, toggleSidebar, setIsOpen, mode, setMode }}
        >
            {children}
        </SidebarContext.Provider>
    );
};

export const useSidebar = (): SidebarContextType => {
    const context = useContext(SidebarContext);
    if (!context) {
        throw new Error("useSidebar must be used within a SidebarProvider");
    }
    return context;
};
