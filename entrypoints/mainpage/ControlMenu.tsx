import {
    AiOutlineExport,
    AiOutlineInfoCircle,
    AiOutlineMenu,
    AiOutlineMoon,
    AiOutlineSetting,
    AiOutlineSun,
    AiOutlineThunderbolt,
} from "react-icons/ai";
import { CgDarkMode } from "react-icons/cg";

import { GiDeathSkull } from "react-icons/gi";
import { Popover } from "radix-ui";

import { useTheme } from "@/context/ThemeContext";

const MENU_ITEMS = [
    { icon: AiOutlineSetting, label: "Settings" },
    { icon: AiOutlineExport, label: "Export Data" },
    { icon: AiOutlineInfoCircle, label: "About" },
];

const THEME_OPTIONS = [
    { id: "light", icon: AiOutlineSun, title: "Light Mode" },
    { id: "dark", icon: AiOutlineMoon, title: "Dark Mode" },
    { id: "brutalism", icon: AiOutlineThunderbolt, title: "Brutalism Mode" },
    { id: "brutalism-dark", icon: CgDarkMode, title: "Brutalism Dark Mode" },
] as const;

export default function ControlMenu() {
    const { theme, setTheme } = useTheme();

    return (
        <Popover.Root>
            <Popover.Trigger className="p-2 hover:bg-muted rounded-md transition-colors cursor-pointer">
                <AiOutlineMenu className="w-5 h-5" />
            </Popover.Trigger>

            <Popover.Portal>
                <Popover.Content
                    className="mr-4 mt-2"
                    align="end"
                    side="bottom"
                    sideOffset={5}
                    asChild
                >
                    <div className="flex flex-col w-48 bg-popover p-1.5 rounded-lg shadow-sm border border-border z-50">
                        <div className="flex flex-col gap-0.5 mb-2">
                            {MENU_ITEMS.map(({ icon: Icon, label }) => (
                                <button
                                    key={label}
                                    className="flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted text-left transition-colors"
                                >
                                    <Icon /> {label}
                                </button>
                            ))}
                        </div>

                        <div className="h-px bg-border my-1 mx-1" />

                        <div className="flex items-center justify-between px-1 py-1">
                            <span className="text-xs text-muted-foreground ml-1">
                                Theme
                            </span>
                            <div className="flex gap-1 bg-muted/50 p-1 rounded-md brutalism:rounded-none!">
                                {THEME_OPTIONS.map((
                                    { id, icon: Icon, title },
                                ) => (
                                    <button
                                        key={id}
                                        className={`p-1.5 rounded-sm brutalism:rounded-none!  transition-all ${
                                            theme === id
                                                ? "bg-background shadow-sm text-primary"
                                                : "hover:bg-background/50 text-muted-foreground"
                                        }`}
                                        onClick={() => setTheme(id)}
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
