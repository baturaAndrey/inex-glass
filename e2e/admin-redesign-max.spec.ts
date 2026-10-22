import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { E2E_BASE_URL, E2E_DATABASE_URL, E2E_PORT, e2eServerEnv } from "./helpers/env";
import { startMaxMock } from "./helpers/max-mock";
import { VIEWPORTS } from "./helpers/viewports";
import type { MaxMock } from "./helpers/max-mock";

/**
 * MAX delivery through a local HTTP mock (task 13 admin-redesign, section 2 item 7: the optional
 * test allowed once task 06 added `MAX_API_BASE_URL`).
 *
 * The e2e web server keeps MAX off (`e2eServerEnv`); here the real client, job, erasure flow and
 * subscription script run in `payload run` child processes whose MAX API is the mock on
 * `E2E_PORT + 99`. Every child gets an explicit MAX environment that wins over a developer's
 * `.env` (`@next/env` never overrides variables that are already set): a loopback API, a fake
 * token and a fake intercept chat. Nothing may reach the real MAX API — the bot is shared with
 * another live site.
 *
 * Runs at 1366 only, serially (it changes `site-settings.notifications.max` for a moment and
 * restores it), and only against the local test database.
 */

test.describe.configure({ mode: "serial" });

const MOCK_PORT = E2E_PORT + 99;
const FAKE_TOKEN = "e2e-fake-max-token-0000000000";
const FAKE_INTERCEPT_CHAT_ID = "-999000111";
const FAKE_SITE_URL = "https://stand.example.test";
const FAKE_WEBHOOK_SECRET = "e2e-max-subscribe-secret-e2e-max-subscribe-00";
const RUN = `e2e-max-${Date.now().toString(36)}`;

const REPO_ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const PAYLOAD_BIN = path.join(REPO_ROOT, "node_modules", "payload", "bin.js");
const DELIVERY_SCRIPT = "e2e/fixtures/max-delivery.ts";
const SUBSCRIBE_SCRIPT = "scripts/max-subscribe.ts";
const CHILD_TIMEOUT_MS = 150_000;
const GUARD_EXIT_CODE = 3;
const RESULT_PREFIX = "MAX_DELIVERY_RESULT ";

let mock: MaxMock | undefined;

interface ChildResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

/**
 * Safe environment of a `payload run` child: the e2e server env (test DB, secrets) plus an
 * explicit MAX block pointing at the mock. `overrides` may only make it stricter.
 */
function childEnv(overrides: Record<string, string> = {}): NodeJS.ProcessEnv {
  const env: Record<string, string> = {
    ...e2eServerEnv(),
    SITE_URL: FAKE_SITE_URL,
    SITE_ENV: "development",
    JOBS_ENABLED: "false",
    MAX_ENABLED: "true",
    MAX_API_BASE_URL: mock!.baseUrl,
    MAX_BOT_TOKEN: FAKE_TOKEN,
    MAX_INTERCEPT_CHAT_ID: FAKE_INTERCEPT_CHAT_ID,
    MAX_WEBHOOK_SECRET: FAKE_WEBHOOK_SECRET,
    E2E_MAX_RUN: RUN,
    ...overrides,
  };
  return { ...process.env, ...env };
}

/** Last line of defence before spawning: never start a child that could reach the real API. */
function assertLocalMaxEnv(env: NodeJS.ProcessEnv): void {
  const base = env.MAX_API_BASE_URL ?? "";
  expect(
    base.startsWith("http://127.0.0.1:") || base.startsWith("http://localhost:"),
    "MAX_API_BASE_URL of a child must be the loopback mock"
  ).toBe(true);
  expect(env.MAX_BOT_TOKEN).toBe(FAKE_TOKEN);
  expect(env.MAX_INTERCEPT_CHAT_ID).toBe(FAKE_INTERCEPT_CHAT_ID);
}

function runPayloadScript(
  script: string,
  args: string[],
  env: NodeJS.ProcessEnv
): Promise<ChildResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [PAYLOAD_BIN, "run", script, ...args], {
      cwd: REPO_ROOT,
      env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => (stdout += chunk.toString("utf8")));
    child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString("utf8")));
    const timer = setTimeout(() => child.kill(), CHILD_TIMEOUT_MS);
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}

const tail = (result: ChildResult): string =>
  `exit ${result.code}\n--- stdout ---\n${result.stdout.slice(-3000)}\n--- stderr ---\n${result.stderr.slice(-3000)}`;

/** 0xC0000409: what Windows reports when libuv's assertion aborts the process. */
const WINDOWS_ABORT_CODE = 3221226505;

/**
 * Windows only: `process.exit()` right after a `fetch` (undici still closing its pooled socket)
 * aborts Node with `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)`. The script's work is
 * done by then; only its exit code is lost. `scripts/max-subscribe.ts` exits that way.
 */
const isWindowsExitAbort = (result: ChildResult): boolean =>
  process.platform === "win32" &&
  result.code === WINDOWS_ABORT_CODE &&
  result.stderr.includes("UV_HANDLE_CLOSING");

/**
 * Exit code of `scripts/max-subscribe.ts`. A Windows exit abort hides the code: it is recorded as
 * an annotation and the test relies on the output and the mock's requests instead.
 */
function expectSubscribeExit(result: ChildResult, expected: number): void {
  if (isWindowsExitAbort(result)) {
    test.info().annotations.push({
      type: "windows-exit-abort",
      description: `max-subscribe exit code lost (libuv UV_HANDLE_CLOSING), expected ${expected}`,
    });
    return;
  }
  expect(result.code, tail(result)).toBe(expected);
}

test.beforeAll(async ({}, testInfo) => {
  test.skip(
    testInfo.project.name !== VIEWPORTS.laptop.name,
    "MAX delivery is checked at 1366 only"
  );
  test.skip(
    Boolean(E2E_BASE_URL),
    "Local test database only (payload run against inex_glass_test)"
  );
  expect(new URL(E2E_DATABASE_URL).pathname.endsWith("_test"), "test database only").toBe(true);
  mock = await startMaxMock(MOCK_PORT);
});

test.afterAll(async () => {
  await mock?.close();
});

test.beforeEach(() => {
  mock!.reset();
  mock!.setSubscriptions([]);
});

test.describe("MAX: delivery through the mock", () => {
  test("guard: the fixture refuses a non-loopback MAX API or a non-test database", async () => {
    test.setTimeout(CHILD_TIMEOUT_MS);
    // Unresolvable host / closed port: even a broken guard could not reach anything real.
    const remoteApi = childEnv({ MAX_API_BASE_URL: "https://max-api.example.invalid" });
    const remote = await runPayloadScript(DELIVERY_SCRIPT, [], remoteApi);
    expect(remote.code, tail(remote)).toBe(GUARD_EXIT_CODE);
    expect(remote.stderr).toContain("MAX_DELIVERY_GUARD: MAX_API_BASE_URL");

    const otherDb = childEnv({ DATABASE_URL: "postgresql://x:y@127.0.0.1:9/inex_glass" });
    const db = await runPayloadScript(DELIVERY_SCRIPT, [], otherDb);
    expect(db.code, tail(db)).toBe(GUARD_EXIT_CODE);
    expect(db.stderr).toContain("MAX_DELIVERY_GUARD: DATABASE_URL");

    expect(mock!.requests).toHaveLength(0);
  });

  test("new lead → one message to the intercept chat, idempotent, deleted on erasure", async () => {
    test.setTimeout(CHILD_TIMEOUT_MS + 30_000);
    const env = childEnv();
    assertLocalMaxEnv(env);
    const result = await runPayloadScript(DELIVERY_SCRIPT, [], env);
    expect(result.code, tail(result)).toBe(0);

    const line = result.stdout.split(/\r?\n/).find((l) => l.startsWith(RESULT_PREFIX));
    expect(line, tail(result)).toBeTruthy();
    const outcome = JSON.parse(line!.slice(RESULT_PREFIX.length)) as {
      leadId: string;
      hookJobs: number;
      afterFirst: { status: string; messageId: string | null; chatId: string | null }[];
      afterSecond: { status: string; messageId: string | null }[];
      leftoverJobs: number;
      erase: { ok: boolean; deleted?: { notifications: number } };
      afterErase: unknown[];
    };

    // The lead hook queued exactly one max-notify job (new_lead, no assignee).
    expect(outcome.hookJobs).toBe(1);

    // Journal: one `sent` row with the mock's message id, addressed to the intercept chat.
    expect(outcome.afterFirst).toHaveLength(1);
    const [row] = outcome.afterFirst;
    expect(row).toMatchObject({ status: "sent", chatId: FAKE_INTERCEPT_CHAT_ID });
    expect(row!.messageId).toMatch(/^mid\.e2e\.\d+$/);

    // Re-run: still one row, same message id, no job left behind.
    expect(outcome.afterSecond).toEqual([
      expect.objectContaining({ status: "sent", messageId: row!.messageId }),
    ]);
    expect(outcome.leftoverJobs).toBe(0);

    // Exactly one POST /messages despite the second job.
    const posts = mock!.calls("POST", "/messages");
    expect(posts).toHaveLength(1);
    const post = posts[0]!;
    expect(post.authorization).toBe(FAKE_TOKEN);
    expect(post.query).toEqual({ chat_id: FAKE_INTERCEPT_CHAT_ID });
    const body = post.body as {
      text: string;
      format: string;
      attachments?: {
        type: string;
        payload: { buttons: { type: string; text: string; url: string }[][] };
      }[];
    };
    expect(body.format).toBe("html");
    expect(body.text.startsWith("<b>[ТЕСТ] Inex Glass</b>\n")).toBe(true);
    expect(body.text).toContain(RUN);
    expect(body.attachments?.[0]?.type).toBe("inline_keyboard");
    expect(body.attachments?.[0]?.payload.buttons.flat()).toEqual([
      {
        type: "link",
        text: "Открыть заявку",
        url: `${FAKE_SITE_URL}/admin/collections/leads/${outcome.leadId}/summary/`,
      },
    ]);

    // Erasure: journal rows gone, the message deleted in the chat (one DELETE with its id).
    expect(outcome.erase).toMatchObject({ ok: true, deleted: { notifications: 1 } });
    expect(outcome.afterErase).toEqual([]);
    const deletes = mock!.calls("DELETE", "/messages");
    expect(deletes).toHaveLength(1);
    expect(deletes[0]!.query).toEqual({ message_id: row!.messageId });
    expect(deletes[0]!.authorization).toBe(FAKE_TOKEN);

    // Nothing else was called (no subscriptions, no chats lookups).
    expect(mock!.requests).toHaveLength(2);
  });
});

test.describe("MAX: webhook subscription script against the mock", () => {
  const webhookUrl = `${FAKE_SITE_URL}/api/max/webhook/`;

  test("a foreign subscription blocks subscribing, even with --force", async () => {
    test.setTimeout(CHILD_TIMEOUT_MS * 2);
    mock!.setSubscriptions([
      { url: "https://other-site.example.org/max/hook", update_types: ["message_created"] },
    ]);
    const env = childEnv();
    assertLocalMaxEnv(env);

    for (const args of [[], ["--", "--force"]]) {
      mock!.reset();
      const result = await runPayloadScript(SUBSCRIBE_SCRIPT, args, env);
      expectSubscribeExit(result, 1);
      // The list goes to stdout, the verdict to stderr.
      expect(result.stdout).toContain("[ДРУГОЙ САЙТ] https://other-site.example.org/max/hook");
      expect(result.stderr).toContain("подписка не изменена");
      expect(mock!.calls("GET", "/subscriptions")).toHaveLength(1);
      expect(mock!.calls("POST", "/subscriptions")).toHaveLength(0);
      expect(mock!.calls("DELETE", "/subscriptions")).toHaveLength(0);
    }
  });

  test("a stale URL of this site needs --force; then the trailing-slash URL is subscribed", async () => {
    test.setTimeout(CHILD_TIMEOUT_MS * 2);
    // Our webhook without the trailing slash: MAX would POST into a 308 redirect.
    const stale = `${FAKE_SITE_URL}/api/max/webhook`;
    mock!.setSubscriptions([{ url: stale }]);
    const env = childEnv();
    assertLocalMaxEnv(env);

    const refused = await runPayloadScript(SUBSCRIBE_SCRIPT, [], env);
    expectSubscribeExit(refused, 1);
    expect(refused.stderr).toContain("--force");
    expect(mock!.calls("POST", "/subscriptions")).toHaveLength(0);
    expect(mock!.calls("DELETE", "/subscriptions")).toHaveLength(0);

    mock!.reset();
    const forced = await runPayloadScript(SUBSCRIBE_SCRIPT, ["--", "--force"], env);
    expectSubscribeExit(forced, 0);
    expect(forced.stdout).toContain(webhookUrl);

    const deletes = mock!.calls("DELETE", "/subscriptions");
    expect(deletes).toHaveLength(1);
    expect(deletes[0]!.query).toEqual({ url: stale });

    const posts = mock!.calls("POST", "/subscriptions");
    expect(posts).toHaveLength(1);
    expect(posts[0]!.authorization).toBe(FAKE_TOKEN);
    expect(posts[0]!.body).toEqual({
      url: webhookUrl,
      secret: FAKE_WEBHOOK_SECRET,
      update_types: ["bot_started", "bot_added", "bot_removed", "bot_stopped", "message_created"],
    });
    // The secret never reaches the output.
    expect(forced.stdout + forced.stderr).not.toContain(FAKE_WEBHOOK_SECRET);
  });
});
