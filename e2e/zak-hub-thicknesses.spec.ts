import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

/**
 * Hub «Закалённое стекло» and the 8 thickness cards (task 23), laid out by the Paper mockups
 * `2560_zakalennoe-steklo` / `2560_zak_tolshchina_10mm` (2026-11).
 *
 * Precondition: `pnpm seed --minimal`, then `pnpm seed --only=zak-hub,thicknesses --force`
 * (CI runs the full seed). The price date of the seed may be fresh or older than 45 days, so the
 * price assertions branch on `data-price-state` (the expired branch itself is covered by Vitest).
 */

const HUB = "/zakalennoe-steklo/";
const NBSP = " ";
const THICKNESSES = [4, 5, 6, 8, 10, 12, 15, 19] as const;
const NOINDEX = new Set([5, 15, 19]);
const REQUEST_ONLY = new Set([15, 19]);

const norm = (text: string | null | undefined) => (text ?? "").replace(/\s+/g, " ").trim();
const weightOf = (n: number) => String(n * 2.5).replace(".", ",");

async function jsonLdTypes(page: Page): Promise<Array<Record<string, unknown>>> {
  const raw = await page.locator('script[type="application/ld+json"]').allTextContents();
  return raw.flatMap((text) => {
    const data = JSON.parse(text) as Record<string, unknown> | Array<Record<string, unknown>>;
    return Array.isArray(data) ? data : [data];
  });
}

/** Clicks a form trigger until its dialog opens (the first click may land before hydration on a cold dev server). */
async function openDialog(page: Page, name: string) {
  await expect(async () => {
    if (await page.getByRole("dialog").isVisible()) return;
    await page.getByRole("button", { name }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout: 60_000 });
}

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

test.describe("hub /zakalennoe-steklo/", () => {
  test.beforeAll(async ({ request }) => {
    const response = await request.get(HUB);
    expect(response.status(), "seed the hub: pnpm seed --only=zak-hub,thicknesses --force").toBe(
      200
    );
    expect(await response.text()).toContain('id="ceny"');
  });

  test("meta, headings and JSON-LD", async ({ page }) => {
    const response = await page.goto(HUB);
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toHaveText("Закалённое (калёное) стекло на заказ по размерам");
    await expect(page).toHaveTitle("Закалённое стекло на заказ 4–19 мм по чертежу | Inex Glass");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      "Проверим чертёж и согласуем спецификацию до закалки, упакуем в обрешётку с фото при отгрузке. Заказы от 50 м²."
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      /\/zakalennoe-steklo\/$/
    );
    await expect(page.getByRole("navigation", { name: /крошки/i })).toContainText("Главная");

    const ld = await jsonLdTypes(page);
    expect(ld.some((item) => item["@type"] === "BreadcrumbList")).toBe(true);
    const faq = ld.filter((item) => item["@type"] === "FAQPage");
    expect(faq).toHaveLength(1);
    expect((faq[0]?.mainEntity as unknown[]).length).toBe(7);
    expect(ld.some((item) => item["@type"] === "Product")).toBe(false);
  });

  test("price tiles follow the 45-day rule", async ({ page }) => {
    await page.goto(HUB);
    const section = page.locator("#ceny");
    await expect(section).toHaveCount(1);
    const state = await section.getAttribute("data-price-state");
    const tiles = section.locator("a[data-price-tile]");
    await expect(tiles).toHaveCount(8);

    for (const [index, n] of THICKNESSES.entries()) {
      const text = norm(await tiles.nth(index).textContent());
      expect(text).toContain(`${n} мм`);
      if (REQUEST_ONLY.has(n)) expect(text).toContain("по запросу");
      else if (state === "price") expect(text).toMatch(/от, ₽\/м² ?\d/);
      else expect(text).toContain("по расчёту");
    }
    if (state === "price") {
      expect(await tiles.nth(4).textContent()).toContain(`1${NBSP}400`);
      await expect(section.locator("[data-prices-caption]")).toContainText(
        /Ориентировочные цены на \d{2}\.\d{2}\.\d{4}/
      );
    } else {
      await expect(section.locator("[data-prices-caption]")).toContainText("Цена по расчёту.");
    }

    await expect(section.locator('[data-included="in"] li')).toHaveCount(3);
    await expect(section.locator('[data-included="out"] li')).toHaveCount(3);
    await expect(section.getByRole("note")).toContainText("Минимальный заказ — от 50 м²");

    // Each tile is a link to the thickness card.
    await tiles.nth(4).click();
    await expect(page).toHaveURL(/\/zakalennoe-steklo\/10-mm\/$/, { timeout: 60_000 });
  });

  test("sections, counts and order", async ({ page }) => {
    await page.goto(HUB);
    const headings = await page.locator("main h2").allTextContents();
    const expected = [
      "Цены на закалённое стекло",
      "Что проверить до заказа",
      "Как мы снижаем риск ошибки",
      "Как выбрать толщину",
      "Виды закалённого стекла",
      "Обработка до закалки",
      "Сроки и доставка",
      "Для кого",
      "Частые вопросы",
      "Отправьте чертёж — посчитаем стоимость и срок",
    ];
    const positions = expected.map((title) => headings.findIndex((h) => norm(h) === title));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);

    const sectionOf = (title: string) =>
      page.locator("section").filter({ has: page.getByRole("heading", { level: 2, name: title }) });
    await expect(sectionOf("Что проверить до заказа").locator("ol > li")).toHaveCount(7);
    await expect(sectionOf("Что проверить до заказа").locator("ul a")).toHaveCount(3);
    await expect(
      sectionOf("Как мы снижаем риск ошибки").locator("[data-risk-cards] > li")
    ).toHaveCount(5);
    await expect(
      sectionOf("Как мы снижаем риск ошибки").locator("[data-risk-cards] svg")
    ).toHaveCount(5);
    await expect(sectionOf("Как выбрать толщину").locator("[data-weight-row]")).toHaveCount(8);
    await expect(page.getByTestId("kind-card")).toHaveCount(7);
    // «Прозрачное» has no page: six cards link to the glass types.
    await expect(page.locator("a[data-testid=kind-card]")).toHaveCount(6);
    await expect(page.locator("#vidy [data-kinds-bridge]")).toContainText("Рядом");
    await expect(page.locator("#vidy [data-kinds-bridge] a")).toHaveCount(3);
    await expect(sectionOf("Обработка до закалки").getByTestId("zak-processing-card")).toHaveCount(
      6
    );
    const processingImages = sectionOf("Обработка до закалки").locator("img");
    await expect(processingImages).toHaveCount(6);
    // The photos are lazy: each one actually loads once scrolled into view.
    for (const img of await processingImages.all()) {
      await img.scrollIntoViewIfNeeded();
      await expect
        .poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth), {
          timeout: 15_000,
        })
        .toBeGreaterThan(0);
    }
    await expect(page.locator("#vidy img")).toHaveCount(7);
    await expect(page.locator("[data-lead-time]")).toHaveCount(2);
    await expect(
      page.getByTestId("processing-hero").getByRole("list", { name: "Условия" }).locator("li")
    ).toHaveCount(4);

    const body = await page.locator("main").innerText();
    expect(body).not.toMatch(/[{}]/);
    await noHorizontalScroll(page);
  });

  test("FAQ opens by click and keyboard", async ({ page }) => {
    await page.goto(HUB);
    const faq = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { level: 2, name: "Частые вопросы" }) });
    // The first answer is open (mockup); a click closes it.
    const first = faq.getByRole("button").first();
    await expect(first).toHaveAttribute("aria-expanded", "true");
    await first.click();
    await expect(first).toHaveAttribute("aria-expanded", "false");
    const second = faq.getByRole("button").nth(1);
    await second.focus();
    await page.keyboard.press("Enter");
    await expect(second).toHaveAttribute("aria-expanded", "true");
  });

  test("hero buttons: quiz link and drawing dialog", async ({ page }) => {
    await page.goto(HUB);
    const quiz = page
      .getByTestId("processing-hero")
      .getByRole("link", { name: "Рассчитать стоимость" });
    const href = await quiz.getAttribute("href");
    expect(href).toContain("/raschet-stoimosti/");
    expect(href).toContain("type=tempered");
    await openDialog(page, "Загрузить чертёж DWG / DXF");
  });

  test("lead form at the bottom", async ({ page }) => {
    await page.goto(HUB);
    const panel = page.getByTestId("drawing-panel");
    await expect(panel.getByRole("heading", { level: 2 })).toHaveText(
      "Отправьте чертёж — посчитаем стоимость и срок"
    );
    await expect(panel).toContainText(
      "КП в среднем за 2–3 рабочих дня · заказы от 50 м² · цена в договоре фиксируется"
    );
    await expect(panel.getByRole("button", { name: "Получить расчёт" })).toBeVisible();
  });
});

test.describe("thickness cards", () => {
  for (const n of THICKNESSES) {
    test(`${n} mm`, async ({ page }) => {
      const path = `/zakalennoe-steklo/${n}-mm/`;
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.locator("h1")).toHaveText(`Закалённое стекло ${n} мм`);

      const spec = page.locator("[data-thickness-spec]");
      const state = await spec.getAttribute("data-price-state");
      if (REQUEST_ONLY.has(n)) expect(state).toBe("calc");

      const title = await page.title();
      if (state === "price") {
        expect(title).toMatch(
          new RegExp(`^Закалённое стекло ${n} мм — от [\\d\\s]+ ₽/м² \\| Inex Glass$`)
        );
      } else {
        expect(title).toBe(`Закалённое стекло ${n} мм — под заказ | Inex Glass`);
        await expect(spec.locator("[data-spec-price]")).toHaveText("Цена по расчёту");
      }
      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        "content",
        `Закалённое стекло ${n} мм: вес ${weightOf(n)} кг/м², размеры от 150 × 300 до 3000 × 2000 мм, срок от 10 рабочих дней. Расчёт по вашему чертежу.`
      );
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        new RegExp(`${path}$`)
      );

      // Robots: 5/15/19 are always noindex; the others follow the environment (hub robots).
      const robots =
        (await page.locator('meta[name="robots"]').first().getAttribute("content")) ?? "";
      if (NOINDEX.has(n)) expect(robots).toContain("noindex");

      // Spec table values.
      await expect(spec.locator('[data-spec-row="Вес"]')).toHaveText(`${weightOf(n)} кг/м²`);
      await expect(spec.locator('[data-spec-row="Размер"]')).toHaveText(
        REQUEST_ONLY.has(n)
          ? "до 3000 × 2000 мм; точнее — после согласования с заводом"
          : "от 150 × 300 до 3000 × 2000 мм"
      );

      // Hole distances: 2N / 2N / 6N.
      const holes = page.locator("[data-hole-rule] b");
      await expect(holes).toHaveText(
        [`${2 * n} мм`, `${2 * n} мм`, `${6 * n} мм`].map((t) => t.replace(" ", NBSP))
      );

      await expect(page.locator("[data-hole-diameter]")).toContainText(
        `меньше ${n} мм — по согласованию`
      );

      // Neighbours: N− / N / N+ cards, the current one is not a link.
      const neighbours = page.locator("[data-neighbors] > li");
      const expectedColumns = n === 4 || n === 19 ? 2 : 3;
      await expect(neighbours).toHaveCount(expectedColumns);
      await expect(page.locator("[data-neighbors] [aria-current=page]")).toContainText(`${n}`);
      await expect(page.locator("[data-neighbors] a")).toHaveCount(expectedColumns - 1);
      for (const other of [15, 19]) {
        const card = page.locator(`[data-neighbors] > li[data-thickness="${other}"]`);
        if ((await card.count()) === 0) continue;
        await expect(card.locator("[data-neighbor-price]")).toHaveText("по запросу");
      }

      // Processing: the six cards of the hub block.
      await expect(page.getByTestId("zak-processing-card")).toHaveCount(6);

      // Product JSON-LD iff the price is shown.
      const ld = await jsonLdTypes(page);
      const product = ld.find((item) => item["@type"] === "Product");
      if (state === "price") {
        expect(product).toBeDefined();
        const offers = product?.offers as Record<string, unknown>;
        expect(offers["@type"]).toBe("AggregateOffer");
        const specPrice = norm(await spec.locator("[data-spec-price]").textContent()).replace(
          /\D/g,
          ""
        );
        expect(String(offers.lowPrice)).toBe(specPrice);
      } else {
        expect(product).toBeUndefined();
      }
      expect(ld.some((item) => item["@type"] === "FAQPage")).toBe(true);

      // Quiz link with the thickness.
      const quiz = page
        .getByTestId("processing-hero")
        .getByRole("link", { name: `Рассчитать стекло ${n} мм` });
      await expect(quiz).toHaveAttribute(
        "href",
        new RegExp(`/raschet-stoimosti/\\?.*thick=${n}(&|$)`)
      );

      const body = await page.locator("main").innerText();
      expect(body).not.toMatch(/[{}]/);
      await noHorizontalScroll(page);

      await openDialog(page, "Подобрать под нагрузку");
    });
  }
});

test.describe("routing /zakalennoe-steklo/[slug]/", () => {
  test("unknown thickness and slug are 404", async ({ request }) => {
    for (const path of [
      "/zakalennoe-steklo/7-mm/",
      "/zakalennoe-steklo/010-mm/",
      "/zakalennoe-steklo/unknown/",
    ]) {
      const response = await request.get(path);
      // A production / ISR render answers 404; `next dev` cannot set the status of the streamed
      // 404 body (see NotFoundResponse) and answers 200 with the same noindex 404 page.
      if (response.status() !== 404) {
        expect(response.status(), path).toBe(200);
        // The H1, not a substring: the not-found text is in every page's RSC payload.
        expect(await response.text()).toMatch(/<h1[^>]*>Страница не найдена<\/h1>/);
      }
    }
  });

  test("missing trailing slash and upper case redirect", async ({ request }) => {
    const noSlash = await request.get("/zakalennoe-steklo/10-mm", { maxRedirects: 0 });
    expect([301, 308]).toContain(noSlash.status());
    expect(noSlash.headers()["location"]).toMatch(/\/zakalennoe-steklo\/10-mm\/$/);
    const upper = await request.get("/zakalennoe-steklo/10-MM/", { maxRedirects: 0 });
    expect(upper.status()).toBe(301);
    expect(upper.headers()["location"]).toMatch(/\/zakalennoe-steklo\/10-mm\/$/);
  });

  test("glass type pages are dispatched to their template", async ({ request }) => {
    const response = await request.get("/zakalennoe-steklo/matovoe/");
    // Requires the glass-types seed (task 24); without it the route answers 404.
    test.skip(response.status() === 404, "glass types are not seeded");
    expect(response.status()).toBe(200);
  });
});
