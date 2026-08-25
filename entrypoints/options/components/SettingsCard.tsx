import React from "react";

export default function SettingsCard({
    title,
    description,
    children,
}: {
    title: string;
    description?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm duration-300">
            <div className="mb-4">
                <h3 className="text-lg font-bold">{title}</h3>
                {description && (
                    <p className="mt-1 text-sm text-muted-foreground">
                        {description}
                    </p>
                )}
            </div>
            {children}
        </div>
    );
}
