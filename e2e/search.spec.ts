import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { VIEWPORTS } from "./helpers/viewports";

/**
 * Task 35: site search — header suggestions (desktop field / phone overlay), the results page
 * `/poisk/` (noindex, pagination, empty state, XSS safety), the 404 search form and the public
 * JSON endpoint. Runs against the full seed (`pnpm seed --full`), indexed by the search plugin
 * during the seed (or `pnpm payload run scripts/reindex-search.ts`).
 */

const SEARCH = "/poisk/";
const PARTITIONS_URL = "/steklyannye-peregorodki/";
const XSS = "<img src=x onerror=alert(1)>";
const NOTHING = "щъщъщъ";
/** Generous: the dev server compiles routes on first hit and is slow under parallel load. */
const NAV_TIMEOUT = 60_000;

const isPhone = (testInfo: TestInfo) => testInfo.project.name === VIEWPORTS.mobile.name;

/** The header search field of the current viewport (phone: opens the overlay first). */
async function headerSearchField(page: Page, testInfo: TestInfo) {
  if (isPhone(testInfo)) {
    await page.getByRole("button", { name: "Поиск по сайту" }).click();
    return page.getByRole("dialog").getByRole("combobox");
  }
  return page.getByRole("banner").getByRole("combobox");
}

/** Fails the test if any script opens a dialog (e.g. an injected `alert`). */
function forbidDialogs(page: Page) {
  page.on("dialog", (dialog) => {
    void dialog.dismiss();
    throw new Error(`unexpected dialog: ${dialog.message()}`);
  });
}

test.describe("site search", () => {
  // The dev server compiles routes on first hit; navigations get NAV_TIMEOUT each.
  test.describe.configure({ timeout: 120_000 });

  test("header suggestions → Enter opens the results page", async ({ page }, testInfo) => {
    await page.goto("/");
    const field = await headerSearchField(page, testInfo);
    await field.fill("перегор");

    const listbox = page.getByRole("listbox", { name: "Поиск по сайту" });
    await expect(listbox).toBeVisible({ timeout: NAV_TIMEOUT });
    const options = listbox.getByRole("option");
    expect(await options.count()).toBeLessThanOrEqual(6);
    await expect(options.first()).toContainText("перегородки");
    await expect(field).toHaveAttribute("aria-expanded", "true");

    await field.press("Enter");
    await page.waitForURL(/\/poisk\/\?q=/, { timeout: NAV_TIMEOUT });
    expect(new URL(page.url()).searchParams.get("q")).toBe("перегор");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Результаты по запросу «перегор»"
    );
    await expect(
      page.getByTestId("search-results").locator(`a[href="${PARTITIONS_URL}"]`)
    ).toBeVisible();
  });

  test("suggestions are keyboard-operable", async ({ page }, testInfo) => {
    await page.goto("/");
    const field = await headerSearchField(page, testInfo);
    await field.fill("перегородки");
    const first = page.getByRole("listbox", { name: "Поиск по сайту" }).getByRole("option").first();
    await expect(first).toBeVisible({ timeout: NAV_TIMEOUT });

    await field.press("ArrowDown");
    await expect(first).toHaveAttribute("aria-selected", "true");
    await expect(field).toHaveAttribute("aria-activedescendant", (await first.getAttribute("id"))!);

    await field.press("Escape");
    await expect(field).toHaveAttribute("aria-expanded", "false");

    await field.press("ArrowDown");
    await expect(first).toHaveAttribute("aria-selected", "true");
    await field.press("Enter");
    await page.waitForURL((url) => url.pathname !== "/" && !url.pathname.startsWith(SEARCH), {
      timeout: NAV_TIMEOUT,
    });
  });

  test("a blank query is not submitted", async ({ page }, testInfo) => {
    await page.goto("/");
    const field = await headerSearchField(page, testInfo);
    await field.fill("   ");
    await field.press("Enter");
    await page.waitForTimeout(500);
    expect(new URL(page.url()).pathname).toBe("/");
  });

  test("results page: noindex, snippets, pagination", async ({ page }) => {
    await page.goto(`${SEARCH}?q=${encodeURIComponent("стекло")}`);
    await expect(page).toHaveTitle("Поиск по сайту | Inex Glass");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /follow/);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);

    const results = page.getByTestId("search-results");
    await expect(results.locator("ol > li").first()).toBeVisible();
    await expect(results.locator("mark").first()).toBeVisible();
    // The search form keeps the query.
    await expect(page.getByTestId("search-form").getByRole("searchbox")).toHaveValue("стекло");

    const pagination = page.getByRole("navigation", { name: "Страницы результатов" });
    if ((await pagination.count()) > 0) {
      await pagination.getByRole("link", { name: "2", exact: true }).click();
      await page.waitForURL(/page=2/, { timeout: NAV_TIMEOUT });
      await expect(
        page
          .getByRole("navigation", { name: "Страницы результатов" })
          .locator('[aria-current="page"]')
      ).toHaveText("2");
    }
  });

  test("empty result: message, sections and the quiz CTA", async ({ page }) => {
    await page.goto(`${SEARCH}?q=${encodeURIComponent(NOTHING)}`);
    const empty = page.getByTestId("search-empty");
    await expect(empty).toContainText(`Ничего не найдено по запросу «${NOTHING}»`);
    await expect(
      empty.getByRole("navigation", { name: "Разделы сайта" }).getByRole("link")
    ).toHaveCount(6);
    await expect(empty.getByRole("link", { name: "Рассчитать стоимость" })).toBeVisible();
  });

  test("the query is rendered as text (XSS)", async ({ page }) => {
    forbidDialogs(page);
    await page.goto(`${SEARCH}?q=${encodeURIComponent(XSS)}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      `Результаты по запросу «${XSS}»`
    );
    await expect(page.locator('img[src="x"]')).toHaveCount(0);
    const html = await page.content();
    expect(html).not.toContain(XSS);
  });

  test("404 page has a working search form", async ({ page }) => {
    await page.goto("/net-takoj-stranicy-poisk/");
    const form = page.getByRole("main").getByTestId("search-form");
    await expect(form).toBeVisible();
    await expect(
      page.getByRole("main").getByRole("navigation", { name: "Разделы сайта" })
    ).toBeVisible();
    // The 404 body is re-mounted by the client not-found boundary on hydration (see
    // not-found-response.tsx), which wipes a value typed too early: retry until it sticks.
    const field = form.getByRole("searchbox");
    await expect(async () => {
      await field.fill("перегородки");
      await page.waitForTimeout(1000);
      await expect(field).toHaveValue("перегородки", { timeout: 100 });
    }).toPass({ timeout: 30_000 });
    await form.getByRole("button", { name: "Найти" }).click();
    await page.waitForURL(/\/poisk\/\?q=/, { timeout: NAV_TIMEOUT });
    await expect(page.getByTestId("search-results")).toBeVisible();
  });

  test("screenshots of /poisk/ and the 404 search", async ({ page }, testInfo) => {
    await page.goto(`${SEARCH}?q=${encodeURIComponent("закалённое стекло")}`);
    await expect(page.getByTestId("search-results")).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("poisk.png"), fullPage: true });
    await page.goto(`${SEARCH}?q=${encodeURIComponent(NOTHING)}`);
    await page.screenshot({ path: testInfo.outputPath("poisk-empty.png"), fullPage: true });
    await page.goto("/net-takoj-stranicy-poisk/");
    await page.screenshot({ path: testInfo.outputPath("404.png"), fullPage: true });
    // No horizontal page scroll at any width.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe("search endpoints", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== VIEWPORTS.laptop.name, "HTTP checks: one project");
  });

  test("/api/site-search/ answers JSON hits; the plugin REST is closed", async ({ request }) => {
    const ok = await request.get(`/api/site-search/?q=${encodeURIComponent("закалённое")}&limit=3`);
    expect(ok.status()).toBe(200);
    expect(ok.headers()["cache-control"]).toContain("max-age=60");
    const { hits } = (await ok.json()) as { hits: Array<{ url: string; kind: string }> };
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.length).toBeLessThanOrEqual(3);
    expect(hits.every((hit) => hit.url.startsWith("/"))).toBe(true);

    // ё/е give the same answer.
    const plain = await request.get(
      `/api/site-search/?q=${encodeURIComponent("закаленное")}&limit=3`
    );
    expect((await plain.json()) as unknown).toEqual({ hits });

    const short = await request.get(`/api/site-search/?q=${encodeURIComponent("я")}`);
    expect(short.status()).toBe(400);

    const rest = await request.get("/api/search/?limit=1");
    expect([401, 403, 404]).toContain(rest.status());
    const restBody = await rest.text();
    expect(restBody).not.toContain('"docs":[{');
  });
});
