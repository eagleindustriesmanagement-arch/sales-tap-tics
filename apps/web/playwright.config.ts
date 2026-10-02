import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests for the rep and manager flows (spec 21.1). They run against a real Postgres seeded with the
 * demo tenant (private window 0), the dev server with on-screen login codes, and the offline customer.
 */
const port = 3200;
export const OUTBOX = `${process.env.TMPDIR ?? "/tmp"}/taptics-e2e-outbox.jsonl`;
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  timeout: 120_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${port}`, ...devices["Pixel 7"], trace: "retain-on-failure" },
  // The accessibility audit runs after the flows, which expect first sign-ins (consent) to happen in them.
  projects: [
    { name: "flows", testMatch: /flows\.spec\.ts/ },
    { name: "a11y", testMatch: /a11y\.spec\.ts/, dependencies: ["flows"] },
  ],
  // The production build, so the tests cover what ships. Login codes go to a file outbox the tests read.
  webServer: {
    command: `pnpm exec next build --webpack && pnpm exec next start -p ${port}`,
    port,
    timeout: 300_000,
    reuseExistingServer: false,
    env: {
      TAPTICS_CODE_OUTBOX: OUTBOX,
      TAPTICS_SECRET: "e2e-only-secret-0123456789abcdef0123456789",
      TAPTICS_OFFLINE: "1",
      NEXT_TELEMETRY_DISABLED: "1",
      DATABASE_URL: process.env.DATABASE_URL ?? "",
    },
  },
});
