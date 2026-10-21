import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Home page `/` (task 22). Precondition: `pnpm seed --minimal` then `pnpm seed --only=home --force`
 * (CI: `pnpm seed --full`). Runs in the 375 / 1366 / 1920 projects.
 */

const META = {
  h1: "Закалённое стекло и стеклянные конструкции для ваших проектов",
  title: "Inex Glass — закалённое стекло и конструкции для проектов",
  description:
    "Комплектуем объекты закалённым стеклом 4–19 мм и триплексом: проверка чертежей до запуска, заказы от 50 м², доставка по Уралу и Сибири.",
};

const H2_ORDER = [
  "Почему через нас, а не напрямую с завода",
  "Закалённое стекло и триплекс под ваш размер",
  "Вся обработка — до закалки",
  "Конструкции из стекла для объектов",
  "С кем мы работаем",
  "Как заказать",
  "Объекты",
  "Полезное для инженеров",
  "Отправьте чертёж — посчитаем стоимость и срок",
];

const PROCESSING_HREFS = [
  "/obrabotka-stekla/kromka/",
  "/obrabotka-stekla/otverstiya-i-vyrezy/",
  "/obrabotka-stekla/facet/",
  "/obrabotka-stekla/matirovanie/",
  "/obrabotka-stekla/pechat/",
  "/obrabotka-stekla/plenki/",
  "/proektirovanie/",
  "/obrabotka-stekla/otverstiya-i-vyrezy/#kalkulyator",
];

const NBSP = " ";
const FORM_HEADING = "Отправьте чертёж — посчитаем стоимость и срок";

/** Accept the cookie banner up front so it never covers the content under test. */
async function openHome(page: Page) {
  const response = await page.goto("/");
  const accept = page.getByRole("button", { name: "Принять" });
  if (await accept.isVisible().catch(() => false)) await accept.click();
  return response;
}

/** The page renders many sections and calls axe; dev servers compile on first hit. */
const TEST_TIMEOUT_MS = 120_000;

test.describe("home page", () => {
  test.describe.configure({ timeout: TEST_TIMEOUT_MS });

  test.beforeAll(async ({ request }) => {
    test.setTimeout(TEST_TIMEOUT_MS);
    const html = await (await request.get("/", { timeout: TEST_TIMEOUT_MS })).text();
    if (!html.includes("Почему через нас")) {
      throw new Error(
        "Главная не наполнена: выполните `pnpm seed --minimal` и `pnpm seed --only=home --force`"
      );
    }
  });

  test("answers 200 with the 17-meta H1, title, description and canonical", async ({
    page,
    baseURL,
  }) => {
    const response = await openHome(page);
    expect(response?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", "ru");
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toHaveText(META.h1);
    await expect(page).toHaveTitle(META.title);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      META.description
    );
    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    const origin = (process.env.SITE_URL ?? baseURL ?? "").replace(/\/+$/, "");
    expect(canonical).toBe(`${origin}/`);
  });

  test("shows «Рассчитать стоимость» on the first screen with a quiz link", async ({ page }) => {
    await openHome(page);
    const ctas = page.locator("a[href^='/raschet-stoimosti/']", {
      hasText: "Рассчитать стоимость",
    });
    const hero = page.locator("section[aria-labelledby='page-title']");
    const heroCta = hero.locator("a[data-quiz-cta]", { hasText: "Рассчитать стоимость" });
    await expect(heroCta).toHaveCount(1);
    const href = (await heroCta.getAttribute("href")) ?? "";
    expect(href.startsWith("/raschet-stoimosti/")).toBe(true);
    expect(href).toContain("src=");

    // Some primary quiz button (hero, header or the sticky bar) is inside the first viewport.
    const viewport = page.viewportSize();
    const visible = await ctas.evaluateAll(
      (nodes, height) =>
        nodes.some((node) => {
          const rect = node.getBoundingClientRect();
          return rect.width > 0 && rect.top >= 0 && rect.bottom <= height;
        }),
      viewport?.height ?? 0
    );
    expect(visible).toBe(true);
    await expect(hero.getByRole("button", { name: "Отправить чертёж" })).toBeVisible();
  });

  test("renders the sections in the prototype order", async ({ page }) => {
    await openHome(page);
    const headings = (await page.locator("main h2").allTextContents()).map((text) => text.trim());
    const order = H2_ORDER.map((title) => headings.indexOf(title));
    expect(order.every((index) => index >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  test("compares 8 stages: pairs on phones, a table on desktop", async ({ page }, testInfo) => {
    await openHome(page);
    const table = page.locator("#why [role=table]");
    await expect(table.locator("[role=row]:has([role=rowheader])")).toHaveCount(8);
    const firstLabel = table.locator("[role=cell]").first().getByText("Сами", { exact: true });
    if (testInfo.project.name === "mobile-375") {
      await expect(firstLabel).toBeVisible();
      await expect(table.locator("[role=columnheader]").first()).toBeHidden();
    } else {
      await expect(firstLabel).toBeHidden();
      await expect(
        table.getByRole("columnheader", { name: /Когда через Inex Glass/ })
      ).toBeVisible();
    }
    await expect(page.locator("#why a", { hasText: "Как мы работаем: 6 шагов" })).toHaveAttribute(
      "href",
      "/kak-zakazat/"
    );
  });

  test("shows the catalog price with its footnote, or neither", async ({ page }) => {
    await openHome(page);
    const glass = page.locator("#glass");
    const footnote = glass.getByText(/^\* Ориентировочная цена на \d{2}\.\d{2}\.\d{4}\./);
    if ((await footnote.count()) > 0) {
      await expect(glass.locator(".ig-price-m").first()).toHaveText(`от 700${NBSP}₽/м²*`);
    } else {
      await expect(glass.locator(".ig-price-m")).toHaveCount(0);
    }
    const calc = glass.locator("a[data-quiz-cta]", { hasText: "Рассчитать" });
    await expect(calc).toHaveCount(4);
    await expect(calc.nth(1)).toHaveAttribute("href", /type=triplex/);
    await expect(glass.locator("a", { hasText: "Закалённое стекло" })).toHaveAttribute(
      "href",
      "/zakalennoe-steklo/"
    );
  });

  test("links the processing tiles, constructions, segments, steps and useful cards", async ({
    page,
  }) => {
    await openHome(page);
    const tiles = page.locator("#processing ul a");
    expect(await tiles.evaluateAll((nodes) => nodes.map((a) => a.getAttribute("href")))).toEqual(
      PROCESSING_HREFS
    );
    await expect(page.locator("#constructions ul a")).toHaveCount(9);
    await expect(page.locator("#segments ul a")).toHaveCount(4);
    await expect(page.locator("#steps ol > li")).toHaveCount(6);
    await expect(page.locator("#useful ul a")).toHaveCount(4);

    const hrefs = await page
      .locator("main a[href]")
      .evaluateAll((nodes) => nodes.map((a) => a.getAttribute("href") ?? ""));
    const internal = hrefs.filter((href) => href.startsWith("/") && !href.startsWith("//"));
    const bad = internal.filter((href) => {
      const path = href.split(/[?#]/)[0] ?? "";
      return !path.endsWith("/") || path !== path.toLowerCase();
    });
    expect(bad).toEqual([]);
  });

  test("shows featured objects or the inactive fallback, and «Все объекты»", async ({ page }) => {
    await openHome(page);
    const objects = page.locator("#objects");
    await expect(objects.locator("a", { hasText: "Все объекты" })).toHaveAttribute(
      "href",
      "/obekty/"
    );
    const list = objects.locator("ul[data-objects]");
    if ((await list.getAttribute("data-objects")) === "fallback") {
      await expect(list.locator("li")).toHaveCount(8);
      await expect(list.locator("a")).toHaveCount(0);
      await expect(list).toContainText("ТРК «Родник»");
    } else {
      expect(await list.locator("li").count()).toBeLessThanOrEqual(8);
    }
  });

  test("opens the drawing form from the hero and the steps; final form is unchecked", async ({
    page,
  }) => {
    await openHome(page);
    for (const scope of ["section[aria-labelledby='page-title']", "#steps"]) {
      await page.locator(scope).getByRole("button", { name: "Отправить чертёж" }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
    }
    const formSection = page.locator("section", {
      has: page.getByRole("heading", { name: FORM_HEADING }),
    });
    await expect(formSection.getByRole("button", { name: "Получить расчёт" })).toBeVisible();
    await expect(formSection.getByRole("checkbox").first()).not.toBeChecked();
  });

  test("outputs Organization + 2 LocalBusiness JSON-LD", async ({ page }) => {
    await openHome(page);
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const items = blocks.flatMap((text) => {
      const data = JSON.parse(text) as unknown;
      return Array.isArray(data) ? data : [data];
    }) as Array<{ "@type"?: string }>;
    expect(items.filter((item) => item["@type"] === "Organization")).toHaveLength(1);
    expect(items.filter((item) => item["@type"] === "LocalBusiness")).toHaveLength(2);
    expect(items.filter((item) => item["@type"] === "BreadcrumbList")).toHaveLength(0);
  });

  test("fits the viewport, keeps placeholders out and passes axe", async ({ page }, testInfo) => {
    await openHome(page);
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

    if (testInfo.project.name === "desktop-1920") {
      const width = await page.locator("#glass > div").evaluate((el) => {
        const style = getComputedStyle(el);
        return el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      });
      expect(width).toBeLessThanOrEqual(1920 - 2 * 70);
      const sectionWidth = await page.locator("#glass").evaluate((el) => el.clientWidth);
      expect(sectionWidth).toBe(clientWidth);
    }

    const text = await page.locator("main").innerText();
    expect(text).not.toMatch(/[{}]/);

    const results = await new AxeBuilder({ page }).include("main").analyze();
    const critical = results.violations.filter((violation) => violation.impact === "critical");
    expect(critical.map((violation) => violation.id)).toEqual([]);

    await page.screenshot({
      path: testInfo.outputPath(`home-${testInfo.project.name}.png`),
      fullPage: true,
    });
  });
});
