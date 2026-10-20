import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:3100";
const repositoryRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const apiURL = "http://127.0.0.1:4001";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL,
    browserName: "chromium",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  ...(process.env.E2E_BASE_URL ? {} : {
    webServer: [
      {
        command: "npm run dev --workspace=@inquiry/api",
        cwd: repositoryRoot,
        url: `${apiURL}/health`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: { API_PORT: "4001", WEB_ORIGIN: baseURL },
      },
      {
        command: "npm run dev --workspace=@inquiry/web -- --port 3100",
        cwd: repositoryRoot,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: { NEXT_E2E: "1", NEXT_PUBLIC_API_URL: apiURL },
      },
    ],
  }),
});
