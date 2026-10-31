import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { VIEWPORTS } from "./helpers/viewports";

/**
 * Glass types (task 24): матовое, тонированное, крашеное, осветлённое, для мебели, рифлёное,
 * гнутое (`/zakalennoe-steklo/<slug>/`, route of task 23) and триплекс (`/tripleks/`).
 * Meta from docs/inex/17-meta.md, template sections, the pattern picker, tables on phones and
 * the sample / drawing dialogs.
 *
 * Precondition: `pnpm seed --minimal`, then `pnpm seed --only=glass-types --force` (CI runs
 * `pnpm seed --full`).
 */

interface GlassCase {
  slug: string;
  path: string;
  h1: string;
  title: string;
  description: string;
  crumb: string;
  /** Quiz parameters expected in the «Рассчитать стоимость» link. */
  quiz: { type: string; vid: string | null };
  faq: boolean;
  samples: boolean;
}

const HUB_CRUMB = "Закалённое стекло";

const PAGES: GlassCase[] = [
  {
    slug: "matovoe",
    path: "/zakalennoe-steklo/matovoe/",
    h1: "Матовое закалённое стекло",
    title: "Матовое закалённое стекло — сатин и пескоструй | Inex Glass",
    description:
      "Сатинированное и пескоструйное матовое стекло для перегородок, дверей и мебели. Согласуем образец до запуска. Заказы от 50 м².",
    crumb: "Матовое",
    quiz: { type: "tempered", vid: "matte" },
    faq: true,
    samples: true,
  },
  {
    slug: "tonirovannoe",
    path: "/zakalennoe-steklo/tonirovannoe/",
    h1: "Тонированное закалённое стекло",
    title: "Тонированное стекло — бронза, графит, серое в закалке | Inex Glass",
    description:
      "Бронза, графит и серое стекло 4–19 мм в закалке. Оттенок зависит от толщины — согласуем образец до запуска партии.",
    crumb: "Тонированное",
    quiz: { type: "tempered", vid: "tinted" },
    faq: true,
    samples: true,
  },
  {
    slug: "okrashennoe",
    path: "/zakalennoe-steklo/okrashennoe/",
    h1: "Крашеное закалённое стекло по RAL",
    title: "Цветное закалённое стекло по RAL — эмалит 4–15 мм | Inex Glass",
    description:
      "Стекло, окрашенное керамической краской и закалённое: цвет по RAL, размеры до 3000 × 1600 мм. Чем отличается от лакобеля — на странице.",
    crumb: "Крашеное по RAL",
    quiz: { type: "tempered", vid: "painted" },
    faq: false,
    samples: true,
  },
  {
    slug: "osvetlennoe",
    path: "/zakalennoe-steklo/osvetlennoe/",
    h1: "Осветлённое закалённое стекло",
    title: "Осветлённое стекло оптивайт в закалке | Inex Glass",
    description:
      "Оптивайт и аналоги в закалке 4–19 мм: прозрачный торец для перегородок, ограждений и витрин. Когда осветлённое стоит своих денег.",
    crumb: "Осветлённое",
    quiz: { type: "tempered", vid: "low-iron" },
    faq: true,
    samples: true,
  },
  {
    slug: "dlya-mebeli",
    path: "/zakalennoe-steklo/dlya-mebeli/",
    h1: "Закалённое стекло для производителей мебели",
    title: "Стекло для мебели — фасады и столешницы серией | Inex Glass",
    description:
      "Закалённое стекло для мебельных фасадов и столешниц: кромка, отверстия под петли, без клейма по запросу. Серии от 50 м².",
    crumb: "Для мебели",
    quiz: { type: "tempered", vid: null },
    faq: false,
    samples: true,
  },
  {
    slug: "riflenoe",
    path: "/zakalennoe-steklo/riflenoe/",
    h1: "Рифлёное закалённое стекло",
    title: "Рифлёное стекло мору, флутс — закалённое по размерам | Inex Glass",
    description:
      "Узорчатое стекло мору, флутс и другие в закалке. Направление рифления укажите в чертеже — проверим до запуска. Заказы от 50 м².",
    crumb: "Рифлёное",
    quiz: { type: "tempered", vid: "ribbed" },
    faq: true,
    samples: false,
  },
  {
    slug: "mollirovannoe",
    path: "/zakalennoe-steklo/mollirovannoe/",
    h1: "Гнутое закалённое стекло",
    title: "Гнутое закалённое стекло на заказ | Inex Glass",
    description:
      "Гнутое закалённое стекло до 1200 × 2000 мм с радиусом от 1000 мм. Что указать в чертеже радиусного стекла — на странице.",
    crumb: "Гнутое",
    quiz: { type: "tempered", vid: "bent" },
    faq: false,
    samples: false,
  },
  {
    slug: "tripleks",
    path: "/tripleks/",
    h1: "Триплекс на заказ",
    title: "Стекло триплекс на заказ — закалённый, плёнка EVA | Inex Glass",
    description:
      "Многослойное стекло по ГОСТ 30826-2014: закалённое до 3000 × 2000 мм, плёнка EVA, со вставками. Схему подберём под нагрузку.",
    crumb: "Триплекс",
    quiz: { type: "triplex", vid: null },
    faq: false,
    samples: false,
  },
];

const bySlug = (slug: string): GlassCase => {
  const found = PAGES.find((item) => item.slug === slug);
  if (!found) throw new Error(`unknown slug ${slug}`);
  return found;
};

const isMobile = (projectName: string) => projectName === VIEWPORTS.mobile.name;

/** Hide the cookie banner (it covers buttons on phones) before the page scripts run. */
async function open(page: Page, path: string) {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("inex-consent-v1", "necessary");
    } catch {
      // storage unavailable: the banner stays, tests scroll around it
    }
  });
  const response = await page.goto(path);
  expect(response?.status(), path).toBe(200);
  return response;
}

/** `@type`s of all JSON-LD blocks of the page (flattened). */
async function jsonLd(page: Page): Promise<Array<Record<string, unknown>>> {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  return blocks.flatMap((text) => {
    const data = JSON.parse(text) as unknown;
    return (Array.isArray(data) ? data : [data]) as Array<Record<string, unknown>>;
  });
}

test.describe("glass types", () => {
  test.beforeAll(async ({ request }) => {
    const response = await request.get("/tripleks/");
    test.skip(
      response.status() !== 200,
      "/tripleks/ не отвечает 200: выполните `pnpm seed --minimal` и `pnpm seed --only=glass-types --force`"
    );
  });

  for (const item of PAGES) {
    test(`${item.path}: meta, crumbs, hero, JSON-LD`, async ({ page }, testInfo) => {
      await open(page, item.path);

      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("h1")).toHaveText(item.h1);
      await expect(page).toHaveTitle(item.title);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        "content",
        item.description
      );
      const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
      expect(canonical).toMatch(/^https?:\/\//);
      expect(new URL(canonical ?? "").pathname).toBe(item.path);

      // Non-production environments are `noindex, nofollow` site-wide (buildMetadata); a page
      // that is noindex on its own keeps `follow`.
      const robots = (await page.locator('meta[name="robots"]').getAttribute("content")) ?? "";
      if (!/nofollow/.test(robots)) expect(robots).not.toMatch(/noindex/);

      const crumbs = page.getByRole("navigation", { name: "Хлебные крошки" });
      const expected =
        item.slug === "tripleks" ? ["Главная", item.crumb] : ["Главная", HUB_CRUMB, item.crumb];
      await expect(crumbs.getByRole("listitem")).toHaveText(expected);

      const ld = await jsonLd(page);
      const breadcrumbList = ld.find((entry) => entry["@type"] === "BreadcrumbList");
      expect(
        (breadcrumbList?.itemListElement as unknown[] | undefined)?.length
      ).toBeGreaterThanOrEqual(2);
      expect(ld.some((entry) => entry["@type"] === "FAQPage")).toBe(item.faq);
      expect(ld.some((entry) => entry["@type"] === "Product")).toBe(false);

      // «Рассчитать стоимость» of the hero: first screen, quiz URL with the page context.
      const hero = page.locator('section[aria-labelledby="page-title"]');
      const quiz = hero.locator("a[data-quiz-cta]").first();
      await expect(quiz).toHaveText(/Рассчитать стоимость/);
      await expect(quiz).toBeInViewport();
      const href = new URL((await quiz.getAttribute("href")) ?? "", "http://site");
      expect(href.pathname).toBe("/raschet-stoimosti/");
      expect(href.searchParams.get("type")).toBe(item.quiz.type);
      expect(href.searchParams.get("vid")).toBe(item.quiz.vid);
      expect(href.searchParams.get("src")).toBe(item.path);

      await expect(hero.locator(".ig-terms__item")).toHaveCount(3);

      const text = (await page.locator("main").innerText()).replace(/\s+/g, " ");
      expect(text).not.toMatch(/[{}]/);
      expect(text).not.toMatch(/\[Фото|ждёт ответа/);

      if (isMobile(testInfo.project.name)) {
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth
        );
        expect(overflow).toBeLessThanOrEqual(0);
      }

      // Samples block on six pages: its button opens the sample form.
      const samples = page.locator("[data-samples-snippet]");
      await expect(samples).toHaveCount(item.samples ? 1 : 0);
      if (item.samples) {
        await expect(samples.getByRole("heading", { name: "Образцы и цветопроба" })).toBeVisible();
        await samples.getByRole("button", { name: "Заказать образец" }).click();
        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();
        await expect(dialog.getByRole("heading", { name: "Заказать образец" })).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(dialog).toBeHidden();
      }

      // Closing buttons: the drawing form.
      const finalCta = page.locator("[data-final-cta]");
      await finalCta.getByRole("button", { name: "Отправить чертёж" }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.keyboard.press("Escape");
    });
  }

  test("рифлёное: pattern picker with keyboard and live panel", async ({ page }) => {
    await open(page, bySlug("riflenoe").path);
    const group = page.getByRole("radiogroup", { name: "Узоры" });
    const radios = group.getByRole("radio");
    await expect(radios).toHaveCount(5);

    const moru = group.getByRole("radio", { name: /Мору/ });
    await expect(moru).toHaveAttribute("aria-checked", "true");
    const panel = page.locator("[data-variant-detail]");
    await expect(panel).toHaveAttribute("aria-live", "polite");
    await expect(panel).toContainText("самый востребованный узор");

    await group.getByRole("radio", { name: /Дельта/ }).click();
    await expect(group.getByRole("radio", { name: /Дельта/ })).toHaveAttribute(
      "aria-checked",
      "true"
    );
    await expect(moru).toHaveAttribute("aria-checked", "false");
    await expect(panel).toContainText("Двери, кухонные фасады");

    await page.keyboard.press("ArrowRight");
    const krizet = group.getByRole("radio", { name: /Кризет/ });
    await expect(krizet).toHaveAttribute("aria-checked", "true");
    await expect(krizet).toBeFocused();
    await expect(panel).toContainText("Офисные перегородки, двери санузлов");
    // Roving tabindex: only the selected radio is in the tab order.
    await expect(krizet).toHaveAttribute("tabindex", "0");
    await expect(moru).toHaveAttribute("tabindex", "-1");

    await page.keyboard.press("ArrowRight");
    await expect(moru).toHaveAttribute("aria-checked", "true");
    await expect(moru).toBeFocused();
  });

  test("осветлённое: edge photos and four highlighted cells", async ({ page }, testInfo) => {
    await open(page, bySlug("osvetlennoe").path);
    const hero = page.locator('section[aria-labelledby="page-title"]');
    const captions = hero.locator("figure figcaption");
    await expect(captions).toHaveText([
      "Торец обычного стекла, 12 мм",
      "Торец осветлённого стекла, 12 мм",
    ]);
    if (!isMobile(testInfo.project.name)) {
      await expect(page.locator('[data-table-view="desktop"] td[data-positive]')).toHaveCount(4);
      await expect(page.locator('[data-table-view="desktop"] table')).toBeVisible();
    } else {
      await expect(page.locator('[data-table-view="pairs"] .ig-pair')).toHaveCount(5);
      await expect(page.locator('[data-table-view="desktop"]')).toBeHidden();
    }
  });

  test("тонированное: three colour cards", async ({ page }) => {
    await open(page, bySlug("tonirovannoe").path);
    await expect(page.locator("[data-variant-card]")).toHaveCount(3);
    await expect(page.getByRole("heading", { level: 2, name: "Цвета" })).toBeVisible();
  });

  test("крашеное: two tables, four rows in «Лакобель и эмалит»", async ({ page }, testInfo) => {
    await open(page, bySlug("okrashennoe").path);
    const tables = page.locator("[data-glass-table]");
    await expect(tables).toHaveCount(2);
    const lacobel = tables.nth(1);
    await expect(
      lacobel.getByRole("heading", { name: "Лакобель и эмалит: не путайте" })
    ).toBeVisible();
    if (isMobile(testInfo.project.name)) {
      await expect(lacobel.locator('[data-table-view="cards"] .ig-mcard')).toHaveCount(4);
    } else {
      await expect(lacobel.locator("table tbody tr")).toHaveCount(4);
    }
  });

  test("триплекс: schemes table, cards on phones", async ({ page }, testInfo) => {
    await open(page, bySlug("tripleks").path);
    const schemes = page.locator('[data-glass-table="schemes"]');
    if (isMobile(testInfo.project.name)) {
      await expect(schemes.locator('[data-table-view="cards"] .ig-mcard')).toHaveCount(6);
      await expect(schemes.locator("table")).toBeHidden();
    } else {
      await expect(schemes.locator("table tbody tr")).toHaveCount(6);
      await expect(schemes.locator("table")).toBeVisible();
    }
    await expect(schemes.getByRole("link", { name: "Проектирование" })).toHaveAttribute(
      "href",
      "/proektirovanie/"
    );
  });

  test("no critical accessibility violations", async ({ page }) => {
    for (const slug of ["riflenoe", "osvetlennoe", "tripleks"]) {
      await open(page, bySlug(slug).path);
      const results = await new AxeBuilder({ page }).analyze();
      const critical = results.violations.filter((violation) => violation.impact === "critical");
      expect(
        critical.map((violation) => violation.id),
        slug
      ).toEqual([]);
    }
  });

  test("screenshots for the prototype comparison", async ({ page }, testInfo) => {
    for (const slug of ["riflenoe", "osvetlennoe", "tripleks"]) {
      await open(page, bySlug(slug).path);
      await testInfo.attach(`${slug}-${testInfo.project.name}`, {
        body: await page.screenshot({ fullPage: true }),
        contentType: "image/png",
      });
    }
  });
});
