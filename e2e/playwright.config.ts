import { defineConfig, devices } from "@playwright/test";

// End-to-end tests run against the real stack: Vite, the API and the seeded dev database.
// The database is not started here — `docker compose up -d db` and `npm run seed` first.
export default defineConfig({
  testDir: "./tests",
  // Tests share one database: one after another keeps the admin grid predictable.
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5173",
    // The interface follows the browser language: pin it, so the selectors read English.
    locale: "en-US",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Reuses the dev servers when they already run, starts them otherwise.
  webServer: [
    {
      command: "npm run dev",
      cwd: "../backend",
      url: "http://localhost:3000/api/health",
      reuseExistingServer: true,
    },
    {
      command: "npm run dev",
      cwd: "../frontend",
      url: "http://localhost:5173",
      reuseExistingServer: true,
    },
  ],
});
