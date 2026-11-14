import { draftMode } from "next/headers";
import { getEnv } from "@/lib/env";
import { safeInternalPath } from "@/lib/preview/safe-path";

/**
 * `POST /api/preview/exit/` — leaves the page draft preview (form of the preview banner,
 * `@/components/preview/preview-banner`). Forms are never prefetched, unlike links, so the
 * cookie cannot be dropped by accident. Other methods get Next's automatic 405.
 *
 * Returns to the page the editor was on: the path of the `Referer` when it comes from the site
 * itself (the `SITE_URL` origin or the origin the request was made to) and is a safe internal
 * path; otherwise the home page.
 */

export const dynamic = "force-dynamic";

/** Internal path of a same-site `Referer`, or `/`. */
function returnPath(request: Request): string {
  const referer = request.headers.get("referer");
  if (!referer) return "/";
  let url: URL;
  try {
    url = new URL(referer);
  } catch {
    return "/";
  }
  const siteOrigins = new Set([new URL(getEnv().SITE_URL).origin, new URL(request.url).origin]);
  if (!siteOrigins.has(url.origin)) return "/";
  return safeInternalPath(url.pathname) ?? "/";
}

export async function POST(request: Request): Promise<Response> {
  (await draftMode()).disable();
  // 303: the browser follows with GET (a 307 from `redirect()` would repeat the POST).
  // Relative `Location`: the browser resolves it against the origin it is on, so a stand whose
  // host differs from `SITE_URL` (local, behind a proxy) is not sent elsewhere.
  // The expired `__prerender_bypass` cookie set by `disable()` is merged into this response by
  // Next's route module (`appendMutableCookies`), so no manual cookie deletion is needed.
  return new Response(null, {
    status: 303,
    headers: { Location: returnPath(request), "Cache-Control": "private, no-store" },
  });
}
