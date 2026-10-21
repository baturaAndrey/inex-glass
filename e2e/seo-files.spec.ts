import { expect, test } from "@playwright/test";
import { VIEWPORTS } from "./helpers/viewports";
import type { APIRequestContext } from "@playwright/test";

/**
 * Technical SEO files (task 36): `/robots.txt`, `/sitemap.xml`, the IndexNow key file and the
 * search-console verification tags. Raw HTTP checks, one project only.
 *
 * The full assertions need a PRODUCTION-like server (`SITE_ENV=production`, `next start`):
 *
 *   SITE_ENV=production INDEXNOW_KEY=<32 hex> pnpm exec next start -p 3136   # + DB / secrets
 *   E2E_BASE_URL=http://localhost:3136 E2E_SKIP_DB=1 INDEXNOW_KEY=<same> pnpm test:e2e seo-files
 *
 * Against staging / dev (the default e2e server) the closed variants are asserted instead
 * (`Disallow: /`, empty `urlset`). The environment is detected from `robots.txt`.
 * Optional: `INDEXNOW_KEY` (key file test) and `E2E_YANDEX_VERIFICATION` /
 * `E2E_GOOGLE_VERIFICATION` (the tokens stored in `site-settings` of the tested database).
 */

const INDEXNOW_KEY = process.env.INDEXNOW_KEY;
const YANDEX_TOKEN = process.env.E2E_YANDEX_VERIFICATION;
const GOOGLE_TOKEN = process.env.E2E_GOOGLE_VERIFICATION;
const UNKNOWN_KEY = "00000000000000000000000000000000";

/** Production robots.txt carries the Yandex `Clean-param`; closed stands only `Disallow: /`. */
async function isProductionStand(request: APIRequestContext): Promise<boolean> {
  const body = await (await request.get("/robots.txt", { maxRedirects: 0 })).text();
  return body.includes("Clean-param:");
}

test.describe("SEO files", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== VIEWPORTS.laptop.name,
      "Raw HTTP checks do not depend on the viewport"
    );
  });

  test("/robots.txt answers 200 without a redirect", async ({ request }) => {
    const response = await request.get("/robots.txt", { maxRedirects: 0 });
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/plain");
    const body = await response.text();

    if (await isProductionStand(request)) {
      expect(body).toContain("Disallow: /zakaz/");
      expect(body).toContain("Disallow: /admin/");
      expect(body).toContain("Clean-param: utm_source&");
      expect(body).toMatch(/^Sitemap: https?:\/\/[^\s]+\/sitemap\.xml$/m);
      expect(body).not.toMatch(/^Disallow: \/$/m);
    } else {
      expect(body).toBe("User-agent: *\nDisallow: /\n");
    }
  });

  test("/sitemap.xml answers 200 XML with indexable pages only", async ({ request }) => {
    const response = await request.get("/sitemap.xml", { maxRedirects: 0 });
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/xml");
    const xml = await response.text();
    expect(xml).toContain("<urlset");

    if (!(await isProductionStand(request))) {
      expect(xml).not.toContain("<url>");
      return;
    }
    expect(xml).toContain("/zakalennoe-steklo/10-mm/</loc>");
    expect(xml).toContain("<lastmod>");
    for (const excluded of [
      "/zakalennoe-steklo/5-mm/",
      "/zakalennoe-steklo/15-mm/",
      "/zakalennoe-steklo/19-mm/",
      "/poisk/",
      "/politika-konfidencialnosti/",
      "/zakaz/",
    ]) {
      expect(xml).not.toContain(`${excluded}</loc>`);
    }
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1] ?? "");
    expect(locs.length).toBeGreaterThan(1);
    for (const loc of locs) {
      expect(loc).not.toContain("?");
      expect(loc.endsWith("/")).toBe(true);
    }
  });

  test("IndexNow key file: the key answers 200, an unknown key 404", async ({ request }) => {
    const unknown = await request.get(`/${UNKNOWN_KEY}.txt`, { maxRedirects: 0 });
    expect(unknown.status()).toBe(404);

    test.skip(!INDEXNOW_KEY, "INDEXNOW_KEY is not set for this run");
    const response = await request.get(`/${INDEXNOW_KEY}.txt`, { maxRedirects: 0 });
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/plain");
    expect(await response.text()).toBe(INDEXNOW_KEY);
  });

  test("verification meta tags are on the home page only", async ({ request }) => {
    test.skip(!YANDEX_TOKEN || !GOOGLE_TOKEN, "verification tokens are not configured");
    test.skip(!(await isProductionStand(request)), "verification tags are production-only");

    const home = await (await request.get("/")).text();
    expect(home).toContain(`<meta name="yandex-verification" content="${YANDEX_TOKEN}"`);
    expect(home).toContain(`<meta name="google-site-verification" content="${GOOGLE_TOKEN}"`);

    const contacts = await (await request.get("/kontakty/")).text();
    expect(contacts).not.toContain("yandex-verification");
    expect(contacts).not.toContain("google-site-verification");
  });
});
