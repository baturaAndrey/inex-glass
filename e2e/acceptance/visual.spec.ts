import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { screenshotDir } from "../helpers/acceptance-env";
import { createTestObject } from "../helpers/acceptance-objects";
import {
  ACCEPTANCE_PAGES,
  CTA_LABEL,
  VISUAL_EXTRA_PAGES,
  openPage,
  presetConsent,
  scrollThrough,
} from "../helpers/acceptance-pages";
import { skipOnMissingAdmin } from "../helpers/admin";
import { ORDER_STATUSES, OrdersFixtures } from "../helpers/orders-fixtures";
import { VIEWPORTS } from "../helpers/viewports";
import type { TestObject } from "../helpers/acceptance-objects";
import type { AcceptancePage } from "../helpers/acceptance-pages";
import type { Page, TestInfo } from "@playwright/test";

/**
 * Acceptance scenario 13 (task 42): visual review material + automated layout checks.
 *
 * Every key page × 375 / 1366 / 1920 is captured twice (first screen and full page) as a test
 * attachment AND as a file under `ACCEPTANCE_SCREENSHOT_DIR/<project>/` (default: inside the
 * Playwright output dir) for the side-by-side comparison with the prototypes
 * (`res/inex-glass-handoff/prototypes/*.dc.html`) — a `[ЧЕЛОВЕК]` step. No pixel baselines:
 * local Windows rendering differs from the Linux baselines policy of `playwright.config.ts`.
 *
 * Automated checks per page (soft, so one run lists every finding):
 * - no horizontal page overflow (asserted at 375; reported at the other widths too);
 * - no emoji in the visible text (design rules of `res/inex-glass-handoff/CLAUDE.md`);
 * - no broken images after scrolling through the page (lazy images included);
 * - «Рассчитать стоимость» visible in the first viewport (ТЗ §2.2), except the quiz page and
 *   `/zakaz/*`.
 *
 * Data-dependent pages use throwaway fixtures: one published «TEST» object (the seed publishes
 * none) and one order walked through its 5 statuses — both removed afterwards.
 */

test.use({ navigationTimeout: 60_000 });
test.describe.configure({ timeout: 240_000 });

/** Fixture object of the running test; removed again in afterEach if the test timed out. */
let liveObject: TestObject | undefined;
test.afterEach(async () => {
  await liveObject?.remove();
  liveObject = undefined;
});

/** Emoji presentation characters, or pictographs forced to emoji style by VS-16. */
const EMOJI = /\p{Emoji_Presentation}|\p{Extended_Pictographic}️/gu;
const IMAGE_SETTLE_MS = 20_000;
const QUIZ_DIALOG_TITLE = "Рассчитаем стоимость вашего заказа";

const isPhone = (testInfo: TestInfo) => testInfo.project.name === VIEWPORTS.mobile.name;

/** Screenshot → file in the acceptance dir + test attachment. */
async function capture(page: Page, testInfo: TestInfo, name: string, fullPage: boolean) {
  const dir = path.join(screenshotDir(testInfo), testInfo.project.name);
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${name}-${fullPage ? "full" : "first"}.png`);
  await page.screenshot({ path: file, fullPage, animations: "disabled" });
  await testInfo.attach(`${name}-${fullPage ? "full" : "first"}`, {
    path: file,
    contentType: "image/png",
  });
}

async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
}

async function emojiInText(page: Page): Promise<string[]> {
  const text = await page.evaluate(() => document.body.innerText);
  return [...new Set(text.match(EMOJI) ?? [])];
}

/** `src` of images that finished loading without pixels (after a settle period). */
async function brokenImages(page: Page): Promise<string[]> {
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            Array.from(document.images).filter(
              (image) => image.currentSrc !== "" && !image.complete
            ).length
        ),
      { timeout: IMAGE_SETTLE_MS }
    )
    .toBe(0)
    .catch(() => undefined); // still loading after the settle: judged below as broken or not
  return page.evaluate(() =>
    Array.from(document.images)
      .filter((image) => (image.currentSrc || image.src) && image.complete)
      .filter((image) => image.naturalWidth === 0)
      .map((image) => image.currentSrc || image.src)
  );
}

/** Whether a visible «Рассчитать стоимость» link/button intersects the first viewport. */
async function ctaInFirstViewport(page: Page): Promise<boolean> {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  return page.evaluate((label) => {
    const candidates = Array.from(document.querySelectorAll<HTMLElement>("a, button"));
    return candidates.some((element) => {
      const name = `${element.getAttribute("aria-label") ?? ""} ${element.innerText}`;
      if (!name.includes(label)) return false;
      if (!element.checkVisibility({ opacityProperty: true, visibilityProperty: true })) {
        return false;
      }
      const rect = element.getBoundingClientRect();
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        rect.top < window.innerHeight &&
        rect.bottom > 0 &&
        rect.left < window.innerWidth &&
        rect.right > 0
      );
    });
  }, CTA_LABEL);
}

interface LayoutCheckOptions {
  /** CTA in the first screen is required. */
  cta: boolean;
}

/** First-screen shot, the soft layout checks and the full-page shot. */
async function reviewPage(
  page: Page,
  testInfo: TestInfo,
  name: string,
  options: LayoutCheckOptions
): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  await capture(page, testInfo, name, false);

  if (options.cta) {
    expect
      .soft(await ctaInFirstViewport(page), `${name}: «${CTA_LABEL}» in the first screen`)
      .toBe(true);
  }

  await scrollThrough(page);
  const overflow = await horizontalOverflow(page);
  if (isPhone(testInfo)) {
    expect.soft(overflow, `${name}: horizontal overflow at 375 (px)`).toBeLessThanOrEqual(0);
  } else if (overflow > 0) {
    testInfo.annotations.push({ type: "overflow", description: `${name}: ${overflow}px` });
  }
  expect.soft(await emojiInText(page), `${name}: emoji in visible text`).toEqual([]);
  expect.soft(await brokenImages(page), `${name}: broken images`).toEqual([]);

  await capture(page, testInfo, name, true);
}

test.describe("key pages", () => {
  test.beforeEach(async ({ page }) => {
    // «Только необходимые»: no banner over the layout, no Metrika.
    await presetConsent(page, "necessary");
  });

  for (const target of [...ACCEPTANCE_PAGES, ...VISUAL_EXTRA_PAGES]) {
    test(`${target.id} ${target.path}`, async ({ page }, testInfo) => {
      await openPage(page, target);
      await reviewPage(page, testInfo, target.id, { cta: target.ctaInFirstScreen });
    });
  }

  test("quiz modal over the hub", async ({ page }, testInfo) => {
    const source = "/zakalennoe-steklo/";
    await page.goto(source, { waitUntil: "load" });
    await expect
      .poll(() => page.evaluate(() => window.sessionStorage.getItem("inex:last-path")), {
        timeout: 90_000,
      })
      .toBe(source);
    const cta = isPhone(testInfo)
      ? page.locator(".ig-sticky-cta a")
      : page.locator('header a[href^="/raschet-stoimosti/?src="]:visible').first();
    await cta.click();
    const dialog = page.getByRole("dialog", { name: QUIZ_DIALOG_TITLE });
    await expect(dialog).toBeVisible({ timeout: 60_000 });
    await page
      .locator("[data-slot=quiz-modal]")
      .evaluate((element) => Promise.all(element.getAnimations().map((a) => a.finished)));
    await capture(page, testInfo, "quiz-modal", false);
    expect.soft(await emojiInText(page), "quiz modal: emoji").toEqual([]);
    expect.soft(await horizontalOverflow(page), "quiz modal: overflow").toBeLessThanOrEqual(0);
  });

  test("objects listing with a card and the object card (TEST fixture)", async ({
    page,
    request,
  }, testInfo) => {
    // Waits for the cross-process objects lock (other projects / objects.spec).
    test.setTimeout(480_000);
    const object = (liveObject = await createTestObject(request));
    try {
      const listing: AcceptancePage = {
        id: "objects-with-cards",
        path: "/obekty/",
        status: 200,
        ctaInFirstScreen: true,
      };
      await openPage(page, listing);
      await expect(page.locator(`a[href="${object.path}"]`).first()).toBeVisible();
      await reviewPage(page, testInfo, listing.id, { cta: true });

      await openPage(page, { ...listing, id: "object-card", path: object.path });
      await reviewPage(page, testInfo, "object-card", { cta: true });
    } finally {
      await object.remove();
    }
  });
});

test.describe("order page in all 5 statuses", () => {
  let fx: OrdersFixtures | undefined;

  test.beforeAll(async ({ baseURL }) => {
    test.setTimeout(300_000);
    try {
      fx = await OrdersFixtures.login(baseURL ?? "http://localhost:3100");
    } catch (error) {
      skipOnMissingAdmin(error);
    }
  });

  test.afterAll(async () => {
    test.setTimeout(300_000);
    await fx?.cleanup();
  });

  test("spec_agreed → received", async ({ page }, testInfo) => {
    test.setTimeout(360_000);
    if (!fx) throw new Error("orders fixtures are not initialised");
    await presetConsent(page, "necessary");
    const statuses = await fx.createStatuses();
    const { order } = await fx.createOrder(statuses);
    const link = await fx.link(order.id);

    for (const status of ORDER_STATUSES) {
      if (status === "packed") {
        const photos = [
          await fx.uploadFile("photo", 0),
          await fx.uploadFile("photo", 1),
          await fx.uploadFile("photo", 2),
        ];
        const documentId = await fx.uploadFile("document");
        await fx.updateOrder(order.id, {
          packPhotos: photos.map((photo) => ({ photo })),
          documents: [{ title: "Паспорт качества (TEST)", kind: "passport", file: documentId }],
        });
      }
      if (status === "shipped") {
        await fx.updateOrder(order.id, {
          shipment: { carrier: "ПЭК", waybill: "TEST-0042-77", trackingUrl: "https://pecom.ru/" },
          clientComment: { text: "Тестовый комментарий клиенту (приёмка)." },
        });
      }
      if (status !== "spec_agreed") await fx.setStatus(order.id, status);

      const response = await page.goto(link, { waitUntil: "load" });
      expect(response?.status(), `order page in ${status}`).toBe(200);
      await expect(page.locator("h1").first()).toBeVisible();
      // `/zakaz/*` has no quiz CTA requirement (ТЗ §2.2 exception).
      await reviewPage(page, testInfo, `order-${status}`, { cta: false });
    }
  });
});
