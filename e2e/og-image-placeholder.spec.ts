import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import sharp from "sharp";
import { skipOnMissingAdmin } from "./helpers/admin";
import { adminApi, deleteDocs } from "./helpers/admin-api";
import { VIEWPORTS } from "./helpers/viewports";
import type { AdminApi } from "./helpers/admin-api";
import type { Page } from "@playwright/test";

/**
 * Generated placeholder media (`isPlaceholder: true`, the `gen-*` uploads of
 * `scripts/attach-generated-media.ts`, task 38) never reach `og:image` / `twitter:image` /
 * JSON-LD `image`: `pickOgImage` (`src/lib/seo/og-image.ts`) skips them, and with no real image
 * left `buildMetadata` falls back to the site default `/og-default.jpg`.
 *
 * 1. Stand data: pages and articles that show attached `gen-*` images (skipped when the attach
 *    step did not run — a fresh CI seed has no generated media).
 * 2. Fixture (always runs when the e2e admin is available): a placeholder upload named `gen-…`
 *    plus a real upload, attached to two TEST articles through the REST API; removed afterwards.
 *    The articles are `noindex` so the IndexNow plugin never queues them.
 *
 * Meta tags do not depend on the viewport: the laptop project only.
 */

test.describe.configure({ timeout: 180_000 });
test.use({ navigationTimeout: 120_000 });

const DEFAULT_OG_PATH = "/og-default.jpg";
/** File name of a generated upload as it appears in a media URL. */
const GENERATED_FILE = /\/gen-[^/]*$/;

/** Pages whose hero / cards show attached placeholders (`e2e/placeholder-media.spec.ts`). */
const PAGES_WITH_PLACEHOLDERS = [
  "/",
  "/zakalennoe-steklo/matovoe/",
  "/steklyannye-konstrukcii/",
  "/osteklenie/",
  "/obrabotka-stekla/kromka/",
  "/blog/",
];

const FIXTURE_SLUG_PREFIX = "test-og-placeholder-";
const FIXTURE_MEDIA_PREFIX = "gen-e2e-og-";
const REAL_MEDIA_PREFIX = "e2e-og-real-";
/** Joins the JSON-LD scripts of a page; never occurs inside JSON text. */
const JSON_LD_SEPARATOR = "\u0000";

interface ShareImages {
  og: string[];
  twitter: string[];
  jsonLd: string;
}

/** `og:image`, `twitter:image` and the raw JSON-LD of the current page. */
async function shareImages(page: Page): Promise<ShareImages> {
  const content = (selector: string) =>
    page
      .locator(selector)
      .evaluateAll((elements) => elements.map((el) => el.getAttribute("content") ?? ""));
  return {
    og: await content('meta[property="og:image"]'),
    twitter: await content('meta[name="twitter:image"]'),
    jsonLd: (
      await page
        .locator('script[type="application/ld+json"]')
        .evaluateAll((elements) => elements.map((el) => el.textContent ?? ""))
    ).join(JSON_LD_SEPARATOR),
  };
}

/** Absolute URLs found under every JSON-LD `image` key (a string, a list, or `ImageObject.url`). */
function jsonLdImageUrls(jsonLd: string): string[] {
  const urls: string[] = [];
  const collect = (value: unknown): void => {
    if (typeof value === "string") {
      if (/^https?:\/\//.test(value)) urls.push(value);
    } else if (Array.isArray(value)) {
      value.forEach(collect);
    } else if (value && typeof value === "object") {
      const { url, contentUrl } = value as { url?: unknown; contentUrl?: unknown };
      collect(url);
      collect(contentUrl);
    }
  };
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) node.forEach(visit);
    else if (node && typeof node === "object") {
      for (const [key, value] of Object.entries(node)) {
        if (key === "image") collect(value);
        else visit(value);
      }
    }
  };
  for (const block of jsonLd.split(JSON_LD_SEPARATOR).filter(Boolean)) {
    try {
      visit(JSON.parse(block));
    } catch {
      // Not a JSON block of ours: ignore.
    }
  }
  return urls;
}

const pathnameOf = (url: string) => new URL(url).pathname;

function expectNoGenerated(images: ShareImages, where: string) {
  expect(images.og.length, `${where}: og:image present`).toBeGreaterThan(0);
  for (const url of [...images.og, ...images.twitter, ...jsonLdImageUrls(images.jsonLd)]) {
    expect(pathnameOf(url), `${where}: ${url}`).not.toMatch(GENERATED_FILE);
  }
}

test.describe("og:image never shows a placeholder", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== VIEWPORTS.laptop.name,
      "Meta tags do not depend on the viewport"
    );
  });

  test("stand data: pages and articles with attached gen-* images", async ({ page, request }) => {
    // Articles whose cover is a placeholder (public REST: published articles, media are public).
    const response = await request.get(
      "/api/articles/?depth=0&limit=5&where[heroImage.isPlaceholder][equals]=true"
    );
    expect(response.status()).toBe(200);
    const { docs } = (await response.json()) as { docs: Array<{ path?: string | null }> };
    const articlePaths = docs.map((doc) => doc.path).filter((path): path is string => !!path);

    let generatedSeen = 0;
    for (const path of [...PAGES_WITH_PLACEHOLDERS, ...articlePaths]) {
      const visit = await page.goto(path);
      expect(visit?.status(), path).toBe(200);
      generatedSeen += await page.locator('img[src*="/_next/image"][src*="gen-"]').count();
      expectNoGenerated(await shareImages(page), path);
    }
    test.skip(
      generatedSeen === 0 && articlePaths.length === 0,
      "no generated images on this stand: run scripts/attach-generated-media.ts (fixture test covers it)"
    );
  });

  test.describe("fixture: placeholder attached to TEST articles", () => {
    const created = { articles: [] as string[], media: [] as string[] };
    const suffix = randomUUID().slice(0, 8);

    /** Removes this run's documents and leftovers of an interrupted run. */
    async function cleanup(admin: AdminApi) {
      const leftovers = async (collection: string, field: string, prefix: string) => {
        const list = await admin.get(
          `/api/${collection}/?depth=0&limit=100&where[${field}][like]=${encodeURIComponent(prefix)}`
        );
        if (!list.ok()) return [];
        return ((await list.json()) as { docs: Array<{ id: string }> }).docs.map((doc) => doc.id);
      };
      const articles = new Set([
        ...created.articles,
        ...(await leftovers("articles", "slug", FIXTURE_SLUG_PREFIX)),
      ]);
      await deleteDocs(admin, "articles", articles);
      const media = new Set([
        ...created.media,
        ...(await leftovers("media", "filename", FIXTURE_MEDIA_PREFIX)),
        ...(await leftovers("media", "filename", REAL_MEDIA_PREFIX)),
      ]);
      await deleteDocs(admin, "media", media);
    }

    async function upload(
      admin: AdminApi,
      name: string,
      isPlaceholder: boolean
    ): Promise<{ id: string; url: string; filename: string }> {
      const buffer = await sharp({
        create: { width: 1200, height: 630, channels: 3, background: { r: 60, g: 90, b: 120 } },
      })
        .jpeg({ quality: 70 })
        .toBuffer();
      const response = await admin.request.post("/api/media/", {
        headers: admin.headers(),
        multipart: {
          file: { name, mimeType: "image/jpeg", buffer },
          _payload: JSON.stringify({
            alt: `TEST og:image ${isPlaceholder ? "placeholder" : "real"}`,
            kind: isPlaceholder ? "illustration" : "photo",
            isPlaceholder,
          }),
        },
      });
      expect(response.status(), `upload ${name}: ${await response.text()}`).toBe(201);
      const doc = (
        (await response.json()) as { doc: { id: string; url: string; filename: string } }
      ).doc;
      created.media.push(doc.id);
      return doc;
    }

    async function createArticle(
      admin: AdminApi,
      slug: string,
      images: { seo: string; hero: string; card: string }
    ): Promise<string> {
      const text = (value: string) => ({
        root: {
          type: "root",
          format: "",
          indent: 0,
          version: 1,
          direction: null,
          children: [
            {
              type: "paragraph",
              format: "",
              indent: 0,
              version: 1,
              direction: null,
              textFormat: 0,
              children: [
                {
                  type: "text",
                  text: value,
                  format: 0,
                  detail: 0,
                  mode: "normal",
                  style: "",
                  version: 1,
                },
              ],
            },
          ],
        },
      });
      const response = await admin.post("/api/articles/", {
        title: `TEST og:image ${slug}`,
        slug,
        _status: "published",
        datePublished: new Date().toISOString(),
        body: text("TEST: статья для проверки og:image, удаляется после прогона."),
        heroImage: images.hero,
        card: { image: images.card },
        // `noindex`: not indexable → the IndexNow plugin queues nothing for this TEST article.
        seo: { noindex: true, ogImage: images.seo },
      });
      expect(response.status(), `create article: ${await response.text()}`).toBe(201);
      const id = ((await response.json()) as { doc: { id: string } }).doc.id;
      created.articles.push(id);
      return id;
    }

    test("placeholder candidates are skipped: real image or the default og image", async ({
      page,
      request,
    }) => {
      let api: AdminApi;
      try {
        api = await adminApi(request);
      } catch (error) {
        skipOnMissingAdmin(error);
        return;
      }
      await cleanup(api);
      // Cleanup inside the test: the test-scoped `request` is gone by `afterAll`.
      try {
        await checkFixtures(api, page);
      } finally {
        await cleanup(api);
      }
    });

    async function checkFixtures(api: AdminApi, page: Page) {
      const placeholder = await upload(api, `${FIXTURE_MEDIA_PREFIX}${suffix}.jpg`, true);
      const real = await upload(api, `${REAL_MEDIA_PREFIX}${suffix}.jpg`, false);
      // The upload of the fixture really is a `gen-*` file: the URL assertions below mean it.
      expect(pathnameOf(new URL(placeholder.url, "http://x").href)).toMatch(GENERATED_FILE);

      // A: every candidate is the placeholder → the site default image.
      const onlyPlaceholders = `${FIXTURE_SLUG_PREFIX}only-${suffix}`;
      await createArticle(api, onlyPlaceholders, {
        seo: placeholder.id,
        hero: placeholder.id,
        card: placeholder.id,
      });
      // B: SEO image and cover are placeholders, the card image is real → the real one.
      const withReal = `${FIXTURE_SLUG_PREFIX}real-${suffix}`;
      await createArticle(api, withReal, {
        seo: placeholder.id,
        hero: placeholder.id,
        card: real.id,
      });

      const visitA = await page.goto(`/blog/${onlyPlaceholders}/`);
      expect(visitA?.status()).toBe(200);
      const a = await shareImages(page);
      expectNoGenerated(a, "only placeholders");
      expect(a.og.map(pathnameOf)).toEqual([DEFAULT_OG_PATH]);
      expect(a.twitter.map(pathnameOf)).toEqual([DEFAULT_OG_PATH]);
      expect(a.jsonLd).not.toContain(placeholder.filename);

      const visitB = await page.goto(`/blog/${withReal}/`);
      expect(visitB?.status()).toBe(200);
      const b = await shareImages(page);
      expectNoGenerated(b, "with a real card image");
      expect(b.og.map(pathnameOf)).toEqual([pathnameOf(new URL(real.url, "http://x").href)]);
      expect(b.jsonLd).not.toContain(placeholder.filename);
      expect(jsonLdImageUrls(b.jsonLd).map(pathnameOf)).toContain(
        pathnameOf(new URL(real.url, "http://x").href)
      );
    }
  });
});
