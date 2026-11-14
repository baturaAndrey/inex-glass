import type { JSX } from "react";
import { FileText } from "lucide-react";
import { faqJsonLdIndex } from "@/components/blocks/faq-block";
import { ObjectsFeedBlock } from "@/components/blocks/objects-feed-block";
import { RenderBlocks } from "@/components/blocks/render-blocks";
import { asMedia, fill, hasText, mediaSrc, resolveLink } from "@/components/blocks/shared";
import type { BlockOf, BlockPageContext, LayoutBlock } from "@/components/blocks/types";
import type { FormKey } from "@/components/forms/form-dialog-provider";
import { FormTrigger } from "@/components/forms/form-trigger";
import { EdgeCompare, type HeroPhotoView } from "@/components/glass-types/edge-compare";
import { TableSection } from "@/components/glass-types/glass-type-sections";
import {
  MAX_SWATCHES,
  RelatedGlassTypes,
  type RelatedGlassTypeCard,
} from "@/components/glass-types/related-glass-types";
import { SamplesSnippet } from "@/components/glass-types/samples-snippet";
import type { SwatchData } from "@/components/glass-types/swatch";
import { toSwatchColor, toSwatchPatternKey } from "@/components/glass-types/swatch-patterns";
import {
  VariantsGrid,
  VariantsPicker,
  type VariantView,
} from "@/components/glass-types/variants-picker";
import { Button } from "@/components/ig/button";
import { Callout } from "@/components/ig/callout";
import { Container } from "@/components/ig/container";
import { NOT_FOUND_METADATA, NotFoundResponse } from "@/components/page/not-found-response";
import { PageShell } from "@/components/page/page-shell";
import { DRAWING_CTA_LABEL, QUIZ_CTA_LABEL, QuizLink, fillLabel } from "@/components/page/quiz-cta";
import { InfoPanels, type InfoPanel } from "@/components/processing/info-panels";
import { ProcessingHero } from "@/components/processing/processing-hero";
import {
  ServiceCallouts,
  splitButton,
  type CalloutButton,
  type ServiceCallout,
} from "@/components/processing/service-callouts";
import { ServiceFaq } from "@/components/processing/service-faq";
import { ServiceLayout, hasAboutSection } from "@/components/processing/service-layout";
import { SpecTiles, isSpecTable, specTilesFrom } from "@/components/processing/spec-tiles";
import { UseCases } from "@/components/processing/use-cases";
import { RichText } from "@/components/rich-text/rich-text";
import { getConditions, getPlaceholderContext, getSnippets } from "@/lib/cms/globals";
import { getDocBySlug, listPublished, redirectIfExists } from "@/lib/cms/queries";
import { replacePlaceholders, type PlaceholderContext } from "@/lib/domain";
import { buildMetadata, resolveH1, resolveSeoText } from "@/lib/seo/metadata";
import { pickOgImage } from "@/lib/seo/og-image";
import type { GlassType } from "@/payload-types";
import type { Metadata } from "next";

/**
 * Template «вид стекла» (task 24, restyled to the Paper mockup `2560_glass_matovoe`): матовое,
 * тонированное, крашеное по RAL, осветлённое, для мебели, рифлёное, гнутое under
 * `/zakalennoe-steklo/<slug>/` (route of task 23) and триплекс at `/tripleks/` (own route).
 * Field → section mapping and the seed rules: `src/seed/content/glass-types/README.md`.
 *
 * Section order (the design of the processing service pages, `src/components/processing/`):
 *  1. hero — H1, intro, terms checklist (`conditions`), «Рассчитать стоимость» + the secondary
 *     form, `heroImage` behind a white fade (no image yet → the `.ig-ph` placeholder);
 *  2. hero photos (`heroPhotos`, captioned photo pair) — when the type has them;
 *  3. specs — the `tables[]` entry with the columns «Параметр | Значение | Пояснение» as tiles;
 *  4. variants («Цвета», «Узоры»: picker or grid, note, plaque) — right after the first «about»
 *     section of the layout, or here when the layout has none;
 *  5. the other `tables[]` entries (site table section);
 *  6. `layout` (`ServiceLayout`): about (+ diagram / comparison table), use-cases (`cards`),
 *     other blocks as on any page; `twoColumns` blocks go to 13;
 *  7. «Где применяют» from `applications` (numbered cards);
 *  8. «Что важно знать до заказа» (`importantItems`: plaque with bold-lead lines; a last item
 *     without a lead made of one link is the pill button);
 *  9. «Образцы и цветопроба» (`showSamples`); 10. objects feed (`showObjects`);
 *  11. FAQ (two columns + FAQPage JSON-LD);
 *  12. «Другие виды стекла» — `relatedLinks` to glass types, topped up with the next types by
 *      `order`; other `relatedLinks` stay a link list;
 *  13. how-to-order — the `twoColumns` blocks as the cream panels, meeting the footer.
 * No conditions section and no closing buttons: the hero carries both.
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
  return buildMetadata({
    seo: doc.seo,
    path: glassTypePath(slug),
    fallbackTitle: doc.title,
    placeholders: await getPlaceholderContext(),
    // Generated placeholders (`gen-*`) never become og:image (task-38).
    image: pickOgImage([doc.seo?.ogImage]),
  });
}

/* ------------------------------------------------------------------------------------------ */
/* Data → view                                                                                */
/* ------------------------------------------------------------------------------------------ */

const HERO_PLACEHOLDER = "фото готовится";
const VARIANTS_HEADING_ID = "glass-variants-title";
const DEFAULT_VARIANTS_HEADING = "Варианты";
const DEFAULT_IMPORTANT_TITLE = "Что важно знать до заказа";
const APPLICATIONS_HEADING = "Где применяют";
const FAQ_HEADING = "Частые вопросы";
const DEFAULT_SAMPLES_KEY = "samples";
const OBJECTS_HEADING = "Объекты";
const OBJECTS_LIMIT = 4;
const RELATED_COUNT = 3;

type Variant = NonNullable<GlassType["variants"]>[number];
type RelatedLink = NonNullable<GlassType["relatedLinks"]>[number];

/** Hero photo: the original upload (the hero spans up to 1920 px; `next/image` resizes it). */
function heroMedia(value: unknown): { src: string; alt: string } | null {
  const media = asMedia(value);
  const src = media ? mediaSrc(media) : null;
  return media && src ? { src, alt: media.alt || "" } : null;
}

/** Terms checklist of the hero: the `conditions` terms bar, placeholders filled. */
async function heroTerms(ctx: PlaceholderContext): Promise<string[]> {
  const conditions = await getConditions();
  return (conditions?.termsBar ?? []).map((item) => fill(item.text, ctx)).filter(Boolean);
}

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

const relationId = (value: unknown): string | null =>
  typeof value === "string"
    ? value
    : typeof value === "object" && value !== null && "id" in value
      ? String((value as { id: unknown }).id)
      : null;

/** Product whose published objects feed the objects section, when there is such an object. */
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

/** Id of a `relatedLinks` item that points at a glass type, else `null`. */
function relatedGlassTypeId(item: RelatedLink): string | null {
  const target = item.link?.type === "custom" ? null : item.link?.doc;
  if (!target || target.relationTo !== "glass-types") return null;
  return relationId(target.value);
}

/** Card text with a capital first letter (hub card texts are lower-case phrases of teksty/02). */
const capitalize = (text: string) => (text ? text[0]!.toUpperCase() + text.slice(1) : text);

/**
 * «Другие виды стекла»: the glass types pinned in `relatedLinks` (in their order), topped up
 * with the next published types by `order` (wrapping around) — three cards, never the page itself.
 */
async function relatedGlassTypes(
  doc: GlassType,
  ctx: PlaceholderContext
): Promise<RelatedGlassTypeCard[]> {
  const { docs } = await listPublished("glass-types", { sort: "order", limit: 50, depth: 0 });
  const others = docs.filter((type) => Boolean(type.path));
  const position = others.findIndex((type) => type.id === doc.id);
  // The types after the current one first, then from the start: neighbours, not always the top.
  const ordered = [...others.slice(position + 1), ...others.slice(0, Math.max(position, 0))].filter(
    (type) => type.id !== doc.id
  );
  const byId = new Map(ordered.map((type) => [type.id, type]));
  const pinned = (doc.relatedLinks ?? [])
    .map(relatedGlassTypeId)
    .flatMap((id) => (id && byId.has(id) ? [byId.get(id)!] : []));
  return [...new Set([...pinned, ...ordered])].slice(0, RELATED_COUNT).map((type) => ({
    key: type.id,
    href: type.path!,
    title: fill(type.card?.title, ctx) || fill(type.title, ctx),
    text: capitalize(fill(type.card?.text, ctx).trim()),
    swatches: (type.variants ?? [])
      .filter((variant) => variant.swatchKind === "color" || !variant.swatchKind)
      .map(toSwatch)
      .filter((swatch) => swatch.kind === "color")
      .slice(0, MAX_SWATCHES),
  }));
}

/** `relatedLinks` that do not point at a glass type: the site link list (bridge / buttons). */
function otherRelatedLinks(doc: GlassType): BlockOf<"linkList"> | null {
  const items = (doc.relatedLinks ?? []).filter(
    (item) => !relatedGlassTypeId(item) && resolveLink(item.link)
  );
  if (items.length === 0) return null;
  const withDescriptions = items.some((item) => hasText(item.description));
  return {
    blockType: "linkList",
    id: "glass-related-links",
    variant: withDescriptions ? "bridge" : "buttons",
    items,
  };
}

const hasContent = (state: { root?: { children?: unknown[] } } | null | undefined) =>
  (state?.root?.children?.length ?? 0) > 0;

/**
 * «Что важно знать до заказа» as a plaque: items with a lead are the lines; the last item
 * without a lead whose text is a single link (`→ [Матирование](/obrabotka-stekla/matirovanie/)`)
 * becomes the pill button. Other lead-less items stay lines.
 */
function importantCallout(doc: GlassType, ctx: PlaceholderContext): ServiceCallout | null {
  const items = (doc.importantItems ?? []).filter(
    (item) => hasText(item.lead) || hasContent(item.text)
  );
  if (items.length === 0) return null;
  let button: CalloutButton | null = null;
  const last = items.at(-1)!;
  if (!hasText(last.lead)) {
    const split = splitButton(last.text);
    if (split.button && !split.body) {
      button = split.button;
      items.pop();
    }
  }
  return {
    key: "important",
    tone: "warning",
    title: fill(doc.importantTitle, ctx) || DEFAULT_IMPORTANT_TITLE,
    body: null,
    items: items.map((item, index) => ({
      key: item.id ?? String(index),
      lead: fill(item.lead, ctx).trim(),
      body: item.text ?? null,
    })),
    button,
  };
}

/** `twoColumns` blocks → panels of the closing cream block (left, then right; empty skipped). */
function columnPanels(layout: readonly LayoutBlock[], ctx: PlaceholderContext): InfoPanel[] {
  return layout
    .filter((block): block is BlockOf<"twoColumns"> => block.blockType === "twoColumns")
    .flatMap((block, index): InfoPanel[] => {
      const key = block.id ?? String(index);
      return (["left", "right"] as const).flatMap((side) => {
        const column = block[side];
        if (!column || (!hasText(column.heading) && !hasContent(column.body))) return [];
        return [
          {
            key: `${key}-${side}`,
            heading: fill(column.heading, ctx) || null,
            headingId: `glass-info-${key}-${side}-title`,
            body: column.body ?? null,
            lead: true,
          },
        ];
      });
    });
}

/* ------------------------------------------------------------------------------------------ */
/* Sections                                                                                   */
/* ------------------------------------------------------------------------------------------ */

interface GlassButtonsProps {
  doc: GlassType;
  slug: string;
  path: string;
  ctx: PlaceholderContext;
}

/** «Рассчитать стоимость» + the secondary form («Отправить чертёж» by default). */
function GlassButtons({ doc, slug, path, ctx }: GlassButtonsProps) {
  const prefill = doc.quizPrefill;
  const primaryLabel = fillLabel(prefill?.ctaLabel, ctx) || QUIZ_CTA_LABEL;
  const form = prefill?.secondaryForm ?? "drawing";
  const formKey: FormKey | null = form === "none" ? null : form;
  const secondaryLabel = fillLabel(prefill?.secondaryLabel, ctx) || DRAWING_CTA_LABEL;
  return (
    <>
      <QuizLink prefill={prefill} src={path} ctx={ctx}>
        {primaryLabel}
      </QuizLink>
      {formKey ? (
        <FormTrigger formKey={formKey} params={{ label: secondaryLabel, source: slug }} asChild>
          <Button
            variant="secondary"
            size="l"
            leftIcon={<FileText aria-hidden="true" strokeWidth={2} />}
          >
            {secondaryLabel}
          </Button>
        </FormTrigger>
      ) : null}
    </>
  );
}

/** Captioned photo pair of `heroPhotos` (осветлённое: «Торец обычного / осветлённого стекла»). */
function HeroPhotos({ photos }: { photos: HeroPhotoView[] }) {
  if (photos.length === 0) return null;
  return (
    <section aria-label="Фото" className="pt-16 max-md:pt-12 max-sm:pt-8">
      <Container>
        <EdgeCompare photos={photos} className="max-w-[640px]" />
      </Container>
    </section>
  );
}

/** «Цвета» / «Узоры»: picker (variants say where they are used) or grid, note and plaque. */
function VariantsSection({ doc, ctx }: { doc: GlassType; ctx: PlaceholderContext }) {
  const variants = variantViews(doc.variants, ctx);
  const callout = doc.variantsCallout;
  const hasCallout = hasContent(callout?.body) || hasText(callout?.title);
  if (variants.length === 0) return null;
  const interactive = variants.some((variant) => variant.application !== null);
  return (
    <section
      aria-labelledby={VARIANTS_HEADING_ID}
      className="py-16 max-md:py-12 max-sm:py-8"
      data-testid="glass-variants"
    >
      <Container className="flex flex-col gap-10 max-sm:gap-6">
        <h2 id={VARIANTS_HEADING_ID} className="ig-h2 text-primary-dark m-0 text-balance">
          {fill(doc.variantsHeading, ctx).trim() || DEFAULT_VARIANTS_HEADING}
        </h2>
        {interactive ? (
          <VariantsPicker items={variants} labelledBy={VARIANTS_HEADING_ID} />
        ) : (
          <VariantsGrid items={variants} />
        )}
        {hasContent(doc.variantsNote) ? (
          <RichText data={doc.variantsNote} ctx={ctx} className="max-w-[880px]" />
        ) : null}
        {hasCallout ? (
          <Callout
            variant="info"
            className="max-w-[1100px]"
            {...(hasText(callout?.title) ? { title: fill(callout.title, ctx) } : {})}
          >
            <RichText data={callout?.body} ctx={ctx} disableContainer />
          </Callout>
        ) : null}
      </Container>
    </section>
  );
}

/** «Где применяют» from `applications`: numbered cards, 4 in a row for four items. */
function Applications({ doc, ctx }: { doc: GlassType; ctx: PlaceholderContext }) {
  const items = (doc.applications ?? []).filter((item) => hasText(item.text));
  if (items.length === 0) return null;
  return (
    <UseCases
      heading={APPLICATIONS_HEADING}
      headingId="glass-applications-title"
      columns={items.length === 4 ? 4 : 3}
      items={items.map((item, index) => ({
        key: item.id ?? String(index),
        title: fill(item.text, ctx),
        text: fill(item.description, ctx),
        href: resolveLink(item.link)?.href ?? null,
      }))}
    />
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Page                                                                                       */
/* ------------------------------------------------------------------------------------------ */

/** Glass-type page (server component). Signature is the contract consumed by task 23. */
export async function GlassTypePage({ slug }: { slug: string }): Promise<JSX.Element> {
  const path = glassTypePath(slug);
  const doc = await loadGlassType(slug);
  if (!doc) {
    await redirectIfExists(path);
    return <NotFoundResponse />;
  }

  const ctx = await getPlaceholderContext();
  const [terms, snippets, objectsProduct, related] = await Promise.all([
    heroTerms(ctx),
    doc.showSamples ? getSnippets() : Promise.resolve(null),
    objectsProductId(doc),
    relatedGlassTypes(doc, ctx),
  ]);

  const title = resolveH1(doc.seo, doc.title, ctx);
  const crumbLabel = resolveSeoText(doc.breadcrumbLabel || doc.title, ctx);
  const media = heroMedia(doc.heroImage);
  const layout = (doc.layout ?? []) as LayoutBlock[];
  // The typed FAQ below owns `doc.faq`: the blocks get no `faq`, so a FAQ block in `doc` mode
  // cannot duplicate it.
  const blockPage: BlockPageContext = { path, title, quizPrefill: doc.quizPrefill };
  const tables = doc.tables ?? [];
  const otherTables = tables.filter(
    (table) =>
      !isSpecTable(table) && (table.columns ?? []).length > 0 && (table.rows ?? []).length > 0
  );
  const variants = <VariantsSection doc={doc} ctx={ctx} />;
  const aboutFirst = hasAboutSection(layout);
  const important = importantCallout(doc, ctx);
  const faq = (doc.faq ?? []).filter((item) => hasText(item.question));
  const relatedLinks = otherRelatedLinks(doc);

  // «Образцы и цветопроба».
  const samplesKey = doc.samplesSnippetKey?.trim() || DEFAULT_SAMPLES_KEY;
  const snippet = snippets?.items?.find((item) => item.key === samplesKey);
  const vid = doc.quizPrefill?.kind;

  return (
    // The how-to-order panels close the page and meet the footer (mockup): no conditions
    // section (the hero lists the terms), no quiz CTA (the hero has the button).
    <PageShell path={path} lastLabel={crumbLabel} showConditions={false} quiz={false}>
      <ProcessingHero
        title={title}
        media={media}
        placeholder={HERO_PLACEHOLDER}
        terms={terms}
        lead={
          hasContent(doc.intro) ? (
            <div data-testid="glass-intro">
              <RichText data={doc.intro} ctx={ctx} disableContainer />
            </div>
          ) : undefined
        }
        actions={<GlassButtons doc={doc} slug={slug} path={path} ctx={ctx} />}
      />
      <HeroPhotos photos={heroPhotoViews(doc.heroPhotos)} />
      <SpecTiles tiles={specTilesFrom(tables.filter(isSpecTable), ctx)} />
      {aboutFirst ? null : variants}
      {otherTables.map((table, index) => (
        <TableSection
          key={`table-${table.id ?? index}`}
          table={table}
          ctx={ctx}
          variant="bg"
          headingId={`glass-table-${index + 1}-title`}
        />
      ))}
      <ServiceLayout
        blocks={layout}
        ctx={ctx}
        page={blockPage}
        afterAbout={aboutFirst ? variants : null}
      />
      <Applications doc={doc} ctx={ctx} />
      <ServiceCallouts callouts={important ? [important] : []} ctx={ctx} />
      {doc.showSamples ? (
        <section aria-labelledby="glass-samples-title" className="py-8 max-sm:py-4">
          <Container>
            <SamplesSnippet
              content={snippet?.content ?? null}
              title={snippet?.title ? fill(snippet.title, ctx) : undefined}
              ctaLabel={snippet?.ctaLabel ? fill(snippet.ctaLabel, ctx) : undefined}
              formParams={{ source: slug, ...(vid ? { vid } : {}) }}
              ctx={ctx}
              headingId="glass-samples-title"
            />
          </Container>
        </section>
      ) : null}
      {objectsProduct ? (
        <ObjectsFeedBlock
          block={{
            blockType: "objectsFeed",
            mode: "byProduct",
            product: objectsProduct,
            limit: OBJECTS_LIMIT,
            heading: OBJECTS_HEADING,
          }}
          ctx={ctx}
          section={{ index: 0, variant: "bg", headingId: "glass-objects-title" }}
        />
      ) : null}
      <ServiceFaq
        heading={FAQ_HEADING}
        headingId="glass-faq-title"
        items={faq.map((item, index) => ({
          key: item.id ?? String(index),
          question: item.question,
          answer: item.answer,
        }))}
        ctx={ctx}
        // One FAQPage per page: a layout FAQ block that emits its own JSON-LD wins.
        jsonLd={faqJsonLdIndex(layout, blockPage) < 0}
      />
      <RelatedGlassTypes cards={related} hubPath={HUB_BASE} />
      {relatedLinks ? <RenderBlocks blocks={[relatedLinks]} ctx={ctx} page={blockPage} /> : null}
      <InfoPanels panels={columnPanels(layout, ctx)} ctx={ctx} attachedToFooter />
    </PageShell>
  );
}
