import { gzipSync } from "node:zlib";
import { expect, test } from "@playwright/test";
import { VIEWPORTS } from "./helpers/viewports";
import { jsLimitFor, PERF_ROUTES, resolveRoutes } from "../scripts/perf/routes";
import type { PerfRoute } from "../scripts/perf/routes";
import type { Page, TestInfo } from "@playwright/test";

/**
 * Performance guard rails (task 39), run only with `PERF=1` against a PRODUCTION server
 * (`next build` + `next start`; dev chunks are unminified and every route compiles on demand):
 *
 *   PERF=1 E2E_BASE_URL=http://localhost:3139 E2E_SKIP_DB=1 pnpm test:e2e e2e/perf-budget.spec.ts
 *
 * - JS budget (phone, no consent): gzip of same-origin scripts ≤ `jsLimitFor(route)`; no
 *   third-party script before consent (Yandex Metrika is consent-gated).
 * - CLS from navigation to `load` + 3 s (shifts after input excluded) < 0.1, phone and desktop.
 * - The LCP photo of the home page is preloaded with `fetchpriority="high"`; exactly one image
 *   preload per page.
 * Lighthouse (LCP/TBT) is not part of the suite: `scripts/perf/lighthouse.ts`.
 */

const PERF_ENABLED = process.env.PERF === "1";
const CLS_LIMIT = 0.1;
/** Settling time after `load` for late shifts (fonts, lazy images, hydration). */
const CLS_SETTLE_MS = 3_000;
const NAVIGATION_TIMEOUT_MS = 120_000;

test.describe.configure({ timeout: 300_000 });

test.beforeEach(() => {
  test.skip(!PERF_ENABLED, "performance checks run only with PERF=1");
});

const isPhone = (testInfo: TestInfo) => testInfo.project.name === VIEWPORTS.mobile.name;

/** The route with its data-dependent path resolved, or a skip when the data is missing. */
async function resolve(route: PerfRoute, baseURL: string | undefined): Promise<PerfRoute> {
  const { routes, skipped } = await resolveRoutes(baseURL ?? "http://localhost:3000", route.id);
  const resolved = routes[0];
  test.skip(!resolved, skipped[0]?.reason ?? "маршрут не разрешён");
  return resolved!;
}

/** Sums `layout-shift` entries without recent input, as the CLS metric does (no windowing). */
async function installClsObserver(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const target = window as unknown as { __perfCls: number };
    target.__perfCls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as Array<
        PerformanceEntry & { value: number; hadRecentInput: boolean }
      >) {
        if (!entry.hadRecentInput) target.__perfCls += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
}

for (const route of PERF_ROUTES) {
  test.describe(`${route.template} (${route.id})`, () => {
    test("JS budget, no third-party scripts before consent", async ({ page, baseURL }, info) => {
      test.skip(!isPhone(info), "budget is measured on the phone profile only");
      const target = await resolve(route, baseURL);
      const origin = new URL(baseURL ?? "http://localhost:3000").origin;
      const bodies: Array<Promise<number>> = [];
      const thirdParty: string[] = [];

      page.on("response", (response) => {
        if (response.request().resourceType() !== "script") return;
        if (new URL(response.url()).origin !== origin) {
          thirdParty.push(response.url());
          return;
        }
        bodies.push(
          response
            .body()
            .then((body) => gzipSync(body, { level: 9 }).length)
            .catch(() => 0)
        );
      });

      const response = await page.goto(target.path, {
        waitUntil: "networkidle",
        timeout: NAVIGATION_TIMEOUT_MS,
      });
      expect(response?.status()).toBe(target.status ?? 200);

      const total = (await Promise.all(bodies)).reduce((sum, bytes) => sum + bytes, 0);
      const limit = jsLimitFor(target);
      expect(
        total,
        `${target.path}: ${(total / 1024).toFixed(1)} KB gzip > ${(limit / 1024).toFixed(1)} KB`
      ).toBeLessThanOrEqual(limit);
      expect(thirdParty, "third-party scripts before consent").toEqual([]);
    });

    test("CLS < 0.1 until load + 3 s", async ({ page, baseURL }, info) => {
      test.skip(info.project.name === VIEWPORTS.desktop.name, "phone and 1366 are enough");
      const target = await resolve(route, baseURL);
      await installClsObserver(page);
      await page.goto(target.path, { waitUntil: "load", timeout: NAVIGATION_TIMEOUT_MS });
      await page.waitForTimeout(CLS_SETTLE_MS);
      const cls = await page.evaluate(() => (window as unknown as { __perfCls: number }).__perfCls);
      expect(cls, `${target.path}: CLS ${cls.toFixed(3)}`).toBeLessThan(CLS_LIMIT);
    });
  });
}

test.describe("LCP image priority", () => {
  test("home hero photo: one high-priority image preload", async ({ request }, info) => {
    test.skip(info.project.name !== VIEWPORTS.laptop.name, "raw HTML, viewport-independent");
    const html = await (await request.get("/")).text();
    const preloads = html.match(/<link rel="preload" as="image"[^>]*>/g) ?? [];
    expect(preloads, "exactly one preloaded image").toHaveLength(1);
    expect(preloads[0]).toMatch(/fetchPriority="high"/i);
    // The hero <img> itself carries the same priority hint and is not lazy.
    const hero = html.match(/<img[^>]*fetchPriority="high"[^>]*>/gi) ?? [];
    expect(hero).toHaveLength(1);
    expect(hero[0]).not.toMatch(/loading="lazy"/);
  });
});
