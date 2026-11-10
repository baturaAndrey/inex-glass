import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Section «Обработка стекла» (task 25): hub + 6 service pages, meta from 17-meta, the sections
 * of the service page (Paper mockups `2560_service_facet`, `2560_service_otverstiya`), the holes
 * calculator (ГОСТ 30698-2014) with its goal: the panel of the holes page and the site-wide block
 * of the tolerances page.
 *
 * Precondition: `pnpm seed --minimal`, then `pnpm seed --only=processing --force` (CI runs
 * `pnpm seed --full`).
 */

type Goal = { name: string; params: Record<string, unknown> | undefined };

interface PageCase {
  path: string;
  h1: string;
  title: string;
  description: string;
  crumb: string | null;
  /** Secondary button of the hero (opens a dialog), `null` when the page has none. */
  secondary: string | null;
  quizType: "tempered" | "mirrors";
}

const PAGES: PageCase[] = [
  {
    path: "/obrabotka-stekla/",
    h1: "Обработка стекла до закалки",
    title: "Обработка стекла до закалки: кромка, отверстия | Inex Glass",
    description:
      "Кромка, отверстия и вырезы, фацет, матирование и печать — в одном заказе с закалкой. После закалки стекло уже не обработать.",
    crumb: null,
    secondary: "Отправить чертёж",
    quizType: "tempered",
  },
  {
    path: "/obrabotka-stekla/kromka/",
    h1: "Обработка кромки стекла",
    title: "Обработка кромки стекла — шлифовка, еврокромка | Inex Glass",
    description:
      "Шлифованная, полированная, «еврокромка» (трапеция) и «карандаш». Какую кромку выбрать для профиля, видимого торца и мебели.",
    crumb: "Кромка",
    secondary: "Отправить чертёж",
    quizType: "tempered",
  },
  {
    path: "/obrabotka-stekla/otverstiya-i-vyrezy/",
    h1: "Отверстия и вырезы в стекле",
    title: "Сверление отверстий в стекле по ГОСТ | Inex Glass",
    description:
      "Отверстия Ø 4–130 мм с притуплённой кромкой, фрезерование от R10. Отверстие — не ближе двух толщин стекла к кромке: калькулятор внутри.",
    crumb: "Отверстия и вырезы",
    secondary: "Отправить чертёж на проверку",
    quizType: "tempered",
  },
  {
    path: "/obrabotka-stekla/facet/",
    h1: "Фацет на зеркале",
    title: "Фацет на зеркале — что это, ширина 5–40 мм | Inex Glass",
    description:
      "Фацет — широкая полированная фаска по краю зеркала или стекла. Делаем шириной 5–40 мм на зеркалах и стекле от 4 мм — для залов, салонов и гостиниц.",
    crumb: "Фацет",
    secondary: "Отправить размеры",
    quizType: "mirrors",
  },
  {
    path: "/obrabotka-stekla/matirovanie/",
    h1: "Пескоструйное матирование стекла",
    title: "Матирование стекла — пескоструй, логотипы, рисунки | Inex Glass",
    description:
      "Пескоструйное матирование до и после закалки: сплошное, полосы приватности, логотип, рисунок, глубокое, по зеркалу. Долговечнее плёнки.",
    crumb: "Матирование",
    secondary: "Отправить макет",
    quizType: "tempered",
  },
  {
    path: "/obrabotka-stekla/plenki/",
    h1: "Наклейка плёнки на стекло",
    title: "Матовая плёнка на стекло для офиса — в составе заказа | Inex Glass",
    description:
      "Матовые, тонирующие и защитные плёнки на стекло вашего заказа. Когда лучше плёнка, а когда — пескоструй или сатин.",
    crumb: "Плёнки",
    secondary: "Отправить чертёж",
    quizType: "tempered",
  },
  {
    path: "/obrabotka-stekla/pechat/",
    h1: "Печать на стекле",
    title: "Печать на стекле — шелкография, УФ-печать, фотопечать | Inex Glass",
    description:
      "Шелкография керамической краской вжигается при закалке и не стирается. Цвета по RAL, формат до 1100 × 700 мм. УФ-печать и фотопечать — до 2000 × 3180 мм.",
    crumb: "Печать",
    secondary: "Отправить макет",
    quizType: "tempered",
  },
];

const HOLES_PATH = "/obrabotka-stekla/otverstiya-i-vyrezy/";
const FACET_PATH = "/obrabotka-stekla/facet/";
/** The site-wide `holesCalculator` block (chips, scheme, diameter field) lives here. */
const TOLERANCES_PATH = "/kak-zakazat/dopuski-i-gost/";
const DIAMETER_HINT = "До 220 мм — при сверлении с одной стороны. Уточним по чертежу";

test.beforeAll(async ({ request }) => {
  const response = await request.get("/obrabotka-stekla/");
  expect(response.status(), "run `pnpm seed --only=processing --force` before this spec").toBe(200);
});

test.beforeEach(async ({ page }) => {
  await page.route("https://mc.yandex.ru/**", (route) => route.abort());
  // Analytics consent (hides the cookie banner) + a Metrika stub that records goals.
  await page.addInitScript(() => {
    const w = window as unknown as {
      __goals: Goal[];
      __INEX_YM_ID__: number;
      ym: (...args: unknown[]) => void;
    };
    window.localStorage.setItem("inex-consent-v1", "all");
    w.__goals = [];
    w.__INEX_YM_ID__ = 1;
    w.ym = (...args: unknown[]) => {
      if (args[1] === "reachGoal") {
        w.__goals.push({ name: String(args[2]), params: args[3] as Record<string, unknown> });
      }
    };
  });
});

/**
 * Navigates and waits for hydration of the client calculator. `domcontentloaded` instead of
 * `load`: a dev server under load may hold late assets (fonts, images) for a long time.
 */
async function open(page: Page, path: string) {
  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
  return response;
}

/** Opens a page with the calculator and waits until it is hydrated (interactive). */
async function openCalculator(page: Page, path: string) {
  await open(page, path);
  await expect(page.locator('[data-testid="holes-calculator"][data-hydrated]')).toHaveCount(1, {
    timeout: 60_000,
  });
}

const goals = (page: Page) =>
  page.evaluate(() => (window as unknown as { __goals: Goal[] }).__goals);

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test.describe("processing pages", () => {
  for (const item of PAGES) {
    test(`${item.path}: meta, h1, crumbs, CTA`, async ({ page }) => {
      const response = await open(page, item.path);
      expect(response?.status()).toBe(200);

      await expect(page).toHaveTitle(item.title);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        "content",
        item.description
      );
      const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
      expect(new URL(canonical!).pathname).toBe(item.path);

      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("h1")).toHaveText(item.h1);

      const crumbs = page.getByRole("navigation", { name: /крошки/i }).first();
      await expect(crumbs).toContainText("Главная");
      await expect(crumbs).toContainText("Обработка стекла");
      if (item.crumb) await expect(crumbs).toContainText(item.crumb);

      const jsonLd = (await page.locator('script[type="application/ld+json"]').allTextContents())
        .map((text) => JSON.parse(text) as { "@type"?: string })
        .map((data) => data["@type"]);
      expect(jsonLd).toContain("BreadcrumbList");

      const body = await page.locator("main").innerText();
      expect(body).not.toMatch(/[{}]/);

      // The first «Рассчитать стоимость» is on the first screen and carries the page context.
      const quiz = page.locator("main a[data-quiz-cta]").first();
      await expect(quiz).toContainText("Рассчитать стоимость");
      await expect(quiz).toBeInViewport();
      const href = new URL((await quiz.getAttribute("href"))!, "http://x");
      expect(href.pathname).toBe("/raschet-stoimosti/");
      expect(href.searchParams.get("type")).toBe(item.quizType);
      expect(href.searchParams.get("src")).toBe(item.path);

      const secondary = item.secondary;
      if (secondary) {
        // Retried: a click before hydration of the form provider does nothing.
        await expect(async () => {
          await page.getByRole("button", { name: secondary, exact: true }).first().click();
          await expect(page.getByRole("dialog")).toBeVisible({ timeout: 3_000 });
        }).toPass({ timeout: 45_000 });
      } else {
        await expect(page.locator("main").getByRole("button", { name: /^Отправить/ })).toHaveCount(
          0
        );
      }

      if ((page.viewportSize()?.width ?? 0) <= 375) await noHorizontalScroll(page);
    });
  }

  test("hub: 6 photo cards, info panels, no final buttons or conditions", async ({ page }) => {
    await open(page, "/obrabotka-stekla/");
    const section = page.getByTestId("processing-operations");
    // The mockup shows no heading; the outline keeps an sr-only h2.
    await expect(section.getByRole("heading", { level: 2 })).toHaveText("Что делаем");
    const cards = section.getByTestId("processing-card");
    await expect(cards).toHaveCount(6);
    await expect(cards.nth(1)).toContainText("Отверстия и вырезы");
    await expect(cards.nth(1)).toContainText("Ø 4–130 мм; от кромки — не ближе двух толщин стекла");

    const info = page.getByTestId("processing-info");
    await expect(info.getByRole("heading", { level: 2 })).toHaveText([
      "Как считается цена",
      "Перед отправкой чертежа",
    ]);
    await expect(info).toContainText("В ориентировочную цену за м² обработка не входит!");
    await expect(info.getByRole("link", { name: "Требования к чертежам" })).toHaveAttribute(
      "href",
      "/kak-zakazat/trebovaniya-k-chertezham/"
    );
    await expect(info.getByRole("link", { name: "Допуски по ГОСТ 30698-2014" })).toHaveAttribute(
      "href",
      "/kak-zakazat/dopuski-i-gost/"
    );
    // The hero carries the only buttons and the terms: no «Условия» section, one quiz button.
    await expect(page.locator("main").getByRole("heading", { name: "Условия" })).toHaveCount(0);
    await expect(page.locator("main a[data-quiz-cta]")).toHaveCount(1);

    await cards.nth(1).click();
    await expect(page).toHaveURL(/\/obrabotka-stekla\/otverstiya-i-vyrezy\/$/);
  });

  test("service page: photo hero, plaque and the «Как указать» panel", async ({ page }) => {
    await open(page, HOLES_PATH);
    const hero = page.getByTestId("processing-hero");
    await expect(hero.locator("img")).toHaveAttribute("alt", /\S/);
    await expect(hero.getByTestId("processing-intro")).toBeVisible();
    await expect(
      page.getByTestId("processing-callout").getByRole("heading", { level: 2 })
    ).toHaveText("Если фурнитура не подходит к отверстию");
    const info = page.getByTestId("processing-info");
    await expect(info.getByRole("heading", { level: 2 })).toHaveText([
      "Как указать в чертеже",
      "Допуски диаметра",
      "Как считается цена",
    ]);
  });

  test("facet: sections of the service page mockup", async ({ page }) => {
    await open(page, FACET_PATH);
    const main = page.locator("main");

    // specs: 4 tiles, the last one is the accent tile.
    const specs = page.getByTestId("processing-spec");
    await expect(specs).toHaveCount(4);
    await expect(specs.locator("dd").first()).toHaveText("5–40 мм");
    await expect(specs.last()).toHaveAttribute("data-accent", "");
    await expect(specs.last()).toContainText("Любая");

    // about: H2, list and the diagram with a descriptive alt.
    const about = page.getByTestId("processing-about");
    await expect(about.getByRole("heading", { level: 2 })).toHaveText("Что такое фацет");
    await expect(about.locator("li")).toHaveCount(4);
    await expect(about.locator("figcaption")).toHaveText("Сечение края с фацетом");
    await expect(about.locator("figure img")).toHaveAttribute("alt", /Схема сечения края/);

    // use-cases: 6 numbered photo cards (number, title, text over the photo).
    const useCases = page.getByTestId("processing-use-cases");
    await expect(useCases.getByRole("heading", { level: 2 })).toHaveText("Где применяют");
    const useCaseItems = useCases.getByTestId("processing-use-case");
    await expect(useCaseItems).toHaveCount(6);
    await expect(useCases.locator('[data-testid="processing-use-case"][data-photo]')).toHaveCount(
      6
    );
    await expect(useCaseItems.first().locator("img")).toHaveAttribute(
      "alt",
      "Зеркальная стена танцевального зала из полотен с фацетом"
    );
    await expect(useCaseItems.first()).toContainText("01");
    await expect(useCases.getByRole("heading", { level: 3 }).last()).toHaveText("Кухни");

    // callout: the trailing link of the text is the button.
    const callout = page.getByTestId("processing-callout");
    await expect(callout.getByRole("heading", { level: 2 })).toHaveText("А на закалённом стекле?");
    await expect(callout).toContainText("На закалённом стекле фацет не делаем.");
    await expect(callout.getByRole("link", { name: "Обработка кромки" })).toHaveAttribute(
      "href",
      "/obrabotka-stekla/kromka/"
    );

    // related: three other services, the link to the hub.
    const related = page.getByTestId("processing-related");
    await expect(related.getByRole("heading", { level: 2 })).toHaveText("Другая обработка");
    const cards = related.getByTestId("processing-card");
    await expect(cards).toHaveCount(3);
    await expect(cards).toHaveText([/Обработка кромки/, /Отверстия и вырезы/, /матирование/]);
    await expect(related.getByRole("link", { name: "Все виды обработки" })).toHaveAttribute(
      "href",
      "/obrabotka-stekla/"
    );

    // how-to-order: two panels close the page, no conditions section.
    const info = page.getByTestId("processing-info");
    await expect(info.getByRole("heading", { level: 2 })).toHaveText([
      "Как заказать",
      "Как считается цена",
    ]);
    await expect(main.getByRole("heading", { name: "Условия" })).toHaveCount(0);

    const text = await main.innerText();
    expect(text).not.toMatch(/30 (?:и|или) 50 мм|уточнить/i);
    if ((page.viewportSize()?.width ?? 0) <= 375) await noHorizontalScroll(page);
  });

  test("about diagram: fits the panel, opens full size on phones", async ({ page }) => {
    await open(page, "/obrabotka-stekla/kromka/");
    const figure = page.getByTestId("processing-about").locator("figure");
    const image = figure.locator("img").first();
    await image.scrollIntoViewIfNeeded();
    const [imageBox, figureBox] = [await image.boundingBox(), await figure.boundingBox()];
    // Never wider than its panel: the whole diagram is visible, no sideways scroll.
    expect(imageBox!.x + imageBox!.width).toBeLessThanOrEqual(figureBox!.x + figureBox!.width);

    const zoom = figure.getByRole("button", { name: /^Открыть схему/ });
    if ((page.viewportSize()?.width ?? 0) >= 600) {
      await expect(zoom).toBeHidden();
      return;
    }
    await expect(figure).toContainText("Открыть схему");
    // Retried: a tap before hydration does nothing.
    await expect(async () => {
      await zoom.click();
      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 3_000 });
    }).toPass({ timeout: 45_000 });
    await expect(page.getByRole("dialog").locator("img").last()).toHaveAttribute(
      "alt",
      /Схема профилей/
    );
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("unknown slug answers 404", async ({ request }) => {
    const response = await request.get("/obrabotka-stekla/net-takoy-uslugi/");
    const html = await response.text();
    expect(html).toContain("<h1");
    // `next dev` renders dynamically and keeps 200 for a page-level 404 (see
    // `not-found-ssr.spec.ts`); production and ISR answer 404.
    if (!html.includes("next-devtools")) expect(response.status()).toBe(404);
  });
});

test.describe("holes calculator", () => {
  test("holes page: panel with the thickness select and four tiles", async ({ page }) => {
    await openCalculator(page, `${HOLES_PATH}#kalkulyator`);
    const panel = page.locator("#kalkulyator");
    await expect(panel).toHaveCount(1);
    await expect(panel).toContainText("Калькулятор отверстий");
    await expect(panel.getByRole("heading", { level: 2 })).toHaveText("Калькулятор расстояний");
    // No scheme and no diameter field: the «about» diagram and the tolerance panel carry them.
    await expect(panel.getByTestId("holes-scheme")).toHaveCount(0);
    await expect(panel.getByLabel("Диаметр отверстия, мм")).toHaveCount(0);

    const select = panel.getByLabel("Толщина стекла, мм");
    const results = panel.getByTestId("holes-results");
    await expect(results).toHaveAttribute("aria-live", "polite");
    await expect(select).toHaveValue("10");
    await expect(results.locator("dt")).toHaveText([
      "От кромки стекла",
      "Между отверстиями",
      "От угла стекла",
      "Мин. диаметр",
    ]);
    // 2t, 2t, 6t and Ø ≥ t (ГОСТ 30698-2014).
    await expect(results.locator("dd")).toHaveText(["20 мм", "20 мм", "60 мм", "Ø 10 мм"]);
    await expect(panel).toContainText("t = 10 мм · 2t = 20 мм · 6t = 60 мм");

    await select.selectOption("4");
    await expect(results.locator("dd")).toHaveText(["8 мм", "8 мм", "24 мм", "Ø 4 мм"]);
    await select.selectOption("19");
    await expect(results.locator("dd")).toHaveText(["38 мм", "38 мм", "114 мм", "Ø 19 мм"]);
    await expect(panel).toContainText("t = 19 мм · 2t = 38 мм · 6t = 114 мм");

    if ((page.viewportSize()?.width ?? 0) <= 375) await noHorizontalScroll(page);
  });

  test("holes page: calc_holes goal is sent once for a burst of changes", async ({ page }) => {
    await openCalculator(page, HOLES_PATH);
    const select = page.locator("#kalkulyator").getByLabel("Толщина стекла, мм");
    await select.selectOption("4");
    await select.selectOption("19");
    await expect
      .poll(async () => (await goals(page)).filter((goal) => goal.name === "calc_holes"))
      .toEqual([{ name: "calc_holes", params: { thickness: 4, source: "otverstiya-i-vyrezy" } }]);
  });

  test("matirovanie: the about panel is a photo of the variants, no zoom", async ({ page }) => {
    await open(page, "/obrabotka-stekla/matirovanie/");
    const figure = page.getByTestId("processing-about").locator("figure");
    await expect(figure.locator("figcaption")).toHaveText("Варианты матирования");
    const image = figure.locator("img");
    await expect(image).toHaveCount(1);
    await expect(image).toHaveAttribute("alt", /^Четыре стеклянные панели/);
    await expect(figure.getByRole("button")).toHaveCount(0);
    // The photo fills the panel width (a 4:3 frame), not a thumbnail.
    await image.scrollIntoViewIfNeeded();
    const [imageBox, figureBox] = [await image.boundingBox(), await figure.boundingBox()];
    expect(imageBox!.width).toBeGreaterThan(figureBox!.width * 0.8);
    expect(imageBox!.width / imageBox!.height).toBeCloseTo(4 / 3, 1);

    // «Что можно сделать»: six photo cards.
    const cards = page.locator('[data-testid="processing-use-case"][data-photo]');
    await expect(cards).toHaveCount(6);
    if ((page.viewportSize()?.width ?? 0) <= 375) await noHorizontalScroll(page);
  });

  test("holes page: the tolerance table card ends level with its neighbours", async ({ page }) => {
    await open(page, HOLES_PATH);
    const info = page.getByTestId("processing-info");
    await info.scrollIntoViewIfNeeded();
    const tableCard = info
      .getByRole("group", { name: "Допуски диаметра" })
      .locator("table")
      .locator("xpath=..");
    const noteCard = info
      .getByRole("group", { name: "Как указать в чертеже" })
      .locator("div.bg-surface")
      .last();
    const [table, note] = [await tableCard.boundingBox(), await noteCard.boundingBox()];
    if ((page.viewportSize()?.width ?? 0) >= 1366) {
      // Three panels in a row: the white cards share the bottom line.
      expect(Math.abs(table!.y + table!.height - (note!.y + note!.height))).toBeLessThanOrEqual(2);
    } else {
      // Stacked panels keep their natural height: the table card does not grow.
      expect(table!.height).toBeLessThan(400);
    }
  });

  test("holes page: diameter tolerances as a two-column panel table, no FAQ", async ({ page }) => {
    await open(page, HOLES_PATH);
    const panel = page
      .getByTestId("processing-info")
      .getByRole("group", { name: "Допуски диаметра" });
    await expect(panel).toContainText(
      "Втулка или прокладка крепежа должна садиться в отверстие и с минимальным, и с максимальным диаметром."
    );
    // The panel's own table (mockup): the same two columns on every width, no site table cards.
    const rows = panel.locator("tbody tr");
    await expect(rows).toHaveCount(3);
    await expect(rows.first()).toBeVisible();
    await expect(panel.locator(".ig-table, .ig-mcard")).toHaveCount(0);
    await expect(panel.locator("thead th")).toHaveText(["Диаметр", "Допуск"]);
    await expect(rows.first().locator("td")).toHaveCSS("text-align", "right");
    for (const text of ["±1,0 мм", "±2,0 мм", "по согласованию"]) {
      await expect(panel).toContainText(text);
    }
    // The mockup has no FAQ on this page.
    await expect(
      page.locator('script[type="application/ld+json"]', { hasText: "FAQPage" })
    ).toHaveCount(0);
  });

  test("tolerances page: site-wide block — chips, scheme and keyboard", async ({ page }) => {
    await openCalculator(page, TOLERANCES_PATH);

    const calc = page.getByTestId("holes-calculator");
    const results = page.getByTestId("holes-results");
    const scheme = page.getByTestId("holes-scheme");
    const group = calc.getByRole("radiogroup", { name: "Толщина стекла" });

    await expect(results).toHaveAttribute("aria-live", "polite");
    await expect(group.getByRole("radio", { name: "10 мм" })).toHaveAttribute(
      "aria-checked",
      "true"
    );
    await expect(results.locator("dd")).toHaveText(["20мм", "20мм", "60мм"]);
    await expect(results).toContainText("Минимальный диаметр — 10 мм; меньше — по согласованию");

    await group.getByRole("radio", { name: "4 мм", exact: true }).click();
    await expect(results.locator("dd")).toHaveText(["8мм", "8мм", "24мм"]);

    await group.getByRole("radio", { name: "19 мм" }).click();
    await expect(results.locator("dd")).toHaveText(["38мм", "38мм", "114мм"]);
    await expect(scheme).toContainText("Стекло 19 мм");
    await expect(scheme).toContainText("114 мм");
    await expect(scheme).toContainText("Ø ≥ 19");

    // Arrow keys move the selection (roving radio group).
    await group.getByRole("radio", { name: "19 мм" }).focus();
    await page.keyboard.press("ArrowLeft");
    await expect(group.getByRole("radio", { name: "15 мм" })).toHaveAttribute(
      "aria-checked",
      "true"
    );
    await expect(results.locator("dd").first()).toHaveText("30мм");

    if ((page.viewportSize()?.width ?? 0) <= 375) {
      const box = await scheme.boundingBox();
      expect(box!.x + box!.width).toBeLessThanOrEqual(375);
      // Phone: each result tile is one row «number — caption».
      const tile = results.locator("dl > div").first();
      const direction = await tile.evaluate((el) => getComputedStyle(el).flexDirection);
      expect(direction).toBe("row-reverse");
      await noHorizontalScroll(page);
    }
  });

  test("tolerances page: diameter tolerances and hints", async ({ page }) => {
    await openCalculator(page, TOLERANCES_PATH);
    const input = page.getByLabel("Диаметр отверстия, мм");
    const message = page.getByTestId("holes-diameter-message");

    const cases: Array<[string, string]> = [
      ["12", "Допуск диаметра: ±1,0 мм"],
      ["25", "Допуск диаметра: ±2,0 мм"],
      ["120", "Допуск диаметра: по согласованию"],
      ["150", DIAMETER_HINT],
      ["3", DIAMETER_HINT],
      ["8", "Диаметр меньше толщины стекла — только по согласованию"],
      ["12,5", "Допуск диаметра: ±1,0 мм"],
    ];
    for (const [value, expected] of cases) {
      await input.fill(value);
      await expect(message).toHaveText(expected);
    }
    await input.fill("");
    await expect(message).toHaveText("");
  });

  test("no critical accessibility violations", async ({ page }) => {
    for (const path of ["/obrabotka-stekla/", HOLES_PATH, FACET_PATH]) {
      await open(page, path);
      const results = await new AxeBuilder({ page }).analyze();
      const critical = results.violations.filter((violation) => violation.impact === "critical");
      expect(
        critical.map((violation) => violation.id),
        path
      ).toEqual([]);
    }
  });
});
