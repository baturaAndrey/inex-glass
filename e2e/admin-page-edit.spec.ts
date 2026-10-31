import { expect, test } from "@playwright/test";
import { skipOnMissingAdmin } from "./helpers/admin";
import { adminApi, signInBrowser } from "./helpers/admin-api";
import { VIEWPORTS } from "./helpers/viewports";
import type { AdminApi } from "./helpers/admin-api";
import type { APIRequestContext, Locator, Page } from "@playwright/test";

/**
 * Page edit form of the admin (task 07, admin redesign): live SEO counters (70 / 170), the search
 * snippet preview, «Изменена / Кем» in the sidebar and saving over the soft limit.
 *
 * Runs at 1366 only (admin UI), serially: the tests share one draft page created through REST
 * under the e2e admin (unique slug `e2e-page-<ts>`) and deleted in `afterAll`.
 */

test.describe.configure({ mode: "serial" });

const RUN = Date.now().toString(36);
const SLUG = `e2e-page-${RUN}`;
const PAGE_TITLE = `E2E страница ${RUN}`;
const SEO_TITLE = "Закалённое стекло на заказ";
const LONG_TITLE = "Закалённое стекло на заказ по чертежу: проверка, упаковка, доставка от 50м";

let apiContext: APIRequestContext | undefined;
let admin: AdminApi;
let pageId: string;

test.beforeAll(async ({ playwright, baseURL }, testInfo) => {
  test.skip(testInfo.project.name !== VIEWPORTS.laptop.name, "Admin UI is checked at 1366 only");
  // A context of our own: the hook's `request` fixture is disposed when the hook ends.
  apiContext = await playwright.request.newContext({ baseURL: baseURL! });
  try {
    admin = await adminApi(apiContext);
  } catch (error) {
    skipOnMissingAdmin(error);
  }
  const response = await admin.post("/api/pages/?draft=true", {
    title: PAGE_TITLE,
    slug: SLUG,
    template: "generic",
    _status: "draft",
  });
  expect(response.status(), `create page: ${await response.text()}`).toBe(201);
  pageId = ((await response.json()) as { doc: { id: string } }).doc.id;
});

test.afterAll(async () => {
  if (admin && pageId) await admin.delete(`/api/pages/${pageId}/`).catch(() => undefined);
  await apiContext?.dispose();
});

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== VIEWPORTS.laptop.name, "Admin UI is checked at 1366 only");
});

/** Opens the page form on the «SEO» tab. */
async function openSeoTab(page: Page, baseURL: string): Promise<void> {
  await signInBrowser(page.context(), admin, baseURL);
  await page.goto(`/admin/collections/pages/${pageId}/`);
  await page.locator(".tabs-field__tab-button", { hasText: "SEO" }).click();
  await expect(seoTitleInput(page)).toBeVisible();
}

const seoTitleInput = (page: Page): Locator => page.locator("#field-seo__title");
const seoDescriptionInput = (page: Page): Locator => page.locator("#field-seo__description");

/** The counter rendered by `afterInput` inside the field wrapper of `input`. */
const counterOf = (page: Page, input: Locator): Locator =>
  page.locator(".field-type", { has: input }).last().locator(".iga-seo-counter");

const snippet = (page: Page): Locator => page.getByTestId("seo-snippet");

/** Saves the draft through the header button; resolves with the save response status. */
async function saveDraft(page: Page): Promise<number> {
  const [response] = await Promise.all([
    page.waitForResponse(
      (res) =>
        res.url().includes(`/api/pages/${pageId}`) &&
        ["POST", "PATCH"].includes(res.request().method())
    ),
    page.getByRole("button", { name: "Сохранить черновик" }).click(),
  ]);
  return response.status();
}

test("SEO counters: «N / 70» and «N / 170», over the limit is highlighted", async ({
  page,
  baseURL,
}) => {
  await openSeoTab(page, baseURL!);

  const titleCounter = counterOf(page, seoTitleInput(page));
  await seoTitleInput(page).fill(SEO_TITLE);
  await expect(titleCounter).toHaveText("26 / 70");
  await expect(titleCounter).toHaveAttribute("data-state", "ok");

  await seoTitleInput(page).fill("я".repeat(75));
  await expect(titleCounter).toHaveAttribute("data-state", "over");
  await expect(titleCounter).toContainText("75 / 70");
  await expect(titleCounter).toContainText("длиннее рекомендованного");

  const descriptionCounter = counterOf(page, seoDescriptionInput(page));
  await expect(descriptionCounter).toHaveText("0 / 170");
  await expect(descriptionCounter).toHaveAttribute("data-state", "empty");
  await seoDescriptionInput(page).fill("Проверим чертёж до закалки.");
  await expect(descriptionCounter).toHaveText("27 / 170");
});

test("snippet preview follows the SEO fields", async ({ page, baseURL }) => {
  await openSeoTab(page, baseURL!);
  const host = new URL(baseURL!).host;

  await seoTitleInput(page).fill(SEO_TITLE);
  await expect(snippet(page).locator(".iga-snippet__title-text")).toHaveText(SEO_TITLE);
  const url = snippet(page).locator(".iga-snippet__url");
  await expect(url).toContainText(host);
  await expect(url).toContainText(SLUG);
  await expect(snippet(page)).toContainText("Описание не заполнено");

  await seoTitleInput(page).fill("");
  await expect(snippet(page).locator(".iga-snippet__title-text")).toHaveText(
    `${PAGE_TITLE} | Inex Glass`
  );
  await expect(snippet(page)).toContainText("(из названия страницы)");

  await seoTitleInput(page).fill("Стекло {N} мм");
  await expect(snippet(page)).toContainText("Метки в фигурных скобках");

  await page.locator("#field-seo__noindex").check();
  await expect(snippet(page).locator(".iga-badge--no")).toHaveText("Закрыта от индексации");
});

test("«Кем изменена» shows the e2e admin after saving a draft", async ({ page, baseURL }) => {
  await openSeoTab(page, baseURL!);
  await seoTitleInput(page).fill(SEO_TITLE);
  expect(await saveDraft(page)).toBe(200);

  const updatedBy = page.getByTestId("updated-by");
  await expect(updatedBy).toContainText("Кем");
  await expect(updatedBy).toContainText(admin.user.name);
  await expect(updatedBy).toContainText(/Изменена\s*\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}/);
});

test("a title over the soft limit does not block saving", async ({ page, baseURL }) => {
  expect([...LONG_TITLE].length).toBeGreaterThan(70);
  await openSeoTab(page, baseURL!);
  await seoTitleInput(page).fill(LONG_TITLE);
  await expect(counterOf(page, seoTitleInput(page))).toHaveAttribute("data-state", "over");
  expect(await saveDraft(page)).toBe(200);

  const saved = await admin.json<{ seo?: { title?: string } }>(
    `/api/pages/${pageId}/?draft=true&depth=0`
  );
  expect(saved.seo?.title).toBe(LONG_TITLE);
});

test("visual: page form at 1366 (artifact for the acceptance)", async ({ page, baseURL }) => {
  await signInBrowser(page.context(), admin, baseURL!);
  await page.goto(`/admin/collections/pages/${pageId}/`);
  await expect(page.locator(".document-fields")).toBeVisible();
  const path = test.info().outputPath("admin-page-edit-1366.png");
  await page.screenshot({ path, fullPage: true });
  await test.info().attach("admin-page-edit-1366", { path, contentType: "image/png" });
});
