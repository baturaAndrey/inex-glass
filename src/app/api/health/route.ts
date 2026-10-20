import { sql } from "@payloadcms/db-postgres/drizzle";
import { getPayload } from "payload";
import config from "@payload-config";

/**
 * Container healthcheck: `GET /api/health/` (trailing slash — without it Next answers 308).
 *
 * Payload initializes lazily, so this route is intentionally "warm": the first call runs
 * `getPayload()`, which applies pending `prodMigrations` and starts the Jobs Queue cron
 * (when JOBS_ENABLED=true). Docker/Swarm call it right after start, so migrations run
 * before real traffic arrives. Not behind staging basic auth: `src/proxy.ts` skips `/api`.
 *
 * Error details are never exposed; the cause is logged server-side only.
 */

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;
const HTTP_SERVICE_UNAVAILABLE = 503;

export async function GET() {
  try {
    const payload = await getPayload({ config });
    await payload.db.drizzle.execute(sql`SELECT 1`);
    return Response.json(
      { status: "ok", release: process.env.RELEASE_SHA ?? "dev" },
      { headers: NO_STORE }
    );
  } catch (error) {
    console.error("[health] check failed:", error instanceof Error ? error.message : error);
    return Response.json(
      { status: "error" },
      { status: HTTP_SERVICE_UNAVAILABLE, headers: NO_STORE }
    );
  }
}
