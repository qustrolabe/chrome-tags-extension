import React, { useRef, useState } from "react";
import {
    AiOutlineCloudDownload,
    AiOutlineCloudUpload,
} from "react-icons/ai";
import {
    applySettingsBackup,
    applyTrackingBackup,
    collectBackup,
    parseBackup,
    serializeBackup,
    type BackupScope,
} from "@/utils/backup.ts";
import { APP_VERSION } from "@/utils/version.ts";
import SettingsCard from "./SettingsCard";

type Status = { tone: "error" | "ok"; text: string; offerReload?: boolean } | null;

const filename = (scope: BackupScope) =>
    `bookmark-tags-${scope}-${new Date().toISOString().slice(0, 10)}.json`;

/**
 * Save text as a file. The `downloads` permission is not requested, so an
 * object URL on a synthetic anchor is used instead.
 */
const download = (name: string, text: string) => {
    const url = URL.createObjectURL(
        new Blob([text], { type: "application/json" }),
    );

    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = name;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    // Revoking in the same tick can cancel a download that has not started.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
};

function BackupCard({
    scope,
    title,
    description,
    status,
    onExport,
    onImport,
}: {
    scope: BackupScope;
    title: string;
    description: string;
    status: Status;
    onExport: (scope: BackupScope) => void;
    onImport: (scope: BackupScope, file: File) => void;
}) {
    const input = useRef<HTMLInputElement>(null);

    return (
        <SettingsCard title={title} description={description}>
            <div className="flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    onClick={() => onExport(scope)}
                    className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-secondary/80"
                >
                    <AiOutlineCloudDownload className="size-4" />
                    Export
                </button>
                <button
                    type="button"
                    onClick={() => input.current?.click()}
                    className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-muted"
                >
                    <AiOutlineCloudUpload className="size-4" />
                    Import
                </button>
                <input
                    ref={input}
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={(event) => {
                        const file = event.target.files?.[0];

                        // Allow re-picking the same file after a failed import.
                        event.target.value = "";

                        if (file) onImport(scope, file);
                    }}
                />
            </div>

            {status && (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                    <p
                        className={`text-xs ${
                            status.tone === "error"
                                ? "text-destructive"
                                : "text-muted-foreground"
                        }`}
                    >
                        {status.text}
                    </p>

                    {status.offerReload && (
                        <button
                            type="button"
                            onClick={() => browser.runtime.reload()}
                            className="cursor-pointer rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/80"
                        >
                            Reload now
                        </button>
                    )}
                </div>
            )}
        </SettingsCard>
    );
}

export default function DataTab() {
    const [status, setStatus] = useState<Record<BackupScope, Status>>({
        settings: null,
        tracking: null,
    });

    const report = (scope: BackupScope, next: Status) =>
        setStatus((prev) => ({ ...prev, [scope]: next }));

    const handleExport = async (scope: BackupScope) => {
        download(filename(scope), serializeBackup(await collectBackup(scope, APP_VERSION)));
        report(scope, { tone: "ok", text: `Saved ${filename(scope)}` });
    };

    const handleImport = async (scope: BackupScope, file: File) => {
        const parsed = parseBackup(await file.text());

        if (!parsed) {
            report(scope, {
                tone: "error",
                text: "That file is not a backup this extension wrote.",
            });

            return;
        }

        if (parsed.scope !== scope) {
            report(scope, {
                tone: "error",
                text: `That is a ${parsed.scope} backup — import it from the other card.`,
            });

            return;
        }

        if (parsed.scope === "settings") {
            await applySettingsBackup(parsed.data);

            // Pages read settings once on mount, so they only apply on reload.
            report(scope, {
                tone: "ok",
                text: "Settings restored.",
                offerReload: true,
            });

            return;
        }

        await applyTrackingBackup(parsed.data);
        report(scope, {
            tone: "ok",
            text: `Restored ${Object.keys(parsed.data.trackingStats).length} tracked bookmarks.`,
        });
    };

    return (
        <section className="animate-in fade-in slide-in-from-bottom-4 space-y-8 duration-500">
            <div>
                <h2 className="mb-2 text-2xl font-bold">Data</h2>
                <p className="text-muted-foreground">
                    Export or restore the settings this extension keeps in
                    browser storage.
                </p>
            </div>

            <div className="grid gap-6">
                <BackupCard
                    scope="settings"
                    title="Settings"
                    description="Theme, accent, tag colors, sidebar, sorting, saved views, table layout and the last used folder. Import applies after a reload."
                    status={status.settings}
                    onExport={handleExport}
                    onImport={handleImport}
                />

                <BackupCard
                    scope="tracking"
                    title="Tracking data"
                    description="Visit counts, frecency scores and last visited times, plus the tracking options. Applies without a reload."
                    status={status.tracking}
                    onExport={handleExport}
                    onImport={handleImport}
                />

                <p className="text-xs text-muted-foreground">
                    Tags are stored inside bookmark titles, so they are not part
                    of a backup — the extension never downloads or rewrites your
                    bookmarks.
                </p>
            </div>
        </section>
    );
}
