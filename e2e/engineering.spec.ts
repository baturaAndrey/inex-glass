import { expect, test, type Page } from "@playwright/test";
import { DESIGN, PRODUCTION } from "../src/seed/content/engineering";

/**
 * `/proektirovanie/` and `/proizvodstvo/` (Paper mockups `2560_proektirovanie` /
 * `2560_proizvodstvo`, slice `engineering`). Runs in the three viewport projects against a
 * seeded database (`pnpm seed --only=engineering`).
 */

test.describe.configure({ timeout: 120_000 });

const PAGES = [DESIGN.page, PRODUCTION.page] as const;

const isMobile = (page: Page) => (page.viewportSize()?.width ?? 0) <= 599;

for (const item of PAGES) {
  test(`${item.path}: 200, h1, meta, crumbs, no placeholders`, async ({ page }) => {
    const response = await page.goto(item.path);
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toHaveText(item.seo.h1);
    await expect(page).toHaveTitle(item.seo.title);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      item.seo.description
    );
    const crumbs = page.getByRole("navigation", { name: /крошки/i }).first();
    await expect(crumbs).toContainText("Главная");
    await expect(crumbs).toContainText(item.breadcrumbLabel);

    const text = await page.locator("main").innerText();
    expect(text).not.toMatch(/[{}]|\[уточнить|\[…\]/u);
    expect(text).not.toMatch(/собственн\S*\s+производств/iu);
    expect(text).not.toMatch(/не выполня/iu);
  });
}

test.describe("/proektirovanie/", () => {
  test("sections of the mockup", async ({ page }) => {
    await page.goto(DESIGN.page.path);
    const main = page.locator("main");
    const hero = main.getByTestId("processing-hero");
    await expect(hero.getByRole("button", { name: DESIGN.taskLabel })).toBeVisible();
    await expect(hero.getByRole("link", { name: DESIGN.objectsLabel })).toHaveAttribute(
      "href",
      "/obekty/"
    );

    await expect(main.getByTestId("facts-light")).toContainText("Для кого");
    await expect(main.getByTestId("engineering-problems").locator("li")).toHaveCount(5);
    const levels = main.getByTestId("engineering-levels");
    await expect(levels.getByRole("heading", { level: 3 })).toHaveText([
      DESIGN.levels.left,
      DESIGN.levels.right,
    ]);
    await expect(
      main.getByTestId("engineering-cards-top").getByRole("link", { name: "Производство" })
    ).toHaveAttribute("href", "/proizvodstvo/");
    await expect(main.getByTestId("engineering-scope").locator("tbody tr")).toHaveCount(5);
    await expect(
      main.getByTestId("engineering-team").getByRole("heading", { level: 2 })
    ).toHaveText(DESIGN.team.heading);
    const steps = main.getByTestId("engineering-steps-big").locator("ol > li");
    await expect(steps).toHaveCount(8);
    await expect(
      steps.nth(6).getByRole("link", { name: "Как устроено производство" })
    ).toHaveAttribute("href", "/proizvodstvo/");

    const panel = main.getByTestId("drawing-panel");
    await expect(panel.getByRole("heading", { level: 2 })).toHaveText(DESIGN.form.heading);
    await expect(panel).toContainText("платная услуга");
    await expect(panel.getByRole("button", { name: DESIGN.form.submitLabel })).toBeVisible();
    // The «drawing» form: no city / area fields.
    await expect(panel.getByLabel("Город доставки")).toHaveCount(0);
  });

  test("hero button opens the drawing dialog", async ({ page }) => {
    await page.goto(DESIGN.page.path);
    await page
      .getByTestId("processing-hero")
      .getByRole("button", { name: DESIGN.taskLabel })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });
});

test.describe("/proizvodstvo/", () => {
  test("sections of the mockup", async ({ page }) => {
    await page.goto(PRODUCTION.page.path);
    const main = page.locator("main");
    const hero = main.getByTestId("processing-hero");
    await expect(hero.getByRole("link", { name: "Рассчитать стоимость" })).toBeVisible();
    await expect(hero.getByRole("button", { name: PRODUCTION.projectLabel })).toBeVisible();

    const facts = main.getByTestId("facts-dark");
    await expect(facts).toContainText("800 м²");
    await expect(
      main.getByTestId("engineering-cards-side").locator(":scope > ul > li")
    ).toHaveCount(4);
    const zones = main.getByTestId("engineering-zones");
    await expect(zones.getByRole("heading", { level: 3 })).toHaveCount(5);
    await expect(main.getByTestId("engineering-crane")).toContainText("кран-балкой");
    await expect(main.getByTestId("engineering-partners").locator("tbody tr")).toHaveCount(3);

    const steps = main.getByTestId("engineering-steps-circle").locator("ol > li");
    await expect(steps).toHaveCount(5);
    await expect(steps.first().getByRole("link", { name: "Проектирование" })).toHaveAttribute(
      "href",
      "/proektirovanie/"
    );
    await expect(steps.last().getByRole("link", { name: "Упаковка и доставка" })).toHaveAttribute(
      "href",
      "/kak-zakazat/upakovka-i-dostavka/"
    );

    const site = main.getByTestId("engineering-site");
    await expect(site).toContainText("Челябинск");
    await expect(site.locator("li")).toHaveCount(6);

    const montage = main.getByTestId("engineering-montage");
    await expect(montage).toContainText("шеф-монтаж");
    await expect(montage.getByRole("button", { name: PRODUCTION.projectLabel })).toBeVisible();

    const panel = main.getByTestId("drawing-panel");
    await expect(panel.getByRole("heading", { level: 2 })).toHaveText(PRODUCTION.form.heading);
    await expect(panel.getByRole("button", { name: PRODUCTION.form.submitLabel })).toBeVisible();
  });

  test("zones stack on phones", async ({ page }) => {
    test.skip(!isMobile(page), "phone layout only");
    await page.goto(PRODUCTION.page.path);
    const items = page.getByTestId("engineering-zones").locator("ol > li h3");
    const first = await items.nth(0).boundingBox();
    const second = await items.nth(1).boundingBox();
    expect(second && first ? second.y > first.y : false).toBe(true);
  });
});

test("home links lead to both pages", async ({ page }) => {
  await page.goto("/");
  for (const href of ["/proektirovanie/", "/proizvodstvo/"]) {
    await expect(page.locator(`main a[href="${href}"]`).first()).toBeAttached();
  }
});
