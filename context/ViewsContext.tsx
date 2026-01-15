import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";
import type { Filter } from "./BookmarksContext";
import { useBookmarks } from "./BookmarksContext";

export interface SavedView {
    id: string;
    name: string;
    filters: Filter[];
}

interface ViewsContextType {
    views: SavedView[];
    activeViewId: string | null;
    saveView: (name: string) => void;
    loadView: (id: string) => void;
    deleteView: (id: string) => void;
    duplicateView: (id: string) => void;
    renameView: (id: string, newName: string) => void;
    clearActiveView: () => void;
}

const ViewsContext = createContext<ViewsContextType | undefined>(undefined);

const generateId = () => crypto.randomUUID();

export const ViewsProvider = ({
    children,
}: {
    children: React.ReactNode;
}) => {
    const [views, setViews] = useState<SavedView[]>([]);
    const [activeViewId, setActiveViewId] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    const { filters } = useBookmarks();

    // Load persisted views
    useEffect(() => {
        chrome.storage.local.get(["savedViews"], (result) => {
            if (result.savedViews) {
                setViews(result.savedViews as SavedView[]);
            }
            setMounted(true);
        });
    }, []);

    // Persist views when they change
    useEffect(() => {
        if (!mounted) return;
        chrome.storage.local.set({ savedViews: views });
    }, [views, mounted]);

    const saveView = useCallback(
        (name: string) => {
            const newView: SavedView = {
                id: generateId(),
                name,
                filters: filters.list,
            };
            setViews((prev) => [...prev, newView]);
            setActiveViewId(newView.id);
        },
        [filters.list],
    );

    const loadView = useCallback(
        (id: string) => {
            const view = views.find((v) => v.id === id);
            if (view) {
                // Atomically replace all filters with view's filters
                filters.set([...view.filters]);
                setActiveViewId(id);
            }
        },
        [views, filters],
    );

    const deleteView = useCallback((id: string) => {
        setViews((prev) => prev.filter((v) => v.id !== id));
        setActiveViewId((prev) => (prev === id ? null : prev));
    }, []);

    const duplicateView = useCallback((id: string) => {
        setViews((prev) => {
            const view = prev.find((v) => v.id === id);
            if (!view) return prev;
            const duplicate: SavedView = {
                id: generateId(),
                name: `${view.name} (copy)`,
                filters: [...view.filters],
            };
            return [...prev, duplicate];
        });
    }, []);

    const renameView = useCallback((id: string, newName: string) => {
        setViews((prev) =>
            prev.map((v) => (v.id === id ? { ...v, name: newName } : v))
        );
    }, []);

    const clearActiveView = useCallback(() => {
        setActiveViewId(null);
    }, []);

    return (
        <ViewsContext.Provider
            value={{
                views,
                activeViewId,
                saveView,
                loadView,
                deleteView,
                duplicateView,
                renameView,
                clearActiveView,
            }}
        >
            {children}
        </ViewsContext.Provider>
    );
};

export const useViews = (): ViewsContextType => {
    const context = useContext(ViewsContext);
    if (!context) {
        throw new Error("useViews must be used within a ViewsProvider");
    }
    return context;
};
