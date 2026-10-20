import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:3100";
const repositoryRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const apiURL = "http://127.0.0.1:4001";
const e2eDatabaseUrl = process.env.E2E_DATABASE_URL || "postgres://inquiry_app:inquiry_local@localhost:5433/inquiry_e2e";
const e2eDatabaseName = new URL(e2eDatabaseUrl).pathname.slice(1).toLowerCase();
const developmentDatabaseUrl = process.env.DATABASE_URL;

if (["inquiry_manager", "inquiry_test"].includes(e2eDatabaseName)
  || (developmentDatabaseUrl && new URL(developmentDatabaseUrl).href === new URL(e2eDatabaseUrl).href)) {
  throw new Error("Playwright requires a dedicated E2E database. Do not use the development or integration-test database.");
}

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
        reuseExistingServer: false,
        timeout: 120_000,
        env: { API_PORT: "4001", WEB_ORIGIN: baseURL, DATABASE_URL: e2eDatabaseUrl },
      },
      {
        command: "npm run dev --workspace=@inquiry/web -- --port 3100",
        cwd: repositoryRoot,
        url: baseURL,
        reuseExistingServer: false,
        timeout: 120_000,
        env: { NEXT_E2E: "1", NEXT_PUBLIC_API_URL: apiURL },
      },
    ],
  }),
});
