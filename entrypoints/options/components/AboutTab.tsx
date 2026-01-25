import React from "react";
import SettingsCard from "./SettingsCard";

export default function AboutTab() {
    return (
        <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-2xl font-bold mb-2">About</h2>
                <p className="text-muted-foreground">
                    Chrome Tags Extension version {__APP_VERSION__}
                </p>
            </div>

            <div className="grid gap-6">
                <SettingsCard title="Project Info">
                    <div className="space-y-4">
                        <p className="text-sm leading-relaxed">
                            A powerful bookmarks manager that focuses on tags
                            and efficient filtering. Designed to bridge the gap
                            between simple browser bookmarks and full-blown
                            second brain applications.
                        </p>
                        <div className="flex gap-4 pt-2">
                            <a
                                href="https://github.com/qustrolabe/chrome-tags-extension"
                                target="_blank"
                                rel="noreferrer"
                                className="px-4 py-2 bg-muted hover:bg-muted-foreground/10 rounded-lg text-sm font-medium transition-colors"
                            >
                                GitHub Repository
                            </a>
                        </div>
                    </div>
                </SettingsCard>
            </div>
        </section>
    );
}
