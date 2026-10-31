/**
 * Playwright e2e config: Chromium only, three widths (375 / 1366 / 1920).
 *
 * Usage
 * - Local (after `docker compose up -d`): `pnpm test:e2e` — builds the app, prepares the
 *   `inex_glass_test` database (migrations + full seed, see `e2e/global-setup.ts`) and serves
 *   it with `next start` on port 3100 (`E2E_PORT` overrides the port).
 * - Skip the build (reuse an existing `.next`, as CI does after its own build step):
 *   `E2E_SKIP_BUILD=1 pnpm test:e2e`.
 * - Against staging (no local server, database untouched):
 *   `E2E_BASE_URL=https://staging.example.ru pnpm test:e2e`.
 * - Skip DB preparation only: `E2E_SKIP_DB=1`. Clean database: `pnpm test:db:reset`.
 *
 * Screenshot baselines policy (v1)
 * - Baselines (`toHaveScreenshot`) live next to specs in `e2e/**\/*-snapshots/` and their
 *   names carry the project and platform (see `snapshotPathTemplate`).
 * - Only `-linux` baselines are committed: they are generated in CI or in the Playwright
 *   Docker image (`mcr.microsoft.com/playwright`) with `--update-snapshots`. Local Windows /
 *   macOS baselines are git-ignored and serve as personal references only.
 */
import { defineConfig, devices } from "@playwright/test";
import { E2E_BASE_URL, E2E_PORT, e2eServerEnv } from "./e2e/helpers/env";
import { VIEWPORTS } from "./e2e/helpers/viewports";

const isCI = !!process.env.CI;

/**
 * Staging basic auth (`STAGING_BASIC_AUTH=user:pass`, split at the first colon). Playwright sends
 * the credentials only in answer to a 401 challenge, so the JWT `Authorization` headers of the
 * admin API calls (`/api` is outside the basic auth of `proxy.ts`) stay untouched.
 */
const basicAuth = process.env.STAGING_BASIC_AUTH;
const basicAuthColon = basicAuth?.indexOf(":") ?? -1;
const httpCredentials =
  basicAuth && basicAuthColon > 0
    ? {
        username: basicAuth.slice(0, basicAuthColon),
        password: basicAuth.slice(basicAuthColon + 1),
      }
    : undefined;
const localURL = `http://localhost:${E2E_PORT}`;
const startCommand = `pnpm exec next start -p ${E2E_PORT}`;

/** Next build + migrations + first compile of the admin can take a while on cold CI runners. */
const WEB_SERVER_TIMEOUT_MS = 300_000;

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [["list"], ["html", { open: "never" }]] : "list",
  globalSetup: "./e2e/global-setup.ts",
  snapshotPathTemplate:
    "{testDir}/{testFileDir}/{testFileName}-snapshots/{arg}-{projectName}-{platform}{ext}",
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: "disabled" },
  },
  use: {
    baseURL: E2E_BASE_URL ?? localURL,
    locale: "ru-RU",
    timezoneId: "Asia/Yekaterinburg",
    trace: "retain-on-failure",
    ...(httpCredentials ? { httpCredentials } : {}),
  },
  projects: [
    {
      name: VIEWPORTS.mobile.name,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: VIEWPORTS.mobile.width, height: VIEWPORTS.mobile.height },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: VIEWPORTS.laptop.name,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: VIEWPORTS.laptop.width, height: VIEWPORTS.laptop.height },
      },
    },
    {
      name: VIEWPORTS.desktop.name,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: VIEWPORTS.desktop.width, height: VIEWPORTS.desktop.height },
      },
    },
  ],
  // An external stand is tested as is; otherwise build (unless skipped) and serve locally.
  ...(E2E_BASE_URL
    ? {}
    : {
        webServer: {
          command: process.env.E2E_SKIP_BUILD ? startCommand : `pnpm build && ${startCommand}`,
          // Playwright starts the web server BEFORE globalSetup. Probe a static file so the
          // readiness check never initializes Payload (whose prodMigrations would otherwise
          // race with `payload migrate` in global-setup).
          url: `${localURL}/favicon.ico`,
          timeout: WEB_SERVER_TIMEOUT_MS,
          reuseExistingServer: !isCI,
          env: e2eServerEnv(),
          stdout: "pipe",
          stderr: "pipe",
        },
      }),
});
