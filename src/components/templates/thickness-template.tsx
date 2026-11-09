import { cache } from "react";
import { FileText } from "lucide-react";
import { RenderBlocks } from "@/components/blocks/render-blocks";
import { asMedia, mediaSrc } from "@/components/blocks/shared";
import { DrawingPanel } from "@/components/forms/drawing-panel";
import { FormTrigger } from "@/components/forms/form-trigger";
import { Button } from "@/components/ig/button";
import { Container } from "@/components/ig/container";
import { NOT_FOUND_METADATA, NotFoundResponse } from "@/components/page/not-found-response";
import { PageShell } from "@/components/page/page-shell";
import { QuizLink, type QuizPrefill } from "@/components/page/quiz-cta";
import { ProcessingHero } from "@/components/processing/processing-hero";
import { ServiceFaq } from "@/components/processing/service-faq";
import { RichText } from "@/components/rich-text/rich-text";
import { PROCESSING_HUB_PATH, ZAK_TEMPLATE_COPY } from "@/components/zak-hub/copy";
import {
  anchorOf,
  HUB_SECTION_ANCHORS,
  processingCards as hubProcessingCards,
} from "@/components/zak-hub/hub-page";
import { ProcessingStrip, type ProcessingStripCard } from "@/components/zak-hub/processing-strip";
import { CreamBlock } from "@/components/zak-hub/zak-info";
import { getConditions, getPlaceholderContext, getPrices, getTechLimits } from "@/lib/cms/globals";
import {
  getPageByPath,
  getThicknessByN,
  getThicknessGroups,
  listPublished,
  redirectIfExists,
} from "@/lib/cms/queries";
import { priceState, replacePlaceholders, THICKNESSES } from "@/lib/domain";
import type { PlaceholderContext } from "@/lib/domain";
import { faqLd, JsonLd, thicknessProductLd } from "@/lib/seo/jsonld";
import { buildMetadata, resolveH1 } from "@/lib/seo/metadata";
import { pickOgImage } from "@/lib/seo/og-image";
import { buildThicknessView, thicknessHref, thicknessLabel } from "@/lib/thickness-view";
import { lexicalToPlainText } from "@/payload/utils/lexical-text";
import type { ProcessingService, Thickness, ThicknessGroup } from "@/payload-types";
import { HolesRules } from "./thickness/holes-rules";
import { Neighbors } from "./thickness/neighbors";
import { SpecTable } from "./thickness/spec-table";
import type { Metadata } from "next";

/**
 * Thickness card `/zakalennoe-steklo/{N}-mm/`: one template for 4, 5, 6, 8, 10, 12, 15 and
 * 19 mm, laid out by the approved Paper mockup `2560_zak_tolshchina_10mm` (2026-11):
 *
 * hero (photo `card.image`, H1, spec table, «Заказы от 50 м².», «Рассчитать стекло N мм» /
 * «Загрузить чертёж») → «Что входит в цену» + «Подберём толщину…» panels → holes scheme and
 * distances → «Обработка стекла N мм» (group text + the six processing services) → neighbour
 * thicknesses → extra `layout` blocks → cream block: FAQ and the dark drawing-form panel.
 *
 * Texts of the template are teksty/03; the group texts (selection, processing, FAQ) come from
 * `thickness-groups` unless the thickness overrides them; prices, weights and hole distances
 * come from the domain library. The 45-day rule decides the price, the title (`seo.title` ↔
 * `seo.titleNoPrice`) and the Product JSON-LD; the page is ISR (`revalidate` of the route).
 */

/** `^(4|5|6|8|10|12|15|19)-mm$` — anything else (`7-mm`, `010-mm`, `10-MM`) is not a card. */
const SLUG_PATTERN = new RegExp(`^(${THICKNESSES.join("|")})-mm$`);

/** `10-mm` → 10; `null` for any other slug. */
export function parseThicknessSlug(slug: string): number | null {
  const match = SLUG_PATTERN.exec(slug);
  return match ? Number(match[1]) : null;
}

/** Template copy (teksty/03). */
const TEXT = {
  h1: (n: number) => `Закалённое стекло ${n} мм`,
  includedTitle: "Что входит в цену",
  included: (n: number) =>
    `В цену «от» входят стекло толщиной ${n} мм, закалка и проверка параметров заказа. Отдельно считаются фигурная резка, обработка кромки и фацет, отверстия и вырезы, печать и матирование. Точная стоимость — в КП; цена в договоре фиксируется.`,
  podborTitle: "Подберём толщину под вашу нагрузку",
  podborAsk:
    "Опишите конструкцию — размер стекла, способ крепления, назначение, — и мы подберём толщину или схему триплекса.",
  podborButton: "Подобрать под нагрузку",
  obrabotkaTitle: (n: number) => `Обработка стекла ${n} мм`,
  holesTitle: (n: number) => `Отверстия в стекле ${n} мм — по ГОСТ 30698-2014`,
  neighborsTitle: "Соседние толщины",
  faqTitle: "Частые вопросы",
  drawingButton: "Загрузить чертёж",
  quizButton: (n: number) => `Рассчитать стекло ${n} мм`,
} as const;

const sourceOf = (n: number) => `thickness-${n}`;

/** Per-request memo: metadata and the page resolve the same thickness. */
const loadThickness = cache(async (n: number) => {
  const doc = await getThicknessByN(n);
  if (!doc) return null;
  // The group is read from its own (tagged) list, so edits of the group texts expire the card.
  const groupId = typeof doc.group === "string" ? doc.group : doc.group?.id;
  const groups = await getThicknessGroups({ depth: 0 });
  const group =
    groups.find((item) => item.id === groupId) ??
    (typeof doc.group === "object" ? doc.group : null);
  return { doc, group };
});

function ogImageOf(doc: Thickness): { url: string; alt?: string | null } | null {
  // Generated placeholders (`gen-*`) never become og:image (task-38, `pickOgImage`).
  return pickOgImage([doc.seo?.ogImage]);
}

export async function generateThicknessMetadata(n: number): Promise<Metadata> {
  const loaded = await loadThickness(n);
  if (!loaded) return NOT_FOUND_METADATA;
  const { doc } = loaded;
  const placeholders = await getPlaceholderContext({ thickness: n });
  const state = priceState(n, placeholders.prices, placeholders.now);
  return buildMetadata({
    seo: {
      ...doc.seo,
      title: (state === "price" ? doc.seo?.title : doc.seo?.titleNoPrice) ?? null,
    },
    path: doc.path || thicknessHref(n),
    fallbackTitle: resolveH1(doc.seo, TEXT.h1(n), placeholders),
    placeholders,
    image: ogImageOf(doc),
    // 5, 15 and 19 mm (and any card switched off by an editor): noindex, follow.
    forceNoindex: doc.indexable === false,
  });
}

type FaqItems = NonNullable<ThicknessGroup["faq"]>;

/** FAQ of the card: its own override, otherwise the group questions. */
function faqItems(doc: Thickness, group: ThicknessGroup | null): FaqItems {
  const own = (doc.faqOverride ?? []).filter((item) => item.question.trim() !== "");
  if (own.length > 0) return own;
  return (group?.faq ?? []).filter((item) => item.question.trim() !== "");
}

/** Hero photo of the card (`card.image`; the same illustration for every thickness for now). */
function heroMedia(doc: Thickness): { src: string; alt: string } | null {
  const media = asMedia(doc.card?.image);
  const src = media ? mediaSrc(media) : null;
  return media && src ? { src, alt: media.alt?.trim() ?? "" } : null;
}

/** Hub of the section: its «Обработка до закалки» block is the source of the processing cards. */
const HUB_PATH = "/zakalennoe-steklo/";

/**
 * Processing cards of the card: the hub's «Обработка до закалки» block (same titles, facts and
 * photos as on the hub, edited in one place); without it, the processing services themselves.
 */
async function loadProcessingCards(ctx: PlaceholderContext): Promise<ProcessingStripCard[]> {
  const hub = await getPageByPath(HUB_PATH);
  const block = (hub?.layout ?? []).find(
    (item) => item.blockType === "cards" && anchorOf(item) === HUB_SECTION_ANCHORS.processing
  );
  if (block?.blockType === "cards") {
    const cards = hubProcessingCards(block, ctx);
    if (cards.length > 0) return cards;
  }
  // Depth 1: the cards need the populated `heroImage` / `card.image`.
  const services = await listPublished("processing-services", {
    sort: "order",
    limit: 50,
    depth: 1,
  });
  return serviceCards(services.docs, ctx);
}

/** The processing services as cards: short title, main limit, service photo. */
function serviceCards(
  services: readonly ProcessingService[],
  ctx: PlaceholderContext
): ProcessingStripCard[] {
  return services.flatMap((service) => {
    if (!service.path) return [];
    const media = asMedia(service.heroImage) ?? asMedia(service.card?.image);
    const src = media ? mediaSrc(media, "card") : null;
    const title = (service.card?.title || service.title).trim();
    return [
      {
        key: service.id,
        href: service.path,
        title: replacePlaceholders(title, ctx),
        text: replacePlaceholders(service.keyLimit?.trim() ?? "", ctx),
        // The title next to the photo names the card: the image itself is decorative here.
        photo: media && src ? { src, alt: "" } : null,
      },
    ];
  });
}

const PANEL_TEXT =
  "text-ink-3 m-0 text-[17px] leading-[1.6] max-sm:text-base [&_p]:m-0 [&_p]:max-w-none [&_p]:text-[length:inherit] [&_p]:leading-[inherit] [&_p]:text-inherit";

const withPeriod = (text: string) => (/[.!?…]$/u.test(text) ? text : `${text}.`);

export async function ThicknessPage({ n }: { n: number }) {
  const loaded = await loadThickness(n);
  const path = thicknessHref(n);
  if (!loaded) {
    await redirectIfExists(path);
    return <NotFoundResponse />;
  }
  const { doc, group } = loaded;
  const [ctx, pricesDoc, conditions, limits] = await Promise.all([
    getPlaceholderContext({ thickness: n }),
    getPrices(),
    getConditions(),
    getTechLimits(),
  ]);
  const processing = await loadProcessingCards(ctx);
  const pagePath = doc.path || path;
  const view = buildThicknessView({
    n,
    doc,
    prices: ctx.prices,
    promo: ctx.promo,
    conditions,
    now: ctx.now,
    captionTemplate: pricesDoc?.caption,
    limits,
  });

  const h1 = resolveH1(doc.seo, TEXT.h1(n), ctx);
  const prefill: QuizPrefill = {
    ...doc.quizPrefill,
    type: doc.quizPrefill?.type ?? "tempered",
    thickness: n,
    ctaLabel: doc.quizPrefill?.ctaLabel || TEXT.quizButton(n),
  };
  const podbor = doc.podborOverride ?? group?.podborText ?? null;
  const obrabotka = doc.obrabotkaOverride ?? group?.obrabotkaText ?? null;
  const faq = faqItems(doc, group);
  const minOrder = conditions?.minOrderText?.trim();

  const productLd = view.showProductJsonLd
    ? thicknessProductLd({
        thickness: n,
        prices: ctx.prices,
        now: ctx.now,
        name: h1,
        url: pagePath,
        description: replacePlaceholders(doc.seo?.description ?? "", ctx).trim() || null,
      })
    : null;
  const faqJsonLd =
    faq.length > 0
      ? faqLd(
          faq.map((item) => ({
            question: replacePlaceholders(item.question, ctx),
            answer: replacePlaceholders(lexicalToPlainText(item.answer), ctx),
          }))
        )
      : null;

  return (
    <PageShell path={pagePath} lastLabel={thicknessLabel(n)} showConditions={false} quiz={false}>
      <JsonLd data={[productLd, faqJsonLd]} />
      <ProcessingHero
        title={h1}
        media={heroMedia(doc)}
        actionsGap="tight"
        indentActions
        lead={
          <div className="flex flex-col gap-6 max-sm:gap-4">
            <SpecTable view={view} />
            {minOrder || view.promoText ? (
              <div className="text-ink-3 text-[15px] leading-[1.2] font-medium" data-min-order="">
                {minOrder ? withPeriod(minOrder) : null}
                {minOrder && view.promoText ? " " : null}
                {view.promoText ? <span data-spec-promo="">{view.promoText}</span> : null}
              </div>
            ) : null}
          </div>
        }
        actions={
          <>
            <QuizLink prefill={prefill} src={pagePath} size="l" ctx={ctx} />
            <FormTrigger
              formKey="drawing"
              params={{ label: TEXT.drawingButton, source: sourceOf(n) }}
              asChild
            >
              <Button
                size="l"
                variant="secondary"
                leftIcon={<FileText aria-hidden="true" strokeWidth={2} />}
              >
                {TEXT.drawingButton}
              </Button>
            </FormTrigger>
          </>
        }
      />

      <section
        aria-label={`${TEXT.includedTitle}. ${TEXT.podborTitle}`}
        className="py-16 max-md:py-12 max-sm:py-8"
        data-section="price-select"
      >
        <Container className="grid grid-cols-2 items-stretch gap-6 max-md:grid-cols-1 max-sm:gap-4">
          <div
            className="bg-surface border-hairline flex flex-col gap-5 rounded-xl border p-10 max-sm:rounded-lg max-sm:p-5"
            data-section="included"
          >
            <h2 className="text-h3 m-0 font-bold text-balance">{TEXT.includedTitle}</h2>
            <p className={PANEL_TEXT}>{TEXT.included(n)}</p>
          </div>
          <div
            className="bg-primary-light flex flex-col items-start gap-5 rounded-xl p-10 max-sm:rounded-lg max-sm:p-5"
            data-section="podbor"
          >
            <h2 className="text-h3 m-0 font-bold text-balance">{TEXT.podborTitle}</h2>
            {podbor ? (
              <div className={PANEL_TEXT}>
                <RichText data={podbor} ctx={ctx} disableContainer />
              </div>
            ) : null}
            <p className={PANEL_TEXT}>{TEXT.podborAsk}</p>
            <FormTrigger
              formKey="load"
              params={{ label: TEXT.podborButton, source: sourceOf(n), thickness: n }}
              asChild
            >
              <Button variant="secondary" size="m">
                {TEXT.podborButton}
              </Button>
            </FormTrigger>
          </div>
        </Container>
      </section>

      <HolesRules
        view={view}
        holes={limits.holes}
        heading={TEXT.holesTitle(n)}
        headingId="th-holes-title"
      />

      <ProcessingStrip
        heading={TEXT.obrabotkaTitle(n)}
        headingId="th-obrabotka-title"
        lead={obrabotka ? <RichText data={obrabotka} ctx={ctx} disableContainer /> : undefined}
        link={{ href: PROCESSING_HUB_PATH, label: ZAK_TEMPLATE_COPY.processingLink }}
        cards={processing}
      />

      <Neighbors
        view={view}
        prices={ctx.prices}
        now={ctx.now}
        heading={TEXT.neighborsTitle}
        headingId="th-neighbors-title"
      />

      <RenderBlocks
        blocks={doc.layout}
        ctx={ctx}
        page={{ path: pagePath, title: h1, quizPrefill: doc.quizPrefill }}
      />

      <CreamBlock>
        {faq.length > 0 ? (
          <div id="faq" className="scroll-mt-24">
            <ServiceFaq
              heading={TEXT.faqTitle}
              headingId="th-faq-title"
              items={faq.map((item, index) => ({
                key: item.id ?? String(index),
                question: item.question,
                answer: item.answer,
              }))}
              ctx={ctx}
              jsonLd={false}
              bare
            />
          </div>
        ) : null}
        <DrawingPanel headingId="th-form-title" params={{ source: sourceOf(n) }} anchorId="form" />
      </CreamBlock>
    </PageShell>
  );
}
