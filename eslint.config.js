import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import tailwindcss from "eslint-plugin-tailwindcss";
import globals from "globals";
import { fileURLToPath } from "node:url";

const tailwindConfig = fileURLToPath(new URL("./assets/global.css", import.meta.url));

export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      ".output/**",
      ".wxt/**",
      "example-searchbar/**",
      "eslint.config.js",
    ],
  },
  {
    settings: {
      tailwindcss: {
        cssConfigPath: tailwindConfig,
      },
    },
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.serviceworker,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      tailwindcss,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // empty catch blocks are intentional for best-effort storage/bookmarks fallbacks
      "no-empty": ["error", { allowEmptyCatch: true }],
      // browser polyfill and chrome.* APIs legitimately need `any`
      "@typescript-eslint/no-explicit-any": "off",
      // experimental compiler rules — false positives on mock data and intentional sync effects
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "tailwindcss/enforces-shorthand": "warn",
      "tailwindcss/multiline-annotation-order": "off",
      "tailwindcss/no-arbitrary-value": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },

  {
    // Tailwind classes only appear inside TSX sources
    files: ["**/*.tsx"],
    rules: {
      "tailwindcss/classnames-order": "warn",
      "tailwindcss/no-contradicting-classname": "error",
    },
  },

  {
    files: ["scripts/**", "*.config.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.bun,
      },
    },
  },
);
