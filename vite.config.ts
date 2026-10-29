import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { execFileSync } from "node:child_process";
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "build-version",
      generateBundle() {
        const commit =
          process.env.GITHUB_SHA ||
          execFileSync("git", ["rev-parse", "HEAD"], {
            encoding: "utf8",
          }).trim();
        this.emitFile({
          type: "asset",
          fileName: "version.json",
          source: JSON.stringify({ commit, builtAt: new Date().toISOString() }),
        });
      },
    },
  ],
  base: "/thread/",
  build: {
    rollupOptions: { output: { manualChunks: { charts: ["recharts"] } } },
  },
});
