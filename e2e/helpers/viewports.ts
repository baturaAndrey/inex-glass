/**
 * Viewport widths the site is verified at (prototypes are drawn at 375 / 1366 / 1920).
 * Playwright projects in `playwright.config.ts` are built from these, and slice specs can
 * use them for per-width screenshots:
 *
 *   await expect(page).toHaveScreenshot("home.png", { fullPage: true });
 *
 * (`animations: "disabled"` and `maxDiffPixelRatio` are preset in `playwright.config.ts`.)
 */
export const VIEWPORTS = {
  mobile: { name: "mobile-375", width: 375, height: 812 },
  laptop: { name: "desktop-1366", width: 1366, height: 768 },
  desktop: { name: "desktop-1920", width: 1920, height: 1080 },
} as const;

export type ViewportKey = keyof typeof VIEWPORTS;

export type ViewportProjectName = (typeof VIEWPORTS)[ViewportKey]["name"];
