import { useState } from "react";
import {
  AiOutlineInfoCircle,
  AiOutlineLayout,
  AiOutlineSetting,
} from "react-icons/ai";
import { useTheme } from "@/context/ThemeContext";
import Sidebar from "./components/Sidebar";
import GeneralTab from "./components/GeneralTab";
import CardsTab from "./components/CardsTab";
import AboutTab from "./components/AboutTab";

type TabId = "general" | "cards" | "about";

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const { theme, setTheme } = useTheme();

  const TABS = [
    { id: "general", label: "General", icon: AiOutlineSetting },
    { id: "cards", label: "Bookmark Cards", icon: AiOutlineLayout },
    { id: "about", label: "About", icon: AiOutlineInfoCircle },
  ] as const;

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        theme={theme}
        onThemeChange={setTheme}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto bg-background/50">
        <div className="max-w-3xl mx-auto px-8 py-12">
          {activeTab === "general" && (
            <GeneralTab theme={theme} setTheme={setTheme} />
          )}

          {activeTab === "cards" && <CardsTab />}

          {activeTab === "about" && <AboutTab />}
        </div>
      </main>
    </div>
  );
}
