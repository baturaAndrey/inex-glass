/**
 * `robots.txt` builder (task 36, ТЗ §8.3). Pure: served by `src/app/robots.txt/route.ts`.
 *
 * Production: one group for every crawler plus a `Yandex` group. A specific group REPLACES `*`
 * for that crawler, so the Yandex group repeats every rule; `Clean-param` is Yandex-only (Google
 * ignores it and relies on canonical tags). Staging / dev close the whole site and name no
 * sitemap (they are also behind basic auth and `noindex`).
 *
 * Never closed: `/_next/static/`, `/_next/image` and media — crawlers need CSS, JS and images to
 * render the pages (Core Web Vitals). Media files are served by Payload under
 * `/api/media/file/…`, hence `Allow:` for that prefix above the `/api/` disallow.
 */

export type SiteEnv = "development" | "staging" | "production";

export interface RobotsInput {
  /** Runtime site origin, e.g. `https://inexglass.ru` (a trailing slash is tolerated). */
  siteUrl: string;
  env: SiteEnv;
}

/** Public media files (Payload upload collection `media`). */
export const MEDIA_FILES_PREFIX = "/api/media/file/";

/** Service sections and parameter URLs closed for every crawler. */
export const DISALLOW_RULES = [
  "/admin/",
  "/api/",
  "/zakaz/",
  "/poisk/",
  // Quiz pre-fill / resume parameters (`?type=&thick=&vid=&src=&resume=`): the canonical has no query.
  "/raschet-stoimosti/?",
  "/*?filtr",
  // Portfolio filters of `/obekty/` (task 30): first and subsequent query parameters.
  "/*?product=",
  "/*?type=",
  "/*?city=",
  "/*?sort=",
  "/*&product=",
  "/*&type=",
  "/*&city=",
  "/*&sort=",
] as const;

/** Tracking parameters Yandex should drop when comparing URLs (`Clean-param`). */
export const CLEAN_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_referrer",
  "yclid",
  "gclid",
  "fbclid",
  "ysclid",
  "roistat",
  "_openstat",
  "from",
] as const;

function group(userAgent: string, extra: readonly string[] = []): string[] {
  return [
    `User-agent: ${userAgent}`,
    `Allow: ${MEDIA_FILES_PREFIX}`,
    ...DISALLOW_RULES.map((rule) => `Disallow: ${rule}`),
    ...extra,
  ];
}

/** Absolute sitemap URL from the site origin: `https://inexglass.ru/sitemap.xml`. */
export function sitemapUrl(siteUrl: string): string {
  return `${siteUrl.trim().replace(/\/+$/, "")}/sitemap.xml`;
}

/** Full `robots.txt` body, `\n` line endings, ending with a newline. */
export function buildRobotsTxt({ siteUrl, env }: RobotsInput): string {
  if (env !== "production") return ["User-agent: *", "Disallow: /", ""].join("\n");

  const lines = [
    ...group("*"),
    "",
    ...group("Yandex", [`Clean-param: ${CLEAN_PARAMS.join("&")} /`]),
    "",
    `Sitemap: ${sitemapUrl(siteUrl)}`,
    "",
  ];
  return lines.join("\n");
}
