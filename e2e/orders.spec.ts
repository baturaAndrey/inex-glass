import { expect, request as playwrightRequest, test } from "@playwright/test";
import { skipOnMissingAdmin } from "./helpers/admin";
import { dateKey, ORDER_STATUSES, OrdersFixtures } from "./helpers/orders-fixtures";
import { VIEWPORTS } from "./helpers/viewports";
import type { OrderStatus } from "./helpers/orders-fixtures";
import type { Page } from "@playwright/test";

/**
 * Orders (task 33, ТЗ §6.2): order created from a lead in «Договор», the client page
 * `/zakaz/<token>/` (5 statuses, photos + lightbox, shipment, documents, invalid links,
 * privacy), the file route, the admin «Управление» tab and access rights.
 *
 * Data is created through the REST API as an admin (`helpers/orders-fixtures.ts`) and removed
 * in `afterAll`. Page/visual checks run at 375 / 1366 / 1920; API-only and admin checks run
 * once, in the 1366 project.
 *
 * Note: a 404 of this DYNAMIC route renders its body on the client (bare `notFound()`), so
 * texts of invalid links are asserted in the browser, statuses on the raw response.
 */

const INVALID_TEXT = "Ссылка больше не действует — свяжитесь с менеджером";
const STEP_TITLES = [
  "Спецификация согласована",
  "В производстве",
  "Упаковано",
  "Отгружено",
  "Получено",
];
const DAY_MS = 86_400_000;

// Generous: the shared dev server compiles routes on demand and answers slowly under load.
test.describe.configure({ mode: "serial", timeout: 600_000 });

let fx: OrdersFixtures;
let statuses: { newId: string; contractId: string };

const isLaptop = (name: string) => name === VIEWPORTS.laptop.name;
const formatRu = (key: string) => key.split("-").reverse().join(".");

test.beforeAll(async ({ baseURL }) => {
  test.setTimeout(300_000);
  try {
    fx = await OrdersFixtures.login(baseURL ?? "http://localhost:3000");
  } catch (error) {
    skipOnMissingAdmin(error);
  }
  statuses = await fx.createStatuses();
});

test.afterAll(async () => {
  test.setTimeout(300_000);
  await fx?.cleanup();
});

test.beforeEach(async ({ page }) => {
  // Consent given: the cookie banner never covers the page.
  await page.addInitScript(() => window.localStorage.setItem("inex-consent-v1", "all"));
});

/**
 * `page.goto` that retries a 5xx once: `next dev` (Turbopack) sporadically answers 500 «module
 * factory is not available» while other routes are recompiled by HMR. Production never does.
 */
async function open(page: Page, url: string) {
  const response = await page.goto(url);
  if (response && response.status() >= 500) return page.goto(url);
  return response;
}

/** Steps of the order timeline. */
const steps = (page: Page) => page.getByRole("list", { name: "Этапы заказа" }).locator("> li");

async function expectStates(page: Page, current: OrderStatus) {
  const items = steps(page);
  await expect(items).toHaveCount(5);
  const reached = ORDER_STATUSES.indexOf(current);
  for (let index = 0; index < 5; index++) {
    const item = items.nth(index);
    await expect(item).toContainText(STEP_TITLES[index] ?? "");
    const completed = index < reached || (index === reached && current === "received");
    if (completed) {
      await expect(item).toHaveClass(/is-done/);
      await expect(item).not.toHaveAttribute("aria-current", "step");
    } else if (index === reached) {
      await expect(item).toHaveClass(/is-current/);
      await expect(item).toHaveAttribute("aria-current", "step");
    } else {
      await expect(item).not.toHaveClass(/is-done|is-current/);
    }
  }
}

// ---------------------------------------------------------------------------------------------

test("1. an order is created once when the lead moves to «Договор»", async ({}, testInfo) => {
  test.skip(!isLaptop(testInfo.project.name), "API check, one project");

  const lead = await fx.createLead(statuses.newId);
  await fx.setLeadStatus(lead.id, statuses.contractId);
  const orders = await fx.ordersOfLead(lead.id);
  expect(orders).toHaveLength(1);
  const [order] = orders;
  expect(order?.number).toMatch(/^\d{4}-\d{4}$/);
  expect(order?.currentStatus).toBe("spec_agreed");
  expect(order?.tokenCreatedAt).toBeTruthy();
  // `tokenHash` is never readable over the API: a working link proves it was stored.
  const link = await fx.link(order!.id);
  expect(link).toMatch(/^\/zakaz\/[A-Za-z0-9_-]{22}\/$/);
  expect((await fx.api.get(link)).status()).toBe(200);
  expect(await fx.statusJobs(order!.id)).toHaveLength(1);

  // Out of «Договор» and back: still one order.
  await fx.setLeadStatus(lead.id, statuses.newId);
  await fx.setLeadStatus(lead.id, statuses.contractId);
  expect(await fx.ordersOfLead(lead.id)).toHaveLength(1);

  // A lead without e-mail: the order exists, no e-mail job.
  const { order: silent } = await fx.createOrder(statuses, null);
  expect(silent.currentStatus).toBe("spec_agreed");
  expect(await fx.statusJobs(silent.id)).toHaveLength(0);
});

test("2. the page shows each of the 5 statuses", async ({ page }, testInfo) => {
  const { order } = await fx.createOrder(statuses);
  const link = await fx.link(order.id);

  for (const status of ORDER_STATUSES) {
    await fx.setStatus(order.id, status);
    const response = await open(page, link);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Заказ № ${order.number}`);
    await expectStates(page, status);
    // Reached stages are dated today.
    await expect(steps(page).nth(ORDER_STATUSES.indexOf(status))).toContainText(
      formatRu(dateKey())
    );
  }

  // Layout: horizontal from 600 px, vertical on phones.
  const first = await steps(page).nth(0).boundingBox();
  const second = await steps(page).nth(1).boundingBox();
  if (testInfo.project.name === VIEWPORTS.mobile.name) {
    expect(second!.y).toBeGreaterThan(first!.y + first!.height - 1);
  } else {
    expect(Math.abs(second!.y - first!.y)).toBeLessThan(2);
    expect(second!.x).toBeGreaterThan(first!.x);
  }
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(0);

  // Minimal footer (`.od-foot` of Order.dc.html): contacts only, no site navigation columns.
  const footer = page.getByRole("contentinfo");
  await expect(footer).toHaveCount(1);
  await expect(footer.getByRole("navigation")).toHaveCount(0);
  await expect(footer.locator('a[href^="tel:"]')).toHaveCount(1);
  await expect(footer.locator('a[href^="mailto:"]')).toHaveCount(1);
});

test("3. photos, lightbox, shipment and copy", async ({ page, context, browserName }) => {
  // «In production» without photos: empty state, no shipment card.
  const { order } = await fx.createOrder(statuses);
  const link = await fx.link(order.id);
  await fx.setStatus(order.id, "in_production");
  await fx.changeStatus(order.id, {
    status: "in_production",
    plannedDate: dateKey(10),
  });
  await open(page, link);
  await expect(page.getByText("Фото появятся при отгрузке")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Отгрузка" })).toHaveCount(0);
  await expect(steps(page).nth(2)).toContainText(`план ${formatRu(dateKey(10)).slice(0, 5)}`);
  await page.screenshot({
    path: test.info().outputPath("order-in-production.png"),
    fullPage: true,
  });

  // «Shipped» with 3 photos, carrier, waybill, tracking.
  const photos = [
    await fx.uploadFile("photo", 0),
    await fx.uploadFile("photo", 1),
    await fx.uploadFile("photo", 2),
  ];
  await fx.updateOrder(order.id, {
    packPhotos: photos.map((photo) => ({ photo })),
    shipment: { carrier: "ПЭК", waybill: "ЧЛБ-0042-77", trackingUrl: "https://pecom.ru/" },
    clientComment: { text: "Отгрузка перенесена на сутки.\nСпасибо за терпение." },
  });
  await fx.setStatus(order.id, "shipped");
  await open(page, link);

  const thumbs = page.getByRole("button", { name: /^Открыть фото упаковки \d$/ });
  await expect(thumbs).toHaveCount(3);
  await expect(page.getByText(`Фото при отгрузке, ${formatRu(dateKey())}`)).toBeVisible();
  await expect(page.getByText("Отгрузка перенесена на сутки.")).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("order-shipped.png"), fullPage: true });

  await thumbs.first().click();
  const dialog = page.getByRole("dialog", { name: "Фото упаковки" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("1 из 3")).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(dialog.getByText("2 из 3")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(thumbs.first()).toBeFocused();

  const shipment = page.locator("section", {
    has: page.getByRole("heading", { name: "Отгрузка" }),
  });
  await expect(shipment).toContainText("ПЭК");
  await expect(shipment).toContainText(formatRu(dateKey()));
  const tracking = shipment.getByRole("link", { name: "Открыть на сайте ТК" });
  await expect(tracking).toHaveAttribute("rel", "noopener noreferrer");
  await expect(tracking).toHaveAttribute("target", "_blank");

  if (browserName === "chromium") {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await shipment.getByRole("button", { name: "Скопировать" }).click();
    await expect(shipment.getByRole("button", { name: "Скопировано" })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("ЧЛБ-0042-77");
  }
});

test("4. documents and photos are served only through the order's link", async ({}, testInfo) => {
  test.skip(!isLaptop(testInfo.project.name), "HTTP check, one project");

  const { order } = await fx.createOrder(statuses);
  const { order: other } = await fx.createOrder(statuses);
  const doc = await fx.uploadFile("document");
  const foreignDoc = await fx.uploadFile("document", 1);
  const photo = await fx.uploadFile("photo");
  await fx.updateOrder(order.id, {
    documents: [{ title: "Паспорт качества", kind: "passport", file: doc }],
    packPhotos: [{ photo }],
  });
  await fx.updateOrder(other.id, {
    documents: [{ title: "Чужой документ", kind: "other", file: foreignDoc }],
  });
  const link = await fx.link(order.id);
  const anon = await playwrightRequest.newContext({ baseURL: fx.baseURL });

  const download = await anon.get(`${link}docs/${doc}/`);
  expect(download.status()).toBe(200);
  const headers = download.headers();
  expect(headers["content-type"]).toBe("application/pdf");
  expect(headers["content-disposition"]).toMatch(/^attachment;/);
  expect(headers["content-disposition"]).toContain("filename*=UTF-8''");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["cache-control"]).toContain("no-store");
  expect(headers["x-robots-tag"]).toContain("noindex");
  expect((await download.body()).subarray(0, 5).toString("latin1")).toBe("%PDF-");

  // A file of another order, an unknown id, a non-uuid: the same 404.
  expect((await anon.get(`${link}docs/${foreignDoc}/`)).status()).toBe(404);
  expect((await anon.get(`${link}docs/00000000-0000-4000-8000-000000000000/`)).status()).toBe(404);
  expect((await anon.get(`${link}docs/..%2F..%2Fetc/`)).status()).toBe(404);

  const thumb = await anon.get(`${link}docs/${photo}/?w=320`);
  expect(thumb.status()).toBe(200);
  expect(thumb.headers()["content-type"]).toBe("image/webp");
  const original = await anon.get(`${link}docs/${photo}/`);
  expect(original.headers()["content-type"]).toBe("image/png");
  expect(original.headers()["content-disposition"]).toMatch(/^inline;/);

  // Revoked link: files are gone too.
  await fx.tokenAction(order.id, "revoke");
  expect((await anon.get(`${link}docs/${doc}/`)).status()).toBe(404);
  await anon.dispose();
});

test("5. invalid links all answer the same 404", async ({ page }, testInfo) => {
  const { order } = await fx.createOrder(statuses);
  const { order: expired } = await fx.createOrder(statuses);
  const link = await fx.link(order.id);
  const expiredLink = await fx.link(expired.id);
  // «Получено» long ago: expiresAt (date + TTL) is in the past.
  await fx.setStatus(expired.id, "received", "2025-01-10");

  const expectInvalid = async (url: string) => {
    const response = await open(page, url);
    expect(response?.status(), url).toBe(404);
    await expect(page.getByRole("heading", { level: 1, name: INVALID_TEXT })).toBeVisible();
    await expect(page.locator('main a[href^="tel:"]')).toBeVisible();
  };

  await expectInvalid("/zakaz/AAAAAAAAAAAAAAAAAAAAAA/");
  await expectInvalid("/zakaz/too-short/");
  await expectInvalid(expiredLink);
  if (isLaptop(testInfo.project.name)) {
    await page.screenshot({ path: testInfo.outputPath("order-invalid.png"), fullPage: true });
  }

  await fx.tokenAction(order.id, "revoke");
  await expectInvalid(link);
  await fx.tokenAction(order.id, "restore");
  expect((await open(page, link))?.status()).toBe(200);

  const reissued = await fx.tokenAction(order.id, "reissue");
  const newLink = new URL(reissued.url ?? "").pathname;
  expect(newLink).not.toBe(link);
  await expectInvalid(link);
  expect((await open(page, newLink))?.status()).toBe(200);
});

test("6. the page leaks no client data and is not indexable", async ({}, testInfo) => {
  test.skip(!isLaptop(testInfo.project.name), "Raw HTML check, one project");

  const { order, lead } = await fx.createOrder(statuses, "e2e-private-client@example.com");
  const link = await fx.link(order.id);
  const anon = await playwrightRequest.newContext({ baseURL: fx.baseURL });
  const response = await anon.get(link);
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const html = await response.text();

  expect(html).not.toContain("e2e-private-client@example.com");
  expect(html).not.toContain(lead.phone);
  expect(html).not.toContain(lead.phone.slice(2));
  expect(html).not.toContain(lead.id);
  expect(html).toMatch(/<meta name="robots" content="[^"]*noindex/);
  expect(html).toContain('<meta name="referrer" content="no-referrer"/>');
  expect(html).not.toContain("application/ld+json");
  expect(html).not.toContain('aria-label="Хлебные крошки"');
  expect(html).toContain(`Заказ № ${order.number}`);
  await anon.dispose();
});

test("7. admin «Управление»: warnings, status panel, e-mail switch, link expiry", async ({
  page,
}, testInfo) => {
  test.skip(!isLaptop(testInfo.project.name), "Admin is checked at 1366 only");

  const { order: noEmail } = await fx.createOrder(statuses, null);
  const { order } = await fx.createOrder(statuses, "e2e-admin-flow@example.com");

  // Reuse the fixtures' admin session in the browser (Payload reads the `payload-token` cookie).
  await page.context().addCookies([{ name: "payload-token", value: fx.token, url: fx.baseURL }]);

  await page.goto(`/admin/collections/orders/${noEmail.id}/manage/`, { timeout: 120_000 });
  await expect(page.locator('[data-warning="no-email"]')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("link", { name: "Управление" })).toBeVisible();

  await page.goto(`/admin/collections/orders/${order.id}/manage/`);
  const panel = page.getByTestId("order-status-panel");
  await expect(panel).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("order-token-panel").getByRole("textbox")).toHaveValue(
    /\/zakaz\/[A-Za-z0-9_-]{22}\/$/
  );
  const jobsBefore = (await fx.statusJobs(order.id)).length;

  await panel.getByLabel("Новый статус").selectOption("packed");
  await panel.getByLabel("Комментарий клиенту").fill("Упаковали в обрешётку.");
  await panel.getByLabel("Отправить письмо клиенту").uncheck();
  await panel.getByRole("button", { name: "Сохранить статус" }).click();
  await expect.poll(async () => (await fx.getOrder(order.id)).currentStatus).toBe("packed");
  expect(await fx.statusJobs(order.id)).toHaveLength(jobsBefore);

  const link = await fx.link(order.id);
  await open(page, link);
  await expect(page.getByText("Упаковали в обрешётку.")).toBeVisible();
  await expectStates(page, "packed");

  // With the e-mail switched on, a job is queued.
  await fx.changeStatus(order.id, { status: "shipped", notify: true });
  expect(await fx.statusJobs(order.id)).toHaveLength(jobsBefore + 1);

  // «Получено»: the link expires TTL days after the received date.
  const ttl = await fx.siteSettingsTtlDays();
  await fx.setStatus(order.id, "received");
  const received = await fx.getOrder(order.id);
  const receivedAt = new Date(
    received.statusHistory.find((row) => row.status === "received")!.date
  ).getTime();
  expect(
    Math.abs(new Date(received.expiresAt!).getTime() - (receivedAt + ttl * DAY_MS))
  ).toBeLessThanOrEqual(DAY_MS);
});

test("8. access rights", async ({}, testInfo) => {
  test.skip(!isLaptop(testInfo.project.name), "API check, one project");

  const { order } = await fx.createOrder(statuses);
  const manager = await fx.createUser("manager");
  const anon = await playwrightRequest.newContext({ baseURL: fx.baseURL });
  const login = await anon.post("/api/users/login/", {
    data: { email: manager.email, password: manager.password },
  });
  expect(login.ok()).toBe(true);
  const { token } = (await login.json()) as { token: string };
  const auth = { Authorization: `JWT ${token}` };

  expect((await anon.get(`/api/orders/${order.id}/`, { headers: auth })).status()).toBe(200);
  const patch = await anon.patch(`/api/orders/${order.id}/`, {
    headers: auth,
    data: { composition: "Закалённое стекло 8 мм" },
  });
  expect(patch.status()).toBe(200);
  expect((await anon.delete(`/api/orders/${order.id}/`, { headers: auth })).status()).toBe(403);

  // Status change from another origin is rejected even with a valid session.
  const foreign = await anon.post(`/api/admin/orders/${order.id}/status/`, {
    headers: { ...auth, Origin: "https://evil.example" },
    data: { status: "in_production", date: dateKey(), notify: false },
  });
  expect(foreign.status()).toBe(403);

  const guest = await playwrightRequest.newContext({ baseURL: fx.baseURL });
  expect([401, 403]).toContain((await guest.get("/api/orders/")).status());
  expect([401, 403]).toContain((await guest.get(`/api/admin/orders/${order.id}/token/`)).status());
  expect([401, 403]).toContain(
    (
      await guest.post(`/api/admin/orders/${order.id}/token/`, {
        headers: { Origin: new URL(fx.baseURL).origin },
        data: { action: "reissue" },
      })
    ).status()
  );
  await guest.dispose();
  await anon.dispose();
});
