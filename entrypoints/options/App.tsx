import { useState } from "react";
import {
  AiOutlineInfoCircle,
  AiOutlineLayout,
  AiOutlineSetting,
  AiOutlineBarChart,
} from "react-icons/ai";
import { useTheme } from "@/context/ThemeContext";
import { useEffect } from "react";
import { initAccent } from "@/utils/accent.ts";
import Sidebar from "./components/Sidebar";
import GeneralTab from "./components/GeneralTab";
import CardsTab from "./components/CardsTab";
import AboutTab from "./components/AboutTab";
import TrackingTab from "./components/TrackingTab";

type TabId = "general" | "cards" | "tracking" | "about";

export default function App() {
  useEffect(() => {
    initAccent();
  }, []);
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const { theme, setTheme } = useTheme();

  const TABS = [
    { id: "general", label: "General", icon: AiOutlineSetting },
    { id: "cards", label: "Bookmark Cards", icon: AiOutlineLayout },
    { id: "tracking", label: "Tracking", icon: AiOutlineBarChart },
    { id: "about", label: "About", icon: AiOutlineInfoCircle },
  ] as const;

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        theme={theme}
        onThemeChange={setTheme}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto bg-background/50">
        <div className="mx-auto max-w-3xl px-8 py-12">
          {activeTab === "general" && (
            <GeneralTab theme={theme} setTheme={setTheme} />
          )}

          {activeTab === "cards" && <CardsTab />}

          {activeTab === "tracking" && <TrackingTab />}

          {activeTab === "about" && <AboutTab />}
        </div>
      </main>
    </div>
  );
}
