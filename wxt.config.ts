import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],

  vite: () => ({
    plugins: [tailwindcss()],
  }),
  webExt: {
    disabled: true,
  },
  manifest: {
    name: "Bookmarks Tags Manager",
    action: {
      "default_title": "Open Main Page",
    },
    permissions: ["bookmarks", "storage", "favicon"],
    author: { email: "qustrolabe@gmail.com" },
  },
});
