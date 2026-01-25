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
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="mb-4">
                <h3 className="text-lg font-bold">{title}</h3>
                {description && (
                    <p className="text-sm text-muted-foreground mt-1">
                        {description}
                    </p>
                )}
            </div>
            {children}
        </div>
    );
}
