import { unstable_cache } from "next/cache";
import { connection } from "next/server";

/**
 * Cache layer for CMS reads + the "build without a database" rule.
 *
 * CACHING
 * -------
 * `cacheComponents` is off, so CMS data is cached with `unstable_cache` and invalidated by the
 * Payload hooks in `src/payload/hooks/revalidate.ts` via the tags of `@/lib/cache-tags`:
 * `global:<slug>`, `collection:<slug>`, `doc:<slug>:<id>`. Loaders cache indefinitely
 * (`revalidate: false`): the hooks are the only invalidation source. prices / promo / contacts
 * are expired immediately by their hooks (`{ expire: 0 }`), so their loaders never set their own
 * `revalidate` either.
 *
 * LOOKUPS: MISSES ARE NEVER CACHED
 * --------------------------------
 * Lookups keyed by a requested URL (page by path, document by slug, redirect by `from`) pass
 * `cacheMisses: false`: a `null` result ("not found") is returned but NOT written to the data
 * cache. Rationale:
 * - a document created outside the admin (seed, import, SQL) fires no hook that could invalidate
 *   a cached miss, so a cached `null` would be a 404 until the cache is wiped;
 * - bots probing unknown URLs would otherwise create one cache entry per URL, without bound.
 * Hits stay cached (bounded by the number of documents) under `collection:<slug>` +
 * `lookup:<slug>` (`./tags.ts`). The hooks expire `lookup:*`, `collection:pages` and
 * `collection:redirects` immediately (`{ expire: 0 }`), so the first request after a publish
 * already resolves the new path. The 404 HTML itself is still ISR-cached by the route
 * (`revalidate`), but it carries the same tags (Next attaches a loader's tags to the page before
 * the loader runs), so it is invalidated together with the data.
 *
 * WRITES OUTSIDE THE ADMIN
 * ------------------------
 * The seed and other scripts run without Next (`revalidateTag` is unavailable there) and write
 * with `context.disableRevalidate`. The seed finishes by calling the signed
 * `POST /api/revalidate/` (`src/app/api/revalidate/route.ts`, token of `./revalidate-token.ts`),
 * which expires every `collection:*`, `lookup:*` and `global:*` tag of the running site.
 * See `docs/deploy.md` («Кэш Next»).
 *
 * TIME, NOT EDITS, CHANGES PRICES AND PROMO
 * -----------------------------------------
 * The 45-day price rule and the promo end date depend on the current date, while hooks fire only
 * on edits. Loaders therefore cache RAW data; "is the price stale" / "is the promo active" is
 * computed at render time from `now`. Consequently every page that shows a price, the promo or
 * meta with a price (including fixed URLs and anything under the header/layout) MUST be
 * re-rendered periodically:
 *
 *     export const revalidate = 3600;
 *
 * Without it a statically cached page keeps showing an outdated price forever.
 *
 * BUILD WITHOUT A DATABASE (rule for every page of Wave 5)
 * --------------------------------------------------------
 * The Docker image is built (`next build`) without Postgres. Any page prerendered at build time
 * that touches the CMS would fail. Solution:
 * - `cached()` calls `assertDbAvailableOrBailOut()` BEFORE entering `unstable_cache` (Next forbids
 *   `connection()` inside a cache scope). During `next build` (`NEXT_PHASE ===
 *   'phase-production-build'`) it awaits `connection()`, which tells Next "this route needs a
 *   request": the route is excluded from build-time prerendering and rendered on demand at
 *   runtime (then ISR'd by its `revalidate`). Outside the build it is a no-op.
 * - `buildMetadata` (`@/lib/seo/metadata`) bails out the same way, so absolute URLs are always
 *   built from the RUNTIME `SITE_URL`, never baked in at build time.
 * - Dynamic segments (`[slug]`, `[...slug]`): `generateStaticParams() { return []; }`,
 *   `dynamicParams` stays `true` → rendered on first request, then ISR.
 *
 * Pattern for page tasks: fixed URLs — read data via the loaders of `@/lib/cms/*`; dynamic URLs —
 * `generateStaticParams → []`; pages whose output depends on the date (price, promo) —
 * `export const revalidate = 3600`.
 */

/** Next.js sets this while running `next build` (same constant as in `@/lib/env`). */
const NEXT_BUILD_PHASE = "phase-production-build";

/** Message of the error `unstable_cache` throws when there is no Next.js request context. */
const MISSING_INCREMENTAL_CACHE = "incrementalCache missing";

export const isBuildPhase = (): boolean => process.env.NEXT_PHASE === NEXT_BUILD_PHASE;

/**
 * During `next build` excludes the current route from static prerendering (see file header):
 * the database is not reachable at build time. A no-op in dev, at runtime and in tests.
 */
export async function assertDbAvailableOrBailOut(): Promise<void> {
  if (isBuildPhase()) await connection();
}

export interface CachedOptions<Args extends unknown[]> {
  /** Static tags, or tags derived from the call arguments (e.g. `doc:pages:<id>`). */
  tags: string[] | ((...args: Args) => string[]);
  /** Seconds, or `false` (default) — cached until a hook invalidates one of the tags. */
  revalidate?: number | false;
  /**
   * `false`: a `null` result is returned to the caller but never stored (see "Lookups" above).
   * Default `true`: globals legitimately return `null` for an empty global and stay cached.
   */
  cacheMisses?: boolean;
}

/**
 * Thrown inside `unstable_cache` so that a `null` result is not stored: `unstable_cache` never
 * caches a rejected call. Caught right outside and turned back into `null`.
 */
class UncachedMiss extends Error {
  constructor() {
    super("cms: uncached miss");
    this.name = "UncachedMiss";
  }
}

function isMissingCacheContext(error: unknown): boolean {
  return error instanceof Error && error.message.includes(MISSING_INCREMENTAL_CACHE);
}

/**
 * Thin wrapper over `unstable_cache` for CMS loaders.
 *
 * - The call arguments are part of the cache key (JSON), so they must be serialisable.
 * - Results are JSON-serialised by Next: return plain data (no class instances, no `Date`).
 * - Outside a Next.js request (seed, Payload jobs, CLI scripts) there is no incremental cache:
 *   the loader then runs uncached instead of failing.
 */
export function cached<Args extends unknown[], Result>(
  fn: (...args: Args) => Promise<Result>,
  keyParts: string[],
  opts: CachedOptions<Args>
): (...args: Args) => Promise<Result> {
  const revalidate = opts.revalidate ?? false;
  const staticTags = Array.isArray(opts.tags) ? opts.tags : null;
  const inner =
    opts.cacheMisses === false
      ? async (...args: Args): Promise<Result> => {
          const result = await fn(...args);
          if (result === null) throw new UncachedMiss();
          return result;
        }
      : fn;
  // Static tags: build the cached function once; derived tags: per call (cheap wrapper object).
  const shared = staticTags
    ? unstable_cache(inner, keyParts, { tags: staticTags, revalidate })
    : null;

  return async (...args: Args): Promise<Result> => {
    await assertDbAvailableOrBailOut();
    const tags = staticTags ?? (opts.tags as (...a: Args) => string[])(...args);
    const cachedFn = shared ?? unstable_cache(inner, keyParts, { tags, revalidate });
    try {
      return await cachedFn(...args);
    } catch (error) {
      if (error instanceof UncachedMiss) return null as Result;
      if (isMissingCacheContext(error)) return fn(...args);
      throw error;
    }
  };
}
