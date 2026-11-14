import { expect, test } from "@playwright/test";
import { skipOnMissingAdmin } from "./helpers/admin";
import {
  adminApi,
  createLead,
  deleteDocs,
  deleteStaffApi,
  findStatusId,
  signInBrowser,
  staffApi,
  uniquePhone,
} from "./helpers/admin-api";
import { E2E_BASE_URL, E2E_MAX_BOT_NAME, E2E_MAX_WEBHOOK_SECRET } from "./helpers/env";
import { clientIpHeaders, uniqueTestIp } from "./helpers/test-ip";
import { VIEWPORTS } from "./helpers/viewports";
import type { AdminApi, LeadInput } from "./helpers/admin-api";
import type { Lead, User } from "../src/payload-types";
import type { APIRequestContext, APIResponse, Page, TestInfo } from "@playwright/test";

/**
 * End-to-end smokes of the redesigned admin (task 13 of specs/admin-redesign, section 2): menu,
 * dashboard, leads kanban, lead card, manager rights and the MAX webhook — one pass through the
 * whole flow. The per-feature specs (`admin-nav`, `admin-dashboard`, `admin-kanban`,
 * `admin-leads`, `max-webhook`) cover the details.
 *
 * - «view»: read-only checks in all three projects (375: burger menu and the phone kanban).
 * - «flow (1366)»: mutating, serial, desktop-1366 only. Fixtures are created through REST under
 *   the e2e admin with the run marker in `company`; `afterAll` deletes the leads and the
 *   throwaway manager (its MAX link goes with it).
 *
 * The MAX webhook part sends 6 requests from fresh documentation-range IPs (the per-IP limit is
 * 120 / min, `src/app/api/max/webhook/route.ts`). The e2e server has no bot token and
 * `MAX_ENABLED=false`, so nothing reaches the real MAX API.
 *
 * Lead statuses named «E2E …» are temporary statuses of a parallel `orders.spec.ts`; they are
 * ignored in column assertions.
 */

const RUN = `e2e-redesign-${Date.now().toString(36)}`;
const NAV = 'nav[aria-label="Главное меню"]';
const KANBAN = "/admin/collections/leads/kanban/";
const BOARD_URL = `${KANBAN}?search=${encodeURIComponent(RUN)}`;
const GROUP_LABELS = ["Работа", "Сайт", "Каталог и цены", "Система"] as const;
const SEEDED_COLUMNS = ["Новая", "В работе", "КП отправлено", "Договор"] as const;
const DASHBOARD_SECTIONS = [
  "Требует внимания",
  "Пульс",
  "Воронка заявок",
  "Источники",
  "Заказы в работе",
  "Последние заявки",
] as const;
/** Name prefix of the temporary lead statuses of `e2e/helpers/orders-fixtures.ts`. */
const E2E_STATUS_PREFIX = "E2E ";
/** «Последние заявки» shows this many newest leads (`LATEST_LEADS_LIMIT` of the loader). */
const LATEST_ROWS = 5;
const LATEST_ATTEMPTS = 3;
/** Webhook processing runs in `after()`: its effects are polled. */
const POLL = { timeout: 15_000, intervals: [250, 500, 1_000] };
/** Tall enough to keep the board and the refusal strip in one screen. */
const TALL_VIEWPORT = { width: VIEWPORTS.laptop.width, height: 1400 };

const isMobile = (testInfo: TestInfo) => testInfo.project.name === VIEWPORTS.mobile.name;
const isLaptop = (testInfo: TestInfo) => testInfo.project.name === VIEWPORTS.laptop.name;

const relId = (value: unknown) =>
  typeof value === "object" && value !== null ? (value as { id: string }).id : value;

/** Signs the browser in as the shared e2e admin (skips locally when there is none). */
async function adminBrowser(page: Page, request: APIRequestContext, baseURL: string) {
  let api: AdminApi;
  try {
    api = await adminApi(request);
  } catch (error) {
    skipOnMissingAdmin(error);
    throw error;
  }
  await signInBrowser(page.context(), api, baseURL);
  return api;
}

// ─── View: all three projects, nothing is mutated ─────────────────────────────────────────────

test.describe("view", () => {
  test("menu groups (burger on phones) and dashboard sections", async ({
    page,
    request,
    baseURL,
  }, testInfo) => {
    await adminBrowser(page, request, baseURL!);
    await page.goto("/admin/");
    await expect(page.getByRole("heading", { level: 1, name: "Дашборд" })).toBeVisible();

    const aside = page.locator("aside.nav");
    if (isMobile(testInfo)) {
      // Closed overlay: the menu is inert until the burger opens it.
      await expect(aside).toHaveAttribute("inert", "");
      await page.locator(".app-header__mobile-nav-toggler").click();
      await expect(aside).toHaveClass(/nav--nav-open/);
      await expect(aside).not.toHaveAttribute("inert", "");
    }
    const nav = page.locator(NAV);
    for (const label of GROUP_LABELS) {
      await expect(nav.locator(".iga-nav__group-label", { hasText: label })).toBeVisible();
    }
    await expect(nav.locator("#nav-leads-report")).toHaveAttribute("href", "/admin/leads-report/");
    if (isMobile(testInfo)) {
      await page.locator("aside.nav .nav__mobile-close").click();
      await expect(aside).not.toHaveClass(/nav--nav-open/);
      await expect(aside).toHaveAttribute("inert", "");
    }

    for (const title of DASHBOARD_SECTIONS) {
      await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    }
    await expect(page.getByText("Не удалось загрузить данные")).toHaveCount(0);
  });

  test("kanban: columns on desktop, tabs and «Перенести в…» on phones", async ({
    page,
    request,
    baseURL,
  }, testInfo) => {
    await adminBrowser(page, request, baseURL!);
    await page.goto(KANBAN);
    await expect(page.getByRole("heading", { level: 1, name: "Заявки" })).toBeVisible();

    if (!isMobile(testInfo)) {
      const titles = (await page.locator(".iga-kanban__col-title").allTextContents()).filter(
        (title) => !title.startsWith(E2E_STATUS_PREFIX)
      );
      expect(titles).toEqual([...SEEDED_COLUMNS]);
      await expect(page.locator('.iga-kstrip[data-status-slug="refused"]')).toContainText("Отказ");
      return;
    }

    const tabs = page.getByRole("tablist", { name: "Статусы заявок" }).getByRole("tab");
    await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
    expect(await tabs.count()).toBeGreaterThan(1);
    await tabs.nth(1).click();
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
    await expect(page.locator('[role="tabpanel"]:visible')).toHaveCount(1);

    // «Перенести в…» is the only way to move a card on a phone: open it on the first card of a
    // non-empty column and close it again (nothing is moved at 375).
    let opened = false;
    for (let index = 0; index < (await tabs.count()) && !opened; index++) {
      await tabs.nth(index).click();
      const button = page.locator('[role="tabpanel"]:visible .iga-kmenu__button').first();
      if ((await button.count()) === 0) continue;
      await expect(page.locator('[role="tabpanel"]:visible .iga-kcard__handle')).toHaveCount(0);
      await button.click();
      const menu = page.getByRole("menu", { name: "Перенести в…" });
      await expect(menu).toBeVisible();
      expect(await menu.getByRole("menuitem").count()).toBeGreaterThan(0);
      await page.keyboard.press("Escape");
      await expect(menu).toBeHidden();
      opened = true;
    }
    if (!opened) {
      testInfo.annotations.push({
        type: "skipped-check",
        description: "the board has no cards: «Перенести в…» was not opened",
      });
    }
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

// ─── Flow: desktop-1366 only, serial, fixtures mutated ────────────────────────────────────────

test.describe("flow (1366)", () => {
  test.describe.configure({ mode: "serial" });

  let apiContext: APIRequestContext | undefined;
  let admin: AdminApi;
  let manager: AdminApi | undefined;
  let leadMove: Lead;
  let leadCard: Lead;
  const leadIds = new Set<string>();
  const statuses: Record<string, string> = {};

  const track = (lead: Lead) => {
    leadIds.add(lead.id);
    return lead;
  };
  const fixture = (suffix: string, extra: Partial<LeadInput> = {}): LeadInput => ({
    formType: "quiz",
    company: `ООО «${RUN} ${suffix}»`,
    name: "Смоук",
    phone: uniquePhone(),
    area: 64,
    productType: "facade",
    ...extra,
  });
  const cardFixture = () => fixture("Карточка", { formType: "callback" });
  const leadDoc = (id: string) => admin.json<Lead>(`/api/leads/${id}/?depth=0`);

  test.beforeAll(async ({ playwright, baseURL }, testInfo) => {
    test.skip(!isLaptop(testInfo), "Mutating flow: desktop-1366 only");
    apiContext = await playwright.request.newContext({ baseURL: baseURL! });
    try {
      admin = await adminApi(apiContext);
    } catch (error) {
      skipOnMissingAdmin(error);
    }
    for (const slug of ["new", "in-progress", "refused"]) {
      statuses[slug] = await findStatusId(admin, slug);
    }
    leadMove = track(await createLead(admin, fixture("Канбан")));
    leadCard = track(await createLead(admin, cardFixture()));
    manager = await staffApi(admin, "manager");
  });

  test.afterAll(async () => {
    if (admin) {
      await deleteDocs(admin, "leads", leadIds);
      if (manager) await deleteStaffApi(admin, manager);
    }
    await apiContext?.dispose();
  });

  test.beforeEach(({}, testInfo) => {
    test.skip(!isLaptop(testInfo), "Mutating flow: desktop-1366 only");
  });

  test("1. menu: counter of new leads, report link, manager's menu", async ({ page, baseURL }) => {
    // The counter is cached 60 s per user: the fresh manager's first render counts right now.
    const statusId = await defaultLeadStatusId(admin);
    const before = await leadsWithStatus(admin, statusId);
    await signInBrowser(page.context(), manager!, baseURL!);
    await page.goto("/admin/");
    const nav = page.locator(NAV);
    const badge = nav.locator('[data-nav-item="leads"] .iga-nav__count');
    await expect(badge).toBeVisible();
    const label = (await badge.getAttribute("aria-label")) ?? "";
    const shown = Number(/^новых: (\d+)$/.exec(label)?.[1] ?? NaN);
    const after = await leadsWithStatus(admin, statusId);
    // Parallel specs add and delete leads meanwhile: the shown value lies between the two counts.
    expect(shown, `aria-label "${label}"`).toBeGreaterThanOrEqual(Math.min(before, after));
    expect(shown).toBeLessThanOrEqual(Math.max(before, after));
    await expect(badge).toHaveText(String(shown));

    await expect(nav.locator(".iga-nav__group-label", { hasText: "Работа" })).toBeVisible();
    await expect(nav.locator(".iga-nav__group-label", { hasText: "Сайт" })).toBeVisible();
    await expect(nav.locator(".iga-nav__user-role")).toHaveText("Менеджер");
    // Collapsed items render no child links: expand all before listing the hrefs.
    const collapsed = nav.locator('button.iga-nav__toggle[aria-expanded="false"]');
    while ((await collapsed.count()) > 0) await collapsed.first().click();
    const hrefs = await nav
      .locator("a[href]")
      .evaluateAll((links) => links.map((link) => link.getAttribute("href") ?? ""));
    expect(hrefs).not.toContain("/admin/collections/payload-jobs/");
    expect(hrefs).not.toContain("/admin/collections/search/");

    await nav.locator("#nav-leads-report").click();
    await expect(page).toHaveURL(/\/admin\/leads-report\/$/);
  });

  test("2. dashboard: the fixture is among «Последние заявки» with a summary link", async ({
    page,
    baseURL,
  }) => {
    await signInBrowser(page.context(), admin, baseURL!);
    // A displaced fixture is replaced by a copy; test 4 then works on the copy.
    leadCard = await showInLatest(page, leadCard, async () =>
      track(await createLead(admin, cardFixture()))
    );
    const lead = leadCard;
    const row = page.locator(`tr[data-lead="${lead.id}"]`);
    await expect(row.getByRole("link", { name: lead.company! })).toHaveAttribute(
      "href",
      `/admin/collections/leads/${lead.id}/summary/`
    );
    await expect(row).toContainText("не назначен");
  });

  test("3. kanban: keyboard move to «В работе», «Отказ» asks for the reason", async ({
    page,
    baseURL,
  }) => {
    await page.setViewportSize(TALL_VIEWPORT);
    await signInBrowser(page.context(), admin, baseURL!);
    await page.goto(BOARD_URL);
    const card = page.locator(`#kcard-${leadMove.id}`);
    await expect(
      page.locator('.iga-kanban__col[data-status-slug="new"]').locator(card)
    ).toBeVisible();

    // @dnd-kit keyboard sensor: focus the handle → Space → → → Space.
    await card.locator(".iga-kcard__handle").focus();
    await page.keyboard.press("Space");
    await expect(page.locator('[id^="DndLiveRegion"]', { hasText: "Взята заявка" })).toHaveCount(1);
    await page.keyboard.press("ArrowRight");
    await expect(
      page.locator('[id^="DndLiveRegion"]', { hasText: "Над колонкой «В работе»" })
    ).toHaveCount(1);
    await page.keyboard.press("Space");
    await expect(page.getByText("Статус: «В работе»")).toBeVisible();
    await expect(
      page.locator('.iga-kanban__col[data-status-slug="in-progress"]').locator(card)
    ).toBeVisible();
    expect(relId((await leadDoc(leadMove.id)).status)).toBe(statuses["in-progress"]);

    // «Отказ» through «Перенести в…»: the reason dialog, «Дорого» is saved as its code.
    await card
      .getByRole("button", { name: `Перенести заявку «${leadMove.company}» в другой статус` })
      .click();
    await page.getByRole("menuitem", { name: "Отказ", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: `Закрыть заявку «${leadMove.company}»` });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Причина").selectOption({ label: "Дорого" });
    await dialog.getByRole("button", { name: "Закрыть заявку" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText("Статус: «Отказ»")).toBeVisible();

    const saved = await leadDoc(leadMove.id);
    expect(relId(saved.status)).toBe(statuses.refused);
    expect(saved.refuseReasonCode).toBe("expensive");
  });

  test("4. card from the kanban: «Назначить себя», comment, «Позвонить»", async ({
    page,
    baseURL,
  }) => {
    await signInBrowser(page.context(), admin, baseURL!);
    await page.goto(BOARD_URL);
    await page.locator(`#kcard-${leadCard.id} .iga-kcard__title`).click();
    await expect(page).toHaveURL(new RegExp(`/admin/collections/leads/${leadCard.id}/summary/$`));

    await expect(page.getByRole("link", { name: "Позвонить" })).toHaveAttribute("href", /^tel:/);

    const processing = page.getByRole("region", { name: "Обработка" });
    const history = page.getByRole("region", { name: "История", exact: true });
    await processing.getByRole("button", { name: "Назначить себя" }).click();
    await expect(
      history.getByRole("listitem").filter({ hasText: `Ответственный: ${admin.user.name ?? ""}` })
    ).toBeVisible();
    expect(relId((await leadDoc(leadCard.id)).assignee)).toBe(admin.user.id);

    const comments = page.getByRole("region", { name: "Комментарии", exact: true });
    const text = `${RUN} комментарий`;
    const field = comments.getByLabel("Внутренний комментарий (клиент его не видит)");
    await field.fill(text);
    await comments.getByRole("button", { name: "Добавить" }).click();
    await expect(comments.getByRole("listitem").filter({ hasText: text })).toBeVisible();
    await expect(field).toHaveValue("");
    const stored = (await leadDoc(leadCard.id)).internalComments ?? [];
    expect(stored.map((comment) => comment.text)).toContain(text);
  });

  test("5. manager rights", async ({ page, baseURL }) => {
    const staff = manager!;
    expect((await staff.delete(`/api/leads/${leadCard.id}/`)).status()).toBe(403);
    expect((await leadDoc(leadCard.id)).id).toBe(leadCard.id);

    // Another user's MAX state: the document is not the manager's (403); the field is system-only
    // anyway, so even an accepted write must leave it untouched.
    const before = await admin.json<{ user: User }>("/api/users/me/");
    const foreign = await staff.patch(`/api/users/${admin.user.id}/`, { maxUserId: "1" });
    expect(foreign.status()).toBe(403);
    const afterPatch = await admin.json<{ user: User }>("/api/users/me/");
    expect(afterPatch.user.maxUserId ?? null).toBe(before.user.maxUserId ?? null);

    expect((await staff.get("/api/notification-log/?limit=1")).status()).toBe(403);

    const { docs } = await admin.json<{ docs: { id: string }[] }>("/api/pages/?limit=1&depth=0");
    const pageId = docs[0]?.id;
    expect(pageId, "seeded pages").toBeTruthy();
    expect((await staff.patch(`/api/pages/${pageId}/`, { title: `${RUN}` })).status()).toBe(403);

    // …but reads the pages in the admin.
    await signInBrowser(page.context(), staff, baseURL!);
    const list = await page.goto("/admin/collections/pages/");
    expect(list?.status()).toBeLessThan(400);
    await expect(page.locator(`${NAV} [data-nav-item="pages"] a.iga-nav__link`)).toHaveAttribute(
      "aria-current",
      "page"
    );
    const edit = await page.goto(`/admin/collections/pages/${pageId}/`);
    expect(edit?.status()).toBeLessThan(400);
    await expect(page).toHaveURL(new RegExp(`/admin/collections/pages/${pageId}/?$`));
  });

  test("6. MAX webhook: secret, unknown update, personal link, single use, bot_stopped", async ({
    baseURL,
  }, testInfo) => {
    test.skip(
      Boolean(E2E_BASE_URL) && !process.env.E2E_MAX_WEBHOOK_SECRET,
      "External stand: set E2E_MAX_WEBHOOK_SECRET (and E2E_MAX_BOT_NAME) of the stand"
    );
    const staff = manager!;
    const webhook = (body: unknown, secret: string | null = E2E_MAX_WEBHOOK_SECRET) =>
      postWebhook(apiContext!, testInfo, body, secret);

    // 1–2. No secret / a wrong one: refused, and the body tells nothing.
    const unknownUpdate = { update_type: "e2e_unknown_update", timestamp: Date.now() };
    for (const secret of [null, `wrong-${E2E_MAX_WEBHOOK_SECRET}`]) {
      const refused = await webhook(unknownUpdate, secret);
      expect(refused.status()).toBe(401);
      expect(await refused.json()).toEqual({ ok: false });
    }
    // 3. The right secret and an update type the site does not know: acknowledged.
    const accepted = await webhook(unknownUpdate);
    expect(accepted.status()).toBe(200);
    expect(await accepted.json()).toEqual({ ok: true });

    // The manager's own link token (the «Подключить MAX» button calls the same route).
    const issued = await staff.post(
      "/api/max/link-token/",
      { target: "user" },
      { Origin: new URL(baseURL!).origin }
    );
    expect(issued.status(), await issued.text()).toBe(200);
    const { url } = (await issued.json()) as { url: string };
    expect(url.startsWith(`https://max.ru/${E2E_MAX_BOT_NAME}?`), url).toBe(true);
    const token = new URL(url).searchParams.get("start");
    expect(token, url).toBeTruthy();

    // Unique MAX ids: `max-webhook.spec.ts` links 900000001/2 to the admin in parallel.
    const maxUserId = 910_000_000 + Math.floor(Math.random() * 1e7);
    const otherMaxUserId = maxUserId + 1;
    const maxUser = (userId: number) => ({ user_id: userId, name: "E2E", is_bot: false });
    const me = async () => (await staff.json<{ user: User }>("/api/users/me/")).user;

    // 4. bot_started with the token links the manager.
    const started = await webhook({
      update_type: "bot_started",
      timestamp: Date.now(),
      chat_id: maxUserId,
      user: maxUser(maxUserId),
      payload: token,
    });
    expect(started.status()).toBe(200);
    await expect.poll(async () => (await me()).maxUserId ?? null, POLL).toBe(String(maxUserId));

    // 5. Replay from another MAX account: the token is single-use. The link above consumed it
    // atomically, so the replay can never match, whenever `after()` processes it.
    const replay = await webhook({
      update_type: "bot_started",
      timestamp: Date.now(),
      chat_id: otherMaxUserId,
      user: maxUser(otherMaxUserId),
      payload: token,
    });
    expect(replay.status()).toBe(200);

    // 6. bot_stopped marks the linked user.
    const stopped = await webhook({
      update_type: "bot_stopped",
      timestamp: Date.now(),
      chat_id: maxUserId,
      user: maxUser(maxUserId),
    });
    expect(stopped.status()).toBe(200);
    await expect.poll(async () => (await me()).maxBotStopped ?? false, POLL).toBe(true);
    expect((await me()).maxUserId).toBe(String(maxUserId));
  });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────────────────────

function postWebhook(
  request: APIRequestContext,
  testInfo: TestInfo,
  body: unknown,
  secret: string | null
): Promise<APIResponse> {
  return request.post("/api/max/webhook/", {
    headers: {
      // A fresh IP per request: the webhook rate limit is per client IP.
      ...clientIpHeaders(uniqueTestIp(testInfo)),
      ...(secret === null ? {} : { "X-Max-Bot-Api-Secret": secret }),
    },
    data: body as Record<string, unknown>,
  });
}

/** The status new leads get: the flagged default, else the first by `order` (as the menu). */
async function defaultLeadStatusId(api: AdminApi): Promise<string> {
  const { docs } = await api.json<{ docs: { id: string; isDefault?: boolean | null }[] }>(
    "/api/lead-statuses/?sort=order&limit=100&depth=0"
  );
  const id = (docs.find((status) => status.isDefault) ?? docs[0])?.id;
  if (!id) throw new Error("No lead statuses: run the seed");
  return id;
}

async function leadsWithStatus(api: AdminApi, statusId: string): Promise<number> {
  const body = await api.json<{ totalDocs: number }>(
    `/api/leads/?where[status][equals]=${statusId}&limit=1&depth=0`
  );
  return body.totalDocs;
}

/**
 * Opens `/admin/` with `lead` among «Последние заявки» and returns the lead that is shown.
 * Parallel specs (in a full run mostly `orders.spec.ts` with its «E2E …» statuses) add newer
 * leads that can push the fixture out of the five rows. A missing fixture is accepted only when
 * the table is full; then a fresh copy is created (cleaned up with the others) and the page
 * reloaded.
 */
async function showInLatest(page: Page, lead: Lead, copy: () => Promise<Lead>): Promise<Lead> {
  let current = lead;
  for (let attempt = 1; ; attempt++) {
    await page.goto("/admin/");
    const latest = page.locator('section[aria-labelledby="iga-dash-latest-h"]');
    await expect(latest.getByRole("heading", { name: "Последние заявки" })).toBeVisible();
    if ((await latest.locator(`tr[data-lead="${current.id}"]`).count()) > 0) return current;

    const rows = latest.locator("tbody tr");
    expect(await rows.count(), "the fixture is missing although the table is not full").toBe(
      LATEST_ROWS
    );
    test.info().annotations.push({
      type: "displaced",
      description: `attempt ${attempt}: the fixture was pushed out by newer leads`,
    });
    expect(attempt, "the fixture keeps being displaced by parallel specs").toBeLessThan(
      LATEST_ATTEMPTS
    );
    current = await copy();
  }
}
