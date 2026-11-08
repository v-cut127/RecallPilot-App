import { defineConfig, devices } from "@playwright/test";

const inheritedEnv = Object.fromEntries(
  Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined)
);

const sharedEnv = {
  ...inheritedEnv,
  AUTH_PROVIDER: "local",
  EMAIL_PROVIDER: "console",
  STORAGE_DRIVER: "local",
  NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3000",
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 240_000,
  expect: { timeout: 30_000 },
  globalSetup: "./scripts/e2e-setup.ts",
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "npm run dev",
      url: "http://127.0.0.1:3000/api/health",
      timeout: 180_000,
      reuseExistingServer: false,
      env: sharedEnv,
    },
    {
      command: "npm run dev:worker",
      url: "http://127.0.0.1:3101/health",
      timeout: 120_000,
      reuseExistingServer: false,
      env: { ...sharedEnv, WORKER_HEALTH_PORT: "3101" },
    },
  ],
});
