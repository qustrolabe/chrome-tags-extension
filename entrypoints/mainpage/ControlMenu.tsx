import {
    AiOutlineMenu,
    AiOutlineMoon,
    AiOutlineSetting,
    AiOutlineSun,
} from "react-icons/ai";
import { Popover } from "radix-ui";

import { useTheme } from "@/context/ThemeContext";

export default function ControlMenu(
    { onOpenSettings }: { onOpenSettings?: () => void },
) {
    const { theme, setTheme } = useTheme();

    const openSettings = () => {
        if (onOpenSettings) onOpenSettings();
        else browser.runtime.openOptionsPage();
    };

    const THEME_OPTIONS = [
        { id: "light", icon: AiOutlineSun, title: "Light Mode" },
        { id: "dark", icon: AiOutlineMoon, title: "Dark Mode" },
    ] as const;

    return (
        <Popover.Root>
            <Popover.Trigger className="cursor-pointer rounded-md p-2 transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
                <AiOutlineMenu className="size-5" />
            </Popover.Trigger>

            <Popover.Portal>
                <Popover.Content
                    className="animate-in fade-in zoom-in-95 mt-2 mr-4 duration-100 outline-none"
                    align="end"
                    side="bottom"
                    sideOffset={5}
                >
                    <div className="z-50 flex w-52 flex-col rounded-xl border border-border bg-popover p-1.5">
                        <div className="mb-2 flex flex-col gap-0.5">
                            <button
                                onClick={openSettings}
                                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-muted"
                            >
                                <AiOutlineSetting className="size-4" />
                                <span>Settings</span>
                            </button>
                        </div>

                        <div className="m-1 h-px bg-border opacity-50" />

                        <div className="flex items-center justify-between px-2 py-1.5">
                            <span className="ml-1 text-xs font-medium text-muted-foreground">
                                Appearance
                            </span>
                            <div className="flex gap-1 rounded-lg bg-muted/50 p-1">
                                {THEME_OPTIONS.map((
                                    { id, icon: Icon, title },
                                ) => (
                                    <button
                                        key={id}
                                        className={`cursor-pointer rounded-md p-1.5 transition-all ${
                                            theme === id
                                                ? "bg-background text-primary shadow-sm"
                                                : "text-muted-foreground hover:bg-background/40"
                                        }`}
                                        onClick={() => setTheme(id as any)}
                                        title={title}
                                    >
                                        <Icon className="size-4" />
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
