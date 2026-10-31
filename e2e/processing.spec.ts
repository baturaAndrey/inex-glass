import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Section «Обработка стекла» (task 25): hub + 6 service pages, meta from 17-meta, the holes
 * calculator (ГОСТ 30698-2014) with its goal, FAQ and tolerance table.
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
      "Шлифованная, полированная, «трапеция» и «еврокромка». Какую кромку выбрать для профиля, видимого торца и мебели.",
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
    title: "Фацет на зеркале — что это, ширина 30 и 50 мм | Inex Glass",
    description:
      "Фацет — широкая полированная фаска по краю зеркала. Делаем на зеркалах шириной 30 или 50 мм — для залов, салонов и гостиниц.",
    crumb: "Фацет",
    secondary: "Отправить размеры",
    quizType: "mirrors",
  },
  {
    path: "/obrabotka-stekla/matirovanie/",
    h1: "Пескоструйное матирование стекла",
    title: "Матирование стекла — пескоструй, логотипы, рисунки | Inex Glass",
    description:
      "Пескоструйное матирование до закалки: сплошное, полосы приватности, логотип на перегородке. Долговечнее плёнки.",
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
    secondary: null,
    quizType: "tempered",
  },
  {
    path: "/obrabotka-stekla/pechat/",
    h1: "Печать на стекле",
    title: "Печать на стекле — шелкография с закалкой, УФ-печать | Inex Glass",
    description:
      "Шелкография керамической краской вжигается при закалке и не стирается. Цвета по RAL, формат до 1100 × 700 мм.",
    crumb: "Печать",
    secondary: "Отправить макет",
    quizType: "tempered",
  },
];

const HOLES_PATH = "/obrabotka-stekla/otverstiya-i-vyrezy/";
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

  test("hub: operations table of 6 clickable rows", async ({ page }) => {
    await open(page, "/obrabotka-stekla/");
    const section = page.getByTestId("processing-operations");
    await expect(section.getByRole("heading", { level: 2 })).toHaveText("Что делаем");
    const mobile = (page.viewportSize()?.width ?? 0) < 600;
    if (mobile) {
      await expect(section.locator(".ig-mcard")).toHaveCount(6);
      await expect(section.locator("table")).toBeHidden();
    } else {
      await expect(section.locator("tbody tr")).toHaveCount(6);
    }
    const scope = mobile ? section.locator(".ig-mcard") : section.locator("tbody tr");
    await expect(scope.nth(1)).toContainText("Ø 4–130 мм; от кромки — не ближе двух толщин стекла");
    await scope.nth(1).getByRole("link").click();
    await expect(page).toHaveURL(/\/obrabotka-stekla\/otverstiya-i-vyrezy\/$/);
  });

  test("facet: mirrors only", async ({ page }) => {
    await open(page, "/obrabotka-stekla/facet/");
    const main = page.locator("main");
    await expect(main.getByRole("heading", { name: "А на закалённом стекле?" })).toBeVisible();
    await expect(main).toContainText("На закалённом стекле фацет не делаем.");
    const text = await main.innerText();
    expect(text).not.toMatch(/фацет[^.]*\bдо 30 мм/i);
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
  test("defaults, thickness switching, scheme and keyboard", async ({ page }) => {
    await openCalculator(page, `${HOLES_PATH}#kalkulyator`);
    await expect(page.locator("#kalkulyator")).toHaveCount(1);

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

  test("diameter tolerances and hints", async ({ page }) => {
    await openCalculator(page, HOLES_PATH);
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

  test("calc_holes goal is sent once for a burst of interactions", async ({ page }) => {
    await openCalculator(page, HOLES_PATH);
    const group = page.getByRole("radiogroup", { name: "Толщина стекла" });
    await group.getByRole("radio", { name: "4 мм", exact: true }).click();
    await group.getByRole("radio", { name: "19 мм" }).click();
    await page.getByLabel("Диаметр отверстия, мм").fill("12");
    await expect
      .poll(async () => (await goals(page)).filter((goal) => goal.name === "calc_holes"))
      .toEqual([{ name: "calc_holes", params: { thickness: 4, source: "otverstiya-i-vyrezy" } }]);
  });

  test("tolerance table, FAQ and FAQPage JSON-LD", async ({ page }) => {
    await openCalculator(page, HOLES_PATH);
    const tolerance = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Допуски диаметра" }) });
    const mobile = (page.viewportSize()?.width ?? 0) < 600;
    await expect(
      mobile ? tolerance.locator(".ig-mcard") : tolerance.locator("tbody tr")
    ).toHaveCount(3);

    const question = page.getByRole("button", {
      name: "Можно ли просверлить закалённое стекло на объекте?",
    });
    await question.click();
    await expect(page.getByText("Закалённое стекло при сверлении разрушается.")).toBeVisible();

    const faqLd = (await page.locator('script[type="application/ld+json"]').allTextContents())
      .map((text) => JSON.parse(text) as { "@type"?: string; mainEntity?: unknown[] })
      .filter((data) => data["@type"] === "FAQPage");
    expect(faqLd).toHaveLength(1);
    expect(faqLd[0]!.mainEntity).toHaveLength(4);
  });

  test("no critical accessibility violations", async ({ page }) => {
    for (const path of ["/obrabotka-stekla/", HOLES_PATH]) {
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
