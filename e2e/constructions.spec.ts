import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { VIEWPORTS } from "./helpers/viewports";

/**
 * Constructions slice (task 26): the hub and six construction pages. The hub and the five
 * construction pages follow the Paper mockups (`2560_steklyannye-konstrukcii`,
 * `2560_steklyannye-peregorodki`); «Зажимной профиль» keeps the task-26 template. Precondition: `pnpm seed --minimal` then `pnpm seed --only=constructions --force`
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
  /**
   * Paper layout (mockups `2560_steklyannye-konstrukcii` / `2560_steklyannye-peregorodki`):
   * crumbs above the hero and no conditions section (the hero lists the terms, the cream block
   * meets the footer).
   */
  paper?: true;
}

const PAGES: PageCase[] = [
  {
    url: "/steklyannye-konstrukcii/",
    h1: "Стеклянные конструкции для объектов",
    title: "Стеклянные конструкции — проект и комплектация | Inex Glass",
    description:
      "Перегородки, ограждения, душевые, козырьки и фасады: проектируем узлы, комплектуем стекло, профиль и фурнитуру. Монтаж — бригада-партнёр или шеф-монтаж.",
    crumb: "Стеклянные конструкции",
    primary: "Рассчитать стоимость",
    secondary: "Отправить проект",
    quizType: "other",
    faq: 0,
    paper: true,
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
    paper: true,
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
    paper: true,
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
    paper: true,
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
    paper: true,
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
    paper: true,
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
    paper: true,
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

      const crumbs = (item.paper ? page.locator("main") : hero(page)).getByRole("navigation", {
        name: "Хлебные крошки",
      });
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
      await expect(page.getByRole("heading", { name: "Условия", level: 2 })).toHaveCount(
        item.paper ? 0 : 1
      );

      if (isMobile(testInfo.project.name)) {
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth
        );
        expect(overflow).toBeLessThanOrEqual(0);
      }
    });
  }

  test("hub: photo cards, «Монтаж» panel, cream block, objects", async ({ page }) => {
    await page.goto("/steklyannye-konstrukcii/");
    const heroSection = hero(page);
    await expect(heroSection.getByRole("list", { name: "Условия" }).locator("li")).toHaveCount(4);
    await expect(heroSection.getByTestId("construction-intro")).toContainText(
      "Подберём проверенную монтажную бригаду или проведём шеф-монтаж с вашими специалистами."
    );

    const cards = page.getByTestId("construction-cards");
    await expect(cards.getByRole("heading", { name: "Конструкции", level: 2 })).toBeVisible();
    await expect(cards.getByTestId("construction-card")).toHaveCount(7);
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
    // Seed photos (not generated placeholders), each with a descriptive alt.
    const photos = cards.locator("[data-testid='construction-card'] img");
    await expect(photos).toHaveCount(7);
    for (const alt of await photos.evaluateAll((els) => els.map((el) => el.getAttribute("alt")))) {
      expect(alt ?? "").toMatch(/^[А-ЯЁ]/);
    }

    const montage = page.getByTestId("construction-montage");
    await expect(montage.getByRole("heading", { name: "Монтаж" })).toBeVisible();
    await expect(montage).toContainText("шеф-монтаж с вашими специалистами");
    await expect(montage.locator("[data-form-trigger]")).toHaveText("Отправить проект");
    await expect(montage.locator("a")).toHaveCount(0);

    const info = page.getByTestId("construction-hub-info");
    const who = info.locator("[data-section='who-does-what']");
    await expect(who.getByRole("heading", { name: "Кто что делает" })).toBeVisible();
    await expect(who.locator("[data-who='inex'] li")).toHaveCount(4);
    await expect(who.locator("[data-who='montage'] h3")).toHaveText("Монтаж");
    await expect(who.locator("[data-who='montage'] li")).toHaveCount(3);
    await expect(
      info.getByRole("heading", { name: "Почему комплект, а не стекло отдельно" })
    ).toBeVisible();
    await expect(info).toContainText("закалённое стекло там уже не подогнать");

    // «Объекты» only with published objects (else no empty heading); the buttons always stay.
    const objects = info.locator("[data-section='objects']");
    const objectCards = objects.getByTestId("hub-object-card");
    const sectionCount = await objects.count();
    if (sectionCount > 0) {
      await expect(objects.getByRole("heading", { name: "Объекты", level: 2 })).toBeVisible();
      await expect(objects.getByRole("link", { name: "Все объекты" })).toHaveAttribute(
        "href",
        "/obekty/"
      );
      const cardCount = await objectCards.count();
      expect(cardCount).toBeGreaterThan(0);
      expect(cardCount).toBeLessThanOrEqual(4);
    } else {
      await expect(info.getByRole("heading", { name: "Объекты" })).toHaveCount(0);
    }
    await expect(info.locator("[data-section='closing-cta'] a[data-quiz-cta]")).toHaveCount(1);

    // The montage decision of 2026-11-09: no «под ключ», no inex.su strip, no «ваша бригада».
    await expect(page.locator("[data-inex-su-strip]")).toHaveCount(0);
    const text = await page.locator("main").innerText();
    expect(text).not.toMatch(/под ключ|ваша бригада|Монтаж выполняет/i);
  });

  test("partitions: system photo cards, panels, risk block, turnkey panel, FAQ, form", async ({
    page,
  }) => {
    await page.goto("/steklyannye-peregorodki/");
    await expect(hero(page).getByRole("list", { name: "Условия" }).locator("li")).toHaveCount(4);
    // The terms checklist replaces the intro's «{условия}» sentence.
    await expect(hero(page).getByTestId("construction-intro")).not.toContainText("Заказы от");

    const systems = page.locator("#sistemy");
    await expect(systems.getByRole("heading", { name: "Какую систему выбрать" })).toBeVisible();
    const cards = systems.getByTestId("system-card");
    await expect(cards).toHaveCount(4);
    await expect(cards.locator("img")).toHaveCount(4);
    for (const alt of await cards
      .locator("img")
      .evaluateAll((els) => els.map((el) => el.getAttribute("alt")))) {
      expect(alt ?? "").toMatch(/^[А-ЯЁ]/);
    }
    await expect(cards.first()).toContainText("Где уместна");
    await expect(cards.first()).toContainText("Что важно знать");

    const profiles = page.getByTestId("construction-profiles");
    await expect(profiles.getByRole("heading", { name: "Профильные системы" })).toBeVisible();
    await expect(profiles.locator("li")).toHaveCount(6);
    await expect(profiles).toContainText("Поставляем перегородочные системы");
    const glass = page.getByTestId("construction-glass");
    await expect(glass.getByRole("heading", { name: "Стекло для перегородки" })).toBeVisible();
    await expect(glass.locator("li")).toHaveCount(4);

    const risk = page.getByTestId("construction-risk");
    await expect(risk.getByRole("heading", { name: "Главный риск — проём" })).toBeVisible();
    await expect(risk.locator("ol > li")).toHaveCount(3);
    await expect(risk.getByRole("link", { name: "Требования к чертежам" })).toHaveAttribute(
      "href",
      "/kak-zakazat/trebovaniya-k-chertezham/"
    );

    const documents = page.getByTestId("construction-documents");
    await expect(
      documents.getByRole("heading", { name: "Документы для сдачи объекта" })
    ).toBeVisible();
    await expect(documents.getByRole("link", { name: "Документы", exact: true })).toBeVisible();
    const objects = page.getByTestId("construction-objects");
    await expect(objects).toContainText("Сургутнефтегаз");
    await expect(objects.getByRole("link", { name: "Все объекты" })).toHaveAttribute(
      "href",
      "/obekty/"
    );

    const turnkey = page.getByTestId("construction-turnkey");
    await expect(turnkey.getByRole("heading", { name: "Нужен монтаж «под ключ»?" })).toBeVisible();
    await expect(turnkey.getByRole("link", { name: "inex.su" })).toHaveAttribute(
      "href",
      "https://inex.su/"
    );
    await expect(page.getByTestId("drawing-panel")).toBeVisible();

    const faq = page.getByTestId("service-faq");
    const buttons = faq.locator("button[aria-expanded]");
    await expect(buttons).toHaveCount(5);
    await expect(buttons.first()).toHaveAttribute("aria-expanded", "true");
    await dismissCookieBanner(page);
    for (let index = 1; index < 5; index++) {
      await buttons.nth(index).click();
      await expect(buttons.nth(index)).toHaveAttribute("aria-expanded", "true");
    }
  });

  test("railings: system photo cards and the load table", async ({ page }, testInfo) => {
    await page.goto("/steklyannye-ograzhdeniya/");
    const systems = page.locator("#sistemy");
    await expect(systems.getByTestId("system-card")).toHaveCount(3);
    await expect(systems.getByTestId("system-card").locator("img")).toHaveCount(3);
    const load = page.getByTestId("construction-table");
    await expect(load.getByRole("heading", { name: "Нагрузка и нормы" })).toBeVisible();
    const rows = isMobile(testInfo.project.name)
      ? load.locator("ul > li")
      : load.locator("table tbody tr");
    await expect(rows).toHaveCount(3);
  });

  test("canopies: 3 system photos, dark snow panel, dialog", async ({ page }) => {
    await page.goto("/steklyannye-kozyrki/");
    const cards = page.locator("#sistemy").getByTestId("system-card");
    await expect(cards).toHaveCount(3);
    // The photos replace the seed schemes visually.
    await expect(cards.locator("img")).toHaveCount(3);
    await expect(cards.first()).toContainText("Как держится стекло");
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
    // The five seed configurations of teksty/12 as photo cards (client request 2026-11-10).
    await expect(section.locator("[data-shower-fallback]")).toHaveCount(0);
    const cards = section.locator("article.ig-card");
    await expect(cards).toHaveCount(5);
    await expect(cards.locator("h3")).toHaveText([
      "Прямая с распашной дверью",
      "угловая",
      "трапециевидная",
      "на штанге (walk-in)",
      "с раздвижной дверью",
    ]);
    await expect(cards.locator("img")).toHaveCount(5);
    for (const image of await cards.locator("img").all()) {
      await expect(image).toHaveAttribute("alt", /душев/i);
    }
    const callout = page.getByTestId("construction-warning");
    await expect(callout.getByRole("heading", { name: "Что важно знать" })).toBeVisible();
    await expect(callout.locator("ul > li")).toHaveCount(3);
    await expect(
      page.getByRole("heading", { name: "Для объекта, а не для одной ванной", level: 2 })
    ).toBeVisible();
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

  test("hardware: photo hero, «Что поставляем» cards, thickness plates, drawing form", async ({
    page,
  }) => {
    await page.goto("/furnitura/");
    const heroSection = hero(page);
    await expect(heroSection.getByRole("list", { name: "Условия" }).locator("li")).toHaveCount(4);
    await expect(heroSection.locator("img")).toHaveAttribute(
      "alt",
      "Стекло в зажимном профиле и спайдер с двумя стёклами"
    );
    // A single hero button: the quiz («Рассчитать комплект»), no secondary form.
    await expect(heroSection.locator("[data-form-trigger]")).toHaveCount(0);

    const systems = page.locator("#sistemy");
    await expect(systems.getByRole("heading", { name: "Что поставляем", level: 2 })).toBeVisible();
    const cards = systems.getByTestId("system-card");
    await expect(cards).toHaveCount(3);
    await expect(cards.locator("img")).toHaveCount(3);
    await expect(cards.locator("h3")).toHaveText([
      "Зажимной профиль",
      "Спайдеры и рутели",
      "Комплектующие для козырьков",
    ]);
    await expect(cards.locator("dt")).toHaveText(["Для чего", "Для чего", "Для чего"]);
    await expect(page.locator("main table")).toHaveCount(0);

    const profile = page.getByTestId("construction-profiles");
    await expect(
      profile.getByRole("heading", { name: "Зажимной профиль", level: 2 })
    ).toBeVisible();
    await expect(profile).toContainText("под стекло и триплекс толщиной 10, 12, 16 и 20 мм");
    await expect(profile.locator("li")).toHaveText(["10 мм", "12 мм", "16 мм", "20 мм"]);

    const holes = page.getByTestId("construction-panel").filter({
      has: page.getByRole("heading", { name: "Отверстия под спайдеры", level: 2 }),
    });
    await expect(holes.getByRole("link", { name: "Отверстия и вырезы" })).toHaveAttribute(
      "href",
      "/obrabotka-stekla/otverstiya-i-vyrezy/"
    );

    // The cream block closes the page with the drawing form; no closing button row.
    await expect(page.getByTestId("drawing-panel")).toBeVisible();
    await expect(page.locator("[data-section='closing-cta']")).toHaveCount(0);
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
