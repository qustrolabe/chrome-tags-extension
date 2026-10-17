import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";

const pkg = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
);

/**
 * Absolute path to a repo-relative file, for bundler aliases.
 * Mirrors the `@queryfield/*` entries in `tsconfig.json`.
 */
const repoPath = (relative: string) =>
  fileURLToPath(new URL(relative, import.meta.url));

const version = process.env.npm_package_version ?? pkg.version;

/** Short hash of the build commit, shown next to the version in dev. */
const gitCommit = (() => {
  try {
    return execSync("git rev-parse --short HEAD", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch {
    return ""; // not a git checkout — no hash to show
  }
})();

/** Amber-tagged artwork used by dev builds only. */
const DEV_ICONS = {
  16: "dev-icon/16.png",
  32: "dev-icon/32.png",
  48: "dev-icon/48.png",
};

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],

  vite: () => ({
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        // Mirrors the `@queryfield/*` entries in tsconfig.json. They are
        // exact-specifier aliases: the packages are imported by barrel only.
        "@queryfield/core": repoPath(
          "./queryfield/packages/core/src/index.ts",
        ),
        "@queryfield/react": repoPath(
          "./queryfield/packages/react/src/index.ts",
        ),
      },
    },
    define: {
      __APP_VERSION__: JSON.stringify(version),
      __GIT_COMMIT__: JSON.stringify(gitCommit),
    },
  }),
  webExt: {
    disabled: true,
  },
  hooks: {
    // Keep dev artwork out of release zips.
    "build:publicAssets": (wxt, files) => {
      if (wxt.config.mode !== "production") return;

      for (let i = files.length - 1; i >= 0; i--) {
        // relativeDest is platform-separated, so normalize before matching.
        const dest = files[i]?.relativeDest.replace(/\\/g, "/");

        if (dest?.startsWith("dev-icon/")) files.splice(i, 1);
      }
    },
  },
  manifest: ({ browser, mode }) => {
    // Release builds must stay unmarked; only `wxt` (dev) gets dev marks.
    const isDev = mode !== "production";
    const suffix = isDev ? " (DEV)" : "";

    return {
      name: `Bookmarks Tags Manager${suffix}`,
  ...(isDev && {
    version_name: `${version}-dev`,
    // Dev builds get their own artwork so a dev install is never
    // confused with the installed release build.
    icons: DEV_ICONS,
  }),
      action: {
        default_title: `Open Main Page${suffix}`,
        ...(isDev && { default_icon: DEV_ICONS }),
      },
      permissions: browser === "firefox"
        ? ["bookmarks", "storage", "tabs", "activeTab", "contextMenus"]
        : ["bookmarks", "storage", "favicon", "tabs", "activeTab", "contextMenus"],
      commands: {
        "bookmark-this-page": {
          description: `Bookmark this page${suffix}`,
          suggested_key: {
            default: "Ctrl+Shift+S",
            mac: "Command+Shift+S",
          },
        },
      },
      author: browser === "firefox"
        ? "qustrolabe@gmail.com"
        : { email: "qustrolabe@gmail.com" },
      browser_specific_settings: {
        gecko: {
          id: "bookmarks-tags-manager@qustrolabe.com",
          strict_min_version: "116",
        },
      },
    };
  },
});
