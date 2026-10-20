import React, { createContext, useContext, useEffect, useState } from "react";
import { z } from "zod";
import { decodeStored, storedBoolean } from "@/utils/storageDecode.ts";

const SIDEBAR_MODES = ["tags", "folders", "views"] as const;

export type SidebarMode = (typeof SIDEBAR_MODES)[number];

const sidebarModeSchema = z.enum(SIDEBAR_MODES);

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
        browser.storage.local.get(["sidebarOpen", "sidebarMode"]).then((result) => {
            const open = decodeStored(storedBoolean, result.sidebarOpen);
            const storedMode = decodeStored(sidebarModeSchema, result.sidebarMode);

            if (open !== undefined) setIsOpen(open);

            if (storedMode) setMode(storedMode);

            setMounted(true);
        });
    }, []);

    // Persist state changes
    useEffect(() => {
        if (!mounted) return;
        browser.storage.local.set({ sidebarOpen: isOpen, sidebarMode: mode });
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
