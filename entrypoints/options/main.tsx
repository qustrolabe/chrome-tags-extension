import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { ThemeProvider } from "@/context/ThemeContext";
import { TagColorProvider } from "@/context/TagColorContext";
import { TrackingProvider } from "@/context/TrackingContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <TagColorProvider>
      <TrackingProvider>
        <App />
      </TrackingProvider>
      </TagColorProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
