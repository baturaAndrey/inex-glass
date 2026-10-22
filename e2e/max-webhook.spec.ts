import { expect, test } from "@playwright/test";
import { skipOnMissingAdmin } from "./helpers/admin";
import { adminApi, deleteStaffApi, signInBrowser, staffApi } from "./helpers/admin-api";
import { E2E_BASE_URL, E2E_MAX_BOT_NAME, E2E_MAX_WEBHOOK_SECRET } from "./helpers/env";
import { clientIpHeaders, uniqueTestIp } from "./helpers/test-ip";
import { VIEWPORTS } from "./helpers/viewports";
import type { AdminApi } from "./helpers/admin-api";
import type { MaxStatus } from "../src/lib/max/link-service";
import type { APIRequestContext, APIResponse, TestInfo } from "@playwright/test";

/**
 * MAX webhook and recipient linking (task 06 admin-redesign). The e2e server has a test
 * webhook secret and bot nickname but NO bot token (`e2eServerEnv`), so the bot never answers
 * and nothing reaches the real MAX API. Webhook processing runs in `after()`: its results are
 * awaited with `expect.poll` on `GET /api/max/status/`.
 *
 * Runs at 1366 only and serially: the tests share the admin's link state and the group binding,
 * both removed in `afterAll`.
 */

test.describe.configure({ mode: "serial" });

const MAX_USER_ID = 900000001;
const OTHER_MAX_USER_ID = 900000002;
const GROUP_CHAT_ID = -700000001;
const POLL = { timeout: 15_000, intervals: [250, 500, 1_000] };

let apiContext: APIRequestContext | undefined;
let admin: AdminApi;
let manager: AdminApi | undefined;
let origin: string;

/** Headers of the mutating link routes: same-origin JSON. */
const originHeaders = () => ({ Origin: origin });

function webhook(
  testInfo: TestInfo,
  body: unknown,
  secret: string | null = E2E_MAX_WEBHOOK_SECRET
): Promise<APIResponse> {
  return apiContext!.post("/api/max/webhook/", {
    headers: {
      ...clientIpHeaders(uniqueTestIp(testInfo)),
      ...(secret === null ? {} : { "X-Max-Bot-Api-Secret": secret }),
    },
    data: body as Record<string, unknown>,
  });
}

const maxUser = (userId: number) => ({ user_id: userId, first_name: "E2E", is_bot: false });

async function status(api: AdminApi): Promise<MaxStatus> {
  return api.json<MaxStatus>("/api/max/status/");
}

test.beforeAll(async ({ playwright, baseURL }, testInfo) => {
  test.skip(testInfo.project.name !== VIEWPORTS.laptop.name, "Admin flow is checked at 1366 only");
  test.skip(
    Boolean(E2E_BASE_URL) && !process.env.E2E_MAX_WEBHOOK_SECRET,
    "External stand: set E2E_MAX_WEBHOOK_SECRET (and E2E_MAX_BOT_NAME) of the stand"
  );
  origin = new URL(baseURL!).origin;
  apiContext = await playwright.request.newContext({ baseURL: baseURL! });
  try {
    admin = await adminApi(apiContext);
  } catch (error) {
    skipOnMissingAdmin(error);
  }
  manager = await staffApi(admin, "manager");
});

test.afterAll(async () => {
  if (admin) {
    await admin.post("/api/max/unlink/", { target: "user" }, originHeaders()).catch(() => null);
    await admin.post("/api/max/unlink/", { target: "group" }, originHeaders()).catch(() => null);
    if (manager) await deleteStaffApi(admin, manager);
  }
  await apiContext?.dispose();
});

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== VIEWPORTS.laptop.name, "Admin flow is checked at 1366 only");
});

test("webhook: secret is required, unknown updates are acknowledged", async ({}, testInfo) => {
  const update = { update_type: "message_callback", timestamp: Date.now() };
  expect((await webhook(testInfo, update, null)).status()).toBe(401);
  expect((await webhook(testInfo, update, "wrong-secret-wrong-secret-wrong-secret")).status()).toBe(
    401
  );

  const accepted = await webhook(testInfo, update);
  expect(accepted.status()).toBe(200);
  expect(await accepted.json()).toEqual({ ok: true });
});

test("personal chat: deep link token links the MAX user once", async ({}, testInfo) => {
  const issued = await admin.post("/api/max/link-token/", { target: "user" }, originHeaders());
  expect(issued.status(), await issued.text()).toBe(200);
  const { url } = (await issued.json()) as { url: string };
  const pattern = new RegExp(
    `^https://max\\.ru/${E2E_MAX_BOT_NAME.replace(/[.]/g, "\\.")}\\?start=(ig_[A-Za-z0-9_-]{32})$`
  );
  const token = pattern.exec(url)?.[1];
  expect(token, url).toBeTruthy();
  await expect.poll(async () => (await status(admin)).user.pending, POLL).toBe(true);

  const started = await webhook(testInfo, {
    update_type: "bot_started",
    timestamp: Date.now(),
    chat_id: 123,
    user: maxUser(MAX_USER_ID),
    payload: token,
  });
  expect(started.status()).toBe(200);
  await expect.poll(async () => (await status(admin)).user.linked, POLL).toBe(true);

  const me = await admin.json<{ user: { maxUserId?: string | null } }>("/api/users/me/");
  expect(me.user.maxUserId).toBe(String(MAX_USER_ID));
  const linked = await status(admin);
  expect(linked.user.pending).toBe(false);
  expect(linked).not.toHaveProperty("user.maxUserId");

  // Replaying the used token from another MAX account must not re-link (single use). A rejected
  // replay has no visible effect, so its background processing cannot be awaited. The check is
  // deterministic anyway: `pending: false` above means the token hash is already gone from the
  // DB (the link consumed it atomically), so the replay can never match it, whenever `after()`
  // gets to it. Hence the same `maxUserId` is required both now and in the next test.
  const replay = await webhook(testInfo, {
    update_type: "bot_started",
    timestamp: Date.now(),
    chat_id: 124,
    user: maxUser(OTHER_MAX_USER_ID),
    payload: token,
  });
  expect(replay.status()).toBe(200);
  const afterReplay = await admin.json<{ user: { maxUserId?: string | null } }>("/api/users/me/");
  expect(afterReplay.user.maxUserId).toBe(String(MAX_USER_ID));
});

test("personal chat: bot_stopped and unlink", async ({}, testInfo) => {
  await webhook(testInfo, {
    update_type: "bot_stopped",
    timestamp: Date.now(),
    chat_id: 123,
    user: maxUser(MAX_USER_ID),
  });
  await expect.poll(async () => (await status(admin)).user.botStopped, POLL).toBe(true);
  // Still the first account: the replay of the previous test cannot have re-linked it.
  const me = await admin.json<{ user: { maxUserId?: string | null } }>("/api/users/me/");
  expect(me.user.maxUserId).toBe(String(MAX_USER_ID));

  const unlinked = await admin.post("/api/max/unlink/", { target: "user" }, originHeaders());
  expect(unlinked.status(), await unlinked.text()).toBe(200);
  const after = await status(admin);
  expect(after.user).toEqual({ linked: false, linkedAt: null, botStopped: false, pending: false });
});

test("group chat: one-time code links the chat, bot_removed unlinks it", async ({}, testInfo) => {
  const issued = await admin.post("/api/max/link-token/", { target: "group" }, originHeaders());
  expect(issued.status(), await issued.text()).toBe(200);
  const { code, botName } = (await issued.json()) as { code: string; botName: string };
  expect(code).toMatch(/^INEX-[0-9A-HJKMNP-TV-Z]{8}$/);
  expect(botName).toBe(E2E_MAX_BOT_NAME);

  // Typed by a person: lower case, a trailing newline (only the exact code format is accepted).
  const typed = ` ${code.toLowerCase()}\n`;
  const message = await webhook(testInfo, {
    update_type: "message_created",
    timestamp: Date.now(),
    message: {
      sender: maxUser(MAX_USER_ID),
      recipient: { chat_id: GROUP_CHAT_ID, chat_type: "chat", user_id: null },
      timestamp: Date.now(),
      body: { mid: "mid.e2e", seq: 1, text: typed },
    },
  });
  expect(message.status()).toBe(200);
  await expect.poll(async () => (await status(admin)).group?.linked, POLL).toBe(true);
  const linked = await status(admin);
  expect(linked.group).toMatchObject({ chatId: String(GROUP_CHAT_ID), pending: false });

  await webhook(testInfo, {
    update_type: "bot_removed",
    timestamp: Date.now(),
    chat_id: GROUP_CHAT_ID,
    user: maxUser(MAX_USER_ID),
    is_channel: false,
  });
  await expect.poll(async () => (await status(admin)).group?.linked, POLL).toBe(false);
});

test("rights: a manager cannot touch the group or other users", async () => {
  const staff = manager!;
  const group = await staff.post("/api/max/link-token/", { target: "group" }, originHeaders());
  expect(group.status()).toBe(403);

  const foreignStatus = await staff.get(`/api/max/status/?userId=${admin.user.id}`);
  expect(foreignStatus.status()).toBe(403);

  const foreignUnlink = await staff.post(
    "/api/max/unlink/",
    { target: "user", userId: admin.user.id },
    originHeaders()
  );
  expect(foreignUnlink.status()).toBe(403);

  const own = await status(staff);
  expect(own).not.toHaveProperty("group");

  // The MAX fields are system-only: a REST write is silently dropped.
  await staff.patch(`/api/users/${staff.user.id}/`, { maxUserId: "1" });
  const me = await staff.json<{ user: { maxUserId?: string | null } }>("/api/users/me/");
  expect(me.user.maxUserId ?? null).toBeNull();

  // CSRF: no Origin → 403 even with a valid session.
  const noOrigin = await admin.post("/api/max/link-token/", { target: "user" });
  expect(noOrigin.status()).toBe(403);
});

test("UI: profile card and the group panel of the site settings", async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  await signInBrowser(context, admin, baseURL!);

  await page.goto("/admin/account/");
  const card = page.getByTestId("max-connect");
  await expect(card).toBeVisible();
  await expect(card).toContainText("Не подключено");
  await expect(card.getByRole("button", { name: "Подключить MAX" })).toBeVisible();
  await card.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("max-account.png") });

  await page.goto("/admin/globals/site-settings/");
  await page.locator(".tabs-field__tab-button", { hasText: "Уведомления и заказы" }).click();
  const panel = page.getByTestId("max-group-link");
  await expect(panel).toContainText("Групповой чат не привязан");
  const bind = panel.getByRole("button", { name: "Привязать чат" });
  await expect(bind).toBeVisible();
  await bind.click();
  await expect(panel.getByTestId("max-group-code")).toHaveText(/^INEX-[0-9A-HJKMNP-TV-Z]{8}$/);
  await expect(panel).toContainText(`@${E2E_MAX_BOT_NAME}`);
  await expect(panel.getByRole("button", { name: "Скопировать" })).toBeVisible();
  await panel.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("max-group-panel.png") });

  const unlinked = await admin.post("/api/max/unlink/", { target: "group" }, originHeaders());
  expect(unlinked.status()).toBe(200);
});
