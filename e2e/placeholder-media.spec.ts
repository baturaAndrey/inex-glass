import { expect as baseExpect, test, type Page } from "@playwright/test";
import { adminToken, skipOnMissingAdmin } from "./helpers/admin";
import { VIEWPORTS } from "./helpers/viewports";

/**
 * Temporary images (task 38): the generated placeholders uploaded by
 * `scripts/attach-generated-media.ts` render through `next/image` on the hero / card slots, no
 * image is broken, every `img` carries `alt`; the media list in the admin has the quick filter
 * «Временные изображения» with a counter and the «Временное» badge.
 *
 * Precondition: the seed (CI: `pnpm seed --full`), then
 * `pnpm payload run scripts/attach-generated-media.ts`. Without the attach step the pages
 * have no generated images and the page checks are skipped (the admin check still runs).
 *
 * The `/zakalennoe-steklo/` hub template has no photo slots by design (prototype): the data are
 * attached for editors, the page is only checked for broken images there.
 */

/** The shared dev server compiles routes on first hit and runs other specs meanwhile. */
const expect = baseExpect.configure({ timeout: 30_000 });

test.describe.configure({ timeout: 180_000 });

/** File names of generated uploads (`gen-<manifest id>`), as seen in `/_next/image?url=…`. */
const GENERATED = 'img[src*="/_next/image"][src*="gen-"]';

interface PageCase {
  path: string;
  /** Minimum number of generated images on the page. */
  min: number;
  /** Card images must have a meaningful (non-empty) alt. */
  cardAlt: boolean;
}

const PAGES: PageCase[] = [
  { path: "/", min: 10, cardAlt: true },
  { path: "/zakalennoe-steklo/matovoe/", min: 1, cardAlt: false },
  { path: "/steklyannye-konstrukcii/", min: 7, cardAlt: true },
  { path: "/osteklenie/", min: 5, cardAlt: true },
  { path: "/obrabotka-stekla/kromka/", min: 1, cardAlt: false },
  // Article cards use `alt=""` on purpose: the card title next to the image names it.
  { path: "/blog/", min: 6, cardAlt: false },
];

/** Scrolls every image into view (lazy loading) and returns those that failed to load. */
async function brokenImages(page: Page): Promise<string[]> {
  const images = page.locator("img");
  const count = await images.count();
  for (let index = 0; index < count; index++) {
    const image = images.nth(index);
    if (!(await image.isVisible())) continue;
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(() => image.evaluate((el: HTMLImageElement) => el.complete), { timeout: 30_000 })
      .toBe(true);
  }
  return page
    .locator("img")
    .evaluateAll((elements) =>
      (elements as HTMLImageElement[])
        .filter((el) => el.checkVisibility() && el.complete && el.naturalWidth === 0)
        .map((el) => el.currentSrc || el.src)
    );
}

for (const pageCase of PAGES) {
  test(`${pageCase.path}: generated images render with alt`, async ({ page }) => {
    const response = await page.goto(pageCase.path, { timeout: 120_000 });
    expect(response?.status()).toBe(200);

    const generated = page.locator(GENERATED);
    const total = await generated.count();
    test.skip(total === 0, "no generated images: run scripts/attach-generated-media.ts first");
    expect(total).toBeGreaterThanOrEqual(pageCase.min);

    expect(await brokenImages(page)).toEqual([]);

    // Every image has an alt attribute (empty only for decorative copies).
    const withoutAlt = await page
      .locator("img:not([alt])")
      .evaluateAll((elements) => elements.map((el) => (el as HTMLImageElement).src));
    expect(withoutAlt).toEqual([]);

    if (pageCase.cardAlt) {
      const cardAlts = await page
        .locator(`.ig-card ${GENERATED}`)
        .evaluateAll((elements) => elements.map((el) => el.getAttribute("alt") ?? ""));
      expect(cardAlts.length).toBeGreaterThan(0);
      expect(cardAlts.filter((alt) => alt.trim() === "")).toEqual([]);
    }
  });
}

test("/zakalennoe-steklo/: no broken images", async ({ page }) => {
  const response = await page.goto("/zakalennoe-steklo/", { timeout: 120_000 });
  expect(response?.status()).toBe(200);
  expect(await brokenImages(page)).toEqual([]);
  expect(await page.locator("img:not([alt])").count()).toBe(0);
});

test("admin media list: quick filter «Временные изображения» and the badge", async ({
  page,
  request,
}, testInfo) => {
  test.skip(testInfo.project.name !== VIEWPORTS.laptop.name, "Admin is checked at 1366 only");
  let token: string;
  try {
    token = await adminToken(request);
  } catch (error) {
    skipOnMissingAdmin(error);
    return;
  }
  const baseURL = testInfo.project.use.baseURL ?? "http://localhost:3000";
  await page.context().addCookies([{ name: "payload-token", value: token, url: baseURL }]);

  await page.goto("/admin/collections/media/", { timeout: 120_000 });
  const filter = page.locator('[data-quick-filter="placeholders"]');
  await expect(filter).toBeVisible({ timeout: 60_000 });
  await expect(filter).toHaveAttribute("href", /isPlaceholder.*equals.*=true/);
  const counter = filter.locator("[data-placeholder-count]");
  await expect(counter).toHaveText(/^\d[\d\s ]*$/);

  await filter.click();
  await expect(page).toHaveURL(/where(%5B|\[)isPlaceholder(%5D|\])(%5B|\[)equals(%5D|\])=true/);
  await expect(
    page.locator('[data-quick-filter="placeholders"][aria-current="true"]')
  ).toBeVisible();
  // Every row of the filtered list is a placeholder.
  const rows = page.locator(".table tbody tr");
  await expect(rows.first()).toBeVisible({ timeout: 60_000 });
  const rowCount = await rows.count();
  await expect(page.locator(".table tbody [data-placeholder-badge]")).toHaveCount(rowCount);
  await expect(page.locator(".table tbody [data-placeholder-badge]").first()).toHaveText(
    "Временное"
  );

  await page.locator('[data-quick-filter="all"]').click();
  await expect(page).not.toHaveURL(/isPlaceholder/);
});
