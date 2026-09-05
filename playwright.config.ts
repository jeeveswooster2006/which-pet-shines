import { defineConfig, devices } from "@playwright/test";

// End-to-end tests for the main user journeys. Requires a running Postgres
// with migrations + seed data applied (see README "Testing"). Starts the app
// itself via `webServer` unless one is already running on PORT.
const PORT = process.env.E2E_PORT || "3200";
const baseURL = `http://localhost:${PORT}`;

// This repo pins its own @playwright/test version, which may not match
// whatever browser build happens to be preinstalled in a given environment.
// If PLAYWRIGHT_CHROMIUM_PATH is set (e.g. to a preinstalled browser), reuse
// it instead of requiring a fresh `npx playwright install` download.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
    launchOptions: executablePath ? { executablePath } : undefined,
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      },
    },
  ],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
