import { cache } from "react";
import { collectionTag } from "@/lib/cache-tags";
import { buildFacets, pickRelated, RESERVED_OBJECT_SLUG, sortObjects } from "@/lib/objects/filters";
import type { ObjectCardData, ObjectsFacets, TaxonomyRef } from "@/lib/objects/filters";
import { cardChips, mediaPath } from "@/lib/objects/format";
import { docUrl } from "@/lib/seo/doc-url";
import { SLUG_PATTERN } from "@/payload/fields/transliterate";
import type { City, Media, Object as PortfolioObject, ObjectType, Product } from "@/payload-types";
import { cached } from "./cache";
import { getPayloadClient } from "./payload";
import { getDocBySlug } from "./queries";

/**
 * Portfolio loaders (`/obekty/`, `/obekty/page/N/`, `/obekty/<slug>/`).
 *
 * The listing reads ALL published objects once (one Local API query, only card fields) and
 * filters / sorts / slices them in JS on the server: up to a few hundred records this is cheap,
 * gives the Russian collation and keeps one cache entry for every filter combination.
 * Invalidation: the object and taxonomy hooks expire `collection:<slug>` tags.
 */

/** Spec rows kept for generated card chips. */
const CARD_SPEC_ROWS = 2;

const INDEX_TAGS = [
  collectionTag("objects"),
  collectionTag("cities"),
  collectionTag("object-types"),
  collectionTag("products"),
  collectionTag("media"),
];

type Populated<T> = T | string | null | undefined;

function asDoc<T extends { id: string }>(value: Populated<T>): T | null {
  return typeof value === "object" && value !== null ? value : null;
}

function taxonomyRef(value: Populated<City | ObjectType | Product>): TaxonomyRef | null {
  const doc = asDoc(value);
  if (!doc?.slug || !doc.name) return null;
  return { slug: doc.slug, name: doc.name, order: doc.order ?? null };
}

const relationId = (value: unknown): string | null =>
  typeof value === "string"
    ? value
    : typeof value === "object" && value !== null && "id" in value
      ? String((value as { id: unknown }).id)
      : null;

/** Fields the listing needs (`select` of the index query). */
const CARD_SELECT = {
  name: true,
  slug: true,
  path: true,
  city: true,
  objectType: true,
  products: true,
  chips: true,
  spec: true,
  photos: true,
  sortDate: true,
  related: true,
  createdAt: true,
} as const;

/** Card data of an object document (populated to depth ≥ 1); `null` without a usable URL. */
export function toObjectCard(doc: PortfolioObject): ObjectCardData | null {
  const href = docUrl("objects", doc);
  if (!href || !doc.slug || doc.slug === RESERVED_OBJECT_SLUG) return null;
  const firstPhoto = doc.photos?.[0];
  const media = asDoc<Media>(firstPhoto?.image);
  const src = mediaPath(media?.sizes?.card?.url ?? media?.url);
  return {
    id: doc.id,
    slug: doc.slug,
    href,
    name: doc.name,
    city: taxonomyRef(doc.city),
    type: taxonomyRef(doc.objectType),
    products: (doc.products ?? [])
      .map((product) => taxonomyRef(product))
      .filter((ref): ref is TaxonomyRef => ref !== null),
    chips: cardChips(doc.chips, (doc.spec ?? []).slice(0, CARD_SPEC_ROWS)),
    photo:
      media && src
        ? {
            src,
            alt: firstPhoto?.alt?.trim() || media.alt?.trim() || doc.name,
            width: media.width ?? null,
            height: media.height ?? null,
          }
        : null,
    sortDate: doc.sortDate ?? doc.createdAt,
    related: (doc.related ?? [])
      .map((item) => relationId(item))
      .filter((id): id is string => id !== null),
  };
}

/**
 * Every published object as card data, newest first. Cached under the object, taxonomy and
 * media tags; the result is plain JSON.
 */
export const getObjectsIndex = cached(
  async (): Promise<ObjectCardData[]> => {
    const payload = await getPayloadClient();
    const { docs } = await payload.find({
      collection: "objects",
      where: { _status: { equals: "published" } },
      select: CARD_SELECT,
      depth: 1,
      pagination: false,
      overrideAccess: false,
    });
    const cards = (docs as PortfolioObject[])
      .map((doc) => toObjectCard(doc))
      .filter((card): card is ObjectCardData => card !== null);
    return sortObjects(cards, "new");
  },
  ["cms", "objects-index"],
  { tags: INDEX_TAGS }
);

/** Drawer facets: taxonomies used by at least one published object, with counts. */
export async function getFilterFacets(): Promise<ObjectsFacets> {
  return buildFacets(await getObjectsIndex());
}

/**
 * Published object by slug (depth 2: taxonomies, photos with media). Invalid and reserved slugs
 * (`page`) never reach the database. Memoized per request: metadata and page share the lookup.
 */
export const getObjectBySlug = cache(async (slug: string): Promise<PortfolioObject | null> => {
  if (!SLUG_PATTERN.test(slug) || slug === RESERVED_OBJECT_SLUG) return null;
  return getDocBySlug("objects", slug);
});

/** «Другие объекты» of an object: hand-picked `related[]`, otherwise by product / type / date. */
export async function getRelatedObjects(obj: PortfolioObject): Promise<ObjectCardData[]> {
  const index = await getObjectsIndex();
  const self = toObjectCard(obj);
  if (!self) return [];
  return pickRelated(self, index);
}
