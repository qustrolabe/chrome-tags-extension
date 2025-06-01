import { defineConfig } from "vite";
import deno from "@deno/vite-plugin";
import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  server: { port: 3000 },
  preview: { port: 3000 },
  plugins: [
    deno(),
    tailwindcss(),
    preact({
      prerender: {
        enabled: true,
        renderTarget: "#app",
        additionalPrerenderRoutes: ["/", "/options"],
      },
    }),
  ],
});
