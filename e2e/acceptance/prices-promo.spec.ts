import { expect, test } from "@playwright/test";
import {
  groupThousands,
  htmlTitle,
  jsonLdNodes,
  normalizeSpaces,
  okJson,
  staffContext,
} from "../helpers/acceptance-admin";
import { createStaffUser, deleteStaffUser, loginAdmin, skipOnMissingAdmin } from "../helpers/admin";
import { dateKey } from "../helpers/orders-fixtures";
import { clientIpHeaders, uniqueTestIp } from "../helpers/test-ip";
import { VIEWPORTS } from "../helpers/viewports";
import type { StaffUser } from "../helpers/admin";
import type { APIRequestContext, Page, TestInfo } from "@playwright/test";

/**
 * Acceptance scenarios 7 and 8 (task 42, ТЗ §2.1, §4.1, §4.2): reference values come from ONE
 * place and reach the site without a redeploy (tag invalidation, `expire: 0`).
 *
 * 7. Prices, edited by a MANAGER: a new 10 mm price + today's date → `/zakalennoe-steklo/10-mm/`
 *    (title, caption, `AggregateOffer`), the hub and the quiz estimate show it; a date older than
 *    45 days → «Цена по расчёту», no price in the title, no `AggregateOffer`, no quiz estimate.
 * 8. Promo, edited by a MANAGER: on → header plate, «Акции» link, caption under the price, quiz
 *    hint (≥ threshold area); end date yesterday / switched off → all of it disappears.
 *
 * These globals are SHARED by every spec on the stand: the suite is serial, runs only in
 * desktop-1366, keeps each mutation window short and ALWAYS restores the original documents
 * (after each scenario and again in `afterAll`), then checks that the page shows them again.
 */

const PRICE_PAGE = "/zakalennoe-steklo/10-mm/";
const HUB = "/zakalennoe-steklo/";
const QUIZ = "/raschet-stoimosti/?type=tempered&thick=10&vid=clear";
const STALE_LABEL = "Цена по расчёту";
const QUIZ_AREA = 80;
const PROMO_AREA = 120;
/** Fields Payload adds to a global document that must not be posted back. */
const SYSTEM_FIELDS = ["id", "createdAt", "updatedAt", "globalType", "_status"] as const;

type Json = Record<string, unknown>;
type PriceRow = { thickness: number; priceFrom: number | null; onRequest: boolean };

test.describe.configure({ mode: "serial", timeout: 600_000 });

let active = false;
let admin: APIRequestContext;
let adminToken: string;
let manager: StaffUser | null = null;
let asManager: APIRequestContext;
let originalPrices: Json;
let originalPromo: Json;

const onlyLaptop = (testInfo: TestInfo) => testInfo.project.name === VIEWPORTS.laptop.name;

const stripSystem = (doc: Json): Json => {
  const copy: Json = { ...doc };
  for (const key of SYSTEM_FIELDS) delete copy[key];
  return copy;
};

const asDate = (key: string) => `${key}T12:00:00.000Z`;
const formatRu = (key: string) => key.split("-").reverse().join(".");

async function saveGlobal(api: APIRequestContext, slug: string, data: Json): Promise<void> {
  await okJson(await api.post(`/api/globals/${slug}/`, { data }), `update ${slug}`);
}

async function restoreOriginals(): Promise<void> {
  await saveGlobal(admin, "prices", stripSystem(originalPrices));
  await saveGlobal(admin, "promo", stripSystem(originalPromo));
}

test.beforeAll(async ({ request, baseURL }, testInfo) => {
  if (!onlyLaptop(testInfo)) return;
  test.setTimeout(180_000);
  try {
    const session = await loginAdmin(request);
    adminToken = session.token;
    admin = await staffContext(baseURL ?? "", session.token);
    manager = await createStaffUser(request, session.token, "manager", "TEST Менеджер цен");
    asManager = await staffContext(baseURL ?? "", manager.token);
  } catch (error) {
    skipOnMissingAdmin(error);
  }
  originalPrices = await okJson<Json>(await admin.get("/api/globals/prices/?depth=0"), "prices");
  originalPromo = await okJson<Json>(await admin.get("/api/globals/promo/?depth=0"), "promo");
  active = true;
});

test.afterAll(async ({ request }, testInfo) => {
  if (!active || !onlyLaptop(testInfo)) return;
  test.setTimeout(180_000);
  await restoreOriginals();
  const prices = await okJson<Json>(await admin.get("/api/globals/prices/?depth=0"), "prices");
  const promo = await okJson<Json>(await admin.get("/api/globals/promo/?depth=0"), "promo");
  expect(stripVolatile(prices)).toEqual(stripVolatile(originalPrices));
  expect(stripVolatile(promo)).toEqual(stripVolatile(originalPromo));
  console.warn(
    `[prices-promo] restored: priceDate=${String(prices.priceDate)} ` +
      `10mm=${String(rowOf(prices, 10)?.priceFrom)} promo.active=${String(promo.active)} ` +
      `promo.endDate=${String(promo.endDate)}`
  );
  if (manager) await deleteStaffUser(request, adminToken, manager.id);
  await asManager?.dispose();
  await admin?.dispose();
});

function stripVolatile(doc: Json): Json {
  const copy = stripSystem(doc);
  return JSON.parse(JSON.stringify(copy)) as Json;
}

function rowOf(prices: Json, thickness: number): PriceRow | undefined {
  return (prices.rows as PriceRow[] | undefined)?.find((row) => row.thickness === thickness);
}

function pricesWith(price10: number, priceDateKey: string): Json {
  const data = stripSystem(originalPrices);
  data.rows = (originalPrices.rows as PriceRow[]).map((row) =>
    row.thickness === 10 ? { ...row, priceFrom: price10, onRequest: false } : row
  );
  data.priceDate = asDate(priceDateKey);
  return data;
}

/** Raw HTML of a page as an anonymous visitor (fresh render after the tag invalidation). */
async function html(request: APIRequestContext, url: string): Promise<string> {
  const response = await request.get(url);
  expect(response.status(), url).toBe(200);
  return response.text();
}

const visibleText = (raw: string) =>
  normalizeSpaces(
    raw
      .replace(/<script[\s\S]*?<\/script>/g, " ")
      .replace(/<style[\s\S]*?<\/style>/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
  );

const aggregateOffers = (raw: string) =>
  jsonLdNodes(raw).filter((node) => node["@type"] === "AggregateOffer");

/** Opens the quiz page pre-filled with tempered 10 mm and goes to step 3 with `area` m². */
async function quizStep3(page: Page, testInfo: TestInfo, area: number) {
  await page.setExtraHTTPHeaders(clientIpHeaders(uniqueTestIp(testInfo)));
  await page.addInitScript(() => window.localStorage.setItem("inex-consent-v1", "necessary"));
  const token = page.waitForResponse((response) => response.url().includes("/api/form-token/"));
  await page.goto(QUIZ);
  await token; // hydrated
  const quiz = page.locator("[data-slot=quiz]");
  const next = quiz.getByRole("button", { name: "Далее", exact: true });
  await next.click();
  await expect(quiz.getByRole("progressbar", { name: "Прогресс" })).toHaveAttribute(
    "aria-valuenow",
    "2"
  );
  await next.click();
  await expect(quiz.getByRole("progressbar", { name: "Прогресс" })).toHaveAttribute(
    "aria-valuenow",
    "3"
  );
  await quiz.getByLabel("Площадь, м²").fill(String(area));
  return quiz;
}

test("7. prices: manager edit reaches the thickness page, hub and quiz; 45-day rule", async ({
  page,
  request,
}, testInfo) => {
  test.skip(!onlyLaptop(testInfo), "mutates shared globals: desktop-1366 only");
  const original10 = rowOf(originalPrices, 10)?.priceFrom ?? 1400;
  // An unusual number: it cannot be on the page by accident.
  const price = original10 + 37;
  const today = dateKey();

  try {
    // --- Fresh price, set by the manager ---------------------------------------------------
    await saveGlobal(asManager, "prices", pricesWith(price, today));

    const thickness = await html(request, PRICE_PAGE);
    expect(htmlTitle(thickness)).toContain(`от ${groupThousands(price)} ₽/м²`);
    expect(visibleText(thickness)).toContain(`Ориентировочная цена на ${formatRu(today)}`);
    const offers = aggregateOffers(thickness);
    expect(offers, "Product/AggregateOffer with a fresh price").toHaveLength(1);
    expect(offers[0]?.lowPrice).toBe(price);

    expect(visibleText(await html(request, HUB))).toContain(`от ${groupThousands(price)}`);

    const quiz = await quizStep3(page, testInfo, QUIZ_AREA);
    await expect(page.locator("[data-price-state]")).toHaveAttribute("data-price-state", "price");
    const estimate = page.locator("[data-slot=quiz-estimate]");
    await expect(estimate).toBeVisible();
    expect(normalizeSpaces((await estimate.textContent()) ?? "")).toContain(
      groupThousands(Math.round(QUIZ_AREA * price))
    );
    await testInfo.attach("quiz-estimate-fresh", {
      body: await quiz.screenshot(),
      contentType: "image/png",
    });

    // --- Price date older than 45 days → «Цена по расчёту» everywhere ----------------------
    const staleDays = Number(originalPrices.staleAfterDays ?? 45) + 1;
    await saveGlobal(asManager, "prices", pricesWith(price, dateKey(-staleDays)));

    const stale = await html(request, PRICE_PAGE);
    expect(htmlTitle(stale)).not.toContain("₽");
    expect(htmlTitle(stale)).not.toContain(groupThousands(price));
    expect(visibleText(stale)).toContain(STALE_LABEL);
    expect(visibleText(stale)).not.toContain(`от ${groupThousands(price)}`);
    expect(aggregateOffers(stale), "no AggregateOffer for a stale price").toHaveLength(0);

    await quizStep3(page, testInfo, QUIZ_AREA);
    await expect(page.locator("[data-price-state]")).toHaveAttribute("data-price-state", "calc");
    await expect(page.locator("[data-slot=quiz-estimate]")).toHaveCount(0);
  } finally {
    await saveGlobal(admin, "prices", stripSystem(originalPrices));
  }

  // Restored: the original price is back without a redeploy.
  const restored = await html(request, PRICE_PAGE);
  const originalRow = rowOf(originalPrices, 10);
  if (originalRow?.priceFrom && aggregateOffers(restored).length > 0) {
    expect(htmlTitle(restored)).toContain(`от ${groupThousands(originalRow.priceFrom)} ₽/м²`);
  }
  expect(htmlTitle(restored)).not.toContain(groupThousands(price));
});

test("8. promo: on → plate, «Акции», caption, quiz hint; ended / off → all gone", async ({
  page,
  request,
}, testInfo) => {
  test.skip(!onlyLaptop(testInfo), "mutates shared globals: desktop-1366 only");
  const base = stripSystem(originalPromo);
  const text =
    typeof originalPromo.text === "string" && originalPromo.text.trim() !== ""
      ? originalPromo.text
      : "−5% на закалённое стекло при заказе от 100 м²";
  const threshold = Number(originalPromo.thresholdArea ?? 100);
  const area = Math.max(PROMO_AREA, threshold);
  const promoOn = {
    ...base,
    active: true,
    text,
    startDate: asDate(dateKey(-5)),
    endDate: asDate(dateKey(30)),
  };

  const expectPromo = async (shown: boolean) => {
    await page.goto(PRICE_PAGE);
    const plate = page.locator(".ig-badge--promo", { hasText: text });
    const actions = page.getByRole("navigation", { name: "Основное" }).getByRole("link", {
      name: "Акции",
      exact: true,
    });
    const caption = page.locator("[data-passport-promo]");
    if (shown) {
      await expect(plate.first()).toBeVisible();
      await expect(actions).toBeVisible();
      await expect(caption).toContainText(text);
    } else {
      await expect(plate).toHaveCount(0);
      await expect(actions).toHaveCount(0);
      await expect(caption).toHaveCount(0);
    }
    const quiz = await quizStep3(page, testInfo, area);
    const hint = quiz.locator('[data-slot=quiz-hint][data-variant="promo"]');
    if (shown) await expect(hint).toContainText(text);
    else await expect(hint).toHaveCount(0);
    // The hub carries the plate / link as well (one source, every page).
    const hub = visibleText(await html(request, HUB));
    if (shown) expect(hub).toContain(text);
    else expect(hub).not.toContain(text);
  };

  try {
    await saveGlobal(asManager, "promo", promoOn);
    await expectPromo(true);
    await testInfo.attach("promo-on", {
      body: await page.screenshot(),
      contentType: "image/png",
    });

    // Ended yesterday: hidden by the date alone.
    await saveGlobal(asManager, "promo", { ...promoOn, endDate: asDate(dateKey(-1)) });
    await expectPromo(false);

    // Switched off while the dates are current.
    await saveGlobal(asManager, "promo", { ...promoOn, active: false });
    await expectPromo(false);
  } finally {
    await saveGlobal(admin, "promo", base);
  }
});
