import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { adminToken, skipOnMissingAdmin } from "./helpers/admin";
import { VIEWPORTS } from "./helpers/viewports";
import { checkStopWords } from "../src/lib/domain/stop-words";

/**
 * Task 28 — «Как заказать» section and «Проектирование» (10 pages, seed slice `how-to-order`).
 * Runs in the three viewport projects; mutating checks (promo) run in one project only.
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

test.describe("/kak-zakazat/", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/kak-zakazat/");
  });

  test("timeline: 6 steps in order with the right links", async ({ page }) => {
    const steps = page.getByTestId("ht-steps").locator(":scope > li");
    await expect(steps).toHaveCount(6);
    await expect(steps.locator("h2")).toHaveText([
      "Пришлите файл.",
      "Согласуйте спецификацию.",
      "Получите КП.",
      "Подпишите договор.",
      "Производство.",
      "Упаковка и отправка.",
    ]);
    const hrefs = async (index: number) =>
      steps
        .nth(index)
        .locator("a")
        .evaluateAll((links) =>
          links.map((link) => new URL((link as HTMLAnchorElement).href).pathname)
        );
    expect(await hrefs(0)).toEqual(["/kak-zakazat/trebovaniya-k-chertezham/"]);
    expect(await hrefs(1)).toEqual(["/kak-zakazat/dopuski-i-gost/"]);
    expect(await hrefs(2)).toEqual(["/raschet-stoimosti/"]);
    expect(await hrefs(3)).toEqual(["/kak-zakazat/sroki/"]);
    expect(await hrefs(4)).toEqual([]);
    expect(await hrefs(5)).toEqual([
      "/kak-zakazat/upakovka-i-dostavka/",
      "/kak-zakazat/dokumenty/",
    ]);

    const circle = steps.first().locator("[data-step-circle]");
    const size = await circle.boundingBox();
    if (isMobile(page)) expect(size?.width).toBeLessThanOrEqual(48);
    else expect(size?.width).toBe(72);
  });

  test("«Условия» card: sticky on desktop, static on phones", async ({ page }) => {
    const aside = page.getByTestId("ht-aside");
    await expect(aside.locator("li")).toHaveText([
      "Заказы от 50 м²",
      "Срочного изготовления нет",
      "Монтаж не выполняем",
      "Принимаем файлы, физические шаблоны — нет",
    ]);
    const position = await aside.evaluate((node) => getComputedStyle(node).position);
    expect(position).toBe(isMobile(page) ? "static" : "sticky");
  });

  test("«Кто за что отвечает»: table on desktop, cards on phones, payer badges", async ({
    page,
  }) => {
    const section = page.locator("section", { has: page.locator("#ht-who") });
    if (isMobile(page)) {
      await expect(section.locator(".ig-mcard")).toHaveCount(3);
      await expect(section.locator("table")).toBeHidden();
    } else {
      await expect(section.locator("table")).toBeVisible();
      await expect(section.locator("table tbody tr")).toHaveCount(3);
    }
    const visible = section.locator("[data-payer]:visible");
    await expect(visible).toHaveText(["Завод", "Заказчик", "Заказчик"]);
  });
});

test.describe("/kak-zakazat/trebovaniya-k-chertezham/", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/kak-zakazat/trebovaniya-k-chertezham/");
  });

  test("three file kinds, the third one is «Не принимаем»", async ({ page }) => {
    const cards = page.getByTestId("file-kinds").locator(":scope > li");
    await expect(cards).toHaveCount(3);
    await expect(cards.nth(2)).toContainText("Не принимаем");
    await expect(cards.nth(2)).toHaveAttribute("data-tone", "no");
  });

  test("«Загрузить чертёж» scrolls to the upload card", async ({ page }) => {
    await page.locator("main").getByRole("link", { name: "Загрузить чертёж" }).first().click();
    await expect(page).toHaveURL(/#dr-up$/);
    await expect(page.locator("#dr-up")).toBeInViewport();
    const margin = await page
      .locator("#dr-up")
      .evaluate((node) => parseFloat(getComputedStyle(node).scrollMarginTop));
    expect(margin).toBeGreaterThanOrEqual(96);
  });

  test("the limits table has 6 rows", async ({ page }) => {
    const section = page.locator("section", { has: page.locator("#dr-lim") });
    const rows = isMobile(page) ? section.locator(".ig-mcard") : section.locator("table tbody tr");
    await expect(rows).toHaveCount(6);
  });

  test("the upload card has an unchecked consent checkbox", async ({ page }) => {
    const card = page.locator("#dr-up");
    // Real form of task 21 (the registry stub renders no fields before it is merged).
    test.skip(
      (await card.locator("input, textarea").count()) === 0,
      "drawing form of task 21 is not merged yet"
    );
    const consent = card.getByRole("checkbox");
    await expect(consent.first()).not.toBeChecked();
  });
});

test.describe("/kak-zakazat/dopuski-i-gost/", () => {
  test("three tolerance tables and the holes calculator block", async ({ page }) => {
    await page.goto("/kak-zakazat/dopuski-i-gost/");
    const tables = page.locator("main .ig-table-wrap");
    // Length/width, flatness, holes (the calculator may add its own table after task 25).
    expect(await tables.count()).toBeGreaterThanOrEqual(3);
    for (const heading of ["Длина и ширина", "Плоскостность", "Отверстия"]) {
      await expect(page.getByRole("heading", { level: 2, name: heading })).toBeVisible();
    }
    await expect(page.getByText("введите толщину стекла")).toBeVisible();
  });

  test("calculator: 10 mm → 20 / 20 / 60 mm (after task 25)", async ({ page }) => {
    await page.goto("/kak-zakazat/dopuski-i-gost/");
    const chip = page.locator("main").getByRole("radio", { name: /^10/ });
    test.skip((await chip.count()) === 0, "holes calculator of task 25 is not merged yet");
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
      .locator(isMobile(page) ? ".ig-mcard dt" : "tbody tr td:first-child");

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
