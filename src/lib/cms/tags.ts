/**
 * Tag of the URL → document lookups of a collection (`lookup:<slug>`): page by path, document by
 * slug, redirect by `from`.
 *
 * Kept separate from `collection:<slug>` (`@/lib/cache-tags`) because the two need different
 * invalidation profiles: lists and documents may be served stale once (stale-while-revalidate),
 * whereas a lookup must be fresh on the very first request after a publish, otherwise a new path
 * is a 404 / a removed path still resolves. `src/payload/hooks/revalidate.ts` therefore expires
 * `lookup:*` with `{ expire: 0 }`. This also matters for `cached({ cacheMisses: false })`: an
 * expired entry is recomputed in the foreground, so a lookup that now finds nothing is reported
 * as a miss instead of Next falling back to the stale hit.
 *
 * Pure module (no Next / Payload imports): shared by loaders, hooks and the revalidate route.
 */
import { collectionTag, globalTag } from "@/lib/cache-tags";

export const lookupTag = (slug: string) => `lookup:${slug}`;

/**
 * Every tag a full purge must expire: `collection:*` + `lookup:*` per collection and `global:*`
 * per global. `doc:<slug>:<id>` entries always also carry their `collection:<slug>` tag, so they
 * need no listing. Used by `POST /api/revalidate/` after writes outside the admin (seed).
 */
export function allCmsTags(
  collectionSlugs: readonly string[],
  globalSlugs: readonly string[]
): string[] {
  const tags = [
    ...collectionSlugs.flatMap((slug) => [collectionTag(slug), lookupTag(slug)]),
    ...globalSlugs.map((slug) => globalTag(slug)),
  ];
  return [...new Set(tags)];
}
