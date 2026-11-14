import { FileText } from "lucide-react";
import { CtaButtons } from "@/components/blocks/cta-buttons";
import { RenderBlocks } from "@/components/blocks/render-blocks";
import { asMedia, fill, hasText, mediaSrc } from "@/components/blocks/shared";
import type { BlockOf, BlockPageContext, LayoutBlock } from "@/components/blocks/types";
import type { FormKey } from "@/components/forms/form-dialog-provider";
import { FormTrigger } from "@/components/forms/form-trigger";
import { Button } from "@/components/ig/button";
import { Container } from "@/components/ig/container";
import { Placeholder } from "@/components/ig/placeholder";
import { NOT_FOUND_METADATA, NotFoundResponse } from "@/components/page/not-found-response";
import { pageBlockContext } from "@/components/page/page-context";
import { PageShell } from "@/components/page/page-shell";
import {
  DRAWING_CTA_LABEL,
  QUIZ_CTA_LABEL,
  QuizCta,
  QuizLink,
  fillLabel,
} from "@/components/page/quiz-cta";
import { InfoPanels, type InfoPanel } from "@/components/processing/info-panels";
import { ProcessingHero } from "@/components/processing/processing-hero";
import { ServiceCallouts, type ServiceCallout } from "@/components/processing/service-callouts";
import {
  RelatedServices,
  ServiceCards,
  type ServiceCardDoc,
} from "@/components/processing/service-cards";
import { ServiceLayout } from "@/components/processing/service-layout";
import { SpecTiles, specTilesFrom } from "@/components/processing/spec-tiles";
import { RichText, type RichTextData } from "@/components/rich-text/rich-text";
import { getConditions, getPlaceholderContext } from "@/lib/cms/globals";
import { getDocBySlug, getPageByPath, listPublished, redirectIfExists } from "@/lib/cms/queries";
import type { PlaceholderContext } from "@/lib/domain";
import { buildBreadcrumbs } from "@/lib/seo/breadcrumbs";
import { buildMetadata, resolveH1, resolveSeoText } from "@/lib/seo/metadata";
import { pickOgImage } from "@/lib/seo/og-image";
import { lexicalToPlainText } from "@/payload/utils/lexical-text";
import type { Media, ProcessingService } from "@/payload-types";
import type { Metadata } from "next";

/**
 * Section «Обработка стекла» (task 25, restyled to the Paper mockup `2560_obrabotka-stekla`):
 * the hub `/obrabotka-stekla/` (a `pages` document plus photo cards from the
 * `processing-services` collection) and the service template `/obrabotka-stekla/<slug>/`.
 *
 * Hub: crumbs → hero (first `hero` block: photo background, H1, lead, terms checklist, buttons)
 * → service cards → other blocks → the `twoColumns` blocks as the cream info block that closes
 * the page (the document hides the conditions section and the quiz CTA, so it meets the footer).
 *
 * Service page (Paper mockups `2560_service_*`; field → section mapping in
 * `src/seed/content/processing/README.md`): crumbs → hero (`heroImage`, intro, terms, buttons)
 * → specs (`tables[]` as tiles) → `layout` (about, calculator, use-cases, other blocks; see
 * `ServiceLayout`) → plaques (`callouts[]`) → «Что важно знать до заказа» → FAQ (+ FAQPage
 * JSON-LD) → «Другая обработка» (3 services) → how-to-order (`howToSpecify` + `twoColumns` as
 * the cream panels, meeting the footer). No conditions section and no final buttons: the hero
 * carries both.
 *
 * Static + ISR: no request APIs. 404 through `redirectIfExists` + `<NotFoundResponse />`.
 */

export const PROCESSING_HUB_PATH = "/obrabotka-stekla/";

/** Slugs are lowercase latin words joined by hyphens; anything else is a 404 without a query. */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Last breadcrumb per service (spec «Крошки»); unknown slugs fall back to the title. */
const BREADCRUMB_LABELS: Readonly<Record<string, string>> = {
  kromka: "Кромка",
  "otverstiya-i-vyrezy": "Отверстия и вырезы",
  facet: "Фацет",
  matirovanie: "Матирование",
  plenki: "Плёнки",
  pechat: "Печать",
};

/**
 * Photo placeholders (`.ig-ph`) for the «[Фото: …]» notes of teksty, shown under the hero while
 * a service has no `heroImage`.
 */
const PHOTO_PLACEHOLDERS: Readonly<Record<string, string>> = {
  matirovanie: "перегородка с полосой приватности; логотип на стеклянной двери",
};

const HOW_TO_SPECIFY_HEADING = "Как указать в чертеже";
const IMPORTANT_HEADING = "Что важно знать до заказа";
const FAQ_HEADING = "Частые вопросы";
const CALCULATOR_HEADING = "Калькулятор расстояний";
const CALCULATOR_ANCHOR = "kalkulyator";

/** Copy that must not be invented: an empty H1 is visibly marked for the editor. */
const MISSING_TEXT = "[…]";

type ServiceDoc = ProcessingService;

// ---------------------------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------------------------

async function getService(slug: string): Promise<ServiceDoc | null> {
  if (!SLUG_PATTERN.test(slug)) return null;
  return getDocBySlug("processing-services", slug);
}

const servicePath = (slug: string, doc?: ServiceDoc | null) =>
  doc?.path || `${PROCESSING_HUB_PATH}${slug}/`;

function ogImageOf(seo: { ogImage?: string | Media | null } | null | undefined) {
  // Generated placeholders (`gen-*`) never become og:image (task-38, `pickOgImage`).
  return pickOgImage([seo?.ogImage]);
}

/** Hero photo: the original upload (the hero spans up to 1920 px; `next/image` resizes it). */
function heroMedia(value: unknown, alt?: string | null): { src: string; alt: string } | null {
  const media = asMedia(value);
  const src = media ? mediaSrc(media) : null;
  if (!media || !src) return null;
  return { src, alt: alt?.trim() || media.alt || "" };
}

/** Terms checklist of the hero: the `conditions` terms bar (full or short), placeholders filled. */
async function heroTerms(
  mode: "full" | "short" | null | undefined,
  ctx: PlaceholderContext
): Promise<string[]> {
  const conditions = await getConditions();
  const items =
    mode === "short" && conditions?.termsBarShort?.length
      ? conditions.termsBarShort
      : (conditions?.termsBar ?? []);
  return items.map((item) => fill(item.text, ctx)).filter(Boolean);
}

// ---------------------------------------------------------------------------------------------
// Section rhythm
// ---------------------------------------------------------------------------------------------

const other = (variant: "bg" | "sf"): "bg" | "sf" => (variant === "bg" ? "sf" : "bg");

/**
 * Explicit `bg` ↔ `sf` backgrounds starting with `first` for blocks left on «auto»: the blocks
 * follow content rendered outside `RenderBlocks` (hero, cards, panels), so its index-based
 * rhythm would be off by that content. The hero (no section) and editor choices stay as they are.
 */
function withRhythm(blocks: readonly LayoutBlock[], first: "bg" | "sf"): LayoutBlock[] {
  let next = first;
  return blocks.map((block) => {
    if (block.blockType === "hero") return block;
    const background = "background" in block ? block.background : null;
    if (background && background !== "auto") return block;
    const variant = next;
    next = other(next);
    return { ...block, background: variant } as LayoutBlock;
  });
}

// ---------------------------------------------------------------------------------------------
// Service page: composed blocks and panels
// ---------------------------------------------------------------------------------------------

function hasContent(state: { root?: { children?: unknown[] } } | null | undefined): boolean {
  return (state?.root?.children?.length ?? 0) > 0;
}

/**
 * The document layout; with `hasHoleCalculator` and no `holesCalculator` block in it, the
 * default calculator (`#kalkulyator`) goes first.
 */
function layoutBlocks(doc: ServiceDoc): LayoutBlock[] {
  const layout = (doc.layout ?? []) as LayoutBlock[];
  const hasCalculator = layout.some((block) => block.blockType === "holesCalculator");
  if (!doc.hasHoleCalculator || hasCalculator) return layout;
  return [
    {
      blockType: "holesCalculator",
      id: "processing-holes-calculator",
      heading: CALCULATOR_HEADING,
      anchorId: CALCULATOR_ANCHOR,
    },
    ...layout,
  ];
}

/**
 * «Как указать в чертеже» as a panel. A teksty heading leading the rich text («Как указать
 * отверстие в чертеже») becomes the panel heading instead of the template one.
 */
function howToSpecifyPanel(doc: ServiceDoc, ctx: PlaceholderContext): InfoPanel | null {
  const state = doc.howToSpecify;
  if (!state || !hasContent(state)) return null;
  const [first, ...rest] = state.root.children as Array<{ type?: unknown }>;
  const leadsWithHeading = first?.type === "heading";
  const heading = leadsWithHeading
    ? fill(lexicalToPlainText({ root: { ...state.root, children: [first] } }), ctx)
    : HOW_TO_SPECIFY_HEADING;
  const body: RichTextData = leadsWithHeading
    ? { ...state, root: { ...state.root, children: rest } }
    : state;
  return {
    key: "how-to-specify",
    heading,
    headingId: "processing-how-to-specify-title",
    body,
    lead: true,
  };
}

/**
 * «how-to-order» panels of a service page: «Как указать в чертеже» (`howToSpecify`), then the
 * columns of the `twoColumns` blocks of the layout (2 or 3 panels in the mockups).
 */
function servicePanels(doc: ServiceDoc, ctx: PlaceholderContext): InfoPanel[] {
  const howTo = howToSpecifyPanel(doc, ctx);
  const layout = (doc.layout ?? []) as LayoutBlock[];
  return [...(howTo ? [howTo] : []), ...columnPanels(layout.filter(isTwoColumns), ctx)];
}

/** Plaques of a service page (`callouts[]`). */
function serviceCallouts(doc: ServiceDoc, ctx: PlaceholderContext): ServiceCallout[] {
  return (doc.callouts ?? []).flatMap((callout, index): ServiceCallout[] => {
    const title = fill(callout.title, ctx);
    if (!title && !hasContent(callout.body)) return [];
    return [
      {
        key: callout.id ?? String(index),
        tone: callout.tone === "info" ? "info" : "warning",
        title,
        body: callout.body ?? null,
      },
    ];
  });
}

const RELATED_COUNT = 3;

type RelatedLink = NonNullable<ServiceDoc["relatedLinks"]>[number];

/** Id of a `relatedLinks` item that points at a processing service, else `null`. */
function relatedServiceId(item: RelatedLink): string | null {
  const target = item.link?.type === "custom" ? null : item.link?.doc;
  if (!target || target.relationTo !== "processing-services") return null;
  return typeof target.value === "string" ? target.value : target.value.id;
}

/**
 * «Другая обработка»: the services pinned in `relatedLinks` (in their order), topped up with the
 * first other published services by `order` — three cards, never the current page.
 */
async function relatedServices(doc: ServiceDoc): Promise<ServiceCardDoc[]> {
  // Depth 1: the cards need the populated `heroImage` / `card.image`.
  const { docs } = await listPublished("processing-services", {
    sort: "order",
    limit: 50,
    depth: 1,
  });
  const others = docs.filter((service) => service.id !== doc.id && Boolean(service.path));
  const byId = new Map(others.map((service) => [service.id, service]));
  const pinned = (doc.relatedLinks ?? [])
    .map(relatedServiceId)
    .flatMap((id) => (id && byId.has(id) ? [byId.get(id)!] : []));
  return [...new Set([...pinned, ...others])].slice(0, RELATED_COUNT);
}

function trailingBlocks(doc: ServiceDoc): LayoutBlock[] {
  const blocks: LayoutBlock[] = [];

  const important = (doc.importantItems ?? []).filter(
    (item) => Boolean(item.lead?.trim()) || hasContent(item.text)
  );
  if (important.length > 0) {
    blocks.push({
      blockType: "callout",
      id: "processing-important",
      heading: doc.importantTitle?.trim() || IMPORTANT_HEADING,
      tone: "info",
      items: important,
    });
  }

  // Links to processing services are the «Другая обработка» cards; the rest stay a link list.
  const related = (doc.relatedLinks ?? []).filter((item) => !relatedServiceId(item));
  if (related.length > 0) {
    const withDescriptions = related.some((item) => Boolean(item.description?.trim()));
    blocks.push({
      blockType: "linkList",
      id: "processing-related",
      variant: withDescriptions ? "bridge" : "buttons",
      items: related,
    });
  }

  if ((doc.faq ?? []).length > 0) {
    blocks.push({ blockType: "faq", id: "processing-faq", heading: FAQ_HEADING, mode: "doc" });
  }

  return blocks;
}

// ---------------------------------------------------------------------------------------------
// Service page: buttons, photo placeholder
// ---------------------------------------------------------------------------------------------

interface ServiceCtas {
  primaryLabel: string;
  secondary: { formKey: FormKey; label: string } | null;
}

function serviceCtas(doc: ServiceDoc, ctx: PlaceholderContext): ServiceCtas {
  const prefill = doc.quizPrefill;
  const primaryLabel =
    fillLabel(doc.ctaPrimaryLabel, ctx) || fillLabel(prefill?.ctaLabel, ctx) || QUIZ_CTA_LABEL;
  const form = prefill?.secondaryForm ?? "drawing";
  const label =
    fillLabel(doc.ctaSecondaryLabel, ctx) ||
    fillLabel(prefill?.secondaryLabel, ctx) ||
    DRAWING_CTA_LABEL;
  return { primaryLabel, secondary: form === "none" ? null : { formKey: form, label } };
}

interface CtaButtonsProps {
  doc: ServiceDoc;
  slug: string;
  path: string;
  ctas: ServiceCtas;
  ctx: PlaceholderContext;
}

function ServiceButtons({ doc, slug, path, ctas, ctx }: CtaButtonsProps) {
  return (
    <>
      <QuizLink prefill={doc.quizPrefill} src={path} ctx={ctx}>
        {ctas.primaryLabel}
      </QuizLink>
      {ctas.secondary ? (
        <FormTrigger
          formKey={ctas.secondary.formKey}
          params={{ label: ctas.secondary.label, source: slug }}
          asChild
        >
          <Button
            variant="secondary"
            size="l"
            leftIcon={<FileText aria-hidden="true" strokeWidth={2} />}
          >
            {ctas.secondary.label}
          </Button>
        </FormTrigger>
      ) : null}
    </>
  );
}

/** The «[Фото: …]» placeholder of the page while it has no `heroImage` (if teksty have one). */
function PhotoPlaceholder({ slug }: { slug: string }) {
  const label = PHOTO_PLACEHOLDERS[slug];
  if (!label) return null;
  return (
    <Container className="pb-16 max-sm:pb-10">
      <div className="max-w-[900px]">
        <Placeholder ratio="16/9" label={label} className="rounded-xl" />
      </div>
    </Container>
  );
}

// ---------------------------------------------------------------------------------------------
// Service page
// ---------------------------------------------------------------------------------------------

export async function generateProcessingMetadata(slug: string): Promise<Metadata> {
  const doc = await getService(slug);
  if (!doc) return NOT_FOUND_METADATA;
  return buildMetadata({
    seo: doc.seo,
    path: servicePath(slug, doc),
    fallbackTitle: doc.title,
    placeholders: await getPlaceholderContext(),
    image: ogImageOf(doc.seo),
  });
}

export async function ProcessingServicePage({ slug }: { slug: string }) {
  const doc = await getService(slug);
  if (!doc) {
    await redirectIfExists(servicePath(slug));
    return <NotFoundResponse />;
  }

  const ctx = await getPlaceholderContext();
  const path = servicePath(slug, doc);
  const title = resolveH1(doc.seo, doc.title, ctx);
  const crumbs = buildBreadcrumbs(path, {
    lastLabel: BREADCRUMB_LABELS[slug] ?? resolveSeoText(doc.title, ctx),
  });
  const blockPage: BlockPageContext = {
    path,
    title,
    faq: doc.faq,
    quizPrefill: doc.quizPrefill,
  };
  const ctas = serviceCtas(doc, ctx);
  const media = heroMedia(doc.heroImage);
  const panels = servicePanels(doc, ctx);
  const related = await relatedServices(doc);

  // Only bg is drawn now (`sf` renders as `bg`), the rhythm just keeps editor choices explicit.
  const contentBlocks = withRhythm(layoutBlocks(doc), "bg");
  const closingBlocks = withRhythm(trailingBlocks(doc), "bg");

  return (
    // The how-to-order panels close the page and meet the footer (mockup): no conditions
    // section (the hero lists the terms), no quiz CTA (the hero has the button).
    <PageShell path={path} breadcrumbs={crumbs} showConditions={false} quiz={false}>
      <ProcessingHero
        title={title}
        media={media}
        terms={await heroTerms("full", ctx)}
        lead={
          hasContent(doc.intro) ? (
            <div data-testid="processing-intro">
              <RichText data={doc.intro} ctx={ctx} disableContainer />
            </div>
          ) : undefined
        }
        actions={<ServiceButtons doc={doc} slug={slug} path={path} ctas={ctas} ctx={ctx} />}
      />

      {media ? null : <PhotoPlaceholder slug={slug} />}

      <SpecTiles tiles={specTilesFrom(doc.tables, ctx)} />
      <ServiceLayout blocks={contentBlocks} ctx={ctx} page={blockPage} />
      <ServiceCallouts callouts={serviceCallouts(doc, ctx)} ctx={ctx} />
      <RenderBlocks blocks={closingBlocks} ctx={ctx} page={blockPage} />
      <RelatedServices services={related} ctx={ctx} hubPath={PROCESSING_HUB_PATH} />
      <InfoPanels panels={panels} ctx={ctx} attachedToFooter />
    </PageShell>
  );
}

// ---------------------------------------------------------------------------------------------
// Hub
// ---------------------------------------------------------------------------------------------

export async function generateProcessingHubMetadata(): Promise<Metadata> {
  const page = await getPageByPath(PROCESSING_HUB_PATH);
  if (!page) return NOT_FOUND_METADATA;
  return buildMetadata({
    seo: page.seo,
    path: PROCESSING_HUB_PATH,
    fallbackTitle: page.seo?.h1 || page.title,
    placeholders: await getPlaceholderContext(),
    image: ogImageOf(page.seo),
  });
}

/** The hub hero from the first `hero` block of the document. */
async function HubHero({
  block,
  ctx,
  page,
}: {
  block: BlockOf<"hero"> | null;
  ctx: PlaceholderContext;
  page: BlockPageContext;
}) {
  const title = fill(block?.titleOverride, ctx) || fill(page.title, ctx) || MISSING_TEXT;
  const lead = block ? fill(lexicalToPlainText(block.lead), ctx) : "";
  const terms = block && block.showTerms !== false ? await heroTerms(block.termsMode, ctx) : [];
  const hasButtons = (block?.buttons ?? []).some((button) => hasText(button.label));
  return (
    <ProcessingHero
      title={title}
      lead={lead || undefined}
      terms={terms}
      media={block ? heroMedia(block.image, fill(block.imageAlt, ctx)) : null}
      actions={
        hasButtons ? (
          <CtaButtons buttons={block?.buttons} ctx={ctx} page={page} className="contents" />
        ) : (
          <QuizCta
            prefill={page.quizPrefill}
            src={page.path ?? PROCESSING_HUB_PATH}
            ctx={ctx}
            className="contents"
          />
        )
      }
    />
  );
}

/** `twoColumns` blocks → panels of the info block (left, then right; empty columns skipped). */
function columnPanels(blocks: readonly BlockOf<"twoColumns">[], ctx: PlaceholderContext) {
  return blocks.flatMap((block, index): InfoPanel[] => {
    const key = block.id ?? String(index);
    return (["left", "right"] as const).flatMap((side) => {
      const column = block[side];
      if (!column || (!hasText(column.heading) && !hasContent(column.body))) return [];
      return [
        {
          key: `${key}-${side}`,
          heading: fill(column.heading, ctx) || null,
          headingId: `processing-info-${key}-${side}-title`,
          body: column.body ?? null,
          lead: true,
        },
      ];
    });
  });
}

const isTwoColumns = (block: LayoutBlock): block is BlockOf<"twoColumns"> =>
  block.blockType === "twoColumns";

/**
 * Hub: the `pages` document `/obrabotka-stekla/` — its first block (the hero), the service
 * cards from the collection, the remaining blocks, and its `twoColumns` blocks as the closing
 * info block.
 */
export async function ProcessingHubPage() {
  const page = await getPageByPath(PROCESSING_HUB_PATH);
  if (!page) {
    await redirectIfExists(PROCESSING_HUB_PATH);
    return <NotFoundResponse />;
  }

  const ctx = await getPlaceholderContext();
  const blockPage = pageBlockContext(page, PROCESSING_HUB_PATH, ctx);
  // Depth 1: the cards need the populated `heroImage` / `card.image`.
  const services = await listPublished("processing-services", {
    sort: "order",
    limit: 50,
    depth: 1,
  });
  const layout = (page.layout ?? []) as LayoutBlock[];
  const [first, ...rest] = layout;
  const hero = first?.blockType === "hero" ? first : null;
  const afterHero = hero ? rest : layout;
  const panels = columnPanels(afterHero.filter(isTwoColumns), ctx);
  const others = afterHero.filter((block) => !isTwoColumns(block));
  // With the conditions section and the quiz CTA hidden the info block meets the footer.
  const closesPage = Boolean(page.hideConditions && page.hideQuizCta);

  return (
    <PageShell
      path={PROCESSING_HUB_PATH}
      breadcrumbLabel={resolveSeoText(page.breadcrumbLabel || page.title, ctx)}
      showConditions={!page.hideConditions}
      quiz={page.hideQuizCta ? false : (page.quizPrefill ?? {})}
    >
      <HubHero block={hero} ctx={ctx} page={blockPage} />
      <ServiceCards services={services.docs} ctx={ctx} />
      <RenderBlocks blocks={withRhythm(others, "bg")} ctx={ctx} page={blockPage} />
      <InfoPanels panels={panels} ctx={ctx} attachedToFooter={closesPage} />
    </PageShell>
  );
}
