import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { VIEWPORTS } from "./helpers/viewports";

/**
 * Constructions slice (task 26): the hub and six construction pages on the `ConstructionPage`
 * template. Precondition: `pnpm seed --minimal` then `pnpm seed --only=constructions --force`
 * (CI's `pnpm seed --full` includes the slice).
 */

interface PageCase {
  url: string;
  h1: string;
  title: string;
  description: string;
  crumb: string;
  primary: string;
  /** Secondary button label (opens a dialog), `null` when the page has none. */
  secondary: string | null;
  quizType: string;
  faq: number;
}

const PAGES: PageCase[] = [
  {
    url: "/steklyannye-konstrukcii/",
    h1: "Стеклянные конструкции для объектов",
    title: "Стеклянные конструкции — проект и комплектация | Inex Glass",
    description:
      "Перегородки, ограждения, душевые, козырьки и фасады: проектируем узлы, комплектуем стекло, профиль и фурнитуру. Монтаж — ваша бригада.",
    crumb: "Стеклянные конструкции",
    primary: "Рассчитать стоимость",
    secondary: "Отправить проект",
    quizType: "other",
    faq: 0,
  },
  {
    url: "/steklyannye-peregorodki/",
    h1: "Стеклянные перегородки для офисов и коммерческих объектов",
    title: "Стеклянные перегородки для офисов — комплект с узлами | Inex Glass",
    description:
      "Цельностеклянные и в алюминиевом профиле: стекло, профиль и фурнитура одним заказом, проверка узлов до запуска. Объекты от 50 м².",
    crumb: "Стеклянные перегородки",
    primary: "Рассчитать комплект",
    secondary: "Отправить планировку",
    quizType: "partitions",
    faq: 5,
  },
  {
    url: "/dushevye-peregorodki/",
    h1: "Душевые перегородки для проектов",
    title: "Душевые перегородки для гостиниц и спортобъектов | Inex Glass",
    description:
      "Душевые перегородки партиями для гостиниц, фитнес-клубов и арен: одинаковые конфигурации, фурнитура одной партии.",
    crumb: "Душевые перегородки",
    primary: "Рассчитать партию",
    secondary: "Отправить проект",
    quizType: "shower",
    faq: 0,
  },
  {
    url: "/steklyannye-ograzhdeniya/",
    h1: "Стеклянные ограждения и перила",
    title: "Стеклянные ограждения и перила — стекло с профилем | Inex Glass",
    description:
      "Ограждения для лестниц, атриумов и балконов: закалённое стекло или триплекс под нагрузку, профиль и фурнитура одним заказом.",
    crumb: "Ограждения и перила",
    primary: "Рассчитать комплект",
    secondary: "Отправить проект",
    quizType: "railings",
    faq: 0,
  },
  {
    url: "/steklyannye-kozyrki/",
    h1: "Стеклянные козырьки",
    title: "Стеклянный козырёк — триплекс под нагрузку | Inex Glass",
    description:
      "Козырьки над входом на тягах и спайдерах: подберём триплекс под снеговую нагрузку, стекло и крепления одним заказом.",
    crumb: "Стеклянные козырьки",
    primary: "Рассчитать козырёк",
    secondary: "Отправить проект",
    quizType: "canopies",
    faq: 3,
  },
  {
    url: "/torgovye-vitriny/",
    h1: "Торговые витрины на заказ",
    title: "Торговые витрины из стекла на заказ | Inex Glass",
    description:
      "Стеклянные витрины для магазинов, ювелирных салонов и торговых центров — на заказ по вашему проекту, партией на все точки сети.",
    crumb: "Торговые витрины",
    primary: "Рассчитать стоимость",
    secondary: "Отправить проект",
    quizType: "shopfronts",
    faq: 0,
  },
  {
    url: "/furnitura/",
    h1: "Зажимной профиль и спайдерная фурнитура",
    title: "Зажимной профиль для стекла и спайдеры | Inex Glass",
    description:
      "Профиль и точечные крепления для ограждений, козырьков и фасадов — в одном заказе со стеклом, изготовленным под этот профиль.",
    crumb: "Зажимной профиль и спайдеры",
    primary: "Рассчитать комплект",
    secondary: null,
    quizType: "other",
    faq: 0,
  },
];

const isMobile = (name: string) => name === VIEWPORTS.mobile.name;

/** JSON-LD `@type`s of the page. */
async function jsonLdTypes(page: Page): Promise<string[]> {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  return blocks.flatMap((text) => {
    const data = JSON.parse(text) as { "@type"?: string } | Array<{ "@type"?: string }>;
    return (Array.isArray(data) ? data : [data]).map((item) => item["@type"] ?? "");
  });
}

/** The cookie banner overlaps content on phones: dismiss it before clicking. */
async function dismissCookieBanner(page: Page) {
  const button = page.getByRole("button", { name: "Только необходимые" });
  if (await button.isVisible().catch(() => false)) await button.click();
}

const hero = (page: Page) => page.locator("section[aria-labelledby='page-title']");

test.describe("constructions", () => {
  test.beforeAll(async ({ request }) => {
    const response = await request.get("/steklyannye-peregorodki/");
    expect(response.status(), "seed: pnpm seed --only=constructions --force").toBe(200);
  });

  for (const item of PAGES) {
    test(`${item.url}: meta, hero, crumbs, JSON-LD, conditions`, async ({ page }, testInfo) => {
      const response = await page.goto(item.url);
      expect(response?.status()).toBe(200);

      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("h1")).toHaveText(item.h1);
      await expect(page).toHaveTitle(item.title);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        "content",
        item.description
      );
      const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
      expect(new URL(canonical ?? "").pathname).toBe(item.url);
      const robots = await page.locator('meta[name="robots"]').getAttribute("content");
      if (process.env.SITE_ENV === "production") expect(robots ?? "").not.toContain("noindex");

      const crumbs = hero(page).getByRole("navigation", { name: "Хлебные крошки" });
      await expect(crumbs.locator('[aria-current="page"]')).toHaveText(item.crumb);
      await expect(crumbs.getByRole("link", { name: "Главная" })).toBeVisible();

      const types = await jsonLdTypes(page);
      expect(types).toContain("BreadcrumbList");
      expect(types.includes("FAQPage")).toBe(item.faq > 0);

      const primary = hero(page).locator("a[data-quiz-cta]");
      await expect(primary).toHaveCount(1);
      await expect(primary).toHaveText(item.primary);
      await expect(primary.locator("svg.lucide-calculator")).toHaveCount(1);
      const href = new URL((await primary.getAttribute("href")) ?? "", "http://x");
      expect(href.pathname).toBe("/raschet-stoimosti/");
      expect(href.searchParams.get("type")).toBe(item.quizType);
      expect(href.searchParams.get("src")).toBe(item.url);

      const secondary = hero(page).locator("[data-form-trigger]");
      if (item.secondary === null) {
        await expect(secondary).toHaveCount(0);
      } else {
        await expect(secondary).toHaveText(item.secondary);
        await dismissCookieBanner(page);
        await secondary.click();
        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();
        await expect(dialog.getByRole("heading", { name: item.secondary })).toBeVisible();
        await page.keyboard.press("Escape");
      }

      const text = (await page.locator("main").innerText()) ?? "";
      expect(text).not.toMatch(/[{}]/);
      expect(text).not.toMatch(/ждёт ответа|Каталог конфигураций/);
      await expect(page.getByRole("heading", { name: "Условия", level: 2 })).toBeVisible();

      if (isMobile(testInfo.project.name)) {
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth
        );
        expect(overflow).toBeLessThanOrEqual(0);
      }
    });
  }

  test("hub: cards, who-does-what, inex.su strip, «Почему комплект»", async ({ page }) => {
    await page.goto("/steklyannye-konstrukcii/");
    const cards = page.locator("section", {
      has: page.getByRole("heading", { name: "Конструкции", exact: true }),
    });
    await expect(cards.locator("a.ig-card")).toHaveCount(7);
    for (const href of [
      "/steklyannye-peregorodki/",
      "/steklyannye-ograzhdeniya/",
      "/steklyannye-kozyrki/",
      "/dushevye-peregorodki/",
      "/torgovye-vitriny/",
      "/zerkala/",
      "/osteklenie/",
    ]) {
      await expect(cards.locator(`a[href="${href}"]`)).toHaveCount(1);
    }
    const who = page.locator("[data-section='who-does-what']");
    await expect(who.getByRole("heading", { name: "Кто что делает" })).toBeVisible();
    await expect(who.locator("[data-who='inex'] li")).toHaveCount(4);
    await expect(who.locator("[data-who='team'] li")).toHaveCount(3);
    const strip = page.locator("[data-inex-su-strip]");
    await expect(strip).toContainText("Нужен монтаж «под ключ»?");
    const link = strip.getByRole("link", { name: "inex.su" });
    await expect(link).toHaveAttribute("href", "https://inex.su/");
    await expect(link).toHaveAttribute("target", "_blank");
    expect(await link.getAttribute("rel")).toContain("noopener");
    await expect(
      page.getByRole("heading", { name: "Почему комплект, а не стекло отдельно" })
    ).toBeVisible();
  });

  test("partitions: systems, plates, risk callout, documents, bridge, FAQ", async ({
    page,
  }, testInfo) => {
    await page.goto("/steklyannye-peregorodki/");
    const systems = page.locator("[data-systems-count]");
    await expect(systems.locator("article")).toHaveCount(4);
    if (isMobile(testInfo.project.name)) {
      const strip = await systems.evaluate((el) => ({
        scrollable: el.scrollWidth > el.clientWidth,
        snap: getComputedStyle(el).scrollSnapType,
      }));
      expect(strip.scrollable).toBe(true);
      expect(strip.snap).toContain("x");
      await expect(systems).toHaveAttribute("role", "region");
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(overflow).toBeLessThanOrEqual(0);
    }
    await expect(page.locator("[data-profile-plates] li")).toHaveCount(6);
    const risk = page.locator("[data-section='risk']");
    await expect(risk).toContainText("Главный риск — проём");
    await expect(risk.locator("ol > li")).toHaveCount(3);
    await expect(
      page
        .locator("[data-column='documents']")
        .getByRole("heading", { name: "Документы для сдачи объекта" })
    ).toBeVisible();
    await expect(page.locator("[data-column='objects']")).toContainText("Сургутнефтегаз");
    await expect(page.locator("[data-inex-su-strip]")).toBeVisible();

    const faq = page.locator("[data-section='faq']");
    const buttons = faq.locator("button[aria-expanded]");
    await expect(buttons).toHaveCount(5);
    await expect(buttons.first()).toHaveAttribute("aria-expanded", "true");
    await dismissCookieBanner(page);
    for (let index = 1; index < 5; index++) {
      await buttons.nth(index).click();
      await expect(buttons.nth(index)).toHaveAttribute("aria-expanded", "true");
    }
  });

  test("railings: systems table and the load table", async ({ page }, testInfo) => {
    await page.goto("/steklyannye-ograzhdeniya/");
    const systems = page.locator("#sistemy");
    if (isMobile(testInfo.project.name)) {
      await expect(systems.locator(".ig-mcard")).toHaveCount(3);
      await expect(systems.locator("table")).toBeHidden();
    } else {
      await expect(systems.locator("table tbody tr")).toHaveCount(3);
    }
    const load = page.locator("section", {
      has: page.getByRole("heading", { name: "Нагрузка и нормы" }),
    });
    await expect(load.locator("table tbody tr")).toHaveCount(3);
  });

  test("canopies: 3 labelled schemes, dark snow section, dialog", async ({ page }) => {
    await page.goto("/steklyannye-kozyrki/");
    const schemes = page.locator("[data-systems-count] svg[role='img']");
    await expect(schemes).toHaveCount(3);
    for (let index = 0; index < 3; index++) {
      expect(await schemes.nth(index).getAttribute("aria-label")).toMatch(/^Схема /);
    }
    const snow = page.locator("[data-section='snow-calc']");
    await expect(snow.getByRole("heading", { name: "Расчёт под снег" })).toBeVisible();
    expect(await snow.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(
      "rgb(22, 64, 61)"
    );
    await dismissCookieBanner(page);
    await snow.getByRole("button", { name: "Отправить проект на расчёт" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("showers: configurations section", async ({ page }) => {
    await page.goto("/dushevye-peregorodki/");
    const section = page.locator("[data-section='shower-configs']");
    await expect(section.getByRole("heading", { name: "Конфигурации" })).toBeVisible();
    const fallback = section.locator("[data-shower-fallback] li");
    const cards = section.locator("article.ig-card");
    expect((await fallback.count()) === 5 || (await cards.count()) > 0).toBe(true);
  });

  test("shopfronts: four text sections and the ordered «Как заказать» list", async ({ page }) => {
    await page.goto("/torgovye-vitriny/");
    for (const heading of [
      "Только по вашему проекту",
      "Стекло для витрины",
      "Для торговых сетей",
      "Как заказать",
    ]) {
      await expect(
        page.getByRole("heading", { name: heading, level: 2, exact: true })
      ).toBeVisible();
    }
    const order = page.locator("section", {
      has: page.getByRole("heading", { name: "Как заказать", exact: true }),
    });
    await expect(order.locator("ol > li")).toHaveCount(3);
  });

  test("hardware: «Что поставляем» table, no secondary hero button", async ({ page }, testInfo) => {
    await page.goto("/furnitura/");
    const table = page.locator("section", {
      has: page.getByRole("heading", { name: "Что поставляем" }),
    });
    const rows = isMobile(testInfo.project.name)
      ? table.locator(".ig-mcard")
      : table.locator("table tbody tr");
    await expect(rows).toHaveCount(3);
    await expect(hero(page).locator("[data-form-trigger]")).toHaveCount(0);
  });

  for (const url of [
    "/steklyannye-konstrukcii/",
    "/steklyannye-peregorodki/",
    "/steklyannye-kozyrki/",
  ]) {
    test(`${url}: no critical accessibility violations`, async ({ page }) => {
      await page.goto(url);
      const results = await new AxeBuilder({ page }).analyze();
      const critical = results.violations.filter((violation) => violation.impact === "critical");
      expect(critical.map((violation) => violation.id)).toEqual([]);
    });
  }
});
