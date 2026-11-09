import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { adminToken, skipOnMissingAdmin } from "./helpers/admin";
import { VIEWPORTS } from "./helpers/viewports";
import { checkStopWords } from "../src/lib/domain/stop-words";

/**
 * Task 28 — «Как заказать» section and «Проектирование» (10 pages, seed slice `how-to-order`).
 * Runs in the three viewport projects; mutating checks (promo) run in one project only.
 * Layout: Paper mockups `2560_kak-zakazat` (hub) and `2560_kak-zakazat_trebovaniya` (template of
 * every subpage), 2026-11.
 */

interface PageCase {
  path: string;
  h1: string;
  title: string;
  description: string;
  crumb: string;
}

const PAGES: readonly PageCase[] = [
  {
    path: "/kak-zakazat/",
    h1: "Как заказать закалённое стекло",
    title: "Как заказать закалённое стекло для проекта — 6 шагов | Inex Glass",
    description:
      "От чертежа DWG до отгрузки: проверяем файл и согласуем спецификацию до запуска, срок — от даты договора. Заказы от 50 м².",
    crumb: "Как заказать",
  },
  {
    path: "/kak-zakazat/trebovaniya-k-chertezham/",
    h1: "Требования к чертежам",
    title: "Требования к чертежам для стекла — DWG, DXF | Inex Glass",
    description:
      "Что указать в чертеже, чтобы стекло встало с первого раза: отверстия, кромка, клеймо. Принимаем DWG и DXF, проверяем до закалки.",
    crumb: "Требования к чертежам",
  },
  {
    path: "/kak-zakazat/dopuski-i-gost/",
    h1: "Допуски закалённого стекла по ГОСТ 30698-2014",
    title: "ГОСТ 30698-2014: допуски закалённого стекла | Inex Glass",
    description:
      "±2 мм до 2000 мм, отверстие не ближе двух толщин стекла к кромке и шести — к углу. Таблицы и калькулятор для чертежа.",
    crumb: "Допуски по ГОСТ",
  },
  {
    path: "/kak-zakazat/sroki/",
    h1: "Сроки изготовления",
    title: "Сроки изготовления закалённого стекла | Inex Glass",
    description:
      "Закалённое стекло — от 10 рабочих дней, триплекс — от 14, отсчёт от даты договора. Дата готовности — в КП, о статусе сообщаем сами.",
    crumb: "Сроки",
  },
  {
    path: "/kak-zakazat/upakovka-i-dostavka/",
    h1: "Упаковка и доставка",
    title: "Доставка закалённого стекла по Уралу и Сибири | Inex Glass",
    description:
      "Обрешётка под дальнюю перевозку и фото упаковки при отгрузке. Доставка ТК по Уралу, Сибири и Поволжью, самовывоз в Челябинске.",
    crumb: "Упаковка и доставка",
  },
  {
    path: "/kak-zakazat/dokumenty/",
    h1: "Документы на стекло",
    title: "Документы на закалённое стекло: паспорт, сертификат | Inex Glass",
    description:
      "Паспорт качества, сертификат и протоколы испытаний на каждую партию — для сдачи объекта. Закалённое стекло — по ГОСТ 30698-2014.",
    crumb: "Документы",
  },
  {
    path: "/kak-zakazat/priemka/",
    h1: "Приёмка стекла",
    title: "Приёмка закалённого стекла — как проверить партию | Inex Glass",
    description:
      "Что проверить до подписания накладной, как осматривают стекло по ГОСТ и что делать, если нашли скол или ошибку.",
    crumb: "Приёмка",
  },
  {
    path: "/kak-zakazat/oplata/",
    h1: "Оплата и договор",
    title: "Оплата и договор — для юрлиц и ИП | Inex Glass",
    description:
      "Работаем по договору с юрлицами и ИП, цены с НДС, предоплата 70%. Цена фиксируется в договоре и не меняется после оплаты.",
    crumb: "Оплата и договор",
  },
  {
    path: "/kak-zakazat/kontrol-kachestva/",
    h1: "Контроль качества",
    title: "Контроль качества стекла — от чертежа до отгрузки | Inex Glass",
    description:
      "Как выбираем заводы, проверяем импортное стекло, согласуем спецификацию и фотографируем стекло при погрузке и отгрузке.",
    crumb: "Контроль качества",
  },
  {
    path: "/proektirovanie/",
    h1: "Проектирование стеклянных конструкций",
    title: "Проектирование стеклянных конструкций и узлов | Inex Glass",
    description:
      "Расчёт стекла под нагрузку, в том числе снеговую, узлы крепления и проектная документация для козырьков, ограждений, фасадов и перегородок.",
    crumb: "Проектирование",
  },
];

const isMobile = (page: Page) => (page.viewportSize()?.width ?? 0) <= 599;

/** Main content text (header / footer excluded: they belong to other tasks). */
async function mainText(page: Page): Promise<string> {
  return page.locator("main").innerText();
}

/** `@type` values of all JSON-LD scripts on the page. */
async function jsonLdTypes(page: Page): Promise<string[]> {
  const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
  return scripts.flatMap((script) => {
    const data = JSON.parse(script) as unknown;
    const items = Array.isArray(data) ? data : [data];
    return items.map((item) => String((item as { "@type"?: unknown })["@type"]));
  });
}

test.describe("how-to-order: common checks", () => {
  for (const item of PAGES) {
    test(`${item.path} — status, H1, meta, crumbs, JSON-LD, text`, async ({ page }) => {
      const response = await page.goto(item.path);
      expect(response?.status()).toBe(200);

      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("h1")).toHaveText(item.h1);
      await expect(page).toHaveTitle(item.title);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        "content",
        item.description
      );
      const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
      expect(new URL(canonical ?? "").pathname).toBe(item.path);

      const crumbs = page.getByRole("navigation", { name: "Хлебные крошки" }).locator("li");
      await expect(crumbs.first()).toHaveText("Главная");
      await expect(crumbs.last().locator('[aria-current="page"]')).toHaveText(item.crumb);
      expect(await jsonLdTypes(page)).toContain("BreadcrumbList");

      const text = await mainText(page);
      expect(text).not.toMatch(/[{}]/);
      expect(checkStopWords(text)).toEqual([]);

      // No horizontal page scroll at any width.
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});

/** Subpage cards of the hub's `linkList` block (`#subpages`), in order. */
const SUBPAGE_LINKS: ReadonlyArray<readonly [string, string]> = [
  ["Требования к чертежам", "/kak-zakazat/trebovaniya-k-chertezham/"],
  ["Допуски по ГОСТ 30698-2014", "/kak-zakazat/dopuski-i-gost/"],
  ["Сроки изготовления", "/kak-zakazat/sroki/"],
  ["Упаковка и доставка", "/kak-zakazat/upakovka-i-dostavka/"],
  ["Документы на стекло", "/kak-zakazat/dokumenty/"],
  ["Оплата и договор", "/kak-zakazat/oplata/"],
  ["Приёмка стекла", "/kak-zakazat/priemka/"],
  ["Контроль качества", "/kak-zakazat/kontrol-kachestva/"],
];

/** Pathnames of the links inside a locator. */
const pathnames = (links: ReturnType<Page["locator"]>) =>
  links.evaluateAll((nodes) =>
    nodes.map((node) => new URL((node as HTMLAnchorElement).href).pathname)
  );

test.describe("/kak-zakazat/", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/kak-zakazat/");
  });

  test("hero photo, 6 steps in order with the right links", async ({ page }) => {
    await expect(page.getByTestId("processing-hero").locator("img")).toHaveCount(1);
    const steps = page.getByTestId("order-steps").locator(":scope > li");
    await expect(steps).toHaveCount(6);
    await expect(steps.locator("h2")).toHaveText([
      "Пришлите файл",
      "Согласуйте спецификацию",
      "Получите КП",
      "Подпишите договор",
      "Производство",
      "Упаковка и отправка",
    ]);
    const hrefs = (index: number) => pathnames(steps.nth(index).locator("a"));
    expect(await hrefs(0)).toEqual(["/kak-zakazat/trebovaniya-k-chertezham/"]);
    expect(await hrefs(1)).toEqual(["/kak-zakazat/dopuski-i-gost/"]);
    expect(await hrefs(2)).toEqual(["/raschet-stoimosti/"]);
    expect(await hrefs(3)).toEqual(["/kak-zakazat/sroki/"]);
    expect(await hrefs(4)).toEqual([]);
    expect(await hrefs(5)).toEqual([
      "/kak-zakazat/upakovka-i-dostavka/",
      "/kak-zakazat/dokumenty/",
    ]);

    // 6 columns ≥1536, 3 below, a vertical timeline on phones.
    const tops = await steps.evaluateAll((items) =>
      items.map((item) => Math.round(item.getBoundingClientRect().top))
    );
    const rows = new Set(tops).size;
    const width = page.viewportSize()?.width ?? 0;
    expect(rows).toBe(width >= 1536 ? 1 : width >= 600 ? 2 : 6);
  });

  test("«Условия» tiles and «Кто за что отвечает» table", async ({ page }) => {
    const terms = page.locator("[data-section='terms'] li");
    await expect(terms).toHaveText([
      "Заказы от 50 м²",
      "Срочного изготовления нет",
      "Монтаж — бригада-партнёр или шеф-монтаж",
      "Принимаем файлы, физические шаблоны — нет",
    ]);
    const whoPays = page.getByTestId("who-pays");
    if (isMobile(page)) {
      await expect(whoPays.locator("[data-order-card]")).toHaveCount(3);
      await expect(whoPays.locator("table")).toBeHidden();
    } else {
      await expect(whoPays.locator("table tbody tr")).toHaveCount(3);
    }
  });

  test("8 subpage cards, then the two buttons", async ({ page }) => {
    const cards = page.getByTestId("subpage-links").locator("a");
    await expect(cards).toHaveText(SUBPAGE_LINKS.map(([label]) => label));
    expect(await pathnames(cards)).toEqual(SUBPAGE_LINKS.map(([, href]) => href));
    await expect(cards.locator("[aria-current]")).toHaveCount(0);
  });
});

test.describe("subpage template", () => {
  for (const item of PAGES.filter((entry) => entry.path !== "/kak-zakazat/")) {
    test(`${item.path} — photo hero, «На странице», form panel, subpage cards`, async ({
      page,
    }) => {
      await page.goto(item.path);
      await expect(page.getByTestId("processing-hero").locator("img")).toHaveCount(1);
      const hero = page.getByTestId("processing-hero");
      await expect(hero.getByRole("link", { name: "Рассчитать стоимость" })).toBeVisible();
      await expect(hero.getByRole("link", { name: "Загрузить чертёж" })).toHaveAttribute(
        "href",
        "#dr-up"
      );

      // «На странице» lists the H2 of the article.
      const toc = page.getByTestId("subpage-toc");
      const h2 = await page
        .getByTestId("subpage-article")
        .locator("h2")
        .evaluateAll((nodes) => nodes.map((node) => node.id));
      expect(h2.length).toBeGreaterThanOrEqual(2);
      const tocLinks = toc.locator(
        isMobile(page) || (page.viewportSize()?.width ?? 0) <= 1100
          ? ":scope > details a"
          : ":scope > div a"
      );
      expect(
        await tocLinks.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")))
      ).toEqual(h2.map((id) => `#${id}`));

      await expect(page.locator("#dr-up")).toHaveCount(1);
      const cards = page.getByTestId("subpage-links").locator("a");
      await expect(cards).toHaveCount(8);
      const current = cards.and(page.locator("[aria-current='page']"));
      await expect(current).toHaveCount(item.path === "/proektirovanie/" ? 0 : 1);
    });
  }

  test("TOC is sticky on desktop and a disclosure ≤1100 px", async ({ page }) => {
    await page.goto("/kak-zakazat/sroki/");
    const width = page.viewportSize()?.width ?? 0;
    const toc = page.getByTestId("subpage-toc");
    if (width <= 1100) {
      await expect(toc.locator("details")).toBeVisible();
      await expect(toc.locator("details a").first()).toBeHidden();
      await toc.locator("summary").click();
      await expect(toc.locator("details a").first()).toBeVisible();
    } else {
      const position = await toc.evaluate((node) => getComputedStyle(node.parentElement!).position);
      expect(position).toBe("sticky");
      await expect(toc.locator(":scope > div a[aria-current='true']")).toHaveCount(1);
    }
  });
});

test.describe("/kak-zakazat/trebovaniya-k-chertezham/", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/kak-zakazat/trebovaniya-k-chertezham/");
  });

  test("article sections in the mockup order", async ({ page }) => {
    await expect(page.getByTestId("subpage-article").locator("h2")).toHaveText([
      "Какие файлы принимаем",
      "Что указать в чертеже",
      "Технологические ограничения",
      "Отверстия по ГОСТ 30698-2014",
      "Как мы проверяем файл",
    ]);
  });

  test("three file kinds, the third one is not accepted", async ({ page }) => {
    const cards = page.getByTestId("file-kinds").locator(":scope > li");
    await expect(cards).toHaveCount(3);
    await expect(cards.nth(2)).toContainText("Физические шаблоны не принимаем");
    await expect(cards.nth(2)).toHaveAttribute("data-tone", "no");
  });

  test("«Загрузить чертёж» scrolls to the drawing-form panel", async ({ page }) => {
    await page
      .getByTestId("processing-hero")
      .getByRole("link", { name: "Загрузить чертёж" })
      .click();
    await expect(page).toHaveURL(/#dr-up$/);
    await expect(page.locator("#dr-up")).toBeInViewport();
    const margin = await page
      .locator("#dr-up")
      .evaluate((node) => parseFloat(getComputedStyle(node).scrollMarginTop));
    expect(margin).toBeGreaterThanOrEqual(96);
  });

  test("6 limit tiles, the holes drawing and 4 check steps", async ({ page }) => {
    const tiles = page.getByTestId("limit-tiles").locator(":scope > div");
    await expect(tiles).toHaveCount(6);
    await expect(tiles.last()).toContainText("Шелкография до 1100 × 700 мм");
    await expect(tiles.last()).toContainText("УФ-печать и фотопечать — до 2000 × 3180 мм");
    await expect(page.getByTestId("holes-scheme")).toBeVisible();
    const steps = page.getByTestId("article-steps").locator(":scope > li");
    await expect(steps).toHaveCount(4);
    await expect(page.getByTestId("article-note")).toContainText("Если ошибся завод");
  });

  test("the drawing form has an unchecked consent checkbox", async ({ page }) => {
    const consent = page.locator("#dr-up").getByRole("checkbox");
    await expect(consent.first()).not.toBeChecked();
  });

  test("the current subpage card is highlighted", async ({ page }) => {
    const current = page.getByTestId("subpage-links").locator("a[aria-current='page']");
    await expect(current).toHaveText("Требования к чертежам");
  });
});

test.describe("/kak-zakazat/dopuski-i-gost/", () => {
  test("three tolerance tables and the holes calculator block", async ({ page }) => {
    await page.goto("/kak-zakazat/dopuski-i-gost/");
    await expect(page.getByTestId("article-table")).toHaveCount(3);
    for (const heading of ["Длина и ширина", "Плоскостность", "Отверстия"]) {
      await expect(page.getByRole("heading", { level: 2, name: heading })).toBeVisible();
    }
    await expect(page.getByText("введите толщину стекла")).toBeVisible();
    await expect(page.locator("#kalkulyator")).toHaveCount(1);
  });

  test("calculator: 10 mm → 20 / 20 / 60 mm", async ({ page }) => {
    await page.goto("/kak-zakazat/dopuski-i-gost/");
    const chip = page.locator("main").getByRole("radio", { name: /^10/ });
    await chip.first().click();
    const live = page.locator("main [aria-live]").first();
    await expect(live).toContainText("20");
    await expect(live).toContainText("60");
  });
});

test.describe("/kak-zakazat/upakovka-i-dostavka/", () => {
  test("13 delivery cities", async ({ page }) => {
    await page.goto("/kak-zakazat/upakovka-i-dostavka/");
    const line = page.locator("main p", { hasText: "Челябинск · Екатеринбург" });
    const text = (await line.innerText()).split(" — ")[0] ?? "";
    expect(text.split("·").map((city) => city.trim())).toHaveLength(13);
  });
});

test.describe("/kak-zakazat/priemka/", () => {
  test("no fileless download stub while the checklist PDF is not supplied", async ({ page }) => {
    await page.goto("/kak-zakazat/priemka/");
    await expect(page.locator("main a[download]")).toHaveCount(0);
    await expect(page.locator("main")).not.toContainText("Файл будет добавлен");
    await expect(page.locator("main")).not.toContainText("чек-лист приёмки");
  });
});

test.describe("/proektirovanie/", () => {
  test("«Отправить задачу на проектирование» opens a dialog", async ({ page }) => {
    await page.goto("/proektirovanie/");
    await page
      .locator("main")
      .getByRole("button", { name: "Отправить задачу на проектирование" })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });
});

test.describe("URL normalization", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== VIEWPORTS.laptop.name, "viewport-independent");
  });

  test("upper case → 301 to lower case", async ({ request }) => {
    const response = await request.get("/Kak-Zakazat/", { maxRedirects: 0 });
    expect(response.status()).toBe(301);
    expect(new URL(response.headers()["location"] ?? "", "http://x").pathname).toBe(
      "/kak-zakazat/"
    );
  });

  test("missing trailing slash → redirect", async ({ request }) => {
    const response = await request.get("/kak-zakazat/sroki", { maxRedirects: 0 });
    expect([301, 308]).toContain(response.status());
    expect(new URL(response.headers()["location"] ?? "", "http://x").pathname).toBe(
      "/kak-zakazat/sroki/"
    );
  });
});

/* -------------------------------------------------------------------------------------------- */
/* Promo row of /kak-zakazat/oplata/ — needs an admin session for the REST API                  */
/* -------------------------------------------------------------------------------------------- */

type PromoState = Record<string, unknown>;

const DISCOUNT = "Скидка";
const PROMO_TEXT = "E2E: −5% при заказе от 100 м²";

test.describe("/kak-zakazat/oplata/ — «Скидка» follows the promo", () => {
  test.describe.configure({ mode: "serial" });

  let token: string | null = null;
  let original: PromoState | null = null;

  test.beforeAll(async ({ request }, testInfo) => {
    test.skip(testInfo.project.name !== VIEWPORTS.laptop.name, "mutates a shared global");
    try {
      token = await adminToken(request);
    } catch (error) {
      skipOnMissingAdmin(error);
      return;
    }
    const response = await request.get("/api/globals/promo?depth=0", {
      headers: { Authorization: `JWT ${token}` },
    });
    original = response.ok() ? ((await response.json()) as PromoState) : null;
  });

  test.afterAll(async ({ request }) => {
    if (!token || !original) return;
    const { active, text, badgeText, startDate, endDate, thresholdArea } = original;
    await request.post("/api/globals/promo", {
      headers: { Authorization: `JWT ${token}` },
      data: { active, text, badgeText, startDate, endDate, thresholdArea },
    });
  });

  async function setPromo(request: APIRequestContext, data: PromoState) {
    const response = await request.post("/api/globals/promo", {
      headers: { Authorization: `JWT ${token}` },
      data,
    });
    expect(response.ok(), await response.text()).toBe(true);
  }

  const termsRows = (page: Page) =>
    page
      .getByTestId("payment-terms")
      .locator(isMobile(page) ? "[data-order-card] > :first-child" : "tbody tr th");

  test("promo off → no «Скидка» row; promo on → row with the promo text", async ({
    page,
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name !== VIEWPORTS.laptop.name, "mutates a shared global");

    await setPromo(request, { active: false });
    await page.goto("/kak-zakazat/oplata/");
    await expect(termsRows(page)).toHaveCount(6);
    await expect(termsRows(page).filter({ hasText: DISCOUNT })).toHaveCount(0);

    const today = new Date();
    const day = (offset: number) =>
      new Date(today.getTime() + offset * 86_400_000).toISOString().slice(0, 10);
    await setPromo(request, {
      active: true,
      text: PROMO_TEXT,
      startDate: day(-1),
      endDate: day(30),
    });
    await expect(async () => {
      await page.goto("/kak-zakazat/oplata/");
      await expect(termsRows(page).filter({ hasText: DISCOUNT })).toHaveCount(1);
    }).toPass({ timeout: 30_000 });
    await expect(page.getByTestId("payment-terms")).toContainText(PROMO_TEXT);
  });
});
