import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { adminToken, skipOnMissingAdmin } from "./helpers/admin";
import { CONSENT, POLICY } from "../src/seed/content/legal";

/**
 * Task 29: «Для кого» (hub + 4 segments), «О компании», «Команда», «Контакты», policy and
 * consent. Runs in the three viewport projects against a fully seeded database.
 *
 * Robots: outside production (`SITE_ENV !== "production"`) every page is `noindex, nofollow`,
 * so the «indexable» assertions only run where the environment allows indexing; the legal pages
 * must carry `noindex` everywhere.
 *
 * Team fixtures are created through the REST API as the shared e2e admin (`helpers/admin`),
 * in desktop-1366 only, and deleted in `afterAll`.
 */

// A shared `next dev` compiles routes on first hit; production builds answer far faster.
test.describe.configure({ timeout: 120_000 });

interface PageCase {
  path: string;
  h1: string;
  title: string;
  description?: string;
  crumb: string;
  legal?: boolean;
}

const PAGES: PageCase[] = [
  {
    path: "/klientam/",
    h1: "С кем мы работаем",
    title: "Inex Glass для подрядчиков, застройщиков и производителей",
    description:
      "Как мы работаем с подрядчиками, производителями мебели, застройщиками и дизайнерами — и что берём на себя.",
    crumb: "С кем мы работаем",
  },
  {
    path: "/klientam/podryadchikam/",
    h1: "Подрядчикам и монтажникам",
    title: "Закалённое стекло для подрядчиков | Inex Glass",
    description:
      "Спецификация на согласование, отверстия по ГОСТ, обрешётка в дорогу и срок от даты договора. Монтаж — бригада-партнёр или шеф-монтаж.",
    crumb: "Подрядчикам",
  },
  {
    path: "/klientam/proizvoditelyam-mebeli/",
    h1: "Производителям мебели и изделий из стекла",
    title: "Стекло для производителей мебели — серии без брака | Inex Glass",
    description:
      "Фасады и столешницы серией: повторяемый оттенок, кромка и отверстия под фурнитуру, без клейма по запросу.",
    crumb: "Производителям мебели",
  },
  {
    path: "/klientam/zastrojshchikam/",
    h1: "Застройщикам и генподрядчикам",
    title: "Стекло для застройщиков — документы и проект узлов | Inex Glass",
    description:
      "Ограждения, перегородки и душевые для крупных объектов: паспорт, сертификат и протоколы на партию, проектирование узлов.",
    crumb: "Застройщикам",
  },
  {
    path: "/klientam/dizajneram-i-arhitektoram/",
    h1: "Дизайнерам и архитекторам",
    title: "Стекло для дизайнеров: RAL, матирование, гнутое | Inex Glass",
    description:
      "Цвета по RAL, матирование, печать, гнутое и осветлённое стекло. Поможем превратить эскиз в рабочие узлы.",
    crumb: "Дизайнерам и архитекторам",
  },
  {
    path: "/o-kompanii/",
    h1: "Inex Glass",
    title: "О компании Inex Glass — комплектация проектов стеклом",
    description:
      "Направление инжиниринговой компании Inex: 21 год, 1500+ проектов. Проектируем, проверяем чертежи, контролируем заводы-партнёры и упаковку.",
    crumb: "О компании",
  },
  {
    path: "/o-kompanii/sotrudniki/",
    h1: "Команда",
    title: "Команда Inex Glass — конструкторы и менеджеры",
    description:
      "Кто ведёт ваш заказ: конструкторы, которые проверяют чертежи, и менеджеры, которые сообщают о статусе.",
    crumb: "Команда",
  },
  {
    path: "/kontakty/",
    h1: "Контакты",
    title: "Контакты Inex Glass — Челябинск и Екатеринбург",
    description:
      "Отправьте чертёж DWG или DXF — пришлём КП в среднем за 2–3 рабочих дня. Телефон, e-mail, адреса офисов и склада, реквизиты.",
    crumb: "Контакты",
  },
  {
    path: "/politika-konfidencialnosti/",
    h1: "Политика обработки персональных данных",
    title: "Политика обработки персональных данных | Inex Glass",
    crumb: "Политика обработки персональных данных",
    // Neutral descriptions added in Wave 7 (17-meta gives none; pending Inex approval).
    description: POLICY.page.seo.description,
    legal: true,
  },
  {
    path: "/soglasie-na-obrabotku-personalnyh-dannyh/",
    h1: "Согласие на обработку персональных данных",
    title: "Согласие на обработку персональных данных | Inex Glass",
    crumb: "Согласие на обработку персональных данных",
    description: CONSENT.page.seo.description,
    legal: true,
  },
];

const SEGMENT_PATHS = PAGES.slice(1, 5).map((item) => item.path);
const TEAM_PATH = "/o-kompanii/sotrudniki/";

async function robotsOf(page: Page): Promise<string> {
  return (await page.locator('meta[name="robots"]').first().getAttribute("content")) ?? "";
}

/** JSON-LD objects of the page (arrays flattened). */
async function jsonLd(page: Page): Promise<Array<Record<string, unknown>>> {
  const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
  return scripts.flatMap((text) => {
    const data = JSON.parse(text) as unknown;
    return (Array.isArray(data) ? data : [data]) as Array<Record<string, unknown>>;
  });
}

/** Whether this environment allows indexing (production): otherwise all pages are noindex. */
let indexableEnv: boolean | null = null;
async function isIndexableEnv(request: APIRequestContext): Promise<boolean> {
  if (indexableEnv === null) {
    const html = await (await request.get("/klientam/")).text();
    indexableEnv = !/<meta name="robots" content="[^"]*nofollow/.test(html);
  }
  return indexableEnv;
}

test.describe("company / legal pages: common checks", () => {
  for (const item of PAGES) {
    test(`${item.path}: 200, h1, meta, crumbs, BreadcrumbList`, async ({ page, request }) => {
      const response = await page.goto(item.path);
      expect(response?.status()).toBe(200);

      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("h1")).toHaveText(item.h1);
      await expect(page).toHaveTitle(item.title);
      const description = page.locator('meta[name="description"]');
      if (item.description) {
        await expect(description).toHaveAttribute("content", item.description);
      } else {
        await expect(description).toHaveCount(0);
      }
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        new RegExp(`${item.path.replace(/\//g, "\\/")}$`)
      );

      const crumbs = page.getByRole("navigation", { name: /крошки/i }).first();
      await expect(crumbs).toContainText("Главная");
      await expect(crumbs).toContainText(item.crumb);
      const ld = await jsonLd(page);
      expect(ld.some((node) => node["@type"] === "BreadcrumbList")).toBe(true);

      const text = await page.locator("main").innerText();
      expect(text).not.toMatch(/[{}]/);

      const robots = await robotsOf(page);
      if (item.legal) {
        expect(robots).toContain("noindex");
      } else if (item.path !== TEAM_PATH && (await isIndexableEnv(request))) {
        expect(robots).not.toContain("noindex");
      }
    });
  }
});

test.describe("«Для кого»", () => {
  test("hub: photo cards of the 4 segments, «Монтаж» panel, drawing form", async ({ page }) => {
    await page.goto("/klientam/");
    const main = page.locator("main");
    await expect(main.getByTestId("processing-hero").locator("img")).toHaveCount(1);
    await expect(main.getByRole("list", { name: "Условия" })).toBeVisible();

    const cards = main.getByTestId("segment-card");
    await expect(cards).toHaveCount(4);
    // The title is the card link (stretched over the card); every card has its photo.
    const hrefs = await cards
      .getByRole("heading", { level: 2 })
      .getByRole("link")
      .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
    expect(hrefs).toEqual(SEGMENT_PATHS);
    for (const card of await cards.all()) {
      await expect(card.locator("img")).toHaveAttribute("alt", /\S/);
      await expect(card).toContainText("Ваша задача");
      await expect(card).toContainText("Что берём на себя");
    }
    await expect(main.locator("table")).toHaveCount(0);

    const montage = main.getByTestId("clients-montage");
    await expect(montage.getByRole("heading", { name: "Монтаж" })).toBeVisible();
    await expect(montage).toContainText("шеф-монтаж");
    await expect(montage).not.toContainText("→");
    await expect(montage.getByRole("link", { name: "Перейти на inex.su" })).toHaveAttribute(
      "href",
      "https://inex.su/"
    );
    await expect(main.getByTestId("drawing-panel")).toBeVisible();
  });

  for (const segment of SEGMENT_PATHS) {
    test(`${segment}: quiz button with src, conditions resolved`, async ({ page }) => {
      await page.goto(segment);
      const quiz = page.locator("main a[data-quiz-cta]").first();
      await expect(quiz).toHaveText(/Рассчитать стоимость/);
      expect(decodeURIComponent((await quiz.getAttribute("href")) ?? "")).toContain(
        `src=${segment}`
      );
      const text = await page.locator("main").innerText();
      expect(text).toContain("50 м²");
      // No hanging separator at the end of a line or paragraph.
      expect(text).not.toMatch(/·\s*$/m);
      expect(text).not.toMatch(/^\s*·/m);
    });
  }

  for (const segment of SEGMENT_PATHS) {
    test(`${segment}: photo hero, content without TOC, note, form, segment tiles`, async ({
      page,
    }) => {
      await page.goto(segment);
      const main = page.locator("main");
      await expect(main.getByTestId("processing-hero").locator("img")).toHaveCount(1);
      await expect(main.getByRole("navigation", { name: "На странице" })).toHaveCount(0);
      await expect(main.getByTestId("article-note")).toContainText("50 м²");
      await expect(main.getByTestId("drawing-panel")).toBeVisible();

      const tiles = main.getByRole("navigation", { name: "Разделы «С кем мы работаем»" });
      await expect(tiles.getByRole("link")).toHaveCount(4);
      await expect(tiles.locator('a[aria-current="page"]')).toHaveAttribute("href", segment);
    });
  }

  test("contractors: problems table, three step cards with the drawings link", async ({ page }) => {
    await page.goto("/klientam/podryadchikam/");
    const main = page.locator("main");
    await expect(main.getByRole("heading", { name: "Как начать" })).toBeVisible();
    const steps = main.getByTestId("article-steps").locator("li");
    await expect(steps).toHaveCount(3);
    await expect(
      steps.first().getByRole("link", { name: "Требования к чертежам" })
    ).toHaveAttribute("href", "/kak-zakazat/trebovaniya-k-chertezham/");
    await expect(main.getByTestId("article-table")).toContainText("Клеймо на видимом стекле");
  });

  test("designers: solutions table keeps the links, four step cards", async ({ page }) => {
    await page.goto("/klientam/dizajneram-i-arhitektoram/");
    const table = page.locator("main").getByTestId("article-table");
    await expect(table.getByRole("link", { name: "Матирование" }).first()).toHaveAttribute(
      "href",
      "/obrabotka-stekla/matirovanie/"
    );
    await expect(page.locator("main").getByTestId("article-steps").locator("li")).toHaveCount(4);
  });

  test("furniture and developers: feature cards and the link rows", async ({ page }) => {
    await page.goto("/klientam/proizvoditelyam-mebeli/");
    let main = page.locator("main");
    await expect(main.getByTestId("feature-cards").locator("li")).toHaveCount(6);
    const types = main.getByTestId("link-row");
    await expect(types.getByRole("link", { name: "Матовое" })).toHaveAttribute(
      "href",
      "/zakalennoe-steklo/matovoe/"
    );
    await expect(types.getByRole("link", { name: "Стекло для мебели" })).toBeVisible();

    await page.goto("/klientam/zastrojshchikam/");
    main = page.locator("main");
    await expect(main.getByTestId("feature-cards").locator("li")).toHaveCount(4);
    await expect(main.getByTestId("link-row")).toContainText("Аэропорт Челябинск");
    await expect(
      main.getByTestId("link-row").getByRole("link", { name: "Все объекты" })
    ).toBeVisible();
  });

  test("furniture: quiz pre-filled with tempered glass", async ({ page }) => {
    await page.goto("/klientam/proizvoditelyam-mebeli/");
    const href = await page.locator("main a[data-quiz-cta]").first().getAttribute("href");
    expect(href).toContain("type=tempered");
  });
});

test.describe("«О компании»", () => {
  test("photo hero, roles table, photo panels, pills, inex.su panel, requisites, form", async ({
    page,
  }, testInfo) => {
    await page.goto("/o-kompanii/");
    const main = page.locator("main");
    const hero = main.getByTestId("processing-hero");
    await expect(hero.locator("img")).toHaveAttribute("alt", /Стол инженера/);
    await expect(hero).toContainText("За 21 год специалисты Inex выполнили более 1500 проектов");
    await expect(hero.locator("a[data-quiz-cta]")).toHaveCount(1);
    await expect(hero.getByRole("button", { name: "Отправить чертёж" })).toBeVisible();

    const roles = main.getByTestId("company-roles");
    await expect(roles.getByRole("heading", { level: 2 })).toHaveText(
      "Что делаем мы, а что — заводы-партнёры"
    );
    if (testInfo.project.name === "mobile-375") {
      await expect(roles.locator("[data-order-card]:visible")).toHaveCount(6);
    } else {
      await expect(roles.locator("table tbody tr")).toHaveCount(6);
    }

    const panels = main.getByTestId("company-photo-panels");
    await expect(panels.getByRole("heading", { level: 2 })).toHaveText([
      "Как мы выбираем заводы",
      "Где работаем",
    ]);
    for (const img of await panels.locator("img").all()) {
      await expect(img).toHaveAttribute("alt", /\S/);
    }

    const clients = main.getByTestId("company-clients").getByRole("link");
    await expect(clients).toHaveCount(5);
    expect(
      new Set(await clients.evaluateAll((links) => links.map((a) => a.getAttribute("href"))))
    ).toEqual(new Set(SEGMENT_PATHS));

    const objects = main.getByTestId("company-objects");
    await expect(objects.getByRole("listitem")).toHaveCount(6);
    await expect(objects.getByRole("link", { name: "Все объекты" })).toHaveAttribute(
      "href",
      "/obekty/"
    );

    const montage = main.getByTestId("clients-montage");
    await expect(montage.getByRole("heading", { name: "Двери, лестницы и монтаж" })).toBeVisible();
    await expect(montage.getByRole("link", { name: "Перейти на inex.su" })).toHaveAttribute(
      "href",
      "https://inex.su/"
    );

    await expect(page.locator("#rekvizity")).toContainText("744700156319");
    await expect(main.getByTestId("drawing-panel")).toBeVisible();
    await expect(main.getByTestId("drawing-panel")).toHaveAttribute("data-form-section", "full");
  });
});

test.describe("«Контакты»", () => {
  test("cards, contact links, form, requisites, LocalBusiness ×2", async ({ page }) => {
    await page.goto("/kontakty/");
    const main = page.locator("main");
    await expect(main.getByTestId("processing-hero").locator("img")).toHaveCount(0);
    await expect(main.getByTestId("processing-hero").locator("a[data-quiz-cta]")).toHaveCount(1);
    const panel = main.getByTestId("drawing-panel");
    await expect(panel).toHaveAttribute("data-form-section", "contacts");
    await expect(panel.getByRole("heading", { name: "Отправьте чертёж" })).toBeVisible();
    await expect(panel).toContainText(
      "КП — в среднем за 2–3 рабочих дня. Работаем с заказами от 50 м²."
    );
    await expect(main.locator("article").filter({ has: page.locator("h2") })).toHaveCount(3);
    await expect(main.locator('a[href="tel:+73512470557"]').first()).toBeVisible();
    await expect(main.locator('a[href="mailto:sale@inex.su"]').first()).toBeVisible();

    await expect(main.locator('input[type="checkbox"]').first()).not.toBeChecked();
    await expect(main.getByRole("button", { name: "Отправить", exact: true })).toBeVisible();

    await expect(page.locator("#rekvizity")).toBeVisible();
    await expect(page.locator("#rekvizity")).toContainText("744700156319");

    const ld = await jsonLd(page);
    expect(ld.filter((node) => node["@type"] === "LocalBusiness")).toHaveLength(2);
    expect(ld.some((node) => node["@type"] === "Organization")).toBe(true);
  });

  test("Yandex map loads only after the click", async ({ page }) => {
    const yandexRequests: string[] = [];
    page.on("request", (req) => {
      if (/yandex\./i.test(new URL(req.url()).hostname)) yandexRequests.push(req.url());
    });
    await page.goto("/kontakty/");
    const open = page.getByRole("link", { name: /Открыть в Яндекс\.Картах/ });
    await expect(open).toHaveAttribute("href", /^https:\/\/yandex\.ru\/maps\//);
    await expect(open).toHaveAttribute("rel", /noopener/);
    await expect(page.locator("iframe")).toHaveCount(0);
    expect(yandexRequests).toEqual([]);

    const frame = page.locator('iframe[src*="yandex.ru/map-widget"]');
    // Retried: a click before hydration (slow dev server) has no handler yet.
    await expect(async () => {
      await page.getByRole("button", { name: "Показать карту" }).click({ timeout: 2_000 });
      await expect(frame).toHaveCount(1, { timeout: 2_000 });
    }).toPass({ timeout: 30_000 });
    await expect(frame).toHaveAttribute("src", /text=/);

    await page.getByRole("button", { name: /Екатеринбург — офис/ }).click();
    await expect(frame).toHaveAttribute("src", /%D0%95%D0%BA%D0%B0%D1%82%D0%B5%D1%80/);
  });

  test("#rekvizity scrolls clear of the fixed header", async ({ page }) => {
    await page.goto("/kontakty/#rekvizity");
    const section = page.locator("#rekvizity");
    // Late layout shifts of a cold dev render can move the anchor: re-apply the hash once.
    await expect(async () => {
      await page.evaluate(() => document.getElementById("rekvizity")?.scrollIntoView());
      await expect(section).toBeInViewport({ timeout: 2_000 });
    }).toPass({ timeout: 20_000 });
    await expect
      .poll(async () => (await section.boundingBox())?.y ?? -1, { timeout: 5_000 })
      .toBeGreaterThanOrEqual(56);
  });
});

test.describe("legal pages", () => {
  test("policy: purposes table (4 rows), no quiz CTA", async ({ page }, testInfo) => {
    await page.goto("/politika-konfidencialnosti/");
    const main = page.locator("main");
    if (testInfo.project.name === "mobile-375") {
      await expect(main.locator(".ig-mcard:visible")).toHaveCount(4);
    } else {
      await expect(main.locator("table tbody tr")).toHaveCount(4);
    }
    await expect(main.locator("a[data-quiz-cta]")).toHaveCount(0);
    await expect(main).not.toContainText("Подтвердить Inex");
  });

  test("consent: links the policy, no quiz CTA", async ({ page }) => {
    await page.goto("/soglasie-na-obrabotku-personalnyh-dannyh/");
    const main = page.locator("main");
    await expect(
      main.getByRole("link", { name: "Политикой обработки персональных данных" })
    ).toHaveAttribute("href", "/politika-konfidencialnosti/");
    await expect(main.locator("a[data-quiz-cta]")).toHaveCount(0);
  });
});

/* ------------------------------------------------------------------------------------------ */
/* Company & team with / without team members                                                 */
/* ------------------------------------------------------------------------------------------ */

async function teamCount(request: APIRequestContext): Promise<number> {
  const res = await request.get("/api/team/?limit=0");
  return ((await res.json()) as { totalDocs?: number }).totalDocs ?? 0;
}

/**
 * Both states of the team section in ONE serial group of ONE project: the «with members» test
 * creates global team fixtures, which must never be visible to the «empty team» check (of this
 * or another viewport project). Fixtures come from the shared e2e admin and are deleted in
 * `afterAll`.
 */
test.describe("team section", () => {
  test.describe.configure({ mode: "serial" });

  let token = "";
  let preexisting = 0;
  const created: string[] = [];

  test.beforeAll(async ({ request }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop-1366",
      "mutates the team collection: desktop-1366 only"
    );
    preexisting = await teamCount(request);
  });

  test.afterAll(async ({ request }) => {
    for (const id of created) {
      await request.delete(`/api/team/${id}/`, { headers: { Authorization: `JWT ${token}` } });
    }
  });

  test("empty team: no «Команда» section and no link; team page 200 + noindex", async ({
    page,
  }) => {
    test.skip(preexisting > 0, "the database already has team members");
    await page.goto("/o-kompanii/");
    const main = page.locator("main");
    await expect(main.getByTestId("team-teaser")).toHaveCount(0);
    await expect(main.locator(`a[href="${TEAM_PATH}"]`)).toHaveCount(0);
    await expect(main.locator("table")).toContainText("—");
    await expect(main).toContainText("За 21 год специалисты Inex выполнили более 1500 проектов");

    const response = await page.goto(TEAM_PATH);
    expect(response?.status()).toBe(200);
    expect(await robotsOf(page)).toContain("noindex");
    await expect(page.getByTestId("team-grid")).toHaveCount(0);
    await expect(page.locator("main a[data-quiz-cta]").first()).toBeVisible();
  });

  test("with members: company page shows «Команда»; team page lists members in order", async ({
    page,
    request,
  }) => {
    test.skip(preexisting > 0, "the database already has team members");
    try {
      token = await adminToken(request);
    } catch (error) {
      skipOnMissingAdmin(error);
    }
    for (const member of [
      { name: "[e2e] Второй", role: "Менеджер", area: "Статусы заказов", order: 20 },
      { name: "[e2e] Первый", role: "Конструктор", area: "Проверка чертежей", order: 10 },
    ]) {
      const res = await request.post("/api/team/", {
        data: member,
        headers: { Authorization: `JWT ${token}` },
      });
      expect(res.ok(), await res.text()).toBe(true);
      created.push(((await res.json()) as { doc: { id: string } }).doc.id);
    }

    // ISR + stale-while-revalidate (`collection:team` expires with the "max" profile, see
    // src/payload/hooks/revalidate.ts): the first request after the edit may still get the cached
    // page while it regenerates in the background — reload until the fresh one is served.
    const teaser = page.getByTestId("team-teaser");
    await expect(async () => {
      await page.goto("/o-kompanii/");
      await expect(teaser).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 30_000 });
    await expect(teaser.getByRole("link", { name: /Сотрудники/ })).toHaveAttribute(
      "href",
      TEAM_PATH
    );

    await expect(async () => {
      await page.goto(TEAM_PATH);
      await expect(page.getByTestId("team-grid").locator("h2")).toHaveText(
        ["[e2e] Первый", "[e2e] Второй"],
        { timeout: 1_000 }
      );
    }).toPass({ timeout: 30_000 });
    // Private contact fields never reach the page.
    await expect(page.locator("main")).not.toContainText("@");
    if (await isIndexableEnv(page.request)) {
      expect(await robotsOf(page)).not.toContain("noindex");
    }
  });
});
