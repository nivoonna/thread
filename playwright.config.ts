import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  use: {
    baseURL: "http://127.0.0.1:4173/thread/",
    headless: true,
    launchOptions: {
      executablePath:
        process.env.CHROMIUM_PATH ||
        (!process.env.CI && existsSync("/usr/bin/chromium")
          ? "/usr/bin/chromium"
          : undefined),
      args: ["--no-sandbox"],
    },
    viewport: { width: 1440, height: 1000 },
  },
  webServer: {
    command: "npm run preview -- --port 4173",
    url: "http://127.0.0.1:4173/thread/",
    reuseExistingServer: !process.env.CI,
  },
  reporter: "list",
});
