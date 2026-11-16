import { defineConfig } from "@playwright/test";

// The cross-site check (e2e/cross-site). Needs a running VIT-RIN API (VITRIN_API_URL, VITRIN_API_LOG,
// VITRIN_ADMIN_PHONE) and the CDN build (`npm run build`); the CI job provides both.
export default defineConfig({
  testDir: "./e2e/cross-site",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,
  use: { browserName: "chromium" },
});
