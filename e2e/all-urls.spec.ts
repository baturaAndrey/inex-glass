import { expect, test } from "@playwright/test";
import { E2E_BASE_URL } from "./helpers/env";
import { clientIpHeaders, uniqueTestIp } from "./helpers/test-ip";
import { VIEWPORTS } from "./helpers/viewports";
import {
  discoverListing,
  isNoindexPath,
  NO_CANONICAL_PATHS,
  NOT_FOUND_PATH,
  orderPath,
  P0_PATHS,
  parseSitemapLocs,
  pathOnly,
  registryPaths,
  SERVICE_PATHS,
  TEAM_PATH,
} from "../scripts/audit/urls";
import type { APIRequestContext, Page, TestInfo } from "@playwright/test";

/**
 * Every URL of the site at 375 / 1366 / 1920 (task 40, §5): 200 without redirects, one H1,
 * title / description / lang, «Рассчитать стоимость» on the first screen, no horizontal scroll
 * (375), no console errors or failing own requests, no unexpanded `{…}` markers, loaded images
 * with alt, robots and canonical.
 *
 * URL sources (`scripts/audit/urls.ts`, shared with the audit scripts):
 * - one test per URL × project for the 17-meta registry (expanded `{N}`), the service pages and
 *   — with `AUDIT_ORDER_TOKEN` — an order page. These are known at collection time;
 * - one test per project for the rest of the sitemap and the published objects / articles linked
 *   from `/obekty/` and `/blog/` (the sitemap is empty outside production), one `test.step` each:
 *   the list only exists once the server runs, after test collection.
 *
 * Seeds: the suite is meant for a PRODUCTION build (`next start`) on a fully seeded throwaway
 * database (`pnpm seed --full`). On a minimal seed, non-P0 URLs answering 404 are skipped; P0 URLs
 * (home, hub, 8 thicknesses, quiz, «Как заказать» + 5 service pages, company, contacts, policy)
 * never are.
 *
 * Robots: detected from the home page — outside production every page is `noindex` and the
 * per-page matrix is not checkable; with `SITE_ENV=production` the matrix of task 40 §3.5 applies.
 */

const CTA_NAME = /Рассчитать стоимость/i;
/** No CTA by design: the simplified order header, the quiz page itself. */
const CTA_EXCEPTIONS = [/^\/zakaz\//, /^\/raschet-stoimosti\/$/];
const PLACEHOLDER = /\{[^{}\s][^{}]*\}/;
const BROKEN_VALUES = /\bundefined\b|\bNaN\b|\[object Object\]/;
const NOT_FOUND_H1 = "Страница не найдена";

/** One page per template gets a first-screen screenshot as an artifact (no pixel comparison). */
const SCREENSHOT_PATHS = new Set([
  "/",
  "/zakalennoe-steklo/",
  "/zakalennoe-steklo/10-mm/",
  "/zakalennoe-steklo/matovoe/",
  "/tripleks/",
  "/obrabotka-stekla/kromka/",
  "/furnitura/",
  "/steklyannye-peregorodki/",
  "/osteklenie/fasadov/",
  "/zerkala/dlya-zalov/",
  "/kak-zakazat/",
  "/kak-zakazat/dopuski-i-gost/",
  "/raschet-stoimosti/",
  "/klientam/podryadchikam/",
  "/obekty/",
  "/blog/",
  "/blog/kak-vybrat-tolshchinu-stekla/",
  "/instrumenty/kalkulyator-vesa-stekla/",
  "/o-kompanii/",
  "/kontakty/",
  "/politika-konfidencialnosti/",
  "/poisk/?q=стекло",
]);

const order = orderPath();
const STATIC_PATHS: string[] = [
  ...new Set([...registryPaths(), ...SERVICE_PATHS, ...(order ? [order] : [])]),
];
const P0 = new Set(P0_PATHS);

// Each test opens a page, scrolls it and waits for lazy images: generous for cold ISR renders.
test.describe.configure({ mode: "parallel", timeout: 90_000 });

/**
 * Staging is behind basic auth: `STAGING_BASIC_AUTH=user:pass` (split at the FIRST colon, the
 * password may contain more) → `httpCredentials` of the browser and the `request` fixture. Bound
 * to the stand's origin (`E2E_BASE_URL`) so the credentials never reach third-party hosts. The
 * listing discovery (`discoverListing` → `fetchPage`) reads the same env var itself.
 */
function stagingCredentials() {
  const raw = process.env.STAGING_BASIC_AUTH?.trim();
  const separator = raw ? raw.indexOf(":") : -1;
  if (!raw || separator <= 0) return null;
  return {
    username: raw.slice(0, separator),
    password: raw.slice(separator + 1),
    ...(E2E_BASE_URL ? { origin: new URL(E2E_BASE_URL).origin } : {}),
  };
}

const credentials = stagingCredentials();
if (credentials) test.use({ httpCredentials: credentials });

/**
 * Pages with a form fetch `/api/form-token/` (rate-limited per client IP): every test gets its
 * own documentation-range `X-Forwarded-For`, also passed on the test's `request` calls, so the
 * suite never shares (and exhausts) the server's `unknown` bucket.
 */
let testIp = "";
test.beforeEach(async ({ page }, testInfo) => {
  testIp = uniqueTestIp(testInfo);
  await page.setExtraHTTPHeaders(clientIpHeaders(testIp));
});

let productionStand: Promise<boolean> | null = null;

/** `true` when the home page is indexable (a production stand). */
function isProductionStand(request: APIRequestContext): Promise<boolean> {
  productionStand ??= (async () => {
    if (process.env.SITE_ENV) return process.env.SITE_ENV === "production";
    const html = await (await request.get("/")).text();
    const robots = /<meta name="robots" content="([^"]*)"/.exec(html)?.[1] ?? "";
    return !robots.includes("noindex");
  })();
  return productionStand;
}

let teamEmpty: Promise<boolean | null> | null = null;

function isTeamEmpty(request: APIRequestContext): Promise<boolean | null> {
  teamEmpty ??= (async () => {
    const response = await request.get("/api/team/?limit=1&depth=0");
    if (!response.ok()) return null;
    return (((await response.json()) as { totalDocs?: number }).totalDocs ?? 0) === 0;
  })();
  return teamEmpty;
}

interface PageWatch {
  consoleErrors: string[];
  failedRequests: string[];
}

function watchPage(page: Page, origin: string): PageWatch {
  const watch: PageWatch = { consoleErrors: [], failedRequests: [] };
  page.on("console", (message) => {
    if (message.type() === "error") watch.consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => watch.consoleErrors.push(`pageerror: ${error.message}`));
  page.on("response", (response) => {
    const url = response.url();
    if (url.startsWith(origin) && response.status() >= 400) {
      watch.failedRequests.push(`${response.status()} ${url}`);
    }
  });
  return watch;
}

/** At least one visible «Рассчитать стоимость» link/button intersects the first screen. */
async function ctaOnFirstScreen(page: Page): Promise<boolean> {
  const viewportHeight = page.viewportSize()?.height ?? 0;
  const candidates = page
    .getByRole("link", { name: CTA_NAME })
    .or(page.getByRole("button", { name: CTA_NAME }));
  const count = await candidates.count();
  for (let i = 0; i < count; i += 1) {
    const candidate = candidates.nth(i);
    if (!(await candidate.isVisible())) continue;
    const box = await candidate.boundingBox();
    if (box && box.width > 0 && box.y + box.height > 0 && box.y < viewportHeight) return true;
  }
  return false;
}

/**
 * Attribute of the first match, or `null` when the element is absent (`locator.getAttribute`
 * would wait for the element until the test times out).
 */
async function headAttr(page: Page, selector: string, name: string): Promise<string | null> {
  const locator = page.locator(selector).first();
  return (await locator.count()) > 0 ? locator.getAttribute(name) : null;
}

/** How long one image may take to load after it was scrolled into view. */
const IMAGE_LOAD_TIMEOUT_MS = 8_000;

interface MainImage {
  src: string;
  alt: string | null;
  /** Rendered (has a layout box) and scrolled into view: its load state is meaningful. */
  inView: boolean;
  loaded: boolean;
}

/**
 * Every `<img>` in `<main>`, each scrolled into view first (both axes — card rails scroll
 * horizontally) and given time to load: `loading="lazy"` only fetches an image near the
 * viewport, so a page-level scroll alone leaves off-screen rail cards at `complete = false`.
 * Images without a layout box (closed lightbox / drawer, `display: none` alternates) cannot be
 * scrolled into view: they report `inView = false` and are checked for `alt` only.
 */
async function collectMainImages(page: Page): Promise<MainImage[]> {
  const images = await page.locator("main img").evaluateAll(async (nodes, timeoutMs) => {
    const settle = (img: HTMLImageElement) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            const done = () => resolve();
            img.addEventListener("load", done, { once: true });
            img.addEventListener("error", done, { once: true });
            setTimeout(done, timeoutMs);
          });
    const result = [];
    for (const node of nodes) {
      const img = node as HTMLImageElement;
      const rendered = img.getClientRects().length > 0;
      if (rendered) {
        img.scrollIntoView({ block: "center", inline: "center" });
        await settle(img);
      }
      result.push({
        src: img.currentSrc || img.src,
        alt: img.getAttribute("alt"),
        inView: rendered,
        loaded: img.complete && img.naturalWidth > 0,
      });
    }
    window.scrollTo(0, 0);
    return result;
  }, IMAGE_LOAD_TIMEOUT_MS);
  await page.waitForLoadState("networkidle").catch(() => undefined);
  return images;
}

/**
 * All per-URL checks. Returns `"skipped"` for a non-P0 URL missing on a minimal seed. Soft
 * assertions: one URL reports every failed check at once.
 */
async function checkUrl(
  page: Page,
  request: APIRequestContext,
  path: string,
  testInfo: TestInfo,
  opts: { mayBeMissing: boolean }
): Promise<"ok" | "skipped"> {
  const origin = new URL(testInfo.project.use.baseURL ?? "http://localhost").origin;
  const watch = watchPage(page, origin);
  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  expect(response, `${path}: no response`).not.toBeNull();
  if (!response) return "ok";

  const status = response.status();
  const h1Text = (
    await page
      .locator("h1")
      .first()
      .textContent()
      .catch(() => null)
  )?.trim();
  if ((status === 404 || h1Text === NOT_FOUND_H1) && opts.mayBeMissing) return "skipped";

  // 1. 200, no redirect, HTML.
  expect.soft(status, `${path}: HTTP status`).toBe(200);
  expect
    .soft(new URL(page.url()).pathname, `${path}: redirected`)
    .toBe(new URL(path, origin).pathname);
  expect.soft(response.headers()["content-type"] ?? "").toContain("text/html");

  // 2. Exactly one non-empty H1.
  await expect.soft(page.locator("h1"), `${path}: H1 count`).toHaveCount(1);
  expect.soft(h1Text ?? "", `${path}: empty H1`).not.toBe("");

  // 3. Title, description, lang.
  const title = (await page.title()).trim();
  expect.soft(title, `${path}: title`).not.toBe("");
  expect
    .soft(title, `${path}: default title`)
    .not.toMatch(/^(Create Next App|Payload|Inex Glass)$/);
  const description = await headAttr(page, 'meta[name="description"]', "content");
  expect.soft(description?.trim() ?? "", `${path}: meta description`).not.toBe("");
  expect.soft(await page.locator("html").getAttribute("lang")).toBe("ru");

  // 4. CTA on the first screen, before any scrolling.
  if (!CTA_EXCEPTIONS.some((pattern) => pattern.test(pathOnly(path)))) {
    expect
      .soft(await ctaOnFirstScreen(page), `${path}: «Рассчитать стоимость» on screen 1`)
      .toBe(true);
  }

  // 5. No horizontal scroll at 375.
  if (testInfo.project.name === VIEWPORTS.mobile.name) {
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect.soft(overflow, `${path}: horizontal scroll at 375 (px)`).toBeLessThanOrEqual(0);
  }

  if (SCREENSHOT_PATHS.has(path)) {
    await testInfo.attach(`${pathOnly(path).replace(/\//g, "_") || "home"}-first-screen`, {
      body: await page.screenshot(),
      contentType: "image/png",
    });
  }

  // 7. Unexpanded markers and broken values in <main>.
  const mainText =
    (await page
      .locator("main")
      .innerText()
      .catch(() => "")) ?? "";
  expect.soft(PLACEHOLDER.exec(mainText)?.[0] ?? null, `${path}: unexpanded marker`).toBeNull();
  expect.soft(BROKEN_VALUES.exec(mainText)?.[0] ?? null, `${path}: broken value`).toBeNull();

  // 8. Images in <main> with alt; loaded once scrolled into view (hidden ones: alt only).
  const images = await collectMainImages(page);
  for (const image of images) {
    expect.soft(image.alt, `${path}: <img> without alt (${image.src})`).not.toBeNull();
    if (image.inView) {
      expect.soft(image.loaded, `${path}: image not loaded (${image.src})`).toBe(true);
    }
  }

  // 9. Robots and canonical.
  const robots = (await headAttr(page, 'meta[name="robots"]', "content")) ?? "";
  if (await isProductionStand(request)) {
    const clean = pathOnly(path);
    const mustNoindex =
      isNoindexPath(path) ||
      (clean === "/obekty/" && path.includes("?")) ||
      (clean === TEAM_PATH && (await isTeamEmpty(request)) === true);
    if (mustNoindex) expect.soft(robots, `${path}: robots`).toMatch(/noindex,\s*follow/);
    else expect.soft(robots, `${path}: robots`).not.toContain("noindex");
  } else {
    expect.soft(robots, `${path}: non-production stand must be noindex`).toContain("noindex");
  }
  const canonical = await headAttr(page, 'link[rel="canonical"]', "href");
  // `/poisk/` has no canonical on purpose (noindex + `Disallow: /poisk/`, every query is its
  // own result set): NO_CANONICAL_PATHS of the audit URL list. A present one is still checked.
  if (!NO_CANONICAL_PATHS.has(pathOnly(path))) {
    expect.soft(canonical ?? "", `${path}: canonical`).toMatch(/^https?:\/\//);
  }
  if (canonical) {
    const url = new URL(canonical);
    expect.soft(url.pathname, `${path}: canonical path`).toBe(pathOnly(path));
    expect.soft(url.search, `${path}: canonical query`).toBe("");
  }

  // 6. Console errors and failing own requests (collected over the whole visit).
  expect.soft(watch.consoleErrors, `${path}: console errors`).toEqual([]);
  expect.soft(watch.failedRequests, `${path}: failing requests`).toEqual([]);
  return "ok";
}

test.describe("all URLs: registry and service pages", () => {
  for (const path of STATIC_PATHS) {
    test(path, async ({ page, request }, testInfo) => {
      const outcome = await checkUrl(page, request, path, testInfo, {
        mayBeMissing: !P0.has(path),
      });
      test.skip(outcome === "skipped", `${path} is not in this seed (not P0)`);
    });
  }
});

test.describe("all URLs: sitemap and listings", () => {
  test("every published URL outside the registry", async ({ page, request }, testInfo) => {
    test.setTimeout(15 * 60_000);
    const sitemap = await request.get("/sitemap.xml", { headers: clientIpHeaders(testIp) });
    const fromSitemap = sitemap.ok() ? parseSitemapLocs(await sitemap.text()) : [];
    const baseURL = testInfo.project.use.baseURL ?? "";
    const fromListings = [
      ...(await discoverListing(baseURL, "/obekty/")),
      ...(await discoverListing(baseURL, "/blog/")),
    ];
    const known = new Set(STATIC_PATHS);
    const extra = [...new Set([...fromSitemap, ...fromListings])].filter((p) => !known.has(p));
    testInfo.annotations.push({ type: "urls", description: `${extra.length} extra URL` });
    for (const path of extra) {
      // A URL from the sitemap or a listing is published: it must not be missing.
      await test.step(path, async () => {
        // Hundreds of pages in one test: a fresh client IP per URL keeps each under the limit.
        await page.setExtraHTTPHeaders(clientIpHeaders(uniqueTestIp(testInfo)));
        await checkUrl(page, request, path, testInfo, { mayBeMissing: false });
      });
    }
  });
});

test.describe("all URLs: special cases", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== VIEWPORTS.laptop.name, "HTTP-level, viewport-independent");
  });

  test(`${NOT_FOUND_PATH} → 404 page with search, sections and the header CTA`, async ({
    page,
  }) => {
    const response = await page.goto(NOT_FOUND_PATH);
    const isDev = (await page.content()).includes("next-devtools");
    if (!isDev) expect(response?.status()).toBe(404);
    await expect(page.locator("h1")).toHaveText(NOT_FOUND_H1);
    await expect(page.locator('main form[role="search"] input[name="q"]')).toBeVisible();
    await expect(page.locator('main nav[aria-label="Разделы сайта"] a').first()).toBeVisible();
    expect(await ctaOnFirstScreen(page)).toBe(true);
  });

  test("/Zakalennoe-Steklo/ → 301 to lower case", async ({ request }) => {
    const response = await request.get("/Zakalennoe-Steklo/", {
      maxRedirects: 0,
      headers: clientIpHeaders(testIp),
    });
    expect(response.status()).toBe(301);
    expect(new URL(response.headers().location ?? "", "http://x").pathname).toBe(
      "/zakalennoe-steklo/"
    );
  });

  test("/zakalennoe-steklo → 301/308 to the trailing-slash URL", async ({ request }) => {
    const response = await request.get("/zakalennoe-steklo", {
      maxRedirects: 0,
      headers: clientIpHeaders(testIp),
    });
    expect([301, 308]).toContain(response.status());
    expect(new URL(response.headers().location ?? "", "http://x").pathname).toBe(
      "/zakalennoe-steklo/"
    );
  });

  test("/obekty/?product=x → 200, noindex, canonical /obekty/", async ({ page }) => {
    const response = await page.goto("/obekty/?product=x");
    expect(response?.status()).toBe(200);
    expect(await page.locator('meta[name="robots"]').getAttribute("content")).toContain("noindex");
    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(new URL(canonical ?? "http://x/none").pathname).toBe("/obekty/");
    expect(new URL(canonical ?? "http://x/none").search).toBe("");
  });
});
