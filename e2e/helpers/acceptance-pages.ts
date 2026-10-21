import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

/**
 * Representative pages of the acceptance a11y / visual passes (task 42): one URL per page
 * template of the site, taken from the URL registry (`scripts/perf/routes.ts`,
 * `docs/inex/17-meta.md`). Data-dependent pages (object card, order page) are created by the
 * specs themselves.
 */

export interface AcceptancePage {
  /** Stable id: file names of screenshots, report rows. */
  id: string;
  path: string;
  /** Expected document status. */
  status: number;
  /**
   * «Рассчитать стоимость» must be visible in the first viewport (ТЗ §2.2). Not on the quiz page
   * itself (it IS the calculation) and not on `/zakaz/*`.
   */
  ctaInFirstScreen: boolean;
}

export const CTA_LABEL = "Рассчитать стоимость";

export const QUIZ_PATH = "/raschet-stoimosti/";
export const SEARCH_PATH = `/poisk/?q=${encodeURIComponent("стекло")}`;
export const NOT_FOUND_PATH = "/net-takoj-stranicy-priemka/";

const page = (id: string, path: string, extra: Partial<AcceptancePage> = {}): AcceptancePage => ({
  id,
  path,
  status: 200,
  ctaInFirstScreen: true,
  ...extra,
});

/** Pages common to the a11y and visual passes. */
export const ACCEPTANCE_PAGES: readonly AcceptancePage[] = [
  page("home", "/"),
  page("zak-hub", "/zakalennoe-steklo/"),
  page("thickness-10", "/zakalennoe-steklo/10-mm/"),
  page("glass-matovoe", "/zakalennoe-steklo/matovoe/"),
  page("holes", "/obrabotka-stekla/otverstiya-i-vyrezy/"),
  page("construction-partitions", "/steklyannye-peregorodki/"),
  page("how-to-order", "/kak-zakazat/"),
  page("objects", "/obekty/"),
  page("article", "/blog/kak-vybrat-tolshchinu-stekla/"),
  page("weight-calc", "/instrumenty/kalkulyator-vesa-stekla/"),
  page("quiz-page", QUIZ_PATH, { ctaInFirstScreen: false }),
  page("contacts", "/kontakty/"),
  page("not-found", NOT_FOUND_PATH, { status: 404 }),
  page("search", SEARCH_PATH),
];

/** Extra pages of the visual pass only. */
export const VISUAL_EXTRA_PAGES: readonly AcceptancePage[] = [
  page("thickness-19", "/zakalennoe-steklo/19-mm/"),
];

const CONSENT_KEY = "inex-consent-v1";

/**
 * Stores a cookie choice before any page script runs. `necessary` hides the banner without
 * loading Metrika (screenshots and focus checks are not covered by the banner).
 */
export async function presetConsent(page: Page, value: "all" | "necessary"): Promise<void> {
  await page.addInitScript(
    ({ key, choice }) => {
      try {
        window.localStorage.setItem(key, choice);
      } catch {
        // Storage blocked: the banner simply stays.
      }
    },
    { key: CONSENT_KEY, choice: value }
  );
}

/** Opens a page and checks its status; waits for the main heading (hydration of the shell). */
export async function openPage(page: Page, target: AcceptancePage): Promise<void> {
  const response = await page.goto(target.path, { waitUntil: "load" });
  expect(response?.status(), `${target.path} status`).toBe(target.status);
  await expect(page.locator("h1").first()).toBeVisible({ timeout: 30_000 });
}

/**
 * Scrolls through the page so lazy images and `whileInView` content load, then back to the top.
 */
export async function scrollThrough(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const step = Math.max(200, Math.floor(window.innerHeight * 0.8));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo({ top: y, behavior: "instant" });
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    window.scrollTo({ top: 0, behavior: "instant" });
  });
}
