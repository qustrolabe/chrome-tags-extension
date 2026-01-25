import {
    AiOutlineMenu,
    AiOutlineMoon,
    AiOutlineSetting,
    AiOutlineSun,
} from "react-icons/ai";
import { Popover } from "radix-ui";

import { useTheme } from "@/context/ThemeContext";

export default function ControlMenu() {
    const { theme, setTheme } = useTheme();

    const openSettings = () => {
        browser.runtime.openOptionsPage();
    };

    const THEME_OPTIONS = [
        { id: "light", icon: AiOutlineSun, title: "Light Mode" },
        { id: "dark", icon: AiOutlineMoon, title: "Dark Mode" },
    ] as const;

    return (
        <Popover.Root>
            <Popover.Trigger className="p-2 hover:bg-muted rounded-md transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <AiOutlineMenu className="w-5 h-5" />
            </Popover.Trigger>

            <Popover.Portal>
                <Popover.Content
                    className="mr-4 mt-2 outline-none animate-in fade-in zoom-in-95 duration-100"
                    align="end"
                    side="bottom"
                    sideOffset={5}
                >
                    <div className="flex flex-col w-52 bg-popover p-1.5 rounded-xl shadow-lg border border-border z-50">
                        <div className="flex flex-col gap-0.5 mb-2">
                            <button
                                onClick={openSettings}
                                className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg hover:bg-muted text-left transition-colors cursor-pointer"
                            >
                                <AiOutlineSetting className="w-4 h-4" />
                                <span>Settings</span>
                            </button>
                        </div>

                        <div className="h-px bg-border my-1 mx-1 opacity-50" />

                        <div className="flex items-center justify-between px-2 py-1.5">
                            <span className="text-xs font-medium text-muted-foreground ml-1">
                                Appearance
                            </span>
                            <div className="flex gap-1 bg-muted/50 p-1 rounded-lg">
                                {THEME_OPTIONS.map((
                                    { id, icon: Icon, title },
                                ) => (
                                    <button
                                        key={id}
                                        className={`p-1.5 rounded-md transition-all cursor-pointer ${
                                            theme === id
                                                ? "bg-background shadow-sm text-primary"
                                                : "hover:bg-background/40 text-muted-foreground"
                                        }`}
                                        onClick={() => setTheme(id as any)}
                                        title={title}
                                    >
                                        <Icon className="w-4 h-4" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}
