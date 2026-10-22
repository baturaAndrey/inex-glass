import { expect, test } from "@playwright/test";
import { skipOnMissingAdmin } from "./helpers/admin";
import {
  adminApi,
  createLead,
  deleteDocs,
  deleteStaffApi,
  signInBrowser,
  staffApi,
  uniquePhone,
} from "./helpers/admin-api";
import { VIEWPORTS } from "./helpers/viewports";
import type { AdminApi } from "./helpers/admin-api";
import type { Lead } from "../src/payload-types";
import type { APIRequestContext, Page } from "@playwright/test";

/**
 * Admin dashboard (`/admin/`, task 04 of specs/admin-redesign): sections of the approved mockup,
 * «Требует внимания» links, the period switch and the latest leads. Fixture-mutating tests run
 * serially at 1366 only; the phone check (375) only reads. Fixtures carry a per-run marker in
 * `company` and are removed in `afterAll`.
 */

test.describe.configure({ mode: "serial" });

const RUN = `e2e-dash-${Date.now().toString(36)}`;
const COMPANY = `ООО «${RUN}»`;

const SECTION_TITLES = [
  "Требует внимания",
  "Пульс",
  "Воронка заявок",
  "Источники",
  "Заказы в работе",
  "Последние заявки",
] as const;

async function expectSections(page: Page) {
  for (const title of SECTION_TITLES) {
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  }
}

test.describe("dashboard (1366)", () => {
  let apiContext: APIRequestContext | undefined;
  let admin: AdminApi;
  let manager: AdminApi | undefined;
  let leadQuiz: Lead;
  const leadIds = new Set<string>();

  test.beforeAll(async ({ playwright, baseURL }, testInfo) => {
    test.skip(testInfo.project.name !== VIEWPORTS.laptop.name, "Admin UI is checked at 1366");
    apiContext = await playwright.request.newContext({ baseURL: baseURL! });
    try {
      admin = await adminApi(apiContext);
    } catch (error) {
      skipOnMissingAdmin(error);
    }
    // Two new leads without an assignee (the default status is set by the collection hook).
    leadQuiz = await createLead(admin, {
      formType: "quiz",
      company: COMPANY,
      name: "Дашборд Первый",
      phone: uniquePhone(),
      area: 120,
      productType: "facade",
    });
    const second = await createLead(admin, {
      formType: "callback",
      company: `${COMPANY} второй`,
      name: "Дашборд Второй",
      phone: uniquePhone(),
    });
    for (const lead of [leadQuiz, second]) leadIds.add(lead.id);
  });

  test.afterAll(async () => {
    if (admin) {
      await deleteDocs(admin, "leads", leadIds);
      if (manager) await deleteStaffApi(admin, manager);
    }
    await apiContext?.dispose();
  });

  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== VIEWPORTS.laptop.name, "Admin UI is checked at 1366");
  });

  test("sections and «Новые без ответственного»", async ({ page, context, baseURL }) => {
    await signInBrowser(context, admin, baseURL!);
    await page.goto("/admin/");

    await expect(page.getByRole("heading", { level: 1, name: "Дашборд" })).toBeVisible();
    await expect(page.getByRole("searchbox", { name: "Поиск по заявкам" })).toBeVisible();
    await expect(page.getByRole("link", { name: "На сайт" })).toBeVisible();
    await expectSections(page);

    const unassigned = page.locator('a[data-attention="unassigned"]');
    await expect(unassigned).toContainText("Новые без ответственного");
    const value = Number((await unassigned.locator("[data-value]").innerText()).replace(/\D/g, ""));
    expect(value).toBeGreaterThanOrEqual(2);
    await expect(page.locator(".iga-att")).toHaveCount(5);

    await unassigned.click();
    await expect(page).toHaveURL(/\/admin\/collections\/leads\/\?.*assignee/);
    await expect(page.getByText(COMPANY, { exact: true }).first()).toBeVisible();
  });

  test("«Последние заявки» link to the lead summary", async ({ page, context, baseURL }) => {
    await signInBrowser(context, admin, baseURL!);
    await page.goto("/admin/");
    const row = page.locator(`tr[data-lead="${leadQuiz.id}"]`);
    await expect(row).toBeVisible();
    await expect(row).toContainText("Квиз");
    await expect(row).toContainText("120 м²");
    await expect(row).toContainText("не назначен");
    const link = row.getByRole("link", { name: COMPANY });
    await expect(link).toHaveAttribute("href", `/admin/collections/leads/${leadQuiz.id}/summary/`);
  });

  test("period switch keeps the report period", async ({ page, context, baseURL }) => {
    await signInBrowser(context, admin, baseURL!);
    await page.goto("/admin/");
    const periods = page.getByRole("navigation", { name: "Период" });
    await expect(periods.getByRole("link", { name: "30 дней" })).toHaveAttribute(
      "aria-current",
      "page"
    );

    await periods.getByRole("link", { name: "7 дней" }).click();
    await expect(page).toHaveURL(/\/admin\/\?period=7d$/);
    await expect(
      page.getByRole("navigation", { name: "Период" }).getByRole("link", { name: "7 дней" })
    ).toHaveAttribute("aria-current", "page");
    await expect(page.getByText("сравнение с предыдущими 7 днями")).toBeVisible();

    const funnel = page.locator('section[aria-labelledby="iga-dash-funnel-h"]');
    await expect(funnel.getByRole("link", { name: "подробнее →" })).toHaveAttribute(
      "href",
      "/admin/leads-report/?period=7d"
    );
    // The quiz lead of this run is counted under «Квиз».
    const sources = page.locator('section[aria-labelledby="iga-dash-sources-h"]');
    await expect(sources).toContainText("Квиз");
  });

  test("a manager sees the dashboard", async ({ page, context, baseURL }) => {
    manager = await staffApi(admin, "manager");
    await signInBrowser(context, manager, baseURL!);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const response = await page.goto("/admin/");
    expect(response?.status()).toBe(200);
    await expectSections(page);
    await expect(page.getByText("Не удалось загрузить данные")).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});

test.describe("dashboard (375)", () => {
  test("no horizontal page scroll, cards in one column", async ({
    page,
    context,
    baseURL,
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name !== VIEWPORTS.mobile.name, "Phone layout is checked at 375");
    let admin: AdminApi;
    try {
      admin = await adminApi(request);
    } catch (error) {
      skipOnMissingAdmin(error);
      return;
    }
    await signInBrowser(context, admin, baseURL!);
    await page.goto("/admin/");
    await expectSections(page);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);

    const lefts = await page
      .locator(".iga-att")
      .evaluateAll((cards) => cards.map((card) => Math.round(card.getBoundingClientRect().left)));
    expect(lefts.length).toBeGreaterThan(1);
    expect(new Set(lefts).size).toBe(1);
  });
});
