import { getEnv } from "@/lib/env";
import { buildRobotsTxt } from "@/lib/seo/robots";

/**
 * `GET /robots.txt` (task 36). A route handler instead of the `robots.ts` metadata route: the
 * body has Yandex-only directives (`Clean-param`) that `MetadataRoute.Robots` cannot express.
 *
 * Lives at the app root (outside `(site)`, no layout). With `trailingSlash: true` Next does not
 * redirect paths with a file extension, so `/robots.txt` answers 200 directly; `src/proxy.ts`
 * skips it too (its matcher excludes paths with a dot). Rendered per request from the RUNTIME
 * `SITE_ENV` / `SITE_URL`: one Docker image serves staging (closed) and production.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROBOTS_HEADERS = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "public, max-age=3600",
} as const;

export function GET(): Response {
  const { SITE_URL, SITE_ENV } = getEnv();
  return new Response(buildRobotsTxt({ siteUrl: SITE_URL, env: SITE_ENV }), {
    status: 200,
    headers: ROBOTS_HEADERS,
  });
}
