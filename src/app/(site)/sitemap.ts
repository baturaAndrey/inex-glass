import { isBuildPhase } from "@/lib/cms/cache";
import { getEnv } from "@/lib/env";
import { collectSitemapEntries } from "@/lib/seo/sitemap-entries";
import type { MetadataRoute } from "next";

/**
 * `/sitemap.xml` (task 36): published, indexable pages with `lastmod` — see
 * `@/lib/seo/sitemap-entries` for the rules.
 *
 * - Outside production (staging, dev) the `urlset` is EMPTY: those stands are `noindex` and
 *   closed by `robots.txt`.
 * - Rendered on request (`force-dynamic`): the image is built without a database and the URLs
 *   come from the runtime `SITE_URL`. The data itself is cached (`unstable_cache`, tags
 *   `collection:*` / `global:prices|promo`, hourly revalidation), so a publish updates the
 *   sitemap without a rebuild and requests do not hit the database every time.
 * - A failing database never turns the sitemap into a 500: only `/` is served and the error is
 *   logged (crawlers retry later).
 */

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { SITE_ENV, SITE_URL } = getEnv();
  if (SITE_ENV !== "production") return [];

  try {
    return await collectSitemapEntries();
  } catch (error) {
    if (!isBuildPhase()) {
      console.error("[sitemap] failed to collect entries, serving the home page only", error);
    }
    return [{ url: new URL("/", SITE_URL).toString(), lastModified: new Date() }];
  }
}
