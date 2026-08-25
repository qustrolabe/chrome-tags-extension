import React from "react";
import { AiOutlineMoon, AiOutlineSun } from "react-icons/ai";
import { Theme } from "@/context/ThemeContext";

interface SidebarProps {
    tabs: readonly { id: string; label: string; icon: React.ElementType }[];
    activeTab: string;
    onTabChange: (id: any) => void;
    theme: Theme;
    onThemeChange: (theme: Theme) => void;
}

export default function Sidebar({
    tabs,
    activeTab,
    onTabChange,
    theme,
    onThemeChange,
}: SidebarProps) {
    return (
        <aside className="flex w-64 flex-col border-r border-border bg-card/50 pt-8 backdrop-blur-sm">
            <div className="mb-8 px-6">
                <h1 className="bg-linear-to-br from-primary to-primary/60 bg-clip-text text-xl font-bold tracking-tight text-transparent">
                    Settings
                </h1>
            </div>

            <nav className="flex-1 space-y-1 px-3">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                                isActive
                                    ? "scale-[1.02] bg-primary text-primary-foreground shadow-md shadow-primary/20"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            }`}
                        >
                            <Icon
                                className={`size-5 ${
                                    isActive ? "animate-pulse" : ""
                                }`}
                            />
                            {tab.label}
                        </button>
                    );
                })}
            </nav>

            <div className="border-t border-border p-4">
                <div className="mb-2 px-2 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                    Appearance
                </div>
                <div className="flex gap-1 rounded-xl bg-muted/50 p-1">
                    {[
                        { id: "light", icon: AiOutlineSun, label: "Light" },
                        { id: "dark", icon: AiOutlineMoon, label: "Dark" },
                    ].map((t) => (
                        <button
                            key={t.id}
                            onClick={() => onThemeChange(t.id as Theme)}
                            className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-all ${
                                theme === t.id
                                    ? "bg-background text-primary shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <t.icon className="size-3.5" />
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>
        </aside>
    );
}
