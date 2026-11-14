import localFont from "next/font/local";

/**
 * Rubik 400–700, self-hosted WOFF2 subsets (latin + cyrillic), built by
 * scripts/fonts/build-fonts.mjs. Exposed as `--font-rubik`, consumed by `--ig-font`.
 * Google Fonts are not allowed at runtime. Licence: SIL OFL 1.1 (src/app/fonts/OFL.txt).
 *
 * next/font preloads every file of the family, so only the weights the design system uses are
 * declared: 400 body, 500 buttons/labels, 600 sub-headings, 700 H1–H3/prices/stats (700 renders
 * the LCP heading, so it stays preloaded). Light (300) is not used anywhere and is not loaded.
 *
 * Performance (task 39): four ~26 KB subsets = ~104 KB, within the 130 KB budget. All four stay
 * preloaded — each is used on the first screen (body, buttons, menu labels, H1), and a
 * non-preloaded weight would swap in late. `adjustFontFallback: "Arial"` (the next/font/local
 * default, kept explicit) generates the size-adjusted «rubik Fallback» face so the swap causes
 * no layout shift.
 */
export const rubik = localFont({
  variable: "--font-rubik",
  display: "swap",
  preload: true,
  adjustFontFallback: "Arial",
  src: [
    { path: "../fonts/Rubik-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/Rubik-Medium.woff2", weight: "500", style: "normal" },
    { path: "../fonts/Rubik-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "../fonts/Rubik-Bold.woff2", weight: "700", style: "normal" },
  ],
});
