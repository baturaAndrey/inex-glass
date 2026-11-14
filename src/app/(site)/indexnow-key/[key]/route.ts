import { timingSafeEqual } from "node:crypto";
import { getEnv } from "@/lib/env";
import { INDEXNOW_KEY_PATTERN } from "@/lib/seo/indexnow";

/**
 * IndexNow key file (task 36): `GET /<INDEXNOW_KEY>.txt` → the key itself, `text/plain`.
 *
 * Served through the rewrite `/:key([a-f0-9]{32}).txt` → `/indexnow-key/:key/` of
 * `next.config.ts` (a dynamic segment cannot carry the `.txt` suffix). Any other 32-hex name is
 * a 404, as is everything when `INDEXNOW_KEY` is unset. A route handler renders no layout, so
 * living inside `(site)` is harmless.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NOT_FOUND = 404;

function sameKey(candidate: string, expected: string): boolean {
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string }> }
): Promise<Response> {
  const { key } = await params;
  const expected = getEnv().INDEXNOW_KEY?.trim().toLowerCase();

  if (!expected || !INDEXNOW_KEY_PATTERN.test(key) || !sameKey(key, expected)) {
    return new Response("Not Found", {
      status: NOT_FOUND,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
  return new Response(expected, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
