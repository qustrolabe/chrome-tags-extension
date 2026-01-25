import React from "react";
import { AiOutlineMoon, AiOutlineSun } from "react-icons/ai";
import { Theme } from "@/context/ThemeContext";
import SettingsCard from "./SettingsCard";

interface GeneralTabProps {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

export default function GeneralTab({ theme, setTheme }: GeneralTabProps) {
    return (
        <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-2xl font-bold mb-2">General</h2>
                <p className="text-muted-foreground">
                    Manage your extension's core behavior and appearance.
                </p>
            </div>

            <div className="grid gap-6">
                <SettingsCard
                    title="Theme"
                    description="Switch between light and dark modes."
                >
                    <div className="flex gap-4">
                        <button
                            onClick={() => setTheme("light")}
                            className={`flex-1 group relative p-4 rounded-xl border-2 transition-all cursor-pointer ${
                                theme === "light"
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-muted-foreground/30"
                            }`}
                        >
                            <div className="aspect-video mb-3 rounded-lg bg-white border border-neutral-200 flex items-center justify-center">
                                <AiOutlineSun className="w-8 h-8 text-yellow-500" />
                            </div>
                            <span className="font-medium text-sm">
                                Light Mode
                            </span>
                            {theme === "light" && (
                                <div className="absolute top-2 right-2 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center scale-90">
                                    <AiOutlineCheck className="w-3 h-3" />
                                </div>
                            )}
                        </button>

                        <button
                            onClick={() => setTheme("dark")}
                            className={`flex-1 group relative p-4 rounded-xl border-2 transition-all cursor-pointer ${
                                theme === "dark"
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-muted-foreground/30"
                            }`}
                        >
                            <div className="aspect-video mb-3 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                                <AiOutlineMoon className="w-8 h-8 text-primary" />
                            </div>
                            <span className="font-medium text-sm">
                                Dark Mode
                            </span>
                            {theme === "dark" && (
                                <div className="absolute top-2 right-2 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center scale-90">
                                    <AiOutlineCheck className="w-3 h-3" />
                                </div>
                            )}
                        </button>
                    </div>
                </SettingsCard>
            </div>
        </section>
    );
}

function AiOutlineCheck({ className }: { className?: string }) {
    return (
        <svg
            stroke="currentColor"
            fill="currentColor"
            strokeWidth="0"
            viewBox="0 0 1024 1024"
            className={className}
            height="1em"
            width="1em"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path d="M912 190h-69.9c-9.8 0-19.1 4.5-25.1 12.2L404.7 724.5 207 474a32 32 0 0 0-25.1-12.2H112c-6.7 0-10.4 7.7-6.3 12.9l273.9 347c12.8 16.2 37.4 16.2 50.3 0l488.4-618.9c4.1-5.1.4-12.8-6.3-12.8z">
            </path>
        </svg>
    );
}
