import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  type ColumnDef,
  type ColumnResizeMode,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
  type ColumnSizingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useBookmarks } from "@/context/BookmarksContext";
import { useTracking } from "@/context/TrackingContext";
import { computeFrecency } from "@/utils/tracking";
import { faviconURL } from "@/utils/favicon.ts";

type Bookmark = chrome.bookmarks.BookmarkTreeNode;

const cleanLink = (url: string): string => {
  let cleaned = url.replace(/^https?:\/\//i, "");
  cleaned = cleaned.replace(/^www\./i, "");
  return cleaned;
};

const formatDateTime = (date: number | undefined): string => {
  if (!date) return "Unknown";
  const now = Date.now();
  const diff = now - date;
  const minutes = Math.floor(diff / 1000 / 60);
  const hours = Math.floor(diff / 1000 / 60 / 60);
  const days = Math.floor(diff / 1000 / 60 / 60 / 24);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
};

const getPath = (bookmark: Bookmark, allBookmarks: Bookmark[]) => {
  let currentId = bookmark.parentId;
  const path: Bookmark[] = [];
  while (currentId) {
    const folder = allBookmarks.find((b) => b.id === currentId);
    if (!folder) break;
    path.unshift(folder);
    currentId = folder.parentId;
  }
  if (path.length > 2) {
    path.shift();
    path.shift();
  }
  return path.map((node) => node.title).join(" / ");
};

export default function BookmarkTable() {
  const {
    bookmarks: { display: displayBookmarks, all: allBookmarks },
  } = useBookmarks();
  const { stats } = useTracking();

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    icon: true,
    tags: true,
    path: false,
    lastUsed: true,
    created: false,
    visits: true,
    frecency: true,
    score: false,
    lastVisited: false,
  });

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const columnResizeMode: ColumnResizeMode = "onChange";
  const [mounted, setMounted] = useState(false);

  const STORAGE_KEYS = {
    visibility: "tableColumnVisibility",
    sizing: "tableColumnSizing",
  } as const;

  const data = useMemo(() => displayBookmarks, [displayBookmarks]);

  const columns = useMemo<ColumnDef<Bookmark>[]>(() => [
    {
      id: "icon",
      header: "",
      enableSorting: false,
      enableResizing: false,
      cell: (info) => {
        const url = info.row.original.url;
        return (
          <div className="-mx-3 flex items-center justify-center">
            {url
              ? (
                  <img
                    loading="lazy"
                    className="size-4 rounded-sm bg-muted"
                    src={faviconURL(url)}
                    alt=""
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.visibility = "hidden";
                    }}
                  />
                )
              : null}
          </div>
        );
      },
      size: 32,
    },
    {
      id: "title",
      header: "Title",
      accessorFn: (row) => row.title,
      cell: (info) => (
        <div className="truncate font-semibold" title={info.getValue() as string}>
          {info.getValue() as string}
        </div>
      ),
      size: 280,
    },
    {
      id: "url",
      header: "URL",
      accessorFn: (row) => row.url ?? "",
      cell: (info) => {
        const value = info.getValue() as string;
        return (
          <div className="truncate text-primary/80" title={value}>
            {value ? cleanLink(value) : "URL not available"}
          </div>
        );
      },
      size: 260,
    },
    {
      id: "tags",
      header: "Tags",
      accessorFn: (row) => row.title,
      cell: (info) => {
        const value = info.getValue() as string;
        const tags = value.match(/#(\w+)/g)?.map((tag) => tag.slice(1)) ?? [];
        return (
          <div className="truncate">
            {tags.length ? tags.map((tag) => `#${tag}`).join(" ") : "—"}
          </div>
        );
      },
      size: 180,
    },
    {
      id: "path",
      header: "Path",
      accessorFn: (row) => getPath(row, allBookmarks),
      cell: (info) => (
        <div className="truncate text-muted-foreground" title={info.getValue() as string}>
          {info.getValue() as string || "—"}
        </div>
      ),
      size: 220,
    },
    {
      id: "created",
      header: "Created",
      accessorFn: (row) => row.dateAdded ?? 0,
      cell: (info) => (
        <div className="truncate text-muted-foreground">
          {formatDateTime(info.getValue() as number)}
        </div>
      ),
      size: 120,
    },
    {
      id: "lastUsed",
      header: "Last Used",
      accessorFn: (row) => row.dateLastUsed ?? 0,
      cell: (info) => (
        <div className="truncate text-muted-foreground">
          {formatDateTime(info.getValue() as number)}
        </div>
      ),
      size: 120,
    },
    {
      id: "visits",
      header: "Visits",
      accessorFn: (row) => stats[row.id]?.visits ?? 0,
      cell: (info) => (
        <div className="text-right tabular-nums">
          {info.getValue() as number}
        </div>
      ),
      size: 90,
    },
    {
      id: "frecency",
      header: "Frecency",
      accessorFn: (row) =>
        computeFrecency(stats[row.id]?.score ?? 0, stats[row.id]?.lastVisited ?? 0),
      cell: (info) => (
        <div className="text-right tabular-nums">
          {(info.getValue() as number).toFixed(2)}
        </div>
      ),
      size: 110,
    },
    {
      id: "score",
      header: "Score",
      accessorFn: (row) => stats[row.id]?.score ?? 0,
      cell: (info) => (
        <div className="text-right tabular-nums">
          {(info.getValue() as number).toFixed(2)}
        </div>
      ),
      size: 100,
    },
    {
      id: "lastVisited",
      header: "Last Visited",
      accessorFn: (row) => stats[row.id]?.lastVisited ?? 0,
      cell: (info) => (
        <div className="truncate text-muted-foreground">
          {(info.getValue() as number)
            ? new Date(info.getValue() as number).toLocaleString()
            : "—"}
        </div>
      ),
      size: 160,
    },
  ], [allBookmarks, stats]);

  // TanStack Table returns non-memoizable handlers — skipping React Compiler memoization is intentional
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: { columnVisibility, sorting, columnSizing },
    enableColumnResizing: true,
    columnResizeMode,
    onColumnSizingChange: setColumnSizing,
    onColumnVisibilityChange: setColumnVisibility,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const parentRef = useRef<HTMLDivElement | null>(null);
  const isResizingRef = useRef(false);
  const rows = table.getRowModel().rows;
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 8,
  });

  useEffect(() => {
    if (!contextMenu) return;
    const handle = () => setContextMenu(null);
    window.addEventListener("click", handle);
    window.addEventListener("scroll", handle, true);
    return () => {
      window.removeEventListener("click", handle);
      window.removeEventListener("scroll", handle, true);
    };
  }, [contextMenu]);

  useEffect(() => {
    const stopResize = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false;
      }
    };
    window.addEventListener("mouseup", stopResize);
    window.addEventListener("touchend", stopResize);
    return () => {
      window.removeEventListener("mouseup", stopResize);
      window.removeEventListener("touchend", stopResize);
    };
  }, []);

  useEffect(() => {
    browser.storage.local.get([STORAGE_KEYS.visibility, STORAGE_KEYS.sizing]).then((result) => {
      if (result[STORAGE_KEYS.visibility]) {
        setColumnVisibility(result[STORAGE_KEYS.visibility] as VisibilityState);
      }
      if (result[STORAGE_KEYS.sizing]) {
        setColumnSizing(result[STORAGE_KEYS.sizing] as ColumnSizingState);
      }
      setMounted(true);
    });
    // STORAGE_KEYS is a stable const — no need to list its fields as deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mounted) return;
    browser.storage.local.set({
      [STORAGE_KEYS.visibility]: columnVisibility,
      [STORAGE_KEYS.sizing]: columnSizing,
    });
    // STORAGE_KEYS is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnVisibility, columnSizing, mounted]);

  const columnSizes = table.getVisibleLeafColumns().map((col) => col.getSize());
  const gridTemplateColumns = columnSizes.map((size) => `${size}px`).join(" ");

  return (
    <div className="flex h-full flex-col">
      <div ref={parentRef} className="flex-1 overflow-auto">
        <div className="min-w-full">
          <div
            role="table"
            className="w-full"
          >
            <div
              role="rowgroup"
              className="sticky top-0 z-10 border-b border-border bg-background"
              onContextMenu={(event) => {
                event.preventDefault();
                setContextMenu({ x: event.clientX, y: event.clientY });
              }}
            >
              {table.getHeaderGroups().map((headerGroup) => (
                <div
                  role="row"
                  key={headerGroup.id}
                  className="grid text-xs font-semibold text-muted-foreground"
                  style={{ gridTemplateColumns }}
                >
                  {headerGroup.headers.map((header) => {
                    const isSortable = header.column.getCanSort();
                    const sorted = header.column.getIsSorted();
                    return (
                      <div
                        role="columnheader"
                        key={header.id}
                        className={`relative border-r border-border px-3 py-2 last:border-r-0 ${
                          isSortable ? "cursor-pointer select-none" : ""
                        }`}
                        onClick={
                          isSortable
                            ? (event) => {
                              const isResizing =
                                isResizingRef.current ||
                                Boolean(table.getState().columnSizingInfo?.isResizingColumn);
                              if (isResizing) {
                                event.preventDefault();
                                return;
                              }
                              header.column.getToggleSortingHandler()(event);
                            }
                            : undefined
                        }
                      >
                        <div className="flex items-center gap-1">
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                          {sorted === "asc" && <span>▲</span>}
                          {sorted === "desc" && <span>▼</span>}
                        </div>
                        {header.column.getCanResize() && (
                          <div
                            onMouseDown={(event) => {
                              isResizingRef.current = true;
                              header.getResizeHandler()(event);
                            }}
                            onPointerDown={(event) => {
                              isResizingRef.current = true;
                              header.getResizeHandler()(event);
                            }}
                            onTouchStart={(event) => {
                              isResizingRef.current = true;
                              header.getResizeHandler()(event);
                            }}
                            onClick={(event) => event.stopPropagation()}
                            className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize touch-none select-none"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {contextMenu && (
              <div
                className="fixed z-30 w-56 rounded-md border border-border bg-popover p-2"
                style={{ top: contextMenu.y, left: contextMenu.x }}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="px-2 pb-1 text-[10px] tracking-widest text-muted-foreground uppercase">
                  Toggle Columns
                </div>
                {table.getAllLeafColumns().map((column) => (
                  <label
                    key={column.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs hover:bg-muted"
                  >
                    <input
                      type="checkbox"
                      checked={column.getIsVisible()}
                      onChange={column.getToggleVisibilityHandler()}
                    />
                    <span className="flex-1">{column.id}</span>
                  </label>
                ))}
              </div>
            )}

            <div
              role="rowgroup"
              className="relative z-0"
              style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const row = rows[virtualRow.index];
                return (
                  <div
                    role="row"
                    key={row.id}
                    className="absolute inset-x-0 grid border-b border-border text-xs text-foreground hover:bg-muted/40"
                    style={{
                      transform: `translateY(${virtualRow.start}px)`,
                      height: `${virtualRow.size}px`,
                      gridTemplateColumns,
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <div
                        role="cell"
                        key={cell.id}
                        className="border-r border-border px-3 py-2 last:border-r-0"
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
