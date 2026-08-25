import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";
import { useBookmarks } from "./BookmarksContext";

export interface SavedView {
    id: string;
    name: string;
    /** Raw query string, e.g. `tag:"tech" -in:"Archive" last_used:<1w`. */
    query: string;
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

/**
 * Migrate legacy views that stored a structured `filters` array.
 * Best-effort conversion into query-string form.
 */
interface LegacyFilter {
  type: string;
  negative?: boolean;
  tag?: string;
  title?: string;
  url?: string;
  value?: string;
}

const migrateLegacyView = (view: Partial<SavedView> & { filters?: LegacyFilter[] }): SavedView => ({
    id: view.id ?? generateId(),
    name: view.name ?? "View",
    query:
        view.query ??
        (Array.isArray(view.filters)
            ? view.filters
                .map((f) => {
                    const neg = f.negative ? "-" : "";
                    switch (f.type) {
                        case "tag":
                            return `${neg}tag:${JSON.stringify(f.tag ?? "")}`;
                        case "title":
                            return `${neg}title:${JSON.stringify(f.title ?? "")}`;
                        case "url":
                            return `${neg}url:${JSON.stringify(f.url ?? "")}`;
                        default:
                            return f.value
                                ? `${neg}${JSON.stringify(f.value)}`
                                : null;
                    }
                })
                .filter(Boolean)
                .join(" ")
            : ""),
});

export const ViewsProvider = ({
    children,
}: {
    children: React.ReactNode;
}) => {
    const [views, setViews] = useState<SavedView[]>([]);
    const [activeViewId, setActiveViewId] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    const { query, setQuery } = useBookmarks();

    // Load persisted views
    useEffect(() => {
        browser.storage.local.get(["savedViews"]).then((result) => {
            if (result.savedViews) {
                setViews(
                    (result.savedViews as (SavedView & { filters?: LegacyFilter[] })[])
                        .map(migrateLegacyView),
                );
            }
            setMounted(true);
        });
    }, []);

    // Persist views when they change
    useEffect(() => {
        if (!mounted) return;
        browser.storage.local.set({ savedViews: views });
    }, [views, mounted]);

    const saveView = useCallback(
        (name: string) => {
            const newView: SavedView = {
                id: generateId(),
                name,
                query,
            };
            setViews((prev) => [...prev, newView]);
            setActiveViewId(newView.id);
        },
        [query],
    );

    const loadView = useCallback(
        (id: string) => {
            const view = views.find((v) => v.id === id);
            if (view) {
                setQuery(view.query);
                setActiveViewId(id);
            }
        },
        [views, setQuery],
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
                query: view.query,
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
