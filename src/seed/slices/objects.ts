import {
  CITY_SEEDS,
  LISTING_AMONG,
  LISTING_CTA_BUTTON,
  LISTING_CTA_TEXT,
  LISTING_FORM_SOURCE,
  LISTING_INTRO,
  LISTING_SEO,
  OBJECT_DRAFTS,
  OBJECT_TYPE_SEEDS,
  OBJECTS_LISTING_PATH,
  PRODUCT_SEEDS,
} from "../content/objects";
import { upsertByPath, upsertBySlug } from "../context";
import { markdown } from "../lexical";
import type { TaxonomySeed } from "../content/objects";
import type { SeedContext } from "../context";

/**
 * Seed slice «objects» (task 30): object taxonomies, the listing document `/obekty/` and
 * portfolio DRAFTS. Idempotent by slug / path; `--force` updates the taxonomies created by this
 * slice and the listing document, but never touches existing objects (they belong to the
 * editors / the import of task 37) and never publishes an object.
 */

type TaxonomyCollection = "products" | "object-types" | "cities";

/**
 * Resolves each taxonomy of the spec to a document id: an existing record with the spec slug or
 * one of its aliases (reference data seeded earlier with other slugs) is reused, otherwise the
 * record is created with the spec slug. Returns spec slug → id.
 */
async function ensureTaxonomies(
  ctx: SeedContext,
  collection: TaxonomyCollection,
  seeds: readonly TaxonomySeed[]
): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const [index, seed] of seeds.entries()) {
    const candidates = [seed.slug, ...(seed.aliases ?? [])];
    const { docs } = await ctx.payload.find({
      collection,
      where: { slug: { in: candidates } },
      limit: candidates.length,
      depth: 0,
      pagination: false,
      overrideAccess: true,
    });
    // Prefer the spec slug, then the aliases in their listed order.
    const existing = candidates
      .map((slug) => docs.find((doc) => doc.slug === slug))
      .find((doc) => doc !== undefined);
    if (existing && existing.slug !== seed.slug) {
      ctx.log(`${collection} ${seed.slug}: используется существующий «${existing.slug}»`);
      ids.set(seed.slug, existing.id);
      continue;
    }

    const order = (index + 1) * 10;
    const data =
      collection === "products"
        ? {
            name: seed.name,
            slug: seed.slug,
            order,
            ...(seed.quizType ? { quizType: seed.quizType } : {}),
          }
        : { name: seed.name, slug: seed.slug, order };
    const { doc } = await upsertBySlug(ctx, collection, data);
    ids.set(seed.slug, doc.id);
  }
  return ids;
}

/** Listing document `/obekty/` (template `listing`): SEO + intro + closing CTA (teksty §5). */
async function seedListingPage(ctx: SeedContext): Promise<void> {
  await upsertByPath(ctx, "pages", OBJECTS_LISTING_PATH, {
    title: LISTING_SEO.h1,
    slug: "obekty",
    pathPrefix: "/",
    template: "listing",
    _status: "published",
    seo: { ...LISTING_SEO },
    // The prototype has neither the «Условия» block nor the quiz banner on the listing.
    hideConditions: true,
    hideQuizCta: true,
    layout: [
      // First block = intro, rendered next to the H1 by the route.
      { blockType: "richText", content: await markdown(ctx, LISTING_INTRO), width: "narrow" },
      {
        blockType: "cta",
        variant: "buttons",
        background: "sf",
        body: await markdown(ctx, `${LISTING_AMONG}\n\n${LISTING_CTA_TEXT}`),
        buttons: [
          {
            label: LISTING_CTA_BUTTON,
            kind: "form",
            variant: "primary",
            formKey: "drawing",
            formParams: { label: LISTING_CTA_BUTTON, source: LISTING_FORM_SOURCE },
          },
        ],
      },
    ],
  });
}

/** Drafts only: publish validation is never bypassed and nothing fictional goes live. */
async function seedObjectDrafts(
  ctx: SeedContext,
  cities: Map<string, string>,
  types: Map<string, string>
): Promise<void> {
  for (const draft of OBJECT_DRAFTS) {
    const city = draft.city ? cities.get(draft.city) : undefined;
    const objectType = draft.type ? types.get(draft.type) : undefined;
    await upsertBySlug(
      ctx,
      "objects",
      {
        name: draft.name,
        slug: draft.slug,
        _status: "draft",
        ...(city ? { city } : {}),
        ...(objectType ? { objectType } : {}),
      },
      { draft: true, overwrite: false }
    );
  }
}

export async function seed(ctx: SeedContext): Promise<void> {
  await ensureTaxonomies(ctx, "products", PRODUCT_SEEDS);
  const types = await ensureTaxonomies(ctx, "object-types", OBJECT_TYPE_SEEDS);
  const cities = await ensureTaxonomies(ctx, "cities", CITY_SEEDS);
  await seedListingPage(ctx);
  await seedObjectDrafts(ctx, cities, types);
}
