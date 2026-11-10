import { expect, test, type Page } from "@playwright/test";
import { VIEWPORTS } from "./helpers/viewports";

/**
 * «Остекление» and «Зеркала» (task 27): 9 pages filled by the seed slice `glazing-mirrors` (CI
 * runs `pnpm seed --full` before e2e). The hubs follow the Paper mockup `2560_osteklenie`
 * (`GlazingHubPage`); the subpages use the construction page template (`ConstructionDetailPage`,
 * approved without an own mockup). Tables are the white table card everywhere (`OrderTable`: a
 * card list on phones).
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

      // Tables: the white table card on desktop, one card per row on phones.
      if (expected.hasTable) {
        const table = page.locator("main [data-order-table]").first();
        const card = page.locator("main [data-order-card]").first();
        if (isMobile(page)) {
          await expect(table).toBeHidden();
          await expect(card).toBeVisible();
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

/** Alts of the photos inside a locator: every one is a Russian description. */
async function expectPhotoAlts(images: ReturnType<Page["locator"]>) {
  for (const alt of await images.evaluateAll((els) => els.map((el) => el.getAttribute("alt")))) {
    expect(alt ?? "").toMatch(/^[А-ЯЁ]/);
  }
}

test.describe("glazing & mirrors hubs (Paper mockup 2560_osteklenie)", () => {
  test("/osteklenie/: photo hero with terms, six photo cards, steps, objects, form panel", async ({
    page,
  }) => {
    await page.goto("/osteklenie/");
    const hero = page.locator("section[aria-labelledby='page-title']");
    await expect(hero.locator("img")).toHaveCount(1);
    await expect(hero.getByRole("list", { name: "Условия" }).locator("li")).toHaveCount(4);
    await expect(hero.getByTestId("construction-intro")).not.toContainText("Заказы от");

    const cards = page.getByTestId("glazing-cards");
    await expect(cards.getByRole("heading", { name: "Что остекляем", level: 2 })).toBeVisible();
    await expect(cards.getByTestId("construction-card")).toHaveCount(6);
    await expect(cards.locator("img")).toHaveCount(6);
    await expectPhotoAlts(cards.locator("img"));

    const steps = page.locator("[data-section='steps']");
    await expect(steps.getByRole("heading", { name: "Как работаем с объектом" })).toBeVisible();
    await expect(steps.getByTestId("glazing-steps").locator("li")).toHaveCount(4);

    const objects = page.locator("[data-section='objects']");
    await expect(objects.getByRole("heading", { name: "Объекты", level: 2 })).toBeVisible();
    await expect(objects.getByRole("link", { name: "Все объекты" })).toHaveAttribute(
      "href",
      "/obekty/"
    );
    // The cream block closes with the drawing-form panel, not a button row.
    await expect(page.getByTestId("drawing-panel")).toBeVisible();
    await expect(page.locator("[data-section='closing-cta']")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Условия", level: 2 })).toHaveCount(0);
  });

  test("/zerkala/: three «Куда» photo cards, «Что делаем» table panel, form panel", async ({
    page,
  }) => {
    await page.goto("/zerkala/");
    const cards = page.getByTestId("glazing-cards");
    await expect(cards.getByRole("heading", { name: "Куда", level: 2 })).toBeVisible();
    await expect(cards.getByTestId("construction-card")).toHaveCount(3);
    await expect(cards.locator('a[href="/zerkala/dlya-zalov/"]')).toHaveCount(1);
    await expect(cards.locator('a[href="/zerkala/dlya-salonov/"]')).toHaveCount(1);
    await expect(cards.locator("img")).toHaveCount(3);
    // «Гостиницы и офисы» has no page: a photo card without the arrow link.
    await expect(cards.locator("a")).toHaveCount(2);
    await expectPhotoAlts(cards.locator("img"));
    await expect(cards).toContainText("Гостиницы и офисы");
    await expect(page.getByTestId("drawing-panel")).toBeVisible();
    await expect(
      page.getByTestId("construction-table").getByRole("heading", { name: "Что делаем" })
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Условия", level: 2 })).toHaveCount(0);
  });
});

/** Subpages and the sibling tiles at the bottom of their cream block (hub card titles). */
const SUBPAGES = [
  { path: "/osteklenie/fasadov/", siblings: 5 },
  { path: "/osteklenie/spajdernoe/", siblings: 5 },
  { path: "/osteklenie/vitrin-i-magazinov/", siblings: 5 },
  { path: "/osteklenie/liftovyh-shaht/", siblings: 5 },
  { path: "/osteklenie/verand-terras-besedok/", siblings: 5 },
  { path: "/zerkala/dlya-zalov/", siblings: 2 },
  { path: "/zerkala/dlya-salonov/", siblings: 2 },
] as const;

test.describe("glazing & mirrors subpages (construction page template)", () => {
  for (const { path, siblings } of SUBPAGES) {
    test(`${path}: photo hero with terms, cream block with form panel and sibling tiles`, async ({
      page,
    }) => {
      await page.goto(path);
      const hero = page.locator("section[aria-labelledby='page-title']");
      await expect(hero.locator("img")).toHaveCount(1);
      await expectPhotoAlts(hero.locator("img"));
      await expect(hero.getByRole("list", { name: "Условия" }).locator("li")).toHaveCount(4);
      // The terms checklist replaces the intro's `{условия}` sentence.
      await expect(hero.getByTestId("construction-intro")).not.toContainText("Заказы от");

      // Crumbs: Главная › hub › page.
      const crumbs = page.getByRole("navigation", { name: "Хлебные крошки" }).locator("li");
      await expect(crumbs).toHaveCount(3);

      // Cream block: the form panel, then the tiles of the sibling subpages (current one dark).
      await expect(page.getByTestId("drawing-panel")).toBeVisible();
      const tiles = page.getByTestId("sibling-links").locator("a");
      await expect(tiles).toHaveCount(siblings);
      await expect(tiles.and(page.locator('[aria-current="page"]'))).toHaveAttribute("href", path);
      await expect(page.locator("[data-section='closing-cta']")).toHaveCount(0);
      await expect(page.getByRole("heading", { name: "Условия", level: 2 })).toHaveCount(0);
    });
  }

  test("fasadov: 4 system photo cards, profile pills, glass, info note, objects", async ({
    page,
  }) => {
    await page.goto("/osteklenie/fasadov/");
    const cards = page.locator("#sistemy").getByTestId("system-card");
    await expect(cards).toHaveCount(4);
    await expect(cards.locator("img")).toHaveCount(4);
    await expectPhotoAlts(cards.locator("img"));
    await expect(cards.first()).toContainText("Стоечно-ригельный");
    // No «Где уместна» facts on this page: just the name and the subtitle.
    await expect(cards.locator("dt")).toHaveCount(0);
    await expect(page.getByTestId("construction-profiles")).toContainText("СИАЛ");
    await expect(page.getByTestId("construction-glass").locator("li")).toHaveCount(3);
    await expect(
      page.getByRole("heading", { name: "Что важно для фасада", level: 2 })
    ).toBeVisible();
    const objects = page.locator("[data-section='objects']");
    await expect(objects).toContainText("Фасады и витражи из портфолио Inex");
    await expect(objects.getByRole("link", { name: "Все объекты" })).toHaveAttribute(
      "href",
      "/obekty/"
    );
  });

  test("verandy: 4 system photo cards with «Где уместна», warning block", async ({ page }) => {
    await page.goto("/osteklenie/verand-terras-besedok/");
    const cards = page.locator("#sistemy").getByTestId("system-card");
    await expect(cards).toHaveCount(4);
    await expect(cards.locator("img")).toHaveCount(4);
    await expect(cards.locator("dt")).toHaveCount(4);
    await expect(page.getByTestId("construction-warning")).toContainText("только из триплекса");
    await expect(page.locator("[data-section='objects']")).toContainText(
      "Веранды, беседки и террасы из портфолио Inex"
    );
  });

  test("spajdernoe: the coordinates note closes the holes table panel", async ({ page }) => {
    await page.goto("/osteklenie/spajdernoe/");
    const table = page.getByTestId("construction-table");
    await expect(table.getByRole("heading", { name: "Отверстия — главный узел" })).toBeVisible();
    await expect(table.getByTestId("construction-table-note")).toContainText("DWG или DXF");
    await expect(table.getByRole("link", { name: "Отверстия и вырезы" })).toBeVisible();
  });

  test("vitriny: the inex.su dark panel comes before «Для торговых сетей»", async ({ page }) => {
    await page.goto("/osteklenie/vitrin-i-magazinov/");
    const turnkey = page.getByTestId("construction-turnkey");
    await expect(turnkey).toContainText("Стеклянные двери изготавливает инжиниринговая компания");
    await expect(turnkey.getByRole("link", { name: "inex.su" })).toHaveAttribute(
      "href",
      "https://inex.su/"
    );
    const chains = page.getByRole("heading", { name: "Для торговых сетей", level: 2 });
    const [turnkeyBox, chainsBox] = await Promise.all([
      turnkey.boundingBox(),
      chains.boundingBox(),
    ]);
    expect(turnkeyBox!.y).toBeLessThan(chainsBox!.y);
  });

  test("dlya-zalov: warning block with the film title, paired text panels", async ({ page }) => {
    await page.goto("/zerkala/dlya-zalov/");
    await expect(
      page
        .getByTestId("construction-warning")
        .getByRole("heading", { name: "Безопасность — противоосколочная плёнка" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Как собрать зеркальную стену", level: 2 })
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Что прислать", level: 2 })).toBeVisible();
  });
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
