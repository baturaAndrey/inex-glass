import path from "node:path";

/**
 * Environment shared by the e2e web server (`playwright.config.ts`) and the DB preparation
 * in `e2e/global-setup.ts`, so migrations and the app always hit the same database.
 *
 * Values are test-only placeholders, never real secrets. Every one can be overridden from
 * the shell (CI sets them at job level); see `.env.test.example`.
 */

export const DEFAULT_E2E_PORT = 3100;

/** Local docker-compose test database (created by `docker/postgres/init`). */
export const DEFAULT_E2E_DATABASE_URL =
  "postgresql://dev_user:dev_password@localhost:5432/inex_glass_test";

/** Port of the locally started server. Overridable to avoid clashes with other local servers. */
export const E2E_PORT = Number(process.env.E2E_PORT ?? DEFAULT_E2E_PORT);

/**
 * External stand (staging) under test. When set, no local server is started and the
 * database is not touched.
 */
export const E2E_BASE_URL = process.env.E2E_BASE_URL;

/**
 * Test database URL. `E2E_DATABASE_URL` wins so that a developer's shell `DATABASE_URL`
 * (usually the dev DB) is never picked up by accident; CI sets `DATABASE_URL` to the test DB.
 */
export const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  (process.env.CI ? process.env.DATABASE_URL : undefined) ??
  DEFAULT_E2E_DATABASE_URL;

/**
 * MAX webhook (task 06 admin-redesign): test-only secret and bot nickname. Against an external
 * stand its own secret must be provided as `E2E_MAX_WEBHOOK_SECRET`.
 */
export const E2E_MAX_WEBHOOK_SECRET =
  process.env.E2E_MAX_WEBHOOK_SECRET ?? "e2e-max-webhook-secret-e2e-max-webhook-0000";
export const E2E_MAX_BOT_NAME = process.env.E2E_MAX_BOT_NAME ?? "inex_glass_e2e_bot";

/** Env for `next start` / `payload migrate` / `pnpm seed` during e2e runs. */
export function e2eServerEnv(): Record<string, string> {
  const siteUrl = `http://localhost:${E2E_PORT}`;
  return {
    DATABASE_URL: E2E_DATABASE_URL,
    PAYLOAD_SECRET: process.env.PAYLOAD_SECRET ?? "e2e-payload-secret-e2e-payload-secret-00",
    FORM_HMAC_SECRET: process.env.FORM_HMAC_SECRET ?? "e2e-form-hmac-secret-e2e-form-hmac-0000",
    ORDER_TOKEN_SECRET:
      process.env.ORDER_TOKEN_SECRET ?? "e2e-order-token-secret-e2e-order-token-0",
    // SITE_URL must match the port the server listens on (Payload `serverURL`/`csrf`).
    SITE_URL: siteUrl,
    SITE_ENV: "development",
    JOBS_ENABLED: "false",
    PAYLOAD_DB_PUSH: "false",
    SMTP_HOST: process.env.SMTP_HOST ?? "localhost",
    SMTP_PORT: process.env.SMTP_PORT ?? "1025",
    UPLOADS_DIR: path.join(".data", "e2e", "lead-files"),
    MEDIA_DIR: path.join(".data", "e2e", "media"),
    // Nothing may reach the real MAX API from tests (the bot is shared with another live site).
    // Explicit empty values: `next start` would otherwise load a developer's `.env` token
    // (Next never overrides variables that are already set, even to ""). The base URL points at
    // the discard port as a second guard.
    MAX_ENABLED: "false",
    MAX_BOT_TOKEN: "",
    MAX_INTERCEPT_CHAT_ID: "",
    MAX_API_BASE_URL: "http://127.0.0.1:9",
    MAX_WEBHOOK_SECRET: E2E_MAX_WEBHOOK_SECRET,
    MAX_BOT_NAME: E2E_MAX_BOT_NAME,
  };
}
