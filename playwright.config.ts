import { defineConfig, devices } from "@playwright/test";

// End-to-end tests drive the real app in a browser. They create, edit and
// delete records, so point them at a throwaway database, never production.
// See e2e/README.md for how to set one up.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5173",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
