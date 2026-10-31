import { expect, request as playwrightRequest, test } from "@playwright/test";
import {
  createTestLead,
  eraseLeads,
  leadStatusId,
  shortTag,
  staffContext,
} from "../helpers/acceptance-admin";
import {
  annotateManualMail,
  IS_STAGING,
  MAIL_INTERCEPT_TO,
  MAIL_ENABLED,
  onlyProject,
} from "../helpers/acceptance-env";
import { skipOnMissingAdmin } from "../helpers/admin";
import { Mailpit, mailLinks, mailText } from "../helpers/mailpit";
import { dateKey, OrdersFixtures } from "../helpers/orders-fixtures";
import type { MailMessage } from "../helpers/mailpit";
import type { APIRequestContext, Page } from "@playwright/test";

/**
 * Acceptance scenario 5 (task 42, ТЗ §6.2): lead → «Договор» → order `ГГГГ-NNNN` + client link;
 * `/zakaz/<token>/` without login; each status change (with comment and date) mails the client
 * a link; «Упаковано» + 3 photos → gallery «1 из 3»; «Отгружено» + carrier/waybill → «Скопировать»
 * → «Скопировано»; «Получено»; revoke → «Ссылка больше не действует…»; reissue → the new link
 * works, the old one does not. The page never shows the client's phone/e-mail, answers
 * `Cache-Control: private, no-store` and is noindex.
 *
 * The end-to-end flow (mutating, mail) runs once, in desktop-1366; the page rendering of a
 * finished order (gallery, copy) is checked at every width. Data: lead `TEST Приёмка <tag>`
 * (erased afterwards), orders/files/jobs removed by `OrdersFixtures.cleanup()`.
 * Mail checks need `MAILPIT_URL`; otherwise they are `[ЧЕЛОВЕК]`.
 */

const INVALID_TEXT = "Ссылка больше не действует — свяжитесь с менеджером";
const LABELS = {
  spec_agreed: "Спецификация согласована",
  in_production: "В производстве",
  packed: "Упаковано",
  shipped: "Отгружено",
  received: "Получено",
} as const;
const CARRIER = "ПЭК";
const WAYBILL = "TEST-0042-77";

test.describe.configure({ mode: "serial", timeout: 600_000 });

let fx: OrdersFixtures;
let api: APIRequestContext;
let mail: Mailpit | null = null;
let statuses: { newId: string; contractId: string };
const leads = new Set<string>();
const mails: string[] = [];

const formatRu = (key: string) => key.split("-").reverse().join(".");

test.beforeAll(async ({ baseURL }) => {
  test.setTimeout(300_000);
  try {
    fx = await OrdersFixtures.login(baseURL ?? "");
  } catch (error) {
    skipOnMissingAdmin(error);
  }
  api = await staffContext(fx.baseURL, fx.token);
  mail = await Mailpit.connect();
  // The real seeded statuses («Новая», «Договор» with isContract); own ones on a bare stand.
  const newId = await leadStatusId(api, "[slug][equals]=new");
  const contractId = await leadStatusId(api, "[isContract][equals]=true");
  statuses = newId && contractId ? { newId, contractId } : await fx.createStatuses();
});

test.afterAll(async () => {
  test.setTimeout(300_000);
  await fx?.cleanup(); // orders (+ jobs) first: a lead with an order cannot be erased
  if (api) {
    await eraseLeads(api, leads);
    await api.dispose();
  }
  if (mail) {
    await mail.deleteMessages(mails);
    await mail.dispose();
  }
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("inex-consent-v1", "necessary"));
});

/** Lead → «Договор» → the order created by the lifecycle hook. */
async function orderFromContract(tag: string, email: string | null) {
  const lead = await createTestLead(api, { tag, email, status: statuses.newId });
  leads.add(lead.id);
  await fx.setLeadStatus(lead.id, statuses.contractId);
  const [order] = await fx.ordersOfLead(lead.id);
  if (!order) throw new Error("no order was created when the lead moved to «Договор»");
  return { lead, order };
}

const steps = (page: Page) => page.getByRole("list", { name: "Этапы заказа" }).locator("> li");

async function expectCurrent(page: Page, label: string, done = false) {
  const item = steps(page).filter({ hasText: label });
  await expect(item).toHaveClass(done ? /is-done/ : /is-current/);
}

async function openOrder(page: Page, link: string) {
  const response = await page.goto(link);
  expect(response?.status(), link).toBe(200);
  return response!;
}

async function expectInvalid(page: Page, link: string) {
  const response = await page.goto(link);
  expect(response?.status(), link).toBe(404);
  await expect(page.getByRole("heading", { level: 1, name: INVALID_TEXT })).toBeVisible();
}

test("5. order flow: «Договор» → link → statuses with mail → photos → shipment → revoke/reissue", async ({
  page,
  context,
}, testInfo) => {
  onlyProject(testInfo, undefined, "end-to-end flow with mail runs once (desktop-1366)");
  if (!MAIL_ENABLED) annotateManualMail(testInfo, "письма клиенту о смене статуса заказа");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);

  const tag = shortTag();
  const { lead, order } = await orderFromContract(tag, `test-accept-${tag}@example.com`);
  const year = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Yekaterinburg",
    year: "numeric",
  }).format(new Date());
  expect(order.number).toMatch(new RegExp(`^${year}-\\d{4}$`));
  let link = await fx.link(order.id);
  expect(link).toMatch(/^\/zakaz\/[A-Za-z0-9_-]{22}\/$/);

  /** The client mail of a status: subject, the link to the CURRENT order page, no client data. */
  async function expectStatusMail(label: string, contains: readonly string[] = []) {
    if (!mail) return;
    // Staging: the mail goes to the interceptor, the client address moves into the subject.
    const recipient = MAIL_INTERCEPT_TO ?? lead.email;
    const message: MailMessage = await mail.waitFor(
      `to:${recipient}`,
      (candidate) => candidate.Subject.includes(label) && candidate.Subject.includes(order.number)
    );
    mails.push(message.ID);
    expect(message.To.map((to) => to.Address)).toContain(recipient);
    if (MAIL_INTERCEPT_TO) expect(message.Subject).toContain(`[STAGING → ${lead.email}]`);
    expect(message.Subject).toContain(order.number);
    const paths = mailLinks(message.HTML).flatMap((href) => {
      try {
        return [new URL(href).pathname];
      } catch {
        return [];
      }
    });
    expect(paths, "the mail links the order page").toContain(link);
    const text = mailText(message.HTML);
    for (const fragment of contains) expect(text).toContain(fragment);
    expect(text).not.toContain(lead.phone.slice(2));
  }

  // --- «Спецификация согласована»: the page opens without login --------------------------
  const anonymous = await playwrightRequest.newContext({ baseURL: fx.baseURL });
  const raw = await anonymous.get(link);
  expect(raw.status()).toBe(200);
  const cacheControl = raw.headers()["cache-control"] ?? "";
  expect(cacheControl).toContain("private");
  expect(cacheControl).toContain("no-store");
  const html = await raw.text();
  const metaNoindex = /<meta name="robots" content="[^"]*noindex/.test(html);
  const headerNoindex = (raw.headers()["x-robots-tag"] ?? "").includes("noindex");
  expect(metaNoindex || headerNoindex, "noindex meta or X-Robots-Tag").toBe(true);
  expect(html).not.toContain(lead.email!);
  expect(html).not.toContain(lead.phone);
  expect(html).not.toContain(lead.phone.slice(2));
  await anonymous.dispose();

  await openOrder(page, link);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Заказ № ${order.number}`);
  await expect(steps(page)).toHaveCount(5);
  await expectCurrent(page, LABELS.spec_agreed);
  await expectStatusMail(LABELS.spec_agreed);

  // --- «В производстве» with a comment and a planned date ---------------------------------
  const comment = `TEST ${tag}: заказ запущен в производство.`;
  const planned = dateKey(10);
  const production = await fx.changeStatus(order.id, {
    status: "in_production",
    date: dateKey(),
    plannedDate: planned,
    comment,
    notify: true,
  });
  expect(production.status(), await production.text()).toBe(200);
  await openOrder(page, link);
  await expectCurrent(page, LABELS.in_production);
  await expect(page.getByText(comment)).toBeVisible();
  await expect(steps(page).filter({ hasText: LABELS.in_production })).toContainText(
    formatRu(dateKey())
  );
  await expectStatusMail(LABELS.in_production, [comment]);

  // --- «Упаковано» + 3 photos → gallery with lightbox «1 из 3» -----------------------------
  const photos = [
    await fx.uploadFile("photo", 0),
    await fx.uploadFile("photo", 1),
    await fx.uploadFile("photo", 2),
  ];
  await fx.updateOrder(order.id, { packPhotos: photos.map((photo) => ({ photo })) });
  expect(
    (await fx.changeStatus(order.id, { status: "packed", date: dateKey(), notify: true })).status()
  ).toBe(200);
  await openOrder(page, link);
  await expectCurrent(page, LABELS.packed);
  const thumbs = page.getByRole("button", { name: /^Открыть фото упаковки \d$/ });
  await expect(thumbs).toHaveCount(3);
  await thumbs.first().click();
  const dialog = page.getByRole("dialog", { name: "Фото упаковки" });
  await expect(dialog.getByText("1 из 3")).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(dialog.getByText("2 из 3")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expectStatusMail(LABELS.packed);

  // --- «Отгружено» + carrier / waybill → «Скопировать» → «Скопировано» ---------------------
  await fx.updateOrder(order.id, { shipment: { carrier: CARRIER, waybill: WAYBILL } });
  expect(
    (await fx.changeStatus(order.id, { status: "shipped", date: dateKey(), notify: true })).status()
  ).toBe(200);
  await openOrder(page, link);
  await expectCurrent(page, LABELS.shipped);
  const shipment = page.locator("section", {
    has: page.getByRole("heading", { name: "Отгрузка" }),
  });
  await expect(shipment).toContainText(CARRIER);
  await expect(shipment).toContainText(WAYBILL);
  await shipment.getByRole("button", { name: "Скопировать" }).click();
  await expect(shipment.getByRole("button", { name: "Скопировано" })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(WAYBILL);
  await expectStatusMail(LABELS.shipped, [WAYBILL]);

  // --- «Получено» ----------------------------------------------------------------------
  expect(
    (
      await fx.changeStatus(order.id, { status: "received", date: dateKey(), notify: true })
    ).status()
  ).toBe(200);
  await openOrder(page, link);
  await expectCurrent(page, LABELS.received, true);
  await expectStatusMail(LABELS.received);
  // Nothing of the client's contacts at the final state either.
  const finalHtml = await page.content();
  expect(finalHtml).not.toContain(lead.email!);
  expect(finalHtml).not.toContain(lead.phone.slice(2));
  await testInfo.attach("order-received", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });

  // --- Revoke → invalid; reissue → the new link works, the old one does not ---------------
  await fx.tokenAction(order.id, "revoke");
  await expectInvalid(page, link);
  const reissued = await fx.tokenAction(order.id, "reissue");
  const newLink = new URL(reissued.url ?? "", fx.baseURL).pathname;
  expect(newLink).not.toBe(link);
  await openOrder(page, newLink);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Заказ № ${order.number}`);
  await expectInvalid(page, link);
  link = newLink;
});

test("5b. a shipped order renders gallery and copy at every width", async ({
  page,
  context,
  browserName,
}) => {
  const { order } = await orderFromContract(shortTag(), null);
  const photos = [
    await fx.uploadFile("photo", 0),
    await fx.uploadFile("photo", 1),
    await fx.uploadFile("photo", 2),
  ];
  await fx.updateOrder(order.id, {
    packPhotos: photos.map((photo) => ({ photo })),
    shipment: { carrier: CARRIER, waybill: WAYBILL },
  });
  await fx.setStatus(order.id, "shipped");
  const link = await fx.link(order.id);

  await openOrder(page, link);
  const thumbs = page.getByRole("button", { name: /^Открыть фото упаковки \d$/ });
  await expect(thumbs).toHaveCount(3);
  await thumbs.first().click();
  await expect(
    page.getByRole("dialog", { name: "Фото упаковки" }).getByText("1 из 3")
  ).toBeVisible();
  await page.keyboard.press("Escape");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow, "no horizontal scroll").toBeLessThanOrEqual(0);
  if (browserName === "chromium") {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const shipment = page.locator("section", {
      has: page.getByRole("heading", { name: "Отгрузка" }),
    });
    await shipment.getByRole("button", { name: "Скопировать" }).click();
    await expect(shipment.getByRole("button", { name: "Скопировано" })).toBeVisible();
  }
  // Staging is noindex anyway; on every stand the order page itself must be.
  if (!IS_STAGING) {
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  }
});
