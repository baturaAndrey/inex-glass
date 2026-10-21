import { expect as baseExpect, test } from "@playwright/test";
import { skipOnMissingAdmin } from "./helpers/admin";
import {
  acquireFixturesLock,
  FIXTURE_OBJECTS,
  FIXTURE_TYPES,
  fixtureName,
  releaseFixturesLock,
  setupObjectsFixtures,
  teardownObjectsFixtures,
} from "./helpers/objects-fixtures";
import { VIEWPORTS } from "./helpers/viewports";
import type { ObjectsFixtures } from "./helpers/objects-fixtures";
import type { APIRequestContext, Page } from "@playwright/test";

/**
 * Portfolio (task 30): listing `/obekty/` with filters, drawer, «Показать ещё» and pagination;
 * `/obekty/page/N/`; object page with gallery, lightbox, spec and «Другие объекты».
 *
 * Runs on fixtures (`helpers/objects-fixtures.ts`): 30 published «[e2e]» objects + 1 draft,
 * created through REST before the tests and removed afterwards. The projects hold the fixtures
 * one at a time (the listing counts every published object).
 *
 * `next dev` answers the 404 body with status 200 (see `not-found-ssr.spec.ts`), and robots are
 * always `noindex, nofollow` outside production (`SITE_ENV`); the assertions adapt to both.
 */

const LOCK_TIMEOUT_MS = 15 * 60_000;
const SETUP_TIMEOUT_MS = LOCK_TIMEOUT_MS + 5 * 60_000;
const COUNT_30 = `${FIXTURE_OBJECTS} объектов`;
const TYPE_TC = FIXTURE_TYPES[0];
/** Fixture objects of the «ТЦ» type: n % 3 === 0 → 10 of 30. */
const TC_COUNT = 10;

/** The shared dev server compiles routes on first hit and runs other specs meanwhile. */
const expect = baseExpect.configure({ timeout: 20_000 });

let fixtures: ObjectsFixtures | null = null;
let api: APIRequestContext | null = null;

test.describe.configure({ mode: "default", timeout: 120_000 });

test.beforeAll(async ({ playwright }, testInfo) => {
  testInfo.setTimeout(SETUP_TIMEOUT_MS);
  await acquireFixturesLock(LOCK_TIMEOUT_MS);
  const baseURL = testInfo.project.use.baseURL;
  api = await playwright.request.newContext(baseURL ? { baseURL } : {});
  try {
    fixtures = await setupObjectsFixtures(api);
    // Object hooks invalidate the cache stale-while-revalidate: the first request after the
    // writes may still see the old index. Wait until the listing shows the fixtures.
    await expect
      .poll(async () => (await api!.get("/obekty/")).text(), { timeout: 60_000 })
      .toContain(COUNT_30);
    await expect
      .poll(async () => (await api!.get("/obekty/page/2/")).status(), { timeout: 60_000 })
      .toBe(200);
  } catch (error) {
    releaseFixturesLock();
    skipOnMissingAdmin(error);
  }
});

test.afterAll(async ({}, testInfo) => {
  testInfo.setTimeout(5 * 60_000);
  try {
    if (api && fixtures) await teardownObjectsFixtures(api, fixtures.token);
    await api?.dispose();
  } finally {
    fixtures = null;
    api = null;
    releaseFixturesLock();
  }
});

/** Dev pages ship the Next dev tools bundle; production pages never do. */
const isDevHtml = (html: string) => html.includes("next-devtools");

/** `next dev` occasionally answers with its error shell while other files recompile (HMR). */
const isDevErrorShell = (html: string) => isDevHtml(html) && html.includes('id="__next_error__"');

async function expectNotFound(request: APIRequestContext, url: string): Promise<void> {
  let response = await request.get(url, { maxRedirects: 0 });
  let html = await response.text();
  for (let attempt = 0; attempt < 3 && isDevErrorShell(html); attempt++) {
    response = await request.get(url, { maxRedirects: 0 });
    html = await response.text();
  }
  if (!isDevHtml(html)) expect(response.status()).toBe(404);
  expect(html).toMatch(/<h1[^>]*>Страница не найдена<\/h1>/);
  expect(html).toMatch(/<meta name="robots" content="noindex/);
}

/** All robots directives of the page (Next may add its own tag next to the metadata one). */
const robotsOf = async (page: Page) =>
  (
    await page
      .locator('meta[name="robots"]')
      .evaluateAll((tags) => tags.map((tag) => tag.getAttribute("content") ?? ""))
  )
    .sort()
    .join(" | ");
const canonicalOf = (page: Page) => page.locator('link[rel="canonical"]').getAttribute("href");
const cards = (page: Page) => page.locator("[data-objects-grid] > li");
const countLabel = (page: Page) => page.locator("[data-objects-count]");

async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test.describe("listing /obekty/", () => {
  test("cards, «Показать ещё», pagination and page meta", async ({ page, request }) => {
    await page.goto("/obekty/");
    await expect(page.getByRole("heading", { level: 1, name: "Объекты" })).toBeVisible();
    await expect(countLabel(page)).toHaveText(COUNT_30);
    const page1Robots = await robotsOf(page);
    expect(await canonicalOf(page)).toMatch(/\/obekty\/$/);

    // 24 cards in the DOM, 8 visible; +8 per click; the button disappears at 24.
    await expect(cards(page)).toHaveCount(24);
    await expect(cards(page).locator("visible=true")).toHaveCount(8);
    const more = page.getByRole("button", { name: "Показать ещё" });
    await more.click();
    await expect(cards(page).locator("visible=true")).toHaveCount(16);
    await more.click();
    await expect(cards(page).locator("visible=true")).toHaveCount(24);
    await expect(more).toHaveCount(0);

    // Unresolved CMS placeholders never reach the page.
    expect(await page.locator("main").innerText()).not.toMatch(/[{}]/);
    if (testInfo().project.name === VIEWPORTS.mobile.name) await expectNoHorizontalScroll(page);

    const pagination = page.getByRole("navigation", { name: "Страницы" });
    await expect(pagination.getByRole("link", { name: "Страница 2" })).toBeVisible();
    await pagination.getByRole("link", { name: "Страница 2" }).click();
    await expect(page).toHaveURL(/\/obekty\/page\/2\/$/);
    await expect(cards(page)).toHaveCount(FIXTURE_OBJECTS - 24);
    await expect(page).toHaveTitle(/— страница 2$/);
    expect(await canonicalOf(page)).toMatch(/\/obekty\/page\/2\/$/);
    // Same robots as page 1: indexable in production, env-wide noindex elsewhere.
    expect(await robotsOf(page)).toBe(page1Robots);
    await expect(page.locator('link[rel="prev"]')).toHaveAttribute("href", /\/obekty\/$/);

    const first = await request.get("/obekty/page/1/", { maxRedirects: 0 });
    expect([301, 308]).toContain(first.status());
    expect(first.headers()["location"]).toMatch(/\/obekty\/$/);
    await expectNotFound(request, "/obekty/page/9/");
    await expectNotFound(request, "/obekty/page/02/");
  });

  test("filters drawer, chips, reset, sort and noindex", async ({ page }) => {
    await page.goto("/obekty/");
    await expect(countLabel(page)).toHaveText(COUNT_30);
    await expect(cards(page).first()).toContainText(fixtureName(FIXTURE_OBJECTS));

    const filtersButton = page.getByRole("button", { name: /^Фильтры/ });
    await filtersButton.click();
    const drawer = page.getByRole("dialog", { name: "Фильтры" });
    await expect(drawer).toBeVisible();
    if (testInfo().project.name === VIEWPORTS.mobile.name) {
      const box = await drawer.boundingBox();
      expect(Math.round(box?.width ?? 0)).toBe(VIEWPORTS.mobile.width);
    }

    await drawer.getByRole("checkbox", { name: TYPE_TC.name }).check();
    await expect(page).toHaveURL(new RegExp(`[?&]type=${TYPE_TC.slug}`));
    await expect(countLabel(page)).toHaveText(`${TC_COUNT} объектов`);
    await expect(
      drawer.getByRole("button", { name: `Показать ${TC_COUNT} объектов` })
    ).toBeVisible();

    // Esc closes the drawer and returns focus to «Фильтры».
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(filtersButton).toBeFocused();
    await expect(filtersButton).toHaveAttribute("aria-expanded", "false");

    // Filtered URL: noindex, canonical /obekty/ (server meta after a reload).
    await page.reload();
    expect(await robotsOf(page)).toContain("noindex");
    expect(await canonicalOf(page)).toMatch(/\/obekty\/$/);
    await expect(cards(page)).toHaveCount(TC_COUNT);

    const chip = page.getByRole("button", { name: `Убрать фильтр ${TYPE_TC.name}` });
    await chip.click();
    await expect(page).not.toHaveURL(/type=/);
    await expect(countLabel(page)).toHaveText(COUNT_30);

    await filtersButton.click();
    await drawer.getByRole("checkbox", { name: TYPE_TC.name }).check();
    await expect(countLabel(page)).toHaveText(`${TC_COUNT} объектов`);
    await drawer.getByRole("button", { name: `Показать ${TC_COUNT} объектов` }).click();
    await expect(drawer).toBeHidden();
    await page.getByRole("button", { name: "Сбросить всё" }).click();
    await expect(page).toHaveURL(/\/obekty\/$/);
    await expect(countLabel(page)).toHaveText(COUNT_30);

    // «По алфавиту» puts «… 01» first (newest-first had «… 30»).
    await page.getByLabel("Сортировка").selectOption("az");
    await expect(page).toHaveURL(/[?&]sort=az/);
    await expect(cards(page).first()).toContainText(fixtureName(1));
  });
});

test.describe("object page", () => {
  test("gallery, lightbox, spec, side panel and related objects", async ({ page }) => {
    const object = fixtures!.objects.find((item) => item.detailed)!;
    await page.goto(`/obekty/${object.slug}/`);
    await expect(page.getByRole("heading", { level: 1, name: object.name })).toBeVisible();
    const crumbs = page.getByRole("navigation", { name: "Хлебные крошки" });
    await expect(crumbs.getByRole("link", { name: "Объекты" })).toHaveAttribute("href", "/obekty/");
    await expect(crumbs.locator('[aria-current="page"]')).toHaveText(object.name);

    // Thumbnails: 5-column grid, the active one is pressed; a click switches the main photo.
    const thumbs = page.getByRole("group", { name: "Фотографии объекта" });
    const columns = await thumbs.evaluate(
      (element) => getComputedStyle(element).gridTemplateColumns.split(" ").length
    );
    expect(columns).toBe(5);
    const main = page.locator("[data-gallery-main]");
    const firstSrc = await main.getAttribute("src");
    await thumbs.getByRole("button", { name: "Фото 2" }).click();
    await expect(thumbs.getByRole("button", { name: "Фото 2" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    await expect(main).not.toHaveAttribute("src", firstSrc ?? "");
    await thumbs.getByRole("button", { name: "Фото 1" }).click();

    // Lightbox: opens at the current photo, → moves on, Esc closes.
    await main.click();
    const lightbox = page.getByRole("dialog");
    await expect(lightbox).toBeVisible();
    await expect(lightbox.getByText("1 из 3")).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(lightbox.getByText("2 из 3")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(lightbox).toBeHidden();

    // Spec: table from 600 px, cards on phones.
    const spec = page.locator("[data-object-spec]");
    const mobile = testInfo().project.name === VIEWPORTS.mobile.name;
    if (mobile) {
      await expect(spec.locator(".ig-mcard")).toHaveCount(3);
      await expect(spec.locator(".ig-mcard").first()).toBeVisible();
      await expect(spec.locator("table")).toBeHidden();
    } else {
      await expect(spec.locator("table tbody tr")).toHaveCount(3);
      await expect(spec.locator("table")).toContainText("8+8 мм");
    }

    // Side panel: sticky on the 1366 desktop, quiz CTA with the object as `src`.
    const facts = page.locator("[data-object-facts]");
    if (testInfo().project.name === VIEWPORTS.laptop.name) {
      expect(await facts.evaluate((element) => getComputedStyle(element).position)).toBe("sticky");
    }
    const cta = facts.getByRole("link", { name: "Рассчитать похожий проект" });
    const href = (await cta.getAttribute("href")) ?? "";
    expect(new URL(href, "http://x").searchParams.get("src")).toBe(`/obekty/${object.slug}/`);
    await expect(facts.getByRole("button", { name: "Отправить чертёж" })).toBeVisible();

    // «Другие объекты»: at most 4, never the object itself.
    const related = page.locator("[data-related-objects] li a");
    const count = await related.count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(4);
    for (const link of await related.all()) {
      expect(await link.getAttribute("href")).not.toBe(`/obekty/${object.slug}/`);
    }

    if (mobile) await expectNoHorizontalScroll(page);
  });

  test("a draft object is a 404", async ({ request }) => {
    await expectNotFound(request, `/obekty/${fixtures!.draft.slug}/`);
    await expectNotFound(request, "/obekty/page/");
  });
});

/** Current test info (keeps the test bodies free of an extra parameter). */
function testInfo() {
  return test.info();
}
