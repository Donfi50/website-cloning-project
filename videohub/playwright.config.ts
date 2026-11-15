import { defineConfig } from "@playwright/test";

// Load .env so the test can talk to the same database as the app (Node 20.12+).
try { process.loadEnvFile(".env"); } catch {}

// Start the app (npm run dev), the worker (npm run worker), docker compose and ffmpeg first. Then: npx playwright test
export default defineConfig({
  testDir: "./e2e",
  timeout: 180_000,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.APP_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // Playwright's bundled Chromium has no H.264 support, so HLS playback fails there.
    // Real Google Chrome plays it, so test with the installed Chrome.
    channel: "chrome",
  },
});
