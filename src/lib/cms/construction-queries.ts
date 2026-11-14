import { cache } from "react";
import { collectionTag, docTag } from "@/lib/cache-tags";
import { LINKABLE_COLLECTIONS } from "@/payload/fields/link";
import type { Construction, Object as PortfolioObject, ShowerConfig } from "@/payload-types";
import { cached } from "./cache";
import { getPayloadClient } from "./payload";
import { DOC_DEPTH, getDocBySlug, listPublished, toPagePath } from "./queries";
import { lookupTag } from "./tags";
import type { Where } from "payload";

/**
 * Loaders of the `constructions` template (task 26; reused by glazing / mirrors, task 27).
 *
 * Same rules as `./queries`: reads run as an anonymous visitor (`overrideAccess: false`) with an
 * explicit `_status: published`, every query is tagged `collection:<slug>`, single documents
 * also `doc:constructions:<id>`, and URL-keyed lookups never cache a miss.
 */

const COLLECTION = "constructions";
const PUBLISHED: Where = { _status: { equals: "published" } };

/** Populated relations of a construction (cards, media, products) expire it too. */
const RELATED_TAGS = [
  ...LINKABLE_COLLECTIONS.map((slug) => collectionTag(slug)),
  collectionTag("media"),
  collectionTag("products"),
];

/** Id of the published construction whose `path` equals the value (miss is not cached). */
const findIdByPath = cached(
  async (path: string): Promise<string | null> => {
    const payload = await getPayloadClient();
    const { docs } = await payload.find({
      collection: COLLECTION,
      where: { and: [{ path: { equals: path } }, PUBLISHED] },
      limit: 1,
      depth: 0,
      pagination: false,
      overrideAccess: false,
    });
    return docs[0]?.id ? String(docs[0].id) : null;
  },
  ["cms", "constructions", "id-by-path"],
  { tags: [collectionTag(COLLECTION), lookupTag(COLLECTION)], cacheMisses: false }
);

/**
 * Paths of all published constructions (`id` → `path`): one cached query for the «path key»
 * lookup. Bounded by the number of documents, so it is cached even when empty.
 */
const listPublishedPaths = cached(
  async (): Promise<Array<{ id: string; path: string }>> => {
    const payload = await getPayloadClient();
    const { docs } = await payload.find({
      collection: COLLECTION,
      where: PUBLISHED,
      limit: 0,
      pagination: false,
      depth: 0,
      select: { path: true },
      overrideAccess: false,
    });
    return docs.flatMap((doc) =>
      typeof doc.path === "string" && doc.path !== ""
        ? [{ id: String(doc.id), path: doc.path }]
        : []
    );
  },
  ["cms", "constructions", "published-paths"],
  { tags: [collectionTag(COLLECTION), lookupTag(COLLECTION)] }
);

/** The published construction by id, tagged with its own `doc:constructions:<id>`. */
const findPublishedById = cached(
  async (id: string, depth: number): Promise<Construction | null> => {
    const payload = await getPayloadClient();
    const { docs } = await payload.find({
      collection: COLLECTION,
      where: { and: [{ id: { equals: id } }, PUBLISHED] },
      limit: 1,
      depth,
      pagination: false,
      overrideAccess: false,
    });
    return docs[0] ?? null;
  },
  ["cms", "constructions", "by-id"],
  {
    tags: (id) => [collectionTag(COLLECTION), docTag(COLLECTION, id), ...RELATED_TAGS],
    cacheMisses: false,
  }
);

/**
 * «Path key» of a stored path: no leading / trailing slash, inner `/` → `-`.
 * `/osteklenie/fasadov/` → `osteklenie-fasadov`, `/furnitura/` → `furnitura`.
 */
export function pathKey(path: string): string {
  return path
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/\/+/g, "-");
}

/**
 * Per-request memo (React `cache`, primitive keys): `generateMetadata` and the page resolve the
 * same document, and a miss is never data-cached.
 */
const resolveMemo = cache(
  async (slug: string | null, path: string | null): Promise<Construction | null> => {
    // 1. Explicit path.
    if (path) {
      const id = await findIdByPath(toPagePath(path));
      return id ? findPublishedById(id, DOC_DEPTH) : null;
    }
    if (!slug) return null;
    // 2. Slug (the seven root construction URLs: slug = last URL segment).
    const bySlug = await getDocBySlug(COLLECTION, slug, { depth: DOC_DEPTH });
    if (bySlug) return bySlug;
    // 3. Path key: `osteklenie-fasadov` → the document at `/osteklenie/fasadov/`.
    const key = slug.trim().toLowerCase();
    const match = (await listPublishedPaths()).find((entry) => pathKey(entry.path) === key);
    return match ? findPublishedById(match.id, DOC_DEPTH) : null;
  }
);

export interface ResolveConstructionInput {
  slug?: string | undefined;
  path?: string | undefined;
}

/**
 * Published construction for a typed route: by `path` when given, otherwise by `slug`, then by
 * the «path key» (`slug` equal to the path without slashes, `/` → `-`). `null` when nothing
 * published matches (the route answers 404).
 */
export function resolveConstruction({
  slug,
  path,
}: ResolveConstructionInput): Promise<Construction | null> {
  const cleanPath = path?.trim() ? path.trim() : null;
  const cleanSlug = slug?.trim() ? slug.trim() : null;
  return resolveMemo(cleanSlug, cleanPath);
}

/** Published shower configurations of a construction, in `order`. */
export async function listShowerConfigs(constructionId: string): Promise<ShowerConfig[]> {
  const { docs } = await listPublished("shower-configs", {
    where: { construction: { equals: constructionId } },
    sort: "order",
    limit: 100,
    depth: 1,
  });
  return docs;
}

/**
 * Up to `limit` published objects tagged with the product (`products ∋ productId`), newest
 * first; without a product (hub pages) — the featured objects.
 */
export async function getObjectsByProduct(
  productId: string | null | undefined,
  limit: number
): Promise<PortfolioObject[]> {
  const where: Where = productId
    ? { products: { contains: productId } }
    : { featured: { equals: true } };
  const { docs } = await listPublished("objects", {
    where,
    limit: Math.max(1, Math.trunc(limit)),
    sort: "-sortDate",
    depth: 1,
  });
  return docs;
}
