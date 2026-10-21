import type { JSX, ReactNode } from "react";
import Image from "next/image";
import { faqJsonLdIndex } from "@/components/blocks/faq-block";
import { ObjectsFeedBlock } from "@/components/blocks/objects-feed-block";
import { RenderBlocks } from "@/components/blocks/render-blocks";
import { asMedia, mediaSrc, resolveLink } from "@/components/blocks/shared";
import type { BlockBackground, BlockPageContext, LayoutBlock } from "@/components/blocks/types";
import { EdgeCompare, type HeroPhotoView } from "@/components/glass-types/edge-compare";
import {
  ApplicationsSection,
  FaqSection,
  FinalCtaSection,
  ImportantSection,
  SectionTitle,
  TableSection,
} from "@/components/glass-types/glass-type-sections";
import { SamplesSnippet } from "@/components/glass-types/samples-snippet";
import type { SwatchData } from "@/components/glass-types/swatch";
import { toSwatchColor, toSwatchPatternKey } from "@/components/glass-types/swatch-patterns";
import {
  VariantsGrid,
  VariantsPicker,
  type VariantView,
} from "@/components/glass-types/variants-picker";
import { Callout } from "@/components/ig/callout";
import { PageHero, PageHeroTerm } from "@/components/ig/page-hero";
import { Section, type SectionVariant } from "@/components/ig/section";
import { NOT_FOUND_METADATA, NotFoundResponse } from "@/components/page/not-found-response";
import { PageShell } from "@/components/page/page-shell";
import { QuizLink } from "@/components/page/quiz-cta";
import { RichText } from "@/components/rich-text/rich-text";
import { getConditions, getPlaceholderContext, getSnippets } from "@/lib/cms/globals";
import { getDocBySlug, listPublished, redirectIfExists } from "@/lib/cms/queries";
import { replacePlaceholders, type PlaceholderContext } from "@/lib/domain";
import { buildMetadata, resolveH1, resolveSeoText } from "@/lib/seo/metadata";
import type { Condition, GlassType } from "@/payload-types";
import type { Metadata } from "next";

/**
 * Template «вид стекла» (task 24): матовое, тонированное, крашеное по RAL, осветлённое, для
 * мебели, рифлёное, гнутое under `/zakalennoe-steklo/<slug>/` (route of task 23) and триплекс at
 * `/tripleks/` (own route). Prototypes: `Osvetl.dc.html`, `Riflenoe.dc.html`.
 *
 * Section order (typed fields first, then the free `layout`):
 *  1. hero — H1, intro (`{условия}` substituted), «Рассчитать стоимость», short terms strip,
 *     photos (`heroPhotos`) or the background illustration (`heroImage`);
 *  2. «Варианты» — interactive picker when variants say where they are used, else a static grid;
 *     `variantsNote`, `variantsCallout`;
 *  3. `tables[]`;  4. «Что важно знать» (`importantItems`);  5. `layout` blocks;
 *  6. «Где применяют» (`applications`, `relatedLinks`);  7. «Образцы и цветопроба» (`showSamples`);
 *  8. objects feed (`showObjects`);  9. FAQ (+ FAQPage JSON-LD);
 *  10. closing buttons — unless the layout already has a `cta` block.
 * Backgrounds alternate bg ↔ sf from the hero on; `layout` blocks with `background: auto` join
 * the same rhythm (explicit backgrounds are kept and the rhythm continues after them).
 *
 * Static + ISR: no request APIs. Unknown / unpublished slug → `redirectIfExists` + 404 body
 * (`<NotFoundResponse />`, never a bare `notFound()` — see its docs).
 */

/** Glass types under `/zakalennoe-steklo/<slug>/` (the dynamic route of task 23). */
export const HUB_GLASS_TYPE_SLUGS = [
  "matovoe",
  "okrashennoe",
  "osvetlennoe",
  "tonirovannoe",
  "dlya-mebeli",
  "riflenoe",
  "mollirovannoe",
] as const;

/** Triplex lives at the site root (`urlBase: root`) and has its own route `/tripleks/`. */
export const TRIPLEX_SLUG = "tripleks";

const HUB_BASE = "/zakalennoe-steklo/";
const HUB_SLUG_SET: ReadonlySet<string> = new Set(HUB_GLASS_TYPE_SLUGS);

/** `true` for the seven glass types served by `/zakalennoe-steklo/[slug]/` (not triplex). */
export function isGlassTypeSlug(slug: string): boolean {
  return HUB_SLUG_SET.has(slug);
}

/** Canonical path of a glass type: `/tripleks/` or `/zakalennoe-steklo/<slug>/`. */
export function glassTypePath(slug: string): string {
  return slug === TRIPLEX_SLUG ? `/${TRIPLEX_SLUG}/` : `${HUB_BASE}${slug}/`;
}

/**
 * Published document for a route slug. The document's computed `path` must equal the URL the
 * route serves: a type moved to another `urlBase` in the admin must not be reachable at two URLs.
 */
async function loadGlassType(slug: string): Promise<GlassType | null> {
  if (!isGlassTypeSlug(slug) && slug !== TRIPLEX_SLUG) return null;
  const doc = await getDocBySlug("glass-types", slug);
  return doc && doc.path === glassTypePath(slug) ? doc : null;
}

export async function generateGlassTypeMetadata(slug: string): Promise<Metadata> {
  const doc = await loadGlassType(slug);
  if (!doc) return NOT_FOUND_METADATA;
  const ogMedia = asMedia(doc.seo?.ogImage);
  return buildMetadata({
    seo: doc.seo,
    path: glassTypePath(slug),
    fallbackTitle: doc.title,
    placeholders: await getPlaceholderContext(),
    image: ogMedia?.url ? { url: ogMedia.url, alt: ogMedia.alt ?? null } : null,
  });
}

/* ------------------------------------------------------------------------------------------ */
/* Section rhythm                                                                             */
/* ------------------------------------------------------------------------------------------ */

const BLOCK_BACKGROUND: Record<SectionVariant, BlockBackground> = {
  bg: "bg",
  sf: "sf",
  dark: "dark",
  "primary-dark": "primaryDark",
};

const VARIANT_OF_BACKGROUND: Record<Exclude<BlockBackground, "auto">, SectionVariant> = {
  bg: "bg",
  sf: "sf",
  dark: "dark",
  primaryDark: "primary-dark",
};

/** bg ↔ sf alternation; the hero is `bg`, so the first section after it is `sf`. */
function createRhythm() {
  let current: SectionVariant = "bg";
  return {
    next(): SectionVariant {
      current = current === "bg" ? "sf" : "bg";
      return current;
    },
    /** A section with its own background: the alternation continues from it. */
    set(variant: SectionVariant) {
      current = variant;
    },
  };
}

type Rhythm = ReturnType<typeof createRhythm>;

/**
 * Layout blocks with `background: auto` get the next background of the page rhythm (on their
 * own `RenderBlocks` would restart the alternation at index 0).
 */
function withRhythm(blocks: LayoutBlock[], rhythm: Rhythm): LayoutBlock[] {
  return blocks.map((block) => {
    if (!("background" in block)) {
      rhythm.next();
      return block;
    }
    const background = block.background;
    if (background && background !== "auto") {
      rhythm.set(VARIANT_OF_BACKGROUND[background]);
      return block;
    }
    return { ...block, background: BLOCK_BACKGROUND[rhythm.next()] } as LayoutBlock;
  });
}

/* ------------------------------------------------------------------------------------------ */
/* Data → view                                                                                */
/* ------------------------------------------------------------------------------------------ */

const hasText = (value: string | null | undefined): value is string =>
  typeof value === "string" && value.trim() !== "";

type Variant = NonNullable<GlassType["variants"]>[number];

function toSwatch(variant: Variant): SwatchData {
  switch (variant.swatchKind) {
    case "image": {
      const media = asMedia(variant.swatchImage);
      const src = media ? mediaSrc(media, "thumbnail") : null;
      return src ? { kind: "image", src } : { kind: "none" };
    }
    case "pattern": {
      const pattern = toSwatchPatternKey(variant.patternKey);
      return pattern ? { kind: "pattern", pattern } : { kind: "none" };
    }
    default: {
      const color = toSwatchColor(variant.swatchColor);
      return color ? { kind: "color", color } : { kind: "none" };
    }
  }
}

/** Variants with a name, unique keys (`key` or the index) and placeholders substituted. */
function variantViews(variants: GlassType["variants"], ctx: PlaceholderContext): VariantView[] {
  const seen = new Set<string>();
  return (variants ?? [])
    .filter((variant) => hasText(variant.name))
    .map((variant, index) => {
      const base = variant.key?.trim() || `variant-${index + 1}`;
      const key = seen.has(base) ? `${base}-${index + 1}` : base;
      seen.add(key);
      return {
        key,
        name: replacePlaceholders(variant.name, ctx),
        description: hasText(variant.description)
          ? replacePlaceholders(variant.description, ctx)
          : null,
        application: hasText(variant.application)
          ? replacePlaceholders(variant.application, ctx)
          : null,
        swatch: toSwatch(variant),
      };
    });
}

/** Hero photos; temporary media is shown as the design-system placeholder (see `EdgeCompare`). */
function heroPhotoViews(photos: GlassType["heroPhotos"]): HeroPhotoView[] {
  return (photos ?? []).map((photo) => {
    const media = asMedia(photo.image);
    const caption = photo.caption?.trim() || null;
    return {
      src: media && !media.isPlaceholder ? mediaSrc(media, "card") : null,
      alt: media?.alt?.trim() || caption || "",
      caption,
    };
  });
}

/** Short terms strip of the glass-type pages (`conditions.termsBarShort`, else `termsBar`). */
function heroTerms(conditions: Condition | null, ctx: PlaceholderContext): ReactNode {
  const items = conditions?.termsBarShort?.length
    ? conditions.termsBarShort
    : (conditions?.termsBar ?? []);
  const texts = items.map((item) => replacePlaceholders(item.text, ctx).trim()).filter(Boolean);
  if (texts.length === 0) return null;
  return texts.map((text, index) => <PageHeroTerm key={index}>{text}</PageHeroTerm>);
}

const relationId = (value: unknown): string | null =>
  typeof value === "string"
    ? value
    : typeof value === "object" && value !== null && "id" in value
      ? String((value as { id: unknown }).id)
      : null;

/** Product whose published objects feed section 8, when there is at least one such object. */
async function objectsProductId(doc: GlassType): Promise<string | null> {
  if (!doc.showObjects) return null;
  const productId = relationId(doc.objectsProduct);
  if (!productId) return null;
  const found = await listPublished("objects", {
    where: { products: { contains: productId } },
    limit: 1,
    depth: 0,
  });
  return found.docs.length > 0 ? productId : null;
}

/* ------------------------------------------------------------------------------------------ */
/* Hero                                                                                       */
/* ------------------------------------------------------------------------------------------ */

const HERO_TITLE_ID = "page-title";

interface GlassTypeHeroProps {
  doc: GlassType;
  title: string;
  path: string;
  ctx: PlaceholderContext;
  terms: ReactNode;
}

function GlassTypeHero({ doc, title, path, ctx, terms }: GlassTypeHeroProps) {
  const photos = heroPhotoViews(doc.heroPhotos);
  // The background illustration only on the one-column hero (photos take the right column).
  const background = photos.length === 0 ? asMedia(doc.heroImage) : null;
  const backgroundSrc = background ? mediaSrc(background, "hero") : null;

  const hero = (
    <PageHero
      variant="ct-hero"
      title={title}
      titleId={HERO_TITLE_ID}
      actions={<QuizLink prefill={doc.quizPrefill} src={path} size="l" ctx={ctx} />}
      terms={terms}
      aside={photos.length > 0 ? <EdgeCompare photos={photos} /> : undefined}
      className={backgroundSrc ? "bg-transparent" : undefined}
    >
      {doc.intro ? (
        <RichText
          data={doc.intro}
          ctx={ctx}
          className="[&_p]:text-lead [&_p]:text-ink-2 max-w-[820px] gap-3 [&_p]:max-w-none"
        />
      ) : null}
    </PageHero>
  );

  if (!backgroundSrc) return hero;
  return (
    <div className="bg-bg relative isolate overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-y-0 right-0 -z-10 w-[45%] [mask-image:linear-gradient(90deg,transparent_0%,black_55%)] max-md:hidden"
      >
        {/* Hidden ≤1100 px: the 1px slot makes the phone preload pick the smallest candidate
            instead of a full image nobody sees (task 39). */}
        <Image
          src={backgroundSrc}
          alt=""
          fill
          preload
          sizes="(max-width: 1100px) 1px, 45vw"
          className="object-cover"
        />
      </div>
      {hero}
    </div>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Page                                                                                       */
/* ------------------------------------------------------------------------------------------ */

const VARIANTS_HEADING_ID = "glass-variants-title";
const DEFAULT_VARIANTS_HEADING = "Варианты";
const DEFAULT_IMPORTANT_TITLE = "Что важно знать до заказа";
const DEFAULT_SAMPLES_KEY = "samples";
const OBJECTS_HEADING = "Объекты";
const OBJECTS_LIMIT = 4;

/** Glass-type page (server component). Signature is the contract consumed by task 23. */
export async function GlassTypePage({ slug }: { slug: string }): Promise<JSX.Element> {
  const path = glassTypePath(slug);
  const doc = await loadGlassType(slug);
  if (!doc) {
    await redirectIfExists(path);
    return <NotFoundResponse />;
  }

  const [ctx, conditions, snippets, objectsProduct] = await Promise.all([
    getPlaceholderContext(),
    getConditions(),
    doc.showSamples ? getSnippets() : Promise.resolve(null),
    objectsProductId(doc),
  ]);

  const title = resolveH1(doc.seo, doc.title, ctx);
  const crumbLabel = resolveSeoText(doc.breadcrumbLabel || doc.title, ctx);
  const rhythm = createRhythm();
  const sections: ReactNode[] = [];

  // 2. Variants.
  const variants = variantViews(doc.variants, ctx);
  const variantsNote = doc.variantsNote ?? null;
  const callout = doc.variantsCallout;
  const hasVariantsCallout = Boolean(callout?.body || hasText(callout?.title));
  if (variants.length > 0) {
    const interactive = variants.some((variant) => variant.application !== null);
    sections.push(
      <Section key="variants" variant={rhythm.next()} aria-labelledby={VARIANTS_HEADING_ID}>
        <SectionTitle id={VARIANTS_HEADING_ID}>
          {replacePlaceholders(doc.variantsHeading?.trim() || DEFAULT_VARIANTS_HEADING, ctx)}
        </SectionTitle>
        {interactive ? (
          <VariantsPicker items={variants} labelledBy={VARIANTS_HEADING_ID} />
        ) : (
          <VariantsGrid items={variants} />
        )}
        {variantsNote ? (
          <RichText data={variantsNote} ctx={ctx} className="mt-6 max-w-[880px]" />
        ) : null}
        {hasVariantsCallout ? (
          <Callout
            variant="info"
            className="mt-6 max-w-[1100px]"
            {...(hasText(callout?.title) ? { title: replacePlaceholders(callout.title, ctx) } : {})}
          >
            <RichText data={callout?.body} ctx={ctx} disableContainer />
          </Callout>
        ) : null}
      </Section>
    );
  }

  // 3. Tables.
  (doc.tables ?? []).forEach((table, index) => {
    if ((table.columns ?? []).length === 0 || (table.rows ?? []).length === 0) return;
    sections.push(
      <TableSection
        key={`table-${table.id ?? index}`}
        table={table}
        ctx={ctx}
        variant={rhythm.next()}
        headingId={`glass-table-${index + 1}-title`}
      />
    );
  });

  // 4. «Что важно знать».
  const importantItems = doc.importantItems ?? [];
  if (importantItems.length > 0) {
    sections.push(
      <ImportantSection
        key="important"
        title={doc.importantTitle?.trim() || DEFAULT_IMPORTANT_TITLE}
        items={importantItems}
        ctx={ctx}
        variant={rhythm.next()}
      />
    );
  }

  // 5. Layout blocks. The typed FAQ below owns `doc.faq`: the blocks get no `faq`, so a FAQ
  // block in `doc` mode cannot duplicate it.
  const blockPage: BlockPageContext = { path, title, quizPrefill: doc.quizPrefill };
  const layout = withRhythm(doc.layout ?? [], rhythm);
  if (layout.length > 0) {
    sections.push(<RenderBlocks key="layout" blocks={layout} ctx={ctx} page={blockPage} />);
  }

  // 6. «Где применяют».
  const applications = doc.applications ?? [];
  const relatedLinks = doc.relatedLinks ?? [];
  const hasRelated = relatedLinks.some((item) => resolveLink(item.link)?.label);
  if (applications.length > 0 || hasRelated) {
    sections.push(
      <ApplicationsSection
        key="applications"
        applications={applications}
        relatedLinks={relatedLinks}
        ctx={ctx}
        variant={rhythm.next()}
        headingId="glass-applications-title"
      />
    );
  }

  // 7. «Образцы и цветопроба».
  if (doc.showSamples) {
    const key = doc.samplesSnippetKey?.trim() || DEFAULT_SAMPLES_KEY;
    const snippet = snippets?.items?.find((item) => item.key === key);
    const vid = doc.quizPrefill?.kind;
    sections.push(
      <Section key="samples" variant={rhythm.next()} aria-labelledby="glass-samples-title">
        <SamplesSnippet
          content={snippet?.content ?? null}
          title={snippet?.title ? replacePlaceholders(snippet.title, ctx) : undefined}
          ctaLabel={snippet?.ctaLabel ? replacePlaceholders(snippet.ctaLabel, ctx) : undefined}
          formParams={{ source: slug, ...(vid ? { vid } : {}) }}
          ctx={ctx}
          headingId="glass-samples-title"
        />
      </Section>
    );
  }

  // 8. Objects (hidden when there is no published object of the product).
  if (objectsProduct) {
    sections.push(
      <ObjectsFeedBlock
        key="objects"
        block={{
          blockType: "objectsFeed",
          mode: "byProduct",
          product: objectsProduct,
          limit: OBJECTS_LIMIT,
          heading: OBJECTS_HEADING,
        }}
        ctx={ctx}
        section={{ index: 0, variant: rhythm.next(), headingId: "glass-objects-title" }}
      />
    );
  }

  // 9. FAQ. One FAQPage per page: a layout FAQ block that emits its own JSON-LD wins.
  const faq = (doc.faq ?? []).filter((item) => hasText(item.question));
  if (faq.length > 0) {
    sections.push(
      <FaqSection
        key="faq"
        items={faq}
        ctx={ctx}
        variant={rhythm.next()}
        headingId="glass-faq-title"
        jsonLd={faqJsonLdIndex(layout, blockPage) < 0}
      />
    );
  }

  // 10. Closing buttons, unless the layout has its own call to action.
  if (!layout.some((block) => block.blockType === "cta")) {
    sections.push(
      <FinalCtaSection
        key="final-cta"
        prefill={doc.quizPrefill}
        path={path}
        slug={slug}
        ctx={ctx}
        variant={rhythm.next()}
      />
    );
  }

  return (
    <PageShell path={path} lastLabel={crumbLabel} showConditions={false} quiz={false}>
      <GlassTypeHero
        doc={doc}
        title={title}
        path={path}
        ctx={ctx}
        terms={heroTerms(conditions, ctx)}
      />
      {sections}
    </PageShell>
  );
}
