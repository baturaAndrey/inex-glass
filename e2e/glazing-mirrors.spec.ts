import { expect, test, type Page } from "@playwright/test";
import { VIEWPORTS } from "./helpers/viewports";

/**
 * «Остекление» and «Зеркала» (task 27): 9 pages on the `ConstructionPage` template, filled by
 * the seed slice `glazing-mirrors` (CI runs `pnpm seed --full` before e2e).
 *
 * Runs in all three viewport projects. URL normalisation, 404 and the hub links are raw HTTP
 * checks and run in the 1366 project only.
 */

interface Expected {
  path: string;
  h1: string;
  title: string;
  description: string;
  /** Secondary button (opens the drawing form). */
  secondary: string;
  hasTable: boolean;
}

/** H1 / Title / Description from `docs/inex/17-meta.md`. */
const PAGES: readonly Expected[] = [
  {
    path: "/osteklenie/",
    h1: "Остекление зданий и помещений",
    title: "Остекление зданий — фасады, витрины, шахты лифтов | Inex Glass",
    description:
      "Стеклянные фасады, спайдерное остекление, витрины, лифтовые шахты и веранды: стекло, профиль и узлы для подрядчика.",
    secondary: "Отправить проект",
    hasTable: false,
  },
  {
    path: "/osteklenie/fasadov/",
    h1: "Стеклянные фасады и структурное остекление",
    title: "Стеклянные фасады и структурное остекление | Inex Glass",
    description:
      "Стекло и профильные системы СИАЛ и Алютех для фасадов: закалённое стекло, триплекс, спандрель. Один оттенок на объект, маркировка по монтажной схеме.",
    secondary: "Отправить проект",
    hasTable: false,
  },
  {
    path: "/osteklenie/spajdernoe/",
    h1: "Спайдерное остекление",
    title: "Спайдерное остекление — стекло и спайдеры комплектом | Inex Glass",
    description:
      "Точечное крепление стекла на спайдерах: цилиндрические и конусные отверстия по ГОСТ, спайдеры и стекло одним заказом.",
    secondary: "Отправить проект",
    hasTable: true,
  },
  {
    path: "/osteklenie/vitrin-i-magazinov/",
    h1: "Витрины и остекление магазинов",
    title: "Витринное стекло и остекление магазинов | Inex Glass",
    description:
      "Закалённое и осветлённое стекло для витрин и входных групп магазинов, торговых центров и шоурумов.",
    secondary: "Отправить проект",
    hasTable: true,
  },
  {
    path: "/osteklenie/liftovyh-shaht/",
    h1: "Остекление лифтовых шахт",
    title: "Остекление лифтовых шахт — триплекс по ГОСТ | Inex Glass",
    description:
      "Триплекс для шахт панорамных лифтов по ГОСТ 33984.1-2016: схема под нагрузку, крепление на спайдерах или в профильной системе.",
    secondary: "Отправить проект",
    hasTable: false,
  },
  {
    path: "/osteklenie/verand-terras-besedok/",
    h1: "Остекление веранд, террас и беседок",
    title: "Безрамное остекление веранд и террас для подрядчика | Inex Glass",
    description:
      "Раздвижные безрамные, гильотинные и складные системы, стеклянная крыша из триплекса — стекло и системы одним комплектом для подрядчика.",
    secondary: "Отправить проект",
    hasTable: false,
  },
  {
    path: "/zerkala/",
    h1: "Зеркала для проектов",
    title: "Изготовление зеркал по размерам для объектов | Inex Glass",
    description:
      "Зеркала для гостиниц, офисов, салонов и залов: по размерам, с фацетом и обработкой кромки, партиями от 50 м².",
    secondary: "Отправить размеры",
    hasTable: true,
  },
  {
    path: "/zerkala/dlya-zalov/",
    h1: "Зеркала для танцевальных и спортивных залов",
    title: "Зеркала для танцевального и спортивного зала | Inex Glass",
    description:
      "Зеркальные стены для залов: безопасные зеркала, размеры под стену, кромка и крепление. Для фитнес-клубов и студий.",
    secondary: "Отправить размеры зала",
    hasTable: false,
  },
  {
    path: "/zerkala/dlya-salonov/",
    h1: "Зеркала для салонов красоты и парикмахерских",
    title: "Зеркала для салонов красоты и парикмахерских | Inex Glass",
    description:
      "Зеркала для рабочих мест мастеров: размеры, фацет, обработка кромки — партией под сеть салонов.",
    secondary: "Отправить размеры",
    hasTable: false,
  },
];

const HUB_CHILDREN = [
  "/osteklenie/fasadov/",
  "/osteklenie/spajdernoe/",
  "/osteklenie/vitrin-i-magazinov/",
  "/osteklenie/liftovyh-shaht/",
  "/osteklenie/verand-terras-besedok/",
  "/steklyannye-kozyrki/",
] as const;

/** Robots is only `index` in production (`SITE_ENV`); the e2e server runs as development. */
const INDEXABLE_ENV = process.env.SITE_ENV === "production";

const isMobile = (page: Page) => (page.viewportSize()?.width ?? 0) < 600;

const rawOnly = (projectName: string) => projectName !== VIEWPORTS.laptop.name;

test.describe("glazing & mirrors pages", () => {
  for (const expected of PAGES) {
    test(`${expected.path}: meta, crumbs, CTAs, tables`, async ({ page, baseURL }) => {
      const response = await page.goto(expected.path);
      expect(response?.status()).toBe(200);

      // Meta of 17-meta.
      await expect(page).toHaveTitle(expected.title);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        "content",
        expected.description
      );
      const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
      const origin = process.env.SITE_URL?.replace(/\/+$/, "") ?? new URL(baseURL ?? "").origin;
      expect(canonical).toBe(`${origin}${expected.path}`);
      if (INDEXABLE_ENV) {
        await expect(page.locator('meta[name="robots"]')).not.toHaveAttribute("content", /noindex/);
      }

      // Exactly one H1 with the 17-meta text.
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("h1")).toHaveText(expected.h1);

      // Breadcrumbs + BreadcrumbList JSON-LD.
      const crumbs = page.getByRole("navigation", { name: "Хлебные крошки" }).locator("li");
      await expect(crumbs.first()).toContainText("Главная");
      await expect(crumbs.last().locator('[aria-current="page"]')).toHaveCount(1);
      const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
      const types = ld.flatMap((text) => {
        const data = JSON.parse(text) as Record<string, unknown> | Array<Record<string, unknown>>;
        return Array.isArray(data) ? data : [data];
      });
      const breadcrumbList = types.find((item) => item["@type"] === "BreadcrumbList");
      expect(breadcrumbList).toBeDefined();
      expect((breadcrumbList?.itemListElement as unknown[]).length).toBeGreaterThanOrEqual(2);
      expect(types.map((item) => item["@type"])).not.toContain("FAQPage");
      expect(types.map((item) => item["@type"])).not.toContain("Product");

      // Primary CTA of the first screen: quiz link with the page pre-fill.
      const quiz = page.locator("main a[data-quiz-cta]").first();
      const href = (await quiz.getAttribute("href")) ?? "";
      expect(href).toContain("/raschet-stoimosti/?");
      const params = new URL(href, "http://x").searchParams;
      expect(params.get("type")).toBeTruthy();
      expect(params.get("src")).toBe(expected.path);
      await expect(quiz).toHaveText("Рассчитать стоимость");
      if (isMobile(page)) {
        await expect(page.locator(".ig-sticky-cta a")).toBeVisible();
      } else {
        await expect(quiz).toBeInViewport();
      }

      // No unresolved placeholders in the page text.
      const text = await page.locator("main").innerText();
      expect(text).not.toMatch(/[{}]/);

      // Tables: cards on phones, the table on desktop. A table without column labels (no
      // <thead>, e.g. «Отверстия — главный узел» on /osteklenie/spajdernoe/) scrolls sideways on
      // phones instead (DataTable, task-42 FL-02).
      if (expected.hasTable) {
        const labelled = page.locator("main table.ig-table:has(thead)");
        const card = page.locator("main .ig-mcard").first();
        const table = (await labelled.count()) > 0 ? labelled.first() : null;
        if (!table) {
          // Only label-less tables: the table itself on every width, never empty cards.
          await expect(page.locator("main table.ig-table").first()).toBeVisible();
          await expect(card).toHaveCount(0);
        } else if (isMobile(page)) {
          await expect(card).toBeVisible();
          await expect(table).toBeHidden();
        } else {
          await expect(table).toBeVisible();
          await expect(card).toBeHidden();
        }
      }

      // The secondary button opens the drawing form.
      // Retried: a click that lands before hydration does nothing (the trigger is client JS).
      const secondary = page
        .locator("main")
        .getByRole("button", { name: expected.secondary, exact: true })
        .first();
      await expect(async () => {
        await secondary.click();
        await expect(page.getByRole("dialog")).toBeVisible({ timeout: 2_000 });
      }).toPass({ timeout: 30_000 });
    });
  }
});

test.describe("glazing & mirrors routing", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(rawOnly(testInfo.project.name), "HTTP checks do not depend on the viewport");
  });

  test("the hub links its five children and canopies, each answering 200", async ({
    page,
    request,
  }) => {
    await page.goto("/osteklenie/");
    for (const path of HUB_CHILDREN) {
      await expect(page.locator(`main a[href="${path}"]`).first()).toBeAttached();
      const response = await request.get(path);
      expect(response.status(), path).toBe(200);
    }
  });

  for (const path of ["/osteklenie/unknown/", "/zerkala/unknown/"]) {
    test(`${path} answers the 404 page`, async ({ request }) => {
      const response = await request.get(path, { maxRedirects: 0 });
      const html = await response.text();
      // `next dev` cannot set the status of a streamed 404 (see e2e/not-found-ssr.spec.ts).
      if (!html.includes("next-devtools")) expect(response.status()).toBe(404);
      // The H1, not a substring: the not-found text is in every page's RSC payload.
      expect(html).toMatch(/<h1[^>]*>Страница не найдена<\/h1>/);
      expect(html).toMatch(/<meta name="robots" content="noindex/);
    });
  }

  test("upper case redirects 301 to lower case", async ({ request }) => {
    const response = await request.get("/Osteklenie/", { maxRedirects: 0 });
    expect(response.status()).toBe(301);
    expect(response.headers()["location"]).toMatch(/\/osteklenie\/$/);
  });

  test("a missing trailing slash redirects to the slash form", async ({ request }) => {
    const response = await request.get("/zerkala", { maxRedirects: 0 });
    expect([301, 308]).toContain(response.status());
    expect(response.headers()["location"]).toMatch(/\/zerkala\/$/);
  });
});
