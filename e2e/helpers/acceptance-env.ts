import os from "node:os";
import path from "node:path";
import { test } from "@playwright/test";
import { MAILPIT_URL } from "./mailpit";
import { VIEWPORTS } from "./viewports";
import type { TestInfo } from "@playwright/test";

/**
 * Environment of the acceptance suite (`e2e/acceptance/*`, task 42). The same specs run against
 * the local production-like stand and a real staging; everything stand-specific comes from env:
 *
 * - `E2E_BASE_URL` — the stand (Playwright `baseURL`).
 * - `ACCEPTANCE_EXPECT_ENV` — `staging` | `production` | `development` (default `production`,
 *   the local stand): staging expects basic auth + noindex everywhere, production expects
 *   indexable public pages.
 * - `STAGING_BASIC_AUTH` — `user:pass` of the staging basic auth (`playwright.config.ts` turns it
 *   into `httpCredentials`).
 * - `MAILPIT_URL` — Mailpit HTTP API; without it mail checks are `[ЧЕЛОВЕК]` (see `./mailpit`).
 * - `ACCEPTANCE_SCREENSHOT_DIR` — where `visual.spec.ts` also writes its screenshots.
 */

export type ExpectEnv = "staging" | "production" | "development";

const EXPECT_ENVS: readonly ExpectEnv[] = ["staging", "production", "development"];

function readExpectEnv(): ExpectEnv {
  const raw = (process.env.ACCEPTANCE_EXPECT_ENV ?? "production").trim().toLowerCase();
  if ((EXPECT_ENVS as readonly string[]).includes(raw)) return raw as ExpectEnv;
  throw new Error(`ACCEPTANCE_EXPECT_ENV must be one of ${EXPECT_ENVS.join(" | ")} (got ${raw})`);
}

export const EXPECT_ENV: ExpectEnv = readExpectEnv();
export const IS_STAGING = EXPECT_ENV === "staging";

/**
 * Staging mail interception (`MAIL_INTERCEPT_TO` of the stand, src/payload/email.ts): every mail
 * goes to this mailbox and its subject is prefixed `[STAGING → <original recipient>] `. Set the
 * same value in the runner env to check intercepted mail; `null` outside staging.
 */
export const MAIL_INTERCEPT_TO = IS_STAGING ? process.env.MAIL_INTERCEPT_TO?.trim() || null : null;

/** The subject a mail to `recipients` carries on this stand (interception prefix on staging). */
export function expectedSubject(subject: string, recipients: readonly string[]): string {
  return MAIL_INTERCEPT_TO ? `[STAGING → ${recipients.join(", ")}] ${subject}` : subject;
}

/** `user:pass` split at the FIRST colon (a password may contain colons). */
export function parseBasicAuth(
  raw: string | undefined
): { username: string; password: string } | null {
  if (!raw) return null;
  const colon = raw.indexOf(":");
  if (colon <= 0) return null;
  return { username: raw.slice(0, colon), password: raw.slice(colon + 1) };
}

export const STAGING_CREDENTIALS = parseBasicAuth(process.env.STAGING_BASIC_AUTH);

/** `Authorization: Basic …` for raw requests that bypass `httpCredentials` (pages only). */
export function basicAuthHeader(): Record<string, string> {
  if (!STAGING_CREDENTIALS) return {};
  const { username, password } = STAGING_CREDENTIALS;
  return {
    Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
  };
}

export const MAIL_ENABLED = Boolean(MAILPIT_URL);

/** Marks a mail assertion as manual and skips it when no Mailpit API is reachable. */
export function annotateManualMail(testInfo: TestInfo, what: string): void {
  testInfo.annotations.push({
    type: "[ЧЕЛОВЕК]",
    description: `Проверить вручную в ящике перехвата: ${what} (MAILPIT_URL не задан)`,
  });
}

/** Only the given Playwright project runs the test (fixture-mutating / single-width scenarios). */
export function onlyProject(
  testInfo: TestInfo,
  name: string = VIEWPORTS.laptop.name,
  reason = "scenario runs once, on desktop-1366"
): void {
  test.skip(testInfo.project.name !== name, reason);
}

/** Whether the stand is served over HTTPS (cookie `Secure`, HSTS are expected only there). */
export function isHttps(baseURL: string | undefined): boolean {
  return Boolean(baseURL?.startsWith("https://"));
}

/**
 * Directory for acceptance screenshots (besides the test attachments): `ACCEPTANCE_SCREENSHOT_DIR`
 * keeps them outside the Playwright output dir, which is wiped at the start of every run.
 */
export function screenshotDir(testInfo: TestInfo): string {
  return (
    process.env.ACCEPTANCE_SCREENSHOT_DIR ??
    path.join(testInfo.project.outputDir || os.tmpdir(), "acceptance-screenshots")
  );
}

/** Unique marker for test data created by one test (`TEST <tag>` names). */
export function testTag(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
