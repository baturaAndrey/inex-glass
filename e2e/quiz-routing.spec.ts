import { expect as baseExpect, test } from "@playwright/test";
import { clientIpHeaders, uniqueTestIp } from "./helpers/test-ip";
import { VIEWPORTS } from "./helpers/viewports";
import type { Locator, Page, TestInfo } from "@playwright/test";

/**
 * Quiz routing (task 34): the intercepted modal `@modal/(.)raschet-stoimosti` on client
 * navigations and the full page `/raschet-stoimosti/` on direct visits / reloads; URL pre-fill,
 * the entry page of `quiz_start` and «Мой расчёт» (`?resume=1`).
 * Precondition: `pnpm seed --minimal` (globals of the quiz config, `/zakalennoe-steklo/`).
 *
 * Metrika is stubbed (`window.ym` + `__INEX_YM_ID__`, consent `all`): goals are recorded in
 * `window.__goals` instead of being sent. No lead is submitted.
 */

/** The shared dev server compiles on demand and may be slow under load. */
const expect = baseExpect.configure({ timeout: 20_000 });
test.describe.configure({ timeout: 240_000 });
test.use({ navigationTimeout: 120_000, actionTimeout: 30_000 });

const QUIZ = "/raschet-stoimosti/";
const SOURCE_PAGE = "/zakalennoe-steklo/";
const DRAFT_KEY = "inex-quiz-draft-v1";
const CONSENT_KEY = "inex-consent-v1";
const TITLE = "Рассчитаем стоимость вашего заказа";
const META_LINE = "7 вопросов · около 3 минут · КП в среднем за 2–3 рабочих дня";

type Goal = [number, string, string, Record<string, unknown> | undefined];

declare global {
  interface Window {
    __goals?: Goal[];
    __pageMarker?: string;
  }
}

const isMobile = (testInfo: TestInfo) => testInfo.project.name === VIEWPORTS.mobile.name;

/** Consent `all` + a recording Metrika stub; the cookie banner never covers the CTAs. */
async function prepare(page: Page, testInfo: TestInfo) {
  // The form-token API is rate-limited per IP: a fresh documentation-range client per test.
  await page.setExtraHTTPHeaders(clientIpHeaders(uniqueTestIp(testInfo)));
  await page.addInitScript((consentKey) => {
    try {
      window.localStorage.setItem(consentKey, "all");
    } catch {
      // storage blocked: the banner just stays.
    }
    window.__goals = [];
    window.__INEX_YM_ID__ = 1;
    window.ym = (...args: unknown[]) => {
      window.__goals!.push(args as Goal);
    };
  }, CONSENT_KEY);
}

async function goals(page: Page, name: string): Promise<Goal[]> {
  return page.evaluate((goal) => (window.__goals ?? []).filter((args) => args[2] === goal), name);
}

/** «Рассчитать стоимость» of the current page: header CTA (≥600 px) or the sticky bar (phones). */
function calcCta(page: Page, testInfo: TestInfo): Locator {
  return isMobile(testInfo)
    ? page.locator(".ig-sticky-cta a")
    : page.locator('header a[href^="/raschet-stoimosti/?src="]:visible').first();
}

const dialog = (page: Page) => page.getByRole("dialog", { name: TITLE });
const quiz = (scope: Page | Locator) => scope.locator("[data-slot=quiz]");
const stepHeading = (scope: Page | Locator, name: string) =>
  quiz(scope).getByRole("heading", { level: 2, name, exact: true });

/** Opens a content page and waits until it is interactive (client router ready). */
async function openSourcePage(page: Page, path = SOURCE_PAGE) {
  await page.goto(path, { waitUntil: "load" });
  await expect(page.locator("main h1").first()).toBeVisible();
  // Hydrated: `PathTracker` (an effect of the layout) has stored the path. A click before that
  // would be a plain document navigation (the full page) instead of the intercepted modal.
  await expect
    .poll(() => page.evaluate(() => window.sessionStorage.getItem("inex:last-path")), {
      timeout: 90_000,
    })
    .toBe(path);
}

async function openModal(page: Page, testInfo: TestInfo) {
  const cta = calcCta(page, testInfo);
  await expect(cta).toBeVisible();
  await cta.click();
  await expect(dialog(page)).toBeVisible({ timeout: 90_000 });
  await expect(page).toHaveURL(/\/raschet-stoimosti\/\?src=/);
  // Let the open animation (fade + zoom) finish before measuring the window.
  await page
    .locator("[data-slot=quiz-modal]")
    .evaluate((element) => Promise.all(element.getAnimations().map((a) => a.finished)));
}

test.describe("quiz routing", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await prepare(page, testInfo);
  });

  test("CTA opens the modal over the page; Esc returns to the page and its scroll", async ({
    page,
  }, testInfo) => {
    await openSourcePage(page);
    await page.evaluate(() => {
      window.__pageMarker = "kept";
      // `instant`: the site has `scroll-behavior: smooth`.
      window.scrollTo({ top: 600, behavior: "instant" });
    });
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(600);
    const scrollBefore = await page.evaluate(() => window.scrollY);

    await openModal(page, testInfo);
    const modal = dialog(page);
    await expect(modal).toHaveAttribute("aria-describedby", /.+/);
    await expect(modal.getByText(META_LINE)).toBeVisible();
    await expect(stepHeading(modal, "Что нужно рассчитать?")).toBeVisible();
    // The page below is the same document (no reload) and keeps its scroll position.
    expect(await page.evaluate(() => window.__pageMarker)).toBe("kept");
    expect(Math.abs((await page.evaluate(() => window.scrollY)) - scrollBefore)).toBeLessThan(2);
    // The sticky bar / header stay below the modal.
    expect(
      await page.evaluate(() => {
        const content = document.querySelector("[data-slot=quiz-modal]");
        return content ? Number(getComputedStyle(content).zIndex) : 0;
      })
    ).toBeGreaterThanOrEqual(50);

    // `quiz_start` reports the page the modal was opened from.
    await expect.poll(async () => (await goals(page, "quiz_start")).length).toBe(1);
    const [start] = await goals(page, "quiz_start");
    expect(start?.[3]).toMatchObject({ entry_page: SOURCE_PAGE, variant: "modal" });

    await page.screenshot({ path: testInfo.outputPath(`modal-${testInfo.project.name}.png`) });

    await page.keyboard.press("Escape");
    await expect(modal).toBeHidden();
    await expect(page).toHaveURL(new RegExp(`${SOURCE_PAGE}$`));
    expect(await page.evaluate(() => window.__pageMarker)).toBe("kept");
    expect(Math.abs((await page.evaluate(() => window.scrollY)) - scrollBefore)).toBeLessThan(2);
    // Focus is back on the trigger.
    await expect(calcCta(page, testInfo)).toBeFocused();
  });

  test("the close button and the overlay close the modal", async ({ page }, testInfo) => {
    await openSourcePage(page);
    await openModal(page, testInfo);
    await dialog(page).getByRole("button", { name: "Закрыть" }).click();
    await expect(dialog(page)).toBeHidden();
    await expect(page).toHaveURL(new RegExp(`${SOURCE_PAGE}$`));

    if (!isMobile(testInfo)) {
      await openModal(page, testInfo);
      // Top-left corner: outside the centred window, on the overlay.
      await page.mouse.click(5, 5);
      await expect(dialog(page)).toBeHidden();
      await expect(page).toHaveURL(new RegExp(`${SOURCE_PAGE}$`));
    }
  });

  test("full page: no dialog, one h1, canonical without query, robots by environment", async ({
    page,
  }, testInfo) => {
    const response = await page.goto(`${QUIZ}?type=tempered&thick=10`, { waitUntil: "load" });
    expect(response?.status()).toBe(200);
    await expect(quiz(page)).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toHaveText(TITLE);
    await expect(page.getByText(META_LINE)).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Хлебные крошки" })).toContainText(
      "Расчёт стоимости"
    );
    await expect(page).toHaveTitle("Расчёт стоимости закалённого стекла по чертежу | Inex Glass");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      "Ответьте на 7 вопросов и прикрепите чертёж — пришлём КП с ценой, сроком и доставкой в среднем за 2–3 рабочих дня."
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      /^https?:\/\/[^/]+\/raschet-stoimosti\/$/
    );
    const robots = (await page.locator('meta[name="robots"]').getAttribute("content")) ?? "";
    // Outside production every page is `noindex, nofollow` (buildMetadata); the page itself
    // adds no noindex of its own.
    if (process.env.SITE_ENV === "production") expect(robots).not.toContain("noindex");
    else expect(robots).toBe("noindex, nofollow");
    // No sticky CTA on the quiz page (it would link to itself).
    await expect(page.locator(".ig-sticky-cta")).toHaveCount(0);

    await page.screenshot({
      path: testInfo.outputPath(`page-${testInfo.project.name}.png`),
      fullPage: true,
    });
  });

  test("the CTA on the quiz page itself opens no second quiz", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo), "no CTA on the quiz page on phones");
    const token = page.waitForResponse((r) => r.url().includes("/api/form-token/"), {
      timeout: 120_000,
    });
    await page.goto(QUIZ, { waitUntil: "load" });
    await token;
    await calcCta(page, testInfo).click();
    await expect(page).toHaveURL(new RegExp(`${QUIZ}$`));
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(quiz(page)).toHaveCount(1);
  });

  test("a client navigation away from the modal closes it", async ({ page }, testInfo) => {
    await openSourcePage(page);
    await openModal(page, testInfo);
    // No slot catch-all (it would capture `/admin`): the shell closes itself by pathname.
    await page.evaluate(() =>
      (window as unknown as { next: { router: { push(href: string): void } } }).next.router.push(
        "/kontakty/"
      )
    );
    await expect(page).toHaveURL(/\/kontakty\/$/);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.locator("main h1").first()).toBeVisible();
  });

  test("reload on the open modal shows the full page", async ({ page }, testInfo) => {
    await openSourcePage(page);
    await openModal(page, testInfo);
    await page.reload({ waitUntil: "load" });
    await expect(quiz(page)).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.locator("h1")).toHaveText(TITLE);
  });

  test("pre-fill from the URL; canonical keeps no query", async ({ page }) => {
    await page.goto(`${QUIZ}?type=tempered&thick=10&src=/zakalennoe-steklo/10-mm/`, {
      waitUntil: "load",
    });
    await expect(page.locator("[data-slot=quiz-prefill]")).toContainText("Закалённое стекло");
    await expect(quiz(page).getByRole("radio", { name: "Закалённое стекло" })).toHaveAttribute(
      "aria-checked",
      "true"
    );
    await quiz(page).getByRole("button", { name: "Далее", exact: true }).click();
    await expect(stepHeading(page, "Какое стекло?")).toBeVisible();
    await expect(
      quiz(page)
        .getByRole("radiogroup", { name: "Толщина" })
        .getByRole("radio", { name: /^10 мм/ })
    ).toHaveAttribute("aria-checked", "true");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      /\/raschet-stoimosti\/$/
    );
    await expect.poll(async () => (await goals(page, "quiz_start")).length).toBe(1);
    const [start] = await goals(page, "quiz_start");
    expect(start?.[3]).toMatchObject({ entry_page: "/zakalennoe-steklo/10-mm/", variant: "page" });
  });

  test("invalid parameters are ignored; src falls back to a safe value", async ({ page }) => {
    await page.goto(`${QUIZ}?thick=7&type=unknown&src=//evil.com`, { waitUntil: "load" });
    await expect(stepHeading(page, "Что нужно рассчитать?")).toBeVisible();
    await expect(page.locator("[data-slot=quiz-prefill]")).toHaveCount(0);
    await expect(quiz(page).locator('[role=radio][aria-checked="true"]')).toHaveCount(0);
    await expect.poll(async () => (await goals(page, "quiz_start")).length).toBe(1);
    const [start] = await goals(page, "quiz_start");
    // No referrer on a direct visit: the quiz page itself.
    expect(start?.[3]).toMatchObject({ entry_page: QUIZ });
  });

  test("draft: close the modal on step 3, «Мой расчёт» continues", async ({ page }, testInfo) => {
    await openSourcePage(page);
    await page.evaluate((key) => window.localStorage.removeItem(key), DRAFT_KEY);
    await openModal(page, testInfo);
    const modal = dialog(page);
    await modal.getByRole("radio", { name: "Закалённое стекло" }).click();
    await modal.getByRole("button", { name: "Далее", exact: true }).click();
    await modal
      .getByRole("radiogroup", { name: "Толщина" })
      .getByRole("radio", { name: /^8 мм/ })
      .click();
    await modal.getByRole("button", { name: "Далее", exact: true }).click();
    await expect(stepHeading(modal, "Объём и размеры")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(modal).toBeHidden();
    await expect
      .poll(() => page.evaluate((key) => window.localStorage.getItem(key), DRAFT_KEY))
      .toContain('"step":3');

    if (!isMobile(testInfo)) {
      // «Мой расчёт» in the header: a client navigation → the modal, restored.
      await page.locator(`header a[href="${QUIZ}?resume=1"]:visible`).first().click();
      await expect(dialog(page)).toBeVisible({ timeout: 90_000 });
      await expect(dialog(page).locator("[data-slot=quiz-resumed]")).toBeVisible();
      await expect(stepHeading(dialog(page), "Объём и размеры")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(dialog(page)).toBeHidden();
    }

    // Direct visit of the same URL: the full page, restored.
    await page.goto(`${QUIZ}?resume=1`, { waitUntil: "load" });
    await expect(page.locator("[data-slot=quiz-resumed]")).toBeVisible();
    await expect(stepHeading(page, "Объём и размеры")).toBeVisible();
    await quiz(page).getByRole("button", { name: "Назад", exact: true }).click();
    await expect(
      quiz(page).getByRole("radiogroup", { name: "Толщина" }).getByRole("radio", { name: /^8 мм/ })
    ).toHaveAttribute("aria-checked", "true");
    await page.evaluate((key) => window.localStorage.removeItem(key), DRAFT_KEY);
  });

  test("draft without resume: URL pre-fill overrides its fields, contacts and the rest stay", async ({
    page,
  }, testInfo) => {
    const company = "E2E черновик task-34";
    const next = (scope: Page | Locator) =>
      quiz(scope).getByRole("button", { name: "Далее", exact: true }).click();
    const thickness = (scope: Page | Locator, mm: number) =>
      quiz(scope)
        .getByRole("radiogroup", { name: "Толщина" })
        .getByRole("radio", { name: new RegExp(`^${mm} мм`) });
    /** From the current step to «Контакты» with «Далее». */
    async function toContacts(scope: Page | Locator, from: number) {
      for (let step = from; step < 7; step += 1) await next(scope);
      await expect(stepHeading(scope, "Контакты")).toBeVisible();
    }

    // 1. A draft: tempered 8 mm, an area and the contacts (no submit).
    await openSourcePage(page);
    await page.evaluate((key) => window.localStorage.removeItem(key), DRAFT_KEY);
    await openModal(page, testInfo);
    const modal = dialog(page);
    await modal.getByRole("radio", { name: "Закалённое стекло" }).click();
    await next(modal);
    await thickness(modal, 8).click();
    await next(modal);
    await quiz(modal).getByLabel("Площадь, м²").fill("12");
    await toContacts(modal, 3);
    await quiz(modal).getByLabel("Компания").fill(company);
    await quiz(modal).getByLabel("Имя").fill("Тест");
    await page.keyboard.press("Escape");
    await expect(modal).toBeHidden();
    await expect
      .poll(() => page.evaluate((key) => window.localStorage.getItem(key), DRAFT_KEY))
      .toContain(company);

    // 2. A card link with another type and thickness: those two change, the rest is the draft.
    await page.goto(`${QUIZ}?type=partitions&thick=10&src=/zakalennoe-steklo/`, {
      waitUntil: "load",
    });
    await expect(page.locator("[data-slot=quiz-prefill]")).toContainText("Перегородки");
    await expect(page.locator("[data-slot=quiz-resumed]")).toHaveCount(0);
    await expect(quiz(page).getByText("Шаг 1 из 7")).toBeVisible();
    await expect(
      quiz(page).getByRole("radio", { name: "Перегородки", exact: true })
    ).toHaveAttribute("aria-checked", "true");
    await next(page);
    await expect(thickness(page, 10)).toHaveAttribute("aria-checked", "true");
    await next(page);
    await expect(quiz(page).getByLabel("Площадь, м²")).toHaveValue("12");
    await toContacts(page, 3);
    await expect(quiz(page).getByLabel("Компания")).toHaveValue(company);
    await expect(quiz(page).getByLabel("Имя")).toHaveValue("Тест");
    // Walking the steps is a change: the merged draft is saved.
    await expect
      .poll(() => page.evaluate((key) => window.localStorage.getItem(key), DRAFT_KEY))
      .toContain('"type":"partitions"');

    // 3. A plain CTA (no pre-fill): the draft answers at step 1, nothing «restored».
    await openSourcePage(page);
    await openModal(page, testInfo);
    await expect(dialog(page).locator("[data-slot=quiz-prefill]")).toHaveCount(0);
    await expect(dialog(page).locator("[data-slot=quiz-resumed]")).toHaveCount(0);
    await expect(stepHeading(dialog(page), "Что нужно рассчитать?")).toBeVisible();
    await expect(
      dialog(page).getByRole("radio", { name: "Перегородки", exact: true })
    ).toHaveAttribute("aria-checked", "true");
    await next(dialog(page));
    await expect(thickness(dialog(page), 10)).toHaveAttribute("aria-checked", "true");
    await next(dialog(page));
    await toContacts(dialog(page), 3);
    await expect(quiz(dialog(page)).getByLabel("Компания")).toHaveValue(company);

    await page.evaluate((key) => window.localStorage.removeItem(key), DRAFT_KEY);
  });

  test("«Мой расчёт» without a draft opens an empty quiz without console errors", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto(QUIZ, { waitUntil: "load" });
    await page.evaluate((key) => window.localStorage.removeItem(key), DRAFT_KEY);
    await page.goto(`${QUIZ}?resume=1`, { waitUntil: "load" });
    await expect(stepHeading(page, "Что нужно рассчитать?")).toBeVisible();
    await expect(page.locator("[data-slot=quiz-resumed]")).toHaveCount(0);
    expect(errors.filter((text) => !/favicon|Download the React DevTools/i.test(text))).toEqual([]);
  });

  test("«Мой расчёт» on the quiz page itself reloads it as the full page with the draft", async ({
    page,
  }, testInfo) => {
    // Phones have no «Мой расчёт» in the header (the menu holds it); the reload logic is the same.
    test.skip(isMobile(testInfo), "header «Мой расчёт» is ≥600 px only");
    const token = page.waitForResponse((r) => r.url().includes("/api/form-token/"), {
      timeout: 120_000,
    });
    await page.goto(QUIZ, { waitUntil: "load" });
    await token;
    await page.evaluate((key) => window.localStorage.removeItem(key), DRAFT_KEY);
    // A draft on step 3, made on the page quiz itself.
    await quiz(page).getByRole("radio", { name: "Закалённое стекло" }).click();
    await quiz(page).getByRole("button", { name: "Далее", exact: true }).click();
    await quiz(page)
      .getByRole("radiogroup", { name: "Толщина" })
      .getByRole("radio", { name: /^8 мм/ })
      .click();
    await quiz(page).getByRole("button", { name: "Далее", exact: true }).click();
    await expect(stepHeading(page, "Объём и размеры")).toBeVisible();
    await expect
      .poll(() => page.evaluate((key) => window.localStorage.getItem(key), DRAFT_KEY))
      .toContain('"step":3');
    await page.evaluate(() => {
      window.__pageMarker = "before-reload";
    });

    // The modal shell sees the page quiz under it and calls `window.location.reload()`.
    const reloaded = page.waitForEvent("load", { timeout: 120_000 });
    await page.locator(`header a[href="${QUIZ}?resume=1"]:visible`).first().click();
    await reloaded;
    await expect(page).toHaveURL(new RegExp(`${QUIZ}\\?resume=1$`));
    // A new document (not a client transition), the full page, the draft restored.
    expect(await page.evaluate(() => window.__pageMarker)).toBeUndefined();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(quiz(page)).toHaveCount(1);
    await expect(page.locator("[data-slot=quiz-resumed]")).toBeVisible();
    await expect(stepHeading(page, "Объём и размеры")).toBeVisible();
    await page.evaluate((key) => window.localStorage.removeItem(key), DRAFT_KEY);
  });

  test("browser Back closes the modal and keeps the page below", async ({ page }, testInfo) => {
    await openSourcePage(page);
    await page.evaluate(() => {
      window.__pageMarker = "kept";
    });
    await openModal(page, testInfo);
    await page.goBack();
    await expect(dialog(page)).toBeHidden();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page).toHaveURL(new RegExp(`${SOURCE_PAGE}$`));
    // Same document: Back is a client transition, not a reload of the source page.
    expect(await page.evaluate(() => window.__pageMarker)).toBe("kept");
    await expect(page.locator("main h1").first()).toBeVisible();
    // Forward re-opens the quiz (the intercepted route is in the history).
    await page.goForward();
    await expect(page).toHaveURL(/\/raschet-stoimosti\/\?src=/);
    await expect(quiz(page)).toBeVisible();
  });

  test("the page below does not scroll while the modal is open", async ({ page }, testInfo) => {
    await openSourcePage(page);
    await page.evaluate(() => window.scrollTo({ top: 400, behavior: "instant" }));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(400);

    await openModal(page, testInfo);
    // Radix (react-remove-scroll) locks the body.
    await expect
      .poll(() => page.evaluate(() => getComputedStyle(document.body).overflow))
      .toBe("hidden");
    // Wheel over the overlay (desktop) / over the full-screen window (phones): the page stays.
    const viewport = page.viewportSize()!;
    if (isMobile(testInfo)) await page.mouse.move(viewport.width / 2, viewport.height / 2);
    else await page.mouse.move(5, viewport.height / 2);
    await page.mouse.wheel(0, 800);
    await page.keyboard.press("End");
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => window.scrollY)).toBe(400);

    await page.keyboard.press("Escape");
    await expect(dialog(page)).toBeHidden();
    // Unlocked again: the page scrolls.
    await expect
      .poll(() => page.evaluate(() => getComputedStyle(document.body).overflow))
      .not.toBe("hidden");
    await page.mouse.wheel(0, 300);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(400);
  });

  test("Tab and Shift+Tab keep the focus inside the modal", async ({ page }, testInfo) => {
    await openSourcePage(page);
    await openModal(page, testInfo);
    const focusInside = () =>
      page.evaluate(() => {
        const modal = document.querySelector("[data-slot=quiz-modal]");
        const active = document.activeElement;
        return Boolean(modal && active && active !== document.body && modal.contains(active));
      });
    await expect.poll(focusInside).toBe(true);

    // More presses than the modal has tab stops: the focus must wrap, never leave.
    const seen = new Set<string>();
    for (let press = 0; press < 30; press += 1) {
      await page.keyboard.press("Tab");
      expect(await focusInside(), `Tab #${press + 1}`).toBe(true);
      seen.add(
        await page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null;
          return `${el?.tagName}|${el?.getAttribute("aria-label") ?? el?.textContent?.trim() ?? ""}`;
        })
      );
    }
    // The walk really moved through several controls (close button, options, «Далее»).
    expect(seen.size).toBeGreaterThan(2);
    for (let press = 0; press < 10; press += 1) {
      await page.keyboard.press("Shift+Tab");
      expect(await focusInside(), `Shift+Tab #${press + 1}`).toBe(true);
    }
  });

  test("a QuizLink CTA of a content page opens the modal with its pre-fill", async ({
    page,
  }, testInfo) => {
    const source = "/zakalennoe-steklo/10-mm/";
    await openSourcePage(page, source);
    await page.evaluate((key) => window.localStorage.removeItem(key), DRAFT_KEY);
    // «Паспорт толщины» button: `QuizLink` with `type=tempered&thick=10&src=<page>`.
    const cta = page
      .locator('main a[data-quiz-cta][href*="type=tempered"][href*="thick=10"]:visible')
      .first();
    await expect(cta).toBeVisible();
    await cta.scrollIntoViewIfNeeded();
    await cta.click();

    const modal = dialog(page);
    await expect(modal).toBeVisible({ timeout: 90_000 });
    await expect(page).toHaveURL(/\/raschet-stoimosti\/\?type=tempered&thick=10&src=/);
    await expect(modal.locator("[data-slot=quiz-prefill]")).toContainText("Закалённое стекло");
    await expect(modal.getByRole("radio", { name: "Закалённое стекло" })).toHaveAttribute(
      "aria-checked",
      "true"
    );
    await modal.getByRole("button", { name: "Далее", exact: true }).click();
    await expect(
      modal.getByRole("radiogroup", { name: "Толщина" }).getByRole("radio", { name: /^10 мм/ })
    ).toHaveAttribute("aria-checked", "true");

    await expect.poll(async () => (await goals(page, "quiz_start")).length).toBe(1);
    const [start] = await goals(page, "quiz_start");
    expect(start?.[3]).toMatchObject({ entry_page: source, variant: "modal" });

    await page.keyboard.press("Escape");
    await expect(modal).toBeHidden();
    await expect(page).toHaveURL(new RegExp(`${source}$`));
    await page.evaluate((key) => window.localStorage.removeItem(key), DRAFT_KEY);
  });

  test("phones: full-screen modal, footer visible without scrolling", async ({
    page,
  }, testInfo) => {
    test.skip(!isMobile(testInfo), "375 px only");
    await openSourcePage(page);
    await openModal(page, testInfo);
    const box = await page.locator("[data-slot=quiz-modal]").boundingBox();
    expect(box).not.toBeNull();
    expect(Math.round(box!.x)).toBe(0);
    expect(Math.round(box!.y)).toBe(0);
    expect(Math.round(box!.width)).toBe(VIEWPORTS.mobile.width);
    expect(Math.round(box!.height)).toBe(VIEWPORTS.mobile.height);
    await expect(dialog(page).getByRole("button", { name: "Далее", exact: true })).toBeInViewport();
    await expect(dialog(page).locator("[data-slot=quiz-footer]")).toBeInViewport({ ratio: 1 });
  });

  test("desktop: centred window up to 880 px", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo), "≥600 px only");
    await openSourcePage(page);
    await openModal(page, testInfo);
    const box = await page.locator("[data-slot=quiz-modal]").boundingBox();
    const viewport = page.viewportSize()!;
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(880);
    expect(Math.abs(box!.x + box!.width / 2 - viewport.width / 2)).toBeLessThan(2);
    expect(box!.height).toBeLessThanOrEqual(viewport.height - 48 + 1);
    await expect(dialog(page).locator("[data-slot=quiz-footer]")).toBeInViewport({ ratio: 1 });
  });
});
