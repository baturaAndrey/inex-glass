import { expect, test } from "@playwright/test";
import { EXPECT_ENV, onlyProject } from "../helpers/acceptance-env";
import { presetConsent } from "../helpers/acceptance-pages";
import { skipOnMissingAdmin } from "../helpers/admin";
import { adminApi } from "../helpers/admin-api";
import { clientIpHeaders, uniqueTestIp } from "../helpers/test-ip";
import { VIEWPORTS } from "../helpers/viewports";
import type { AdminApi } from "../helpers/admin-api";
import type { BrowserContext, Page, TestInfo } from "@playwright/test";

/**
 * Acceptance scenarios 9 (site search) and 10 (cookie banner + Yandex Metrika) of task 42.
 *
 * Search: the three queries of the scenario return the relevant pages on top, `/poisk/` is
 * `noindex`.
 *
 * Metrika: never any request to `mc.yandex.ru` before consent or after «Только необходимые»;
 * «Принять» loads the counter (tag.js) and the choice survives a reload; goals reach `ym(...)`.
 * NO real network: every `mc.yandex.ru` request is intercepted — tag.js is fulfilled with a
 * stub that replays the snippet queue (`ym.a`) and records every call into `window.__ymCalls`.
 *
 * The counter only exists in production (`SITE_ENV=production` + `site-settings.analytics.
 * metrikaId`). A fresh seed has no counter id, so the «Принять» scenario sets a TEST id
 * (`ACCEPTANCE_METRIKA_ID`, default 99999999) for the duration of the test and restores the
 * original value in `finally` — a short global change, run serially on desktop-1366 only. On a
 * staging stand (no counter by design) that part is N/A and annotated.
 *
 * Goals covered here: quiz_start, quiz_step_1/2, calc_weight, calc_to_quiz, click_phone,
 * click_email. quiz_step_3…7, quiz_submit, file_upload and form_submit need a submitted lead:
 * they are asserted by `e2e/quiz.spec.ts`, `e2e/forms.spec.ts` and `acceptance/lead-flow.spec.ts`.
 */

const NAV_TIMEOUT = 60_000;
const TEST_COUNTER_ID = process.env.ACCEPTANCE_METRIKA_ID ?? "99999999";
const METRIKA_HOST = "https://mc.yandex.ru/**";
const COUNTER_IN_HTML = /counterId\\?"\s*:\s*(\d+)/;
const CACHE_POLL_MS = 90_000;

test.use({ navigationTimeout: NAV_TIMEOUT });

// ---------------------------------------------------------------------------------------------
// Scenario 9: search
// ---------------------------------------------------------------------------------------------

const SEARCH_CASES = [
  { query: "закаленное", expected: "/zakalennoe-steklo/" },
  { query: "перегородки", expected: "/steklyannye-peregorodki/" },
  { query: "ГОСТ", expected: "/kak-zakazat/dopuski-i-gost/" },
] as const;
/** «Relevant» = the expected page is among the first results. */
const TOP_RESULTS = 3;

test.describe("scenario 9: site search", () => {
  for (const { query, expected } of SEARCH_CASES) {
    test(`«${query}» → ${expected} in the top ${TOP_RESULTS}`, async ({ page }) => {
      await presetConsent(page, "necessary");
      const response = await page.goto(`/poisk/?q=${encodeURIComponent(query)}`);
      expect(response?.status()).toBe(200);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        `Результаты по запросу «${query}»`
      );

      const results = page.getByTestId("search-results").locator("ol > li");
      await expect(results.first()).toBeVisible();
      const hrefs = await results.evaluateAll((items) =>
        items.map((item) => item.querySelector("a")?.getAttribute("href") ?? "")
      );
      expect(hrefs.slice(0, TOP_RESULTS), `top results for «${query}»`).toContain(expected);
      // Highlighted match in the snippets.
      await expect(page.getByTestId("search-results").locator("mark").first()).toBeVisible();
    });
  }

  test("/poisk/ without a query is noindex too", async ({ page }) => {
    await page.goto("/poisk/");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });
});

// ---------------------------------------------------------------------------------------------
// Scenario 10: cookie banner + Metrika
// ---------------------------------------------------------------------------------------------

type YmCall = unknown[];

/**
 * tag.js stand-in: takes over the queue of the official snippet (`ym.a`) and records every
 * call. Runs as a classic script, so plain ES5.
 */
const TAG_JS_STUB = `(function () {
  var queued = (window.ym && window.ym.a) || [];
  var calls = window.__ymCalls || (window.__ymCalls = []);
  for (var i = 0; i < queued.length; i++) calls.push(Array.prototype.slice.call(queued[i]));
  window.ym = function () { calls.push(Array.prototype.slice.call(arguments)); };
  window.__ymStub = true;
})();`;

interface MetrikaTraffic {
  /** Every requested mc.yandex.ru URL. */
  urls: string[];
}

/** Intercepts mc.yandex.ru for the whole context: tag.js → stub, anything else → 204. */
async function interceptMetrika(context: BrowserContext): Promise<MetrikaTraffic> {
  const traffic: MetrikaTraffic = { urls: [] };
  await context.route(METRIKA_HOST, async (route) => {
    const url = route.request().url();
    traffic.urls.push(url);
    if (/\/metrika\/tag\.js/.test(url)) {
      await route.fulfill({ status: 200, contentType: "text/javascript", body: TAG_JS_STUB });
    } else {
      await route.fulfill({ status: 204, body: "" });
    }
  });
  return traffic;
}

async function ymCalls(page: Page): Promise<YmCall[]> {
  return page.evaluate(() => (window as unknown as { __ymCalls?: unknown[][] }).__ymCalls ?? []);
}

async function goalNames(page: Page): Promise<string[]> {
  return (await ymCalls(page)).filter((call) => call[1] === "reachGoal").map((c) => String(c[2]));
}

const banner = (page: Page) => page.getByRole("region", { name: "Уведомление о cookie" });

async function waitHydrated(page: Page, path: string): Promise<void> {
  await expect
    .poll(() => page.evaluate(() => window.sessionStorage.getItem("inex:last-path")), {
      timeout: NAV_TIMEOUT,
    })
    .toBe(path);
}

test.describe("scenario 10: cookie banner and Metrika (no counter mutation)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await page.setExtraHTTPHeaders(clientIpHeaders(uniqueTestIp(testInfo)));
  });

  test("no choice yet: banner shown, no request to mc.yandex.ru", async ({ page, context }) => {
    const traffic = await interceptMetrika(context);
    for (const path of ["/", "/zakalennoe-steklo/", "/instrumenty/kalkulyator-vesa-stekla/"]) {
      await page.goto(path, { waitUntil: "load" });
      await waitHydrated(page, path);
      await expect(banner(page)).toBeVisible();
    }
    await page.waitForTimeout(1_000);
    expect(traffic.urls, "mc.yandex.ru requests before consent").toEqual([]);
    expect(await page.evaluate(() => typeof window.ym)).toBe("undefined");
    // No preconnect / dns-prefetch to Metrika either.
    await expect(page.locator('link[href*="mc.yandex.ru"]')).toHaveCount(0);
  });

  test("«Только необходимые»: remembered, never loads Metrika", async ({ page, context }) => {
    const traffic = await interceptMetrika(context);
    await page.goto("/", { waitUntil: "load" });
    await waitHydrated(page, "/");
    await banner(page).getByRole("button", { name: "Только необходимые" }).click();
    await expect(banner(page)).toBeHidden();
    expect(
      await page.evaluate(() => window.localStorage.getItem("inex-consent-v1")),
      "stored choice"
    ).toBe("necessary");

    await page.reload({ waitUntil: "load" });
    await waitHydrated(page, "/");
    await page.goto("/zakalennoe-steklo/", { waitUntil: "load" });
    await waitHydrated(page, "/zakalennoe-steklo/");
    await page.waitForTimeout(1_000);
    await expect(banner(page), "the choice is remembered").toHaveCount(0);
    expect(traffic.urls, "mc.yandex.ru requests with «Только необходимые»").toEqual([]);
    expect(await page.evaluate(() => typeof window.ym)).toBe("undefined");
  });
});

interface AnalyticsGroup {
  metrikaId?: string | null;
  webvisor?: boolean | null;
  [key: string]: unknown;
}

/** Polls a page's HTML until its server-rendered Metrika config shows `counterId` (or none). */
async function waitForCounterInHtml(
  api: AdminApi,
  path: string,
  counterId: string | null
): Promise<void> {
  await expect
    .poll(
      async () => {
        const response = await api.request.get(path);
        const match = COUNTER_IN_HTML.exec(await response.text());
        return match?.[1] ?? null;
      },
      { timeout: CACHE_POLL_MS, intervals: [1_000, 2_000, 3_000] }
    )
    .toBe(counterId);
}

test.describe("scenario 10: «Принять» loads the counter, goals fire", () => {
  test.describe.configure({ mode: "serial", timeout: 420_000 });

  const PAGES = ["/", "/zakalennoe-steklo/", "/instrumenty/kalkulyator-vesa-stekla/"] as const;

  test("consent → tag.js (stubbed), init + hit, remembered; goals", async ({
    page,
    context,
    request,
  }, testInfo: TestInfo) => {
    onlyProject(testInfo, VIEWPORTS.laptop.name, "global site-settings change: one project");
    if (EXPECT_ENV !== "production") {
      testInfo.annotations.push({
        type: "N/A",
        description: `SITE_ENV=${EXPECT_ENV}: the counter is production-only by design`,
      });
      test.skip(true, "Metrika loads only with SITE_ENV=production");
    }

    let api: AdminApi;
    try {
      api = await adminApi(request);
    } catch (error) {
      skipOnMissingAdmin(error);
      return;
    }
    const settings = await api.json<{ analytics?: AnalyticsGroup | null }>(
      "/api/globals/site-settings/?depth=0"
    );
    const original: AnalyticsGroup = { ...(settings.analytics ?? {}) };
    const configured = original.metrikaId?.trim() || null;
    const counterId = configured ?? TEST_COUNTER_ID;

    try {
      if (!configured) {
        testInfo.annotations.push({
          type: "fixture",
          description: `site-settings.analytics.metrikaId empty → temporary TEST id ${counterId}`,
        });
        const update = await api.post("/api/globals/site-settings/", {
          analytics: { ...original, metrikaId: counterId },
        });
        expect(update.status(), `set metrikaId: ${await update.text()}`).toBe(200);
      }
      for (const path of PAGES) await waitForCounterInHtml(api, path, counterId);

      const traffic = await interceptMetrika(context);
      await page.setExtraHTTPHeaders(clientIpHeaders(uniqueTestIp(testInfo)));

      // Before the choice: nothing.
      await page.goto("/", { waitUntil: "load" });
      await waitHydrated(page, "/");
      await page.waitForTimeout(1_000);
      expect(traffic.urls, "before consent").toEqual([]);

      // «Принять» → tag.js, init with the counter id, one hit.
      await banner(page).getByRole("button", { name: "Принять" }).click();
      await expect(banner(page)).toBeHidden();
      await expect
        .poll(() => traffic.urls.some((url) => url.includes("/metrika/tag.js")))
        .toBe(true);
      await expect
        .poll(() => page.evaluate(() => Boolean((window as { __ymStub?: boolean }).__ymStub)))
        .toBe(true);
      const calls = await ymCalls(page);
      expect(calls.filter((call) => call[1] === "init")).toEqual([
        [Number(counterId), "init", expect.objectContaining({ defer: true })],
      ]);
      expect(calls.filter((call) => call[1] === "hit")).toHaveLength(1);

      // Remembered: after a reload no banner, the counter loads by itself.
      const before = traffic.urls.length;
      await page.reload({ waitUntil: "load" });
      await waitHydrated(page, "/");
      await expect(banner(page)).toHaveCount(0);
      await expect
        .poll(() => traffic.urls.slice(before).some((url) => url.includes("/metrika/tag.js")))
        .toBe(true);

      // click_phone / click_email: links are prevented after the tracker has seen the click.
      await page.evaluate(() =>
        document.addEventListener("click", (event) => {
          if ((event.target as Element).closest('a[href^="tel:"], a[href^="mailto:"]')) {
            event.preventDefault();
          }
        })
      );
      await page.locator('a[href^="tel:"]:visible').first().click();
      await page.locator('a[href^="mailto:"]:visible').first().click();
      await expect
        .poll(() => goalNames(page))
        .toEqual(expect.arrayContaining(["click_phone", "click_email"]));

      // calc_weight (debounced, after a change) and calc_to_quiz (CTA click).
      const tool = "/instrumenty/kalkulyator-vesa-stekla/";
      await page.goto(tool, { waitUntil: "load" });
      await waitHydrated(page, tool);
      await page.getByLabel("Ширина, мм").fill("1200");
      await page.getByLabel("Высота, мм").fill("2100");
      await page.getByLabel("Количество, шт.").fill("4");
      await expect.poll(() => goalNames(page), { timeout: 10_000 }).toContain("calc_weight");
      await page.evaluate(() =>
        document.addEventListener(
          "click",
          (event) => {
            if ((event.target as Element).closest("[data-testid=weight-cta]")) {
              event.preventDefault();
            }
          },
          { capture: true }
        )
      );
      await page.getByTestId("weight-cta").click();
      await expect.poll(() => goalNames(page)).toContain("calc_to_quiz");

      // quiz_start / quiz_step_1 / quiz_step_2 in the modal opened from the hub.
      const hub = "/zakalennoe-steklo/";
      await page.goto(hub, { waitUntil: "load" });
      await waitHydrated(page, hub);
      await page.locator('header a[href^="/raschet-stoimosti/?src="]:visible').first().click();
      const dialog = page.getByRole("dialog", { name: "Рассчитаем стоимость вашего заказа" });
      await expect(dialog).toBeVisible({ timeout: NAV_TIMEOUT });
      await expect.poll(() => goalNames(page)).toContain("quiz_start");
      const quiz = dialog.locator("[data-slot=quiz]");
      await quiz.getByRole("radio", { name: "Закалённое стекло" }).click();
      await quiz.getByRole("button", { name: "Далее", exact: true }).click();
      await expect.poll(() => goalNames(page)).toContain("quiz_step_1");
      await quiz
        .getByRole("radiogroup", { name: "Толщина" })
        .getByRole("radio", { name: /^10 мм/ })
        .click();
      await quiz.getByRole("button", { name: "Далее", exact: true }).click();
      await expect.poll(() => goalNames(page)).toContain("quiz_step_2");

      // Goals never carry the visitor's contacts.
      const serialized = JSON.stringify(await ymCalls(page));
      expect(serialized).not.toMatch(/\+7|@inex|mailto:|tel:/);
      await testInfo.attach("ym-calls.json", {
        body: JSON.stringify(await ymCalls(page), null, 2),
        contentType: "application/json",
      });
    } finally {
      if (!configured) {
        const restore = await api.post("/api/globals/site-settings/", { analytics: original });
        expect(restore.status(), `restore metrikaId: ${await restore.text()}`).toBe(200);
        // Serve the stale pages once more so other specs get the counter-free version.
        for (const path of PAGES) await waitForCounterInHtml(api, path, null);
      }
    }
  });
});
