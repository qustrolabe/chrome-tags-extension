import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],

  vite: () => ({
    plugins: [tailwindcss()],
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    },
  }),
  webExt: {
    disabled: true,
  },
  manifest: ({ browser }) => ({
    name: "Bookmarks Tags Manager",
    action: {
      "default_title": "Open Main Page",
    },
    permissions: browser === "firefox"
      ? ["bookmarks", "storage", "tabs"]
      : ["bookmarks", "storage", "favicon", "tabs"],
    author: browser === "firefox"
      ? "qustrolabe@gmail.com"
      : { email: "qustrolabe@gmail.com" },
    browser_specific_settings: {
      gecko: {
        id: "bookmarks-tags-manager@qustrolabe.com",
        strict_min_version: "116",
      },
    },
  }),
});
