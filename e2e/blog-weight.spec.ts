import { mkdirSync, rmSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { adminToken, skipOnMissingAdmin } from "./helpers/admin";
import { VIEWPORTS } from "./helpers/viewports";
import { checkStopWords } from "../src/lib/domain/stop-words";

/**
 * Task 31: blog listing / pagination, article template and the glass weight calculator.
 * Runs against the full seed (`pnpm seed --full` / `--only=blog`).
 *
 * The listing tests count ALL published articles, and the pagination test publishes 8 fixture
 * articles for a moment (desktop-1366 only): a cross-process lock serialises those tests across
 * the viewport projects, and the fixture test releases the lock only after the listing is back
 * to the seed state (the ISR cache revalidates stale-while-revalidate), so no listing check ever
 * sees the fixtures.
 */

const BLOG = "/blog/";
const TOOL = "/instrumenty/kalkulyator-vesa-stekla/";
const MOZHNO = "/blog/mozhno-li-rezat-zakalennoe-steklo/";

/** 17-meta order = listing order (seed dates). */
const ARTICLES = [
  {
    path: MOZHNO,
    h1: "Можно ли резать закалённое стекло",
    title: "Можно ли резать закалённое стекло — и что делать с размером",
    description:
      "Коротко: нет — после закалки стекло рассыпается при резке и сверлении. Почему так и как не ошибиться с размером заранее.",
  },
  {
    path: "/blog/chem-otlichaetsya-zakalennoe-steklo-ot-obychnogo/",
    h1: "Чем закалённое стекло отличается от обычного",
    title: "Чем закалённое стекло отличается от обычного",
    description:
      "Закалённое прочнее обычного в 5–6 раз и рассыпается на тупые осколки, но его нельзя обработать после закалки. Как отличить на глаз.",
  },
  {
    path: "/blog/kak-vybrat-tolshchinu-stekla/",
    h1: "Как выбрать толщину стекла",
    title: "Толщина стекла — как выбрать и когда нужен триплекс",
    description:
      "От чего зависит толщина: размер, крепление, нагрузка, безопасность. Почему её подбирают расчётом, а не по таблице.",
  },
  {
    path: "/blog/kak-snyat-razmery-dlya-stekla/",
    h1: "Как снять размеры проёма для закалённого стекла",
    title: "Как снять размеры проёма для закалённого стекла",
    description:
      "Когда мерить, чем мерить, какие зазоры заложить и как отрисовать сложный проём — чтобы стекло встало с первого раза.",
  },
  {
    path: "/blog/tripleks-ili-zakalennoe-dlya-ograzhdenij/",
    h1: "Триплекс или закалённое стекло для ограждений",
    title: "Триплекс или закалённое стекло для ограждения — что выбрать",
    description:
      "Как ведёт себя стекло при разрушении, какие нагрузки задаёт проект и когда однослойного закалённого недостаточно.",
  },
  {
    path: "/blog/markirovka-zakalennogo-stekla/",
    h1: "Марки и маркировка стекла",
    title: "Стекло М1 и маркировка — что значат марки стекла",
    description:
      "Что значит М1 и 4М1 в формуле, марки листового стекла М0–М7 и как найти клеймо закалённого стекла.",
  },
] as const;

const PAGES = [
  {
    path: BLOG,
    h1: "Статьи",
    title: "Статьи о закалённом стекле для инженеров | Inex Glass",
    description:
      "Допуски, толщина, триплекс, маркировка — практические ответы для тех, кто заказывает стекло на объект.",
    crumbs: ["Главная", "Блог"],
  },
  {
    path: TOOL,
    h1: "Калькулятор веса стекла",
    title: "Вес стекла — калькулятор для 4–19 мм и триплекса | Inex Glass",
    description:
      "Вес стекла: 2,5 кг на м² на каждый миллиметр толщины. Калькулятор для одинарного стекла и триплекса + таблица 4–19 мм.",
    crumbs: ["Главная", "Инструменты", "Калькулятор веса стекла"],
  },
  ...ARTICLES.map((article) => ({ ...article, crumbs: ["Главная", "Блог", article.h1] })),
];

const NOT_FOUND_TITLE = "Страница не найдена";

/** Dev pages ship the Next dev tools bundle (status of a 404 inside Suspense stays 200 there). */
const isDevServerHtml = (html: string) => html.includes("next-devtools");

/**
 * The not-found screen is part of every page's RSC payload, so a raw-HTML substring check of its
 * text matches any page. Only the document `<title>` and the server-rendered `<h1>` identify the
 * 404 page itself.
 */
const isNotFoundDocument = (html: string) =>
  html.includes(`<title>${NOT_FOUND_TITLE}`) &&
  new RegExp(`<h1[^>]*>${NOT_FOUND_TITLE}</h1>`).test(html);

// ---------------------------------------------------------------------------------------------
// Cross-process lock for the listing tests
// ---------------------------------------------------------------------------------------------

const LOCK_DIR = path.join(os.tmpdir(), "inex-glass-e2e-blog.lock");
const LOCK_STALE_MS = 10 * 60_000;
const LOCK_WAIT_MS = 5 * 60_000;

async function withListingLock<T>(fn: () => Promise<T>): Promise<T> {
  const deadline = Date.now() + LOCK_WAIT_MS;
  for (;;) {
    try {
      mkdirSync(LOCK_DIR);
      break;
    } catch {
      try {
        if (Date.now() - statSync(LOCK_DIR).mtimeMs > LOCK_STALE_MS)
          rmSync(LOCK_DIR, { recursive: true, force: true });
      } catch {
        // Released meanwhile.
      }
      if (Date.now() > deadline) throw new Error("blog e2e: listing lock timeout");
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  try {
    return await fn();
  } finally {
    rmSync(LOCK_DIR, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------------------------
// Pagination fixtures (8 extra published articles, removed afterwards)
// ---------------------------------------------------------------------------------------------

const FIXTURE_PREFIX = "e2e-blog-";
const FIXTURE_COUNT = 8;
const FIXTURE_TITLE_PREFIX = "[e2e] Статья";
/** One wait for the ISR listing to pick up (or drop) the fixtures. */
const FIXTURE_LISTING_WAIT_MS = 60_000;
/**
 * The listing tests may wait for the lock while the fixture test holds it through both of its
 * listing waits, and the fixture test runs both waits itself: the default 30 s is not enough.
 */
const LISTING_TEST_TIMEOUT_MS = LOCK_WAIT_MS + 2 * FIXTURE_LISTING_WAIT_MS + 60_000;

const auth = (token: string) => ({ Authorization: `JWT ${token}` });

function fixtureBody(text: string) {
  return {
    root: {
      type: "root",
      format: "",
      indent: 0,
      version: 1,
      direction: "ltr",
      children: [
        {
          type: "paragraph",
          format: "",
          indent: 0,
          version: 1,
          direction: "ltr",
          textFormat: 0,
          children: [
            { type: "text", text, format: 0, detail: 0, mode: "normal", style: "", version: 1 },
          ],
        },
      ],
    },
  };
}

async function removeFixtures(request: APIRequestContext, token: string) {
  // `like` is not usable here (bulk delete with it fails on articles): exact slugs instead.
  const slugs = Array.from(
    { length: FIXTURE_COUNT },
    (_, index) => `${FIXTURE_PREFIX}${index + 1}`
  );
  const query = `where[slug][in]=${encodeURIComponent(slugs.join(","))}`;
  const response = await request.delete(`/api/articles/?${query}`, { headers: auth(token) });
  expect(response.ok(), await response.text()).toBe(true);
}

/**
 * Polls until the cached listing shows the fixtures (`/blog/page/2/` answers 200 with fixture
 * cards) or no longer shows them (`/blog/page/2/` is the 404 page and neither page links a
 * fixture): ISR pages revalidate stale-while-revalidate, so the first request after a write may
 * still see the old state. Fixture cards are detected by the `e2e-blog-` slug of their links.
 */
async function waitForFixtureListing(request: APIRequestContext, visible: boolean) {
  await expect
    .poll(
      async () => {
        const secondResponse = await request.get("/blog/page/2/", { maxRedirects: 0 });
        const second = await secondResponse.text();
        if (visible) return secondResponse.status() === 200 && second.includes(FIXTURE_PREFIX);

        const first = await (await request.get(BLOG)).text();
        // `next dev` answers 200 for the streamed 404 (see e2e/not-found-ssr.spec.ts).
        const secondIsNotFound =
          (isDevServerHtml(second) || secondResponse.status() === 404) &&
          isNotFoundDocument(second);
        return (
          secondIsNotFound && !second.includes(FIXTURE_PREFIX) && !first.includes(FIXTURE_PREFIX)
        );
      },
      { timeout: FIXTURE_LISTING_WAIT_MS, intervals: [500, 1_000, 2_000] }
    )
    .toBe(true);
}

async function createFixtures(request: APIRequestContext, token: string) {
  await removeFixtures(request, token);
  for (let n = 1; n <= FIXTURE_COUNT; n++) {
    const response = await request.post("/api/articles/", {
      headers: auth(token),
      data: {
        title: `${FIXTURE_TITLE_PREFIX} ${n}`,
        slug: `${FIXTURE_PREFIX}${n}`,
        _status: "published",
        // Older than the seeded articles: they end up at the end of the listing.
        datePublished: `2020-01-${String(10 + n).padStart(2, "0")}T12:00:00.000Z`,
        body: fixtureBody("Тестовая статья для проверки пагинации."),
        seo: { description: "Тестовая статья." },
      },
    });
    expect(response.ok(), await response.text()).toBe(true);
  }
}

// ---------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------

async function visibleText(page: Page): Promise<string> {
  return page.locator("main").innerText();
}

async function jsonLd(page: Page): Promise<Array<Record<string, unknown>>> {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  return blocks.flatMap((text) => {
    const data = JSON.parse(text) as Record<string, unknown> | Array<Record<string, unknown>>;
    return Array.isArray(data) ? data : [data];
  });
}

const isMobile = (projectName: string) => projectName === VIEWPORTS.mobile.name;

// ---------------------------------------------------------------------------------------------
// Weight calculator
// ---------------------------------------------------------------------------------------------

test.describe("weight calculator", () => {
  test("defaults, triplex, comma input, empty field, quiz links", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(TOOL);

    await expect(page.getByTestId("weight-per-m2")).toHaveText("25");
    await expect(page.getByTestId("weight-per-glass")).toHaveText("50");
    await expect(page.getByTestId("weight-batch")).toHaveText("500");
    await expect(page.getByTestId("weight-hint")).toContainText(
      "только вдвоём, по одной-две присоски на человека"
    );
    const cta = page.getByTestId("weight-cta");
    await expect(cta).toHaveAttribute("href", /type=tempered&thick=10&.*w=1000&h=2000&q=10/);

    // Comma input.
    const width = page.getByLabel("Ширина, мм");
    await width.fill("1,5");
    await expect(width).not.toHaveAttribute("aria-invalid", "true");
    await expect(page.getByTestId("weight-per-glass")).not.toHaveText("50");

    // Empty field → zeros, hint hidden, CTA still active.
    await width.fill("");
    await expect(page.getByTestId("weight-per-glass")).toHaveText("0");
    await expect(page.getByTestId("weight-batch")).toHaveText("0");
    await expect(page.getByTestId("weight-hint")).toHaveCount(0);
    await expect(cta).toBeEnabled();
    await width.fill("1000");

    // Triplex 8+8, film 0,76 (defaults of the triplex mode).
    await page
      .getByRole("group", { name: "Вид стекла" })
      .getByRole("button", { name: "Триплекс" })
      .click();
    await expect(page.getByLabel("Стекло 1")).toHaveValue("8");
    await expect(page.getByLabel("Стекло 2")).toHaveValue("8");
    await expect(
      page.getByRole("group", { name: "Толщина плёнки" }).getByRole("button", { name: "0,76 мм" })
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("weight-per-m2")).toHaveText("40,72");
    await expect(page.getByTestId("weight-per-glass")).toHaveText("81,4");
    await expect(page.getByTestId("weight-batch")).toHaveText("814,4");
    await expect(page.getByTestId("weight-hint")).toContainText(
      "бригада 3–5 человек или вакуумный подъёмник"
    );
    await expect(cta).toHaveAttribute("href", /type=triplex&.*t1=8&t2=8&film=0\.76/);

    expect(errors).toEqual([]);
  });

  test("weight table: 8 rows, comma decimals", async ({ page }, testInfo) => {
    await page.goto(TOOL);
    const section = page.locator("section", {
      has: page.getByRole("heading", { name: "Сколько весит 1 м² стекла" }),
    });
    if (isMobile(testInfo.project.name)) {
      const cards = section.locator(".ig-mcard");
      await expect(cards).toHaveCount(8);
      await expect(cards.nth(1)).toContainText("12,5 кг");
      await expect(cards.nth(7)).toContainText("47,5 кг");
    } else {
      const rows = section.locator("table tbody tr");
      await expect(rows).toHaveCount(8);
      await expect(rows.nth(1)).toContainText("5 мм");
      await expect(rows.nth(1)).toContainText("12,5 кг");
      await expect(rows.nth(7)).toContainText("47,5 кг");
    }
  });

  test("first screen is the calculator, no intro, one H1", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === VIEWPORTS.desktop.name, "375 / 1366 per task");
    await page.goto(TOOL);
    await expect(page.locator("h1")).toHaveCount(1);
    // The calculator starts within the first screen; no lead paragraph between H1 and it.
    const segment = page.getByRole("group", { name: "Вид стекла" });
    const box = await segment.boundingBox();
    const viewport = page.viewportSize();
    expect(box && viewport && box.y < viewport.height).toBe(true);
    const h1Box = await page.locator("h1").boundingBox();
    expect(box && h1Box && box.y - (h1Box.y + h1Box.height) < 120).toBe(true);
  });

  test("Metrika goals: calc_weight once, calc_to_quiz on the CTA", async ({ page }) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem("inex-consent-v1", "all");
      } catch {
        // Storage blocked: the test then fails on the goal assertions.
      }
      const calls: unknown[][] = [];
      (window as unknown as { __ymCalls: unknown[][] }).__ymCalls = calls;
      window.__INEX_YM_ID__ = 1;
      window.ym = (...args: unknown[]) => {
        calls.push(args);
      };
    });
    await page.goto(TOOL);
    const goals = () =>
      page.evaluate(() =>
        (window as unknown as { __ymCalls: unknown[][] }).__ymCalls
          .filter((call) => call[1] === "reachGoal")
          .map((call) => call[2])
      );

    const width = page.getByLabel("Ширина, мм");
    await width.fill("1200");
    await page.getByLabel("Высота, мм").fill("2100");
    await page.getByLabel("Количество, шт.").fill("12");
    await expect.poll(goals, { timeout: 5_000 }).toContain("calc_weight");
    await width.fill("1300");
    await page.waitForTimeout(1_200);
    expect((await goals()).filter((goal) => goal === "calc_weight")).toHaveLength(1);

    // Stay on the page: cancel the link navigation before React/next-link see the click (a
    // prevented click is not followed by `next/link`, while the CTA onClick still runs).
    await page.evaluate(() => {
      document.addEventListener(
        "click",
        (event) => {
          if ((event.target as Element).closest("[data-testid=weight-cta]")) event.preventDefault();
        },
        { capture: true }
      );
    });
    await page.getByTestId("weight-cta").click();
    await expect.poll(goals).toContain("calc_to_quiz");
  });
});

// ---------------------------------------------------------------------------------------------
// Listing + pagination
// ---------------------------------------------------------------------------------------------

test.describe("blog listing", () => {
  test.beforeEach(() => {
    test.setTimeout(LISTING_TEST_TIMEOUT_MS);
  });

  test("6 cards in 17-meta order, tools, no pagination; page/1 → /blog/, page/2 → 404", async ({
    page,
    request,
  }) => {
    await withListingLock(async () => {
      await page.goto(BLOG);
      const cards = page.getByTestId("article-list").locator("li");
      await expect(cards).toHaveCount(ARTICLES.length);
      for (const [index, article] of ARTICLES.entries()) {
        const card = cards.nth(index);
        await expect(card.getByRole("heading", { level: 2 })).toHaveText(article.h1);
        await expect(card.getByRole("link")).toHaveAttribute("href", article.path);
        await expect(card).toContainText("Статья");
        await expect(card.getByTestId("reading-time")).toHaveText(/^\d+ мин$/);
        await expect(card.locator(".ig-card__sub")).not.toBeEmpty();
      }
      await expect(page.getByRole("navigation", { name: "Страницы" })).toHaveCount(0);
      const tools = page.getByTestId("blog-tools");
      await expect(tools.getByRole("link", { name: "Калькулятор веса стекла" })).toHaveAttribute(
        "href",
        TOOL
      );
      await expect(
        tools.getByRole("link", { name: "Допуски по ГОСТ 30698-2014 и калькулятор отверстий" })
      ).toHaveAttribute("href", "/kak-zakazat/dopuski-i-gost/");

      const first = await request.get("/blog/page/1/", { maxRedirects: 0 });
      expect([301, 308]).toContain(first.status());
      expect(first.headers()["location"]).toMatch(/\/blog\/$/);

      const second = await request.get("/blog/page/2/", { maxRedirects: 0 });
      const html = await second.text();
      if (!isDevServerHtml(html)) expect(second.status()).toBe(404);
      expect(isNotFoundDocument(html), "/blog/page/2/ is the 404 page").toBe(true);
    });
  });

  test("pagination with 8 fixture articles", async ({ page, request }, testInfo) => {
    // Mutates the global article listing: one project only.
    test.skip(testInfo.project.name !== VIEWPORTS.laptop.name, "fixture test, one project");
    let token = "";
    try {
      token = await adminToken(request);
    } catch (error) {
      skipOnMissingAdmin(error);
    }
    await withListingLock(async () => {
      try {
        await createFixtures(request, token);
        await waitForFixtureListing(request, true);
        const response = await page.goto("/blog/page/2/");
        expect(response?.status()).toBe(200);
        await expect(page).toHaveTitle(/— страница 2( \| Inex Glass)?$/);
        await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
          "href",
          /\/blog\/page\/2\/$/
        );
        await expect(page.getByTestId("article-list").locator("li")).toHaveCount(2);
        const nav = page.getByRole("navigation", { name: "Страницы" });
        await expect(nav.locator('[aria-current="page"]')).toHaveText("2");
        await expect(nav.getByRole("link", { name: "1", exact: true })).toHaveAttribute(
          "href",
          BLOG
        );
        await expect(page.getByTestId("blog-tools")).toHaveCount(0);
      } finally {
        await removeFixtures(request, token);
        // Keep the lock until the cached listing has dropped the fixtures again.
        await waitForFixtureListing(request, false);
      }
    });
  });
});

// ---------------------------------------------------------------------------------------------
// Article template
// ---------------------------------------------------------------------------------------------

test.describe("article", () => {
  test("lead, TOC, CTA, related, JSON-LD", async ({ page }, testInfo) => {
    await page.goto(MOZHNO);
    await expect(page.getByTestId("article-lead")).toContainText("Коротко: нет.");

    const toc = page.getByRole("navigation", { name: "Содержание" });
    const links = toc.getByRole("link");
    await expect(links).toHaveCount(4);
    await expect(links.first()).toHaveAttribute("href", "#pochemu-ono-rassypaetsya");
    for (const href of await links.evaluateAll((items) =>
      items.map((a) => a.getAttribute("href"))
    )) {
      await expect(page.locator(`h2${href}`)).toHaveCount(1);
    }

    await links.nth(2).click();
    await expect(page).toHaveURL(/#a-podshlifovat-kromku$/);
    await expect(page.locator("h2#a-podshlifovat-kromku")).toBeInViewport();

    const position = await toc.evaluate((nav) => getComputedStyle(nav.parentElement!).position);
    if (isMobile(testInfo.project.name)) {
      // ≤1100: «Содержание» → text → CTA card.
      const tocY = (await toc.boundingBox())!.y;
      const textY = (await page.locator("article").boundingBox())!.y;
      const ctaY = (await page.getByText("КП — в среднем за").boundingBox())!.y;
      expect(tocY).toBeLessThan(textY);
      expect(textY).toBeLessThan(ctaY);
    } else {
      expect(position).toBe("sticky");
    }

    await expect(page.locator("article ol > li")).toHaveCount(4);

    const related = page.getByTestId("related-articles").locator("li");
    await expect(related).toHaveCount(3);
    await expect(related.getByRole("link", { name: /Можно ли резать/ })).toHaveCount(0);

    const ld = await jsonLd(page);
    const article = ld.find((item) => item["@type"] === "Article");
    expect(article?.headline).toBe("Можно ли резать закалённое стекло");
    expect(String(article?.datePublished)).toMatch(/^2026-10-20/);
    expect(ld.some((item) => item["@type"] === "BreadcrumbList")).toBe(true);

    await page.getByRole("button", { name: "Отправить чертёж на проверку" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("tables become cards on phones", async ({ page }, testInfo) => {
    await page.goto("/blog/chem-otlichaetsya-zakalennoe-steklo-ot-obychnogo/");
    const article = page.locator("article");
    if (isMobile(testInfo.project.name)) {
      await expect(article.locator("table")).toBeHidden();
      await expect(article.locator(".ig-mcard").first()).toBeVisible();
      await expect(article.locator(".ig-mcard")).toHaveCount(6);
    } else {
      await expect(article.locator("table")).toBeVisible();
      await expect(article.locator("table thead th")).toHaveCount(3);
      await expect(article.locator("table tbody tr")).toHaveCount(6);
    }
    // No «Коротко» plate on articles without it.
    await expect(page.getByTestId("article-lead")).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------------------------
// Meta of all 8 URLs
// ---------------------------------------------------------------------------------------------

test.describe("meta", () => {
  for (const item of PAGES) {
    test(`${item.path}: H1, title, description, canonical, crumbs, copy`, async ({ page }) => {
      const response = await page.goto(item.path);
      expect(response?.status()).toBe(200);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("h1")).toHaveText(item.h1);
      await expect(page).toHaveTitle(item.title);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        "content",
        item.description
      );
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        new RegExp(`${item.path.replace(/[/-]/g, "\\$&")}$`)
      );
      const crumbs = page.getByRole("navigation", { name: "Хлебные крошки" }).locator("li");
      await expect(crumbs).toHaveText(item.crumbs.map((label) => new RegExp(label)));

      const text = await visibleText(page);
      expect(text).not.toMatch(/[{}]/);
      expect(checkStopWords(text).map((finding) => finding.match)).toEqual([]);
    });
  }
});
