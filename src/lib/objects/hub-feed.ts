import type { ObjectCardData, ObjectPhoto, TaxonomyRef } from "./filters";

/**
 * «Объекты» of the hub `/steklyannye-konstrukcii/` (pure, no Next / Payload imports): the
 * published objects grouped by construction type (the `products` tag of an object) for the
 * filter chips. «Все» is the newest objects; each type is the newest objects with that tag.
 * Only types that have objects become chips, in the taxonomy order — nothing is invented.
 */

/** Cards per chip (one row of the mockup). */
export const HUB_OBJECTS_LIMIT = 4;
export const HUB_OBJECTS_ALL_KEY = "all";
export const HUB_OBJECTS_ALL_LABEL = "Все";

/** Card of the hub feed: what the client component needs, nothing more. */
export interface HubObjectCard {
  id: string;
  href: string;
  name: string;
  /** Construction type shown above the name (product tag), empty when the object has none. */
  type: string;
  photo: ObjectPhoto | null;
}

export interface HubObjectsGroup {
  /** `all` or the product slug. */
  key: string;
  label: string;
  objects: HubObjectCard[];
}

const byOrder = (a: TaxonomyRef, b: TaxonomyRef) =>
  (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER) ||
  a.name.localeCompare(b.name, "ru");

function card(object: ObjectCardData, type: TaxonomyRef | undefined): HubObjectCard {
  return {
    id: object.id,
    href: object.href,
    name: object.name,
    type: type?.name ?? "",
    photo: object.photo,
  };
}

/**
 * Groups of the chips: «Все» first, then one group per product used by the objects. `objects`
 * must already be sorted (the index is newest first); every group keeps that order.
 */
export function hubObjectGroups(
  objects: readonly ObjectCardData[],
  limit: number = HUB_OBJECTS_LIMIT
): HubObjectsGroup[] {
  if (objects.length === 0) return [];
  const products = new Map<string, TaxonomyRef>();
  for (const object of objects) {
    for (const product of object.products) {
      if (!products.has(product.slug)) products.set(product.slug, product);
    }
  }
  const types = [...products.values()].sort(byOrder);
  const firstType = (object: ObjectCardData) => [...object.products].sort(byOrder)[0];

  const all: HubObjectsGroup = {
    key: HUB_OBJECTS_ALL_KEY,
    label: HUB_OBJECTS_ALL_LABEL,
    objects: objects.slice(0, limit).map((object) => card(object, firstType(object))),
  };
  const byType = types.map((type): HubObjectsGroup => ({
    key: type.slug,
    label: type.name,
    objects: objects
      .filter((object) => object.products.some((product) => product.slug === type.slug))
      .slice(0, limit)
      .map((object) => card(object, type)),
  }));
  return [all, ...byType];
}
