import { FileText } from "lucide-react";
import { RenderBlocks } from "@/components/blocks/render-blocks";
import { BlockImage, asMedia } from "@/components/blocks/shared";
import type { BlockPageContext, LayoutBlock } from "@/components/blocks/types";
import type { FormKey } from "@/components/forms/form-dialog-provider";
import { FormTrigger } from "@/components/forms/form-trigger";
import { Breadcrumbs } from "@/components/ig/breadcrumbs";
import { Button } from "@/components/ig/button";
import { Container } from "@/components/ig/container";
import { PageHero } from "@/components/ig/page-hero";
import { Placeholder } from "@/components/ig/placeholder";
import { Section } from "@/components/ig/section";
import { NOT_FOUND_METADATA, NotFoundResponse } from "@/components/page/not-found-response";
import { pageBlockContext } from "@/components/page/page-context";
import { PageShell } from "@/components/page/page-shell";
import { DRAWING_CTA_LABEL, QUIZ_CTA_LABEL, QuizLink, fillLabel } from "@/components/page/quiz-cta";
import { OperationsTable } from "@/components/processing/operations-table";
import { RichText } from "@/components/rich-text/rich-text";
import { getPlaceholderContext } from "@/lib/cms/globals";
import { getDocBySlug, getPageByPath, listPublished, redirectIfExists } from "@/lib/cms/queries";
import type { PlaceholderContext } from "@/lib/domain";
import { buildBreadcrumbs } from "@/lib/seo/breadcrumbs";
import { buildMetadata, resolveH1, resolveSeoText } from "@/lib/seo/metadata";
import { cn } from "@/lib/utils";
import type { Media, ProcessingService } from "@/payload-types";
import type { Metadata } from "next";

/**
 * Section «Обработка стекла» (task 25): the hub `/obrabotka-stekla/` (a `pages` document with
 * the operations table from the `processing-services` collection) and the service template
 * `/obrabotka-stekla/<slug>/` (`Holes.dc.html`, `Constr.dc.html`).
 *
 * Service page order: hero (crumbs inside, H1, intro, buttons) → photo → `tables[]` →
 * `layout` → «Как указать в чертеже» → «Что важно знать до заказа» → callouts → related links →
 * FAQ (+ FAQPage JSON-LD) → final buttons → conditions (`PageShell`). Everything between the
 * hero and the final buttons is rendered by ONE `RenderBlocks` pass over blocks composed from the
 * document fields: one FAQPage per page, unique heading ids and the `bg` ↔ `sf` rhythm.
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
 * Photo placeholders (`.ig-ph`) for the «[Фото: …]» notes of teksty until real photos arrive
 * (task 38 uploads them into `heroImage`).
 */
const PHOTO_PLACEHOLDERS: Readonly<Record<string, string>> = {
  facet: "зеркало с фацетом крупным планом; схема сечения — фацет и обычная кромка",
  matirovanie: "перегородка с полосой приватности; логотип на стеклянной двери",
};

/** Pages whose teksty list the form button before «Рассчитать стоимость» at the end. */
const SECONDARY_FIRST_SLUGS: ReadonlySet<string> = new Set(["otverstiya-i-vyrezy", "matirovanie"]);

const HOW_TO_SPECIFY_HEADING = "Как указать в чертеже";
const IMPORTANT_HEADING = "Что важно знать до заказа";
const FAQ_HEADING = "Частые вопросы";
const CALCULATOR_HEADING = "Калькулятор расстояний";
const CALCULATOR_ANCHOR = "kalkulyator";

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
  const media = asMedia(seo?.ogImage);
  return media?.url ? { url: media.url, alt: media.alt ?? null } : null;
}

// ---------------------------------------------------------------------------------------------
// Section rhythm
// ---------------------------------------------------------------------------------------------

const other = (variant: "bg" | "sf"): "bg" | "sf" => (variant === "bg" ? "sf" : "bg");

/**
 * Explicit `bg` ↔ `sf` backgrounds starting with `first` for blocks left on «auto»: the blocks
 * follow content rendered outside `RenderBlocks` (hero, tables, photo), so its index-based
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

/** Background after `count` alternating sections that started with `first`. */
const variantAfter = (first: "bg" | "sf", count: number): "bg" | "sf" =>
  count % 2 === 0 ? first : other(first);

// ---------------------------------------------------------------------------------------------
// Service page: composed blocks
// ---------------------------------------------------------------------------------------------

/** Lexical state that starts with a heading (the teksty heading replaces the template one). */
function startsWithHeading(state: ServiceDoc["howToSpecify"]): boolean {
  const first = state?.root?.children?.[0] as { type?: unknown } | undefined;
  return first?.type === "heading";
}

function hasContent(state: { root?: { children?: unknown[] } } | null | undefined): boolean {
  return (state?.root?.children?.length ?? 0) > 0;
}

/** `tables[]` of the document as `table` blocks (lead → section sub). */
function tableBlocks(doc: ServiceDoc): LayoutBlock[] {
  return (doc.tables ?? []).map((table, index) => ({
    blockType: "table" as const,
    id: `processing-table-${table.id ?? index}`,
    heading: table.heading ?? null,
    sub: table.lead ?? null,
    table: {
      role: table.role ?? null,
      mobileMode: table.mobileMode ?? null,
      columns: table.columns ?? [],
      rows: table.rows ?? [],
      footnote: table.footnote ?? null,
    },
  }));
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

function trailingBlocks(doc: ServiceDoc): LayoutBlock[] {
  const blocks: LayoutBlock[] = [];

  if (hasContent(doc.howToSpecify) && doc.howToSpecify) {
    blocks.push({
      blockType: "richText",
      id: "processing-how-to-specify",
      heading: startsWithHeading(doc.howToSpecify) ? null : HOW_TO_SPECIFY_HEADING,
      content: doc.howToSpecify,
    });
  }

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

  (doc.callouts ?? []).forEach((callout, index) => {
    if (!callout.title?.trim() && !hasContent(callout.body)) return;
    blocks.push({
      blockType: "callout",
      id: `processing-callout-${callout.id ?? index}`,
      tone: callout.tone ?? "warning",
      title: callout.title ?? null,
      body: callout.body ?? null,
    });
  });

  const related = doc.relatedLinks ?? [];
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
// Service page: hero, photo, final buttons
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
  /** Final row: some pages list the form button first (teksty order). */
  secondaryFirst?: boolean | undefined;
}

function ServiceButtons({ doc, slug, path, ctas, ctx, secondaryFirst = false }: CtaButtonsProps) {
  const primary = (
    <QuizLink key="quiz" prefill={doc.quizPrefill} src={path} ctx={ctx}>
      {ctas.primaryLabel}
    </QuizLink>
  );
  const secondary = ctas.secondary ? (
    <FormTrigger
      key="form"
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
  ) : null;
  return <>{secondaryFirst ? [secondary, primary] : [primary, secondary]}</>;
}

/** `heroImage`, otherwise the «[Фото: …]» placeholder of the page (if teksty have one). */
function ServicePhoto({ doc, slug }: { doc: ServiceDoc; slug: string }) {
  const media = asMedia(doc.heroImage);
  const placeholder = PHOTO_PLACEHOLDERS[slug];
  if (!media && !placeholder) return null;
  // Continues the hero background (no section padding of its own).
  return (
    <div className="bg-bg">
      <Container className="pb-16 max-sm:pb-10">
        <div className="max-w-[900px]">
          {media ? (
            <BlockImage
              media={media}
              size="hero"
              sizes="(max-width: 1100px) 100vw, 900px"
              frameClassName="aspect-[16/9] rounded-xl"
            />
          ) : (
            <Placeholder ratio="16/9" label={placeholder ?? ""} className="rounded-xl" />
          )}
        </div>
      </Container>
    </div>
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

  // The hero (and the photo under it) is `bg`; the composed blocks start on `sf`.
  const blocksStart = "sf";
  const blocks = withRhythm(
    [...tableBlocks(doc), ...layoutBlocks(doc), ...trailingBlocks(doc)],
    blocksStart
  );
  const autoCount = blocks.filter((block) => block.blockType !== "hero").length;
  const finalVariant = variantAfter(blocksStart, autoCount);

  return (
    <PageShell path={path} breadcrumbs={crumbs} hideBreadcrumbs showConditions quiz={false}>
      <PageHero
        variant="p5-top"
        title={title}
        breadcrumbs={<Breadcrumbs items={crumbs} />}
        actions={<ServiceButtons doc={doc} slug={slug} path={path} ctas={ctas} ctx={ctx} />}
      >
        {hasContent(doc.intro) ? (
          <div
            className="text-ink-3 max-w-[900px] text-pretty [&_p]:m-0 [&_p]:text-(length:--ig-lead-m-size) [&_p]:leading-(--ig-lead-m-lh) [&_p+p]:mt-3"
            data-testid="processing-intro"
          >
            <RichText data={doc.intro} ctx={ctx} disableContainer />
          </div>
        ) : null}
      </PageHero>

      <ServicePhoto doc={doc} slug={slug} />

      <RenderBlocks blocks={blocks} ctx={ctx} page={blockPage} />

      <Section variant={finalVariant} aria-label="Действия">
        <div
          className={cn(
            "flex flex-wrap justify-center gap-3",
            "max-sm:flex-col max-sm:items-stretch max-sm:[&_.ig-btn]:w-full"
          )}
          data-testid="processing-final-cta"
        >
          <ServiceButtons
            doc={doc}
            slug={slug}
            path={path}
            ctas={ctas}
            ctx={ctx}
            secondaryFirst={SECONDARY_FIRST_SLUGS.has(slug)}
          />
        </div>
      </Section>
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

/**
 * Hub: the `pages` document `/obrabotka-stekla/` — its first block (the hero), then the
 * operations table built from the collection, then the rest of the layout.
 */
export async function ProcessingHubPage() {
  const page = await getPageByPath(PROCESSING_HUB_PATH);
  if (!page) {
    await redirectIfExists(PROCESSING_HUB_PATH);
    return <NotFoundResponse />;
  }

  const ctx = await getPlaceholderContext();
  const blockPage = pageBlockContext(page, PROCESSING_HUB_PATH, ctx);
  const services = await listPublished("processing-services", {
    sort: "order",
    limit: 50,
    depth: 0,
  });
  const layout = (page.layout ?? []) as LayoutBlock[];
  const [first, ...rest] = layout;
  const hasHero = first?.blockType === "hero";
  const afterTable = hasHero ? rest : layout;

  return (
    <PageShell
      path={PROCESSING_HUB_PATH}
      breadcrumbLabel={resolveSeoText(page.breadcrumbLabel || page.title, ctx)}
      showConditions={!page.hideConditions}
      quiz={page.hideQuizCta ? false : (page.quizPrefill ?? {})}
    >
      {hasHero ? (
        <RenderBlocks blocks={[first]} ctx={ctx} page={blockPage} />
      ) : (
        <Container className="pt-6 max-sm:pt-4">
          <h1 className="ig-h1 m-0">{blockPage.title}</h1>
        </Container>
      )}
      <OperationsTable services={services.docs} ctx={ctx} variant="sf" />
      <RenderBlocks blocks={withRhythm(afterTable, "bg")} ctx={ctx} page={blockPage} />
    </PageShell>
  );
}
