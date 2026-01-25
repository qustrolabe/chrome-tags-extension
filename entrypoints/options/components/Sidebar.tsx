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
        <aside className="w-64 border-r border-border bg-card/50 backdrop-blur-sm flex flex-col pt-8">
            <div className="px-6 mb-8">
                <h1 className="text-xl font-bold tracking-tight bg-linear-to-br from-primary to-primary/60 bg-clip-text text-transparent">
                    Settings
                </h1>
            </div>

            <nav className="flex-1 px-3 space-y-1">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                                isActive
                                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            }`}
                        >
                            <Icon
                                className={`w-5 h-5 ${
                                    isActive ? "animate-pulse" : ""
                                }`}
                            />
                            {tab.label}
                        </button>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-border">
                <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest px-2 mb-2">
                    Appearance
                </div>
                <div className="flex bg-muted/50 p-1 rounded-xl gap-1">
                    {[
                        { id: "light", icon: AiOutlineSun, label: "Light" },
                        { id: "dark", icon: AiOutlineMoon, label: "Dark" },
                    ].map((t) => (
                        <button
                            key={t.id}
                            onClick={() => onThemeChange(t.id as Theme)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                                theme === t.id
                                    ? "bg-background text-primary shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <t.icon className="w-3.5 h-3.5" />
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>
        </aside>
    );
}
