import { revalidatePath, revalidateTag } from "next/cache";
import { tokenFromAuthorization, verifyRevalidateToken } from "@/lib/cms/revalidate-token";
import { allCmsTags } from "@/lib/cms/tags";
import { getEnv } from "@/lib/env";
import config from "@payload-config";

/**
 * `POST /api/revalidate/` (trailing slash!) with `Authorization: Bearer <token>` → 200
 * `{ ok: true, tags }`.
 *
 * Expires the whole CMS cache of this site: every `collection:*`, `lookup:*` and `global:*` tag
 * (`{ expire: 0 }` — the next request waits for fresh data) plus the ISR route cache. Called by
 * the seed (`src/seed/context.ts → revalidateSite`) after writing through the Local API outside
 * Next, where the Payload hooks cannot invalidate anything (see `src/lib/cms/cache.ts`).
 *
 * The token is a 5-minute HMAC of `PAYLOAD_SECRET` (`@/lib/cms/revalidate-token`): only a process
 * holding the site's secret can mint one. Not behind staging basic auth (`src/proxy.ts` skips
 * `/api`). The body is ignored: the tag list is derived from the Payload config, never from input.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;
const HTTP_UNAUTHORIZED = 401;
const EXPIRE_NOW = { expire: 0 } as const;

export async function POST(request: Request): Promise<Response> {
  const token = tokenFromAuthorization(request.headers.get("authorization"));
  if (!token || !verifyRevalidateToken(token, getEnv().PAYLOAD_SECRET)) {
    return Response.json({ ok: false }, { status: HTTP_UNAUTHORIZED, headers: NO_STORE });
  }

  // The sanitized config is enough for the slugs; no database connection is needed.
  const sanitized = await config;
  const tags = allCmsTags(
    sanitized.collections.map((collection) => collection.slug),
    sanitized.globals.map((global) => global.slug)
  );
  for (const tag of tags) revalidateTag(tag, EXPIRE_NOW);
  // Route-cache entries carry the tags above already; this also drops untagged ISR output.
  revalidatePath("/", "layout");

  return Response.json({ ok: true, tags: tags.length }, { headers: NO_STORE });
}
