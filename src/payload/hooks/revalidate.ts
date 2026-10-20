import { revalidateTag } from "next/cache";
import { collectionTag, docTag, globalTag } from "@/lib/cache-tags";
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  GlobalAfterChangeHook,
} from "payload";

/**
 * Globals whose stale values must never be served (prices, promo, contacts): they expire
 * immediately instead of stale-while-revalidate.
 */
const IMMEDIATE_GLOBALS: ReadonlySet<string> = new Set(["prices", "promo", "contacts"]);

/** Expire the tag right away (next request waits for fresh data). */
const IMMEDIATE_PROFILE = { expire: 0 } as const;
/** Stale-while-revalidate: serve cached data once more and refresh in the background. */
const SWR_PROFILE = "max";

type DocLike = { id?: unknown; _status?: unknown } | null | undefined;

function safeRevalidate(tag: string, immediate: boolean): void {
  try {
    revalidateTag(tag, immediate ? IMMEDIATE_PROFILE : SWR_PROFILE);
  } catch {
    // Outside a Next.js request (seed, jobs, CLI) revalidateTag throws — nothing to invalidate there.
  }
}

function revalidateDoc(slug: string, doc: DocLike): void {
  safeRevalidate(collectionTag(slug), false);
  if (doc?.id !== undefined && doc.id !== null && doc.id !== "") {
    safeRevalidate(docTag(slug, String(doc.id)), false);
  }
}

/** `afterChange` hook for a global: invalidates `global:<slug>`. */
export const revalidateGlobal =
  (slug: string): GlobalAfterChangeHook =>
  ({ doc, req }) => {
    if (req.context?.disableRevalidate) return doc;
    safeRevalidate(globalTag(slug), IMMEDIATE_GLOBALS.has(slug));
    return doc;
  };

/**
 * Hooks for a collection: invalidate `collection:<slug>` and `doc:<slug>:<id>`.
 *
 * Usage: `hooks: { afterChange: [revalidateCollection("pages").afterChange],
 * afterDelete: [revalidateCollection("pages").afterDelete] }`.
 */
export const revalidateCollection = (slug: string) => {
  const afterChange: CollectionAfterChangeHook = ({ doc, previousDoc, req }) => {
    if (req.context?.disableRevalidate) return doc;
    const current = doc as DocLike;
    const previous = previousDoc as DocLike;
    // Draft-enabled collections: a draft save that touches no published version keeps the cache.
    if (current?._status && current._status !== "published" && previous?._status !== "published") {
      return doc;
    }
    revalidateDoc(slug, current);
    return doc;
  };

  const afterDelete: CollectionAfterDeleteHook = ({ doc, req }) => {
    if (req.context?.disableRevalidate) return doc;
    revalidateDoc(slug, doc as DocLike);
    return doc;
  };

  return { afterChange, afterDelete };
};
