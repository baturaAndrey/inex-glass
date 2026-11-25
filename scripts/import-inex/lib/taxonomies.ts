/**
 * Reference records of the importers: `products`, `cities`, `object-types` (find, cached;
 * create only where the method says so).
 *
 * `product(category)` maps an inex.su portfolio category through `CATEGORY_PRODUCTS`
 * (`selectors.ts`) and creates missing products — kept for `import.ts`. Note that
 * `CATEGORY_PRODUCTS.osteklenie` would create a near-duplicate product «Остекление»
 * (`osteklenie`); new callers must not use `product()` for it but map the category to the
 * existing `osteklenie-verand-i-terras` and call `productBySlug()`.
 */
import { transliterate } from "@/payload/fields/transliterate";
import { toLatinSlug } from "@/lib/migration/rules";
import { SEED_REQUEST_CONTEXT, type SeedContext } from "@/seed/context";

import { CATEGORY_PRODUCTS, OBJECT_TYPE_RULES, REGION_LOCATION } from "../selectors";

/** Aliases of the task-30 object types (reference data seeded earlier under other slugs). */
export const OBJECT_TYPE_ALIASES: Readonly<Record<string, readonly string[]>> = {
  tc: ["torgovye-centry"],
  bank: ["banki"],
  office: ["ofisy"],
  arena: ["areny"],
  airport: ["aeroporty"],
};

type TaxonomyCollection = "products" | "cities" | "object-types";

/** Result of `objectTypeByName`. `would-create` = missing, `create: true`, but a dry run. */
export type ObjectTypeLookup =
  { id: string; status: "found" | "created" } | { id: null; status: "missing" | "would-create" };

interface ObjectTypeRecord {
  id: string;
  name: string;
  slug: string;
  order: number | null;
}

/** Comparison key of reference names: trimmed, single spaces, lowercase, «ё» = «е». */
const nameKey = (name: string): string =>
  name.trim().replace(/\s+/g, " ").toLowerCase().replace(/ё/g, "е");

export class Taxonomies {
  private readonly cache = new Map<string, string | null>();
  private objectTypes: ObjectTypeRecord[] | null = null;

  constructor(
    private readonly ctx: SeedContext,
    private readonly dryRun: boolean
  ) {}

  /** Id of the first record with one of `slugs`; `null` when none exists. */
  private async find(collection: TaxonomyCollection, slugs: readonly string[], name?: string) {
    const or = [{ slug: { in: [...slugs] } }, ...(name ? [{ name: { equals: name } }] : [])];
    const { docs } = await this.ctx.payload.find({
      collection,
      where: { or },
      limit: 10,
      depth: 0,
      pagination: false,
      overrideAccess: true,
    });
    const bySlug = slugs.map((slug) => docs.find((doc) => doc.slug === slug)).find(Boolean);
    return (bySlug ?? docs[0])?.id ?? null;
  }

  private async findOrCreate(
    collection: "products" | "cities",
    slug: string,
    name: string,
    aliases: readonly string[] = []
  ): Promise<string | null> {
    const key = `${collection}:${slug}`;
    if (this.cache.has(key)) return this.cache.get(key) ?? null;
    let id = await this.find(collection, [slug, ...aliases], name);
    if (!id && !this.dryRun) {
      const doc = await this.ctx.payload.create({
        collection,
        data: { name, slug },
        depth: 0,
        overrideAccess: true,
        context: SEED_REQUEST_CONTEXT,
      });
      this.ctx.log(`${collection} ${slug}: создан`);
      id = doc.id;
    }
    this.cache.set(key, id);
    return id;
  }

  /**
   * Product of an inex.su portfolio category (`CATEGORY_PRODUCTS`); creates it when missing
   * (not in dry-run). `null` for an unmapped category. See the module note on `osteklenie`.
   */
  product(category: string): Promise<string | null> {
    const spec = CATEGORY_PRODUCTS[category];
    if (!spec) return Promise.resolve(null);
    return this.findOrCreate("products", spec.slug, spec.name, spec.aliases);
  }

  /**
   * Id of the existing product with this `slug` (cached). Never creates.
   *
   * @throws Error when no product has the slug.
   */
  async productBySlug(slug: string): Promise<string> {
    const key = `products-by-slug:${slug}`;
    let id = this.cache.get(key);
    if (id === undefined) {
      const { docs } = await this.ctx.payload.find({
        collection: "products",
        where: { slug: { equals: slug } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      });
      id = docs[0]?.id ?? null;
      this.cache.set(key, id);
    }
    if (!id) throw new Error(`продукт со slug «${slug}» не найден (products)`);
    return id;
  }

  /** City by name, found or created (not in dry-run); `null` for a region name. */
  city(name: string): Promise<string | null> {
    // Defense in depth: the parser already moves regions out of `city`.
    if (REGION_LOCATION.test(name)) return Promise.resolve(null);
    return this.findOrCreate("cities", toLatinSlug(name), name);
  }

  /** `cities` records whose name is a region — created by the first import (wave 6). */
  async regionCities(): Promise<Array<{ id: string; name: string; createdAt: string }>> {
    const { docs } = await this.ctx.payload.find({
      collection: "cities",
      pagination: false,
      depth: 0,
      overrideAccess: true,
    });
    return docs
      .filter((doc) => REGION_LOCATION.test(doc.name))
      .map(({ id, name, createdAt }) => ({ id, name, createdAt }));
  }

  /** Object type by keyword (`OBJECT_TYPE_RULES`); only existing records are used. */
  async objectType(text: string): Promise<string | null> {
    const rule = OBJECT_TYPE_RULES.find(([, pattern]) => pattern.test(text));
    if (!rule) return null;
    const [slug] = rule;
    const key = `object-types:${slug}`;
    if (!this.cache.has(key)) {
      this.cache.set(
        key,
        await this.find("object-types", [slug, ...(OBJECT_TYPE_ALIASES[slug] ?? [])])
      );
    }
    return this.cache.get(key) ?? null;
  }

  /**
   * Object type by exact name (trimmed, case-insensitive, «ё» = «е»); a record whose slug equals
   * the transliterated name also counts as found. When missing and `create` is set, creates it
   * (slug via `transliterate`, `order` after the existing ones) — the caller decides which names
   * may be created. In dry-run nothing is created (`would-create`); with `create: false` the
   * result is `missing`.
   */
  async objectTypeByName(name: string, options: { create: boolean }): Promise<ObjectTypeLookup> {
    const records = await this.loadObjectTypes();
    const key = nameKey(name);
    const slug = transliterate(name);
    const found =
      records.find((record) => nameKey(record.name) === key) ??
      records.find((record) => record.slug === slug);
    if (found) return { id: found.id, status: "found" };
    if (!options.create) return { id: null, status: "missing" };
    if (this.dryRun) return { id: null, status: "would-create" };

    const order = Math.max(0, ...records.map((record) => record.order ?? 0)) + 1;
    const doc = await this.ctx.payload.create({
      collection: "object-types",
      data: { name: name.trim(), slug, order },
      depth: 0,
      overrideAccess: true,
      context: SEED_REQUEST_CONTEXT,
    });
    this.ctx.log(`object-types ${slug}: создан`);
    records.push({ id: doc.id, name: doc.name, slug: doc.slug ?? slug, order });
    return { id: doc.id, status: "created" };
  }

  /** All object types (loaded once per instance). */
  private async loadObjectTypes(): Promise<ObjectTypeRecord[]> {
    if (!this.objectTypes) {
      const { docs } = await this.ctx.payload.find({
        collection: "object-types",
        pagination: false,
        depth: 0,
        overrideAccess: true,
      });
      this.objectTypes = docs.map((doc) => ({
        id: doc.id,
        name: doc.name,
        slug: doc.slug ?? "",
        order: doc.order ?? null,
      }));
    }
    return this.objectTypes;
  }
}
