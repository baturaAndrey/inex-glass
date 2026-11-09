import { CtaButtons, toFormParams } from "@/components/blocks/cta-buttons";
import { faqBlockItems } from "@/components/blocks/faq-block";
import { RenderBlocks } from "@/components/blocks/render-blocks";
import { asMedia, fill, hasText, mediaSrc, resolveLink } from "@/components/blocks/shared";
import type { BlockOf, BlockPageContext, LayoutBlock } from "@/components/blocks/types";
import { DrawingPanel } from "@/components/forms/drawing-panel";
import { ProcessingHero } from "@/components/processing/processing-hero";
import { ServiceFaq } from "@/components/processing/service-faq";
import { getConditions } from "@/lib/cms/globals";
import type { PlaceholderContext } from "@/lib/domain";
import { PROCESSING_HUB_PATH, ZAK_TEMPLATE_COPY } from "./copy";
import { KindsSection } from "./kinds-section";
import { NumberedChecklist } from "./numbered-checklist";
import { PriceTilesSection } from "./price-tiles-section";
import { ProcessingStrip, type ProcessingStripCard } from "./processing-strip";
import { RiskCards } from "./risk-cards";
import { WeightSection } from "./weight-section";
import { AudiencesPanel, CreamBlock, TimingPanel } from "./zak-info";

/**
 * Hub `/zakalennoe-steklo/` restyled to the approved Paper mockup `2560_zakalennoe-steklo`
 * (2026-11). The `pages` document keeps its `layout` blocks; the hub picks its sections by
 * `blockType` + `anchorId` (contract of the seed, `HUB_ANCHORS`) and lays them out in the
 * mockup order on the single page background:
 *
 * hero (photo, H1, strong line, facts as checks, buttons) → prices (`#ceny`, tiles + panels) →
 * checklist → risk → weights → kinds (+ «Рядом» panel from `vidy-bridge`) → processing → any
 * other block (objects feed, blocks an editor adds) via `RenderBlocks` → cream block: timing +
 * audiences panels, FAQ, the dark drawing-form panel.
 *
 * Companion blocks (`weights-cta`, `vidy-bridge`, `sroki-cta`) are read by their section and not
 * rendered on their own.
 */

export const HUB_SECTION_ANCHORS = {
  checklist: "checklist",
  risk: "risk",
  weights: "weights",
  weightsCta: "weights-cta",
  kinds: "vidy",
  kindsBridge: "vidy-bridge",
  processing: "obrabotka",
  timing: "sroki",
  timingCta: "sroki-cta",
  audiences: "forwhom",
} as const;

export const anchorOf = (block: LayoutBlock): string =>
  "anchorId" in block && hasText(block.anchorId) ? block.anchorId.trim() : "";

/** The hub's blocks, picked by type (+ anchor); `used` collects what the template renders. */
function picker(layout: readonly LayoutBlock[]) {
  const used = new Set<LayoutBlock>();
  const pick = <T extends LayoutBlock["blockType"]>(
    type: T,
    anchor?: string
  ): BlockOf<T> | undefined => {
    const block = layout.find(
      (item) =>
        item.blockType === type &&
        !used.has(item) &&
        (anchor === undefined || anchorOf(item) === anchor)
    );
    if (block) used.add(block);
    return block as BlockOf<T> | undefined;
  };
  return { pick, used };
}

/** Facts of the hero: one check per line of the CMS field. */
const factLines = (text: string): string[] =>
  text
    .split(/\n+/u)
    .map((line) => line.trim())
    .filter(Boolean);

function HubHero({
  block,
  ctx,
  page,
}: {
  block: BlockOf<"hero">;
  ctx: PlaceholderContext;
  page: BlockPageContext;
}) {
  const media = asMedia(block.image);
  const src = media ? mediaSrc(media) : null;
  const strong = fill(block.strong, ctx);
  return (
    <ProcessingHero
      title={fill(block.titleOverride, ctx) || page.title || ""}
      media={media && src ? { src, alt: media.alt?.trim() ?? "" } : null}
      lead={strong ? <p className="text-ink-3 font-semibold">{strong}</p> : undefined}
      terms={factLines(fill(block.facts, ctx))}
      actions={<CtaButtons buttons={block.buttons} ctx={ctx} page={page} className="contents" />}
      indentActions
    />
  );
}

/** Processing cards of a `cards` block (title, text, link, image); shared with the thickness cards. */
export function processingCards(
  block: BlockOf<"cards">,
  ctx: PlaceholderContext
): ProcessingStripCard[] {
  return (block.items ?? []).flatMap((item, index) => {
    const title = fill(item.title, ctx);
    const link = resolveLink(item.link);
    if (!title || !link) return [];
    const media = asMedia(item.image);
    const src = media ? mediaSrc(media, "card") : null;
    return [
      {
        key: item.id ?? String(index),
        href: link.href,
        title,
        text: fill(item.text, ctx),
        photo: media && src ? { src, alt: media.alt?.trim() ?? "" } : null,
      },
    ];
  });
}

export interface HubPageProps {
  blocks: LayoutBlock[] | null | undefined;
  ctx: PlaceholderContext;
  page: BlockPageContext;
}

export async function HubPage({ blocks, ctx, page }: HubPageProps) {
  const layout = blocks ?? [];
  const A = HUB_SECTION_ANCHORS;
  const { pick, used } = picker(layout);

  const hero = pick("hero");
  const prices = pick("pricesTable");
  const checklist = pick("steps", A.checklist);
  const risk = pick("cards", A.risk);
  const weights = pick("table", A.weights);
  const weightsCta = weights ? pick("cta", A.weightsCta) : undefined;
  const kinds = pick("cards", A.kinds);
  const kindsBridge = kinds ? pick("richText", A.kindsBridge) : undefined;
  const processing = pick("cards", A.processing);
  const timing = pick("richText", A.timing);
  const timingCta = timing ? pick("cta", A.timingCta) : undefined;
  const audiences = pick("cards", A.audiences);
  const faq = pick("faq");
  const form = pick("form");
  const rest = layout.filter((block) => !used.has(block));

  const conditions = await getConditions();
  const faqItems = faq ? faqBlockItems(faq, page) : [];
  const formParams = form
    ? {
        ...toFormParams(
          form.params,
          page.path ? `${page.path}#${anchorOf(form) || "form"}` : undefined
        ),
        ...(hasText(form.sourceLabel) ? { label: fill(form.sourceLabel, ctx) } : {}),
        ...(hasText(form.submitLabel) ? { submitLabel: fill(form.submitLabel, ctx) } : {}),
      }
    : null;

  return (
    <>
      {hero ? <HubHero block={hero} ctx={ctx} page={page} /> : null}

      {prices ? (
        <PriceTilesSection
          ctx={ctx}
          heading={fill(prices.heading, ctx)}
          headingId="hub-prices-title"
          anchorId={prices.anchorId ?? undefined}
          captionTemplate={prices.sub}
          showPromo={prices.showPromo}
          showIncluded={prices.showIncluded}
          showCallout={prices.calloutFromConditions}
        />
      ) : null}

      {checklist ? (
        <NumberedChecklist block={checklist} ctx={ctx} headingId="hub-checklist-title" />
      ) : null}

      {risk ? <RiskCards block={risk} ctx={ctx} headingId="hub-risk-title" /> : null}

      {weights ? (
        <WeightSection
          block={weights}
          companion={weightsCta}
          ctx={ctx}
          headingId="hub-weights-title"
          page={page}
        />
      ) : null}

      {kinds ? (
        <KindsSection block={kinds} bridge={kindsBridge} ctx={ctx} headingId="hub-kinds-title" />
      ) : null}

      {processing ? (
        <ProcessingStrip
          id={anchorOf(processing) || undefined}
          heading={fill(processing.heading, ctx)}
          headingId="hub-processing-title"
          link={{ href: PROCESSING_HUB_PATH, label: ZAK_TEMPLATE_COPY.processingLink }}
          cards={processingCards(processing, ctx)}
        />
      ) : null}

      {rest.length > 0 ? <RenderBlocks blocks={rest} ctx={ctx} page={page} /> : null}

      <CreamBlock>
        {timing || audiences ? (
          <div className="grid grid-cols-2 items-stretch gap-6 max-md:grid-cols-1">
            {timing ? (
              <TimingPanel block={timing} companion={timingCta} conditions={conditions} ctx={ctx} />
            ) : null}
            {audiences ? <AudiencesPanel block={audiences} ctx={ctx} /> : null}
          </div>
        ) : null}
        {faq && faqItems.length > 0 ? (
          <div id={anchorOf(faq) || "faq"} className="scroll-mt-24">
            <ServiceFaq
              heading={fill(faq.heading, ctx)}
              headingId="hub-faq-title"
              items={faqItems.map((item, index) => ({
                key: item.id ?? String(index),
                question: item.question,
                answer: item.answer,
              }))}
              ctx={ctx}
              jsonLd
              bare
            />
          </div>
        ) : null}
        {form && formParams ? (
          <DrawingPanel
            heading={fill(form.heading, ctx) || undefined}
            headingId="hub-form-title"
            params={formParams}
            anchorId={anchorOf(form) || undefined}
          />
        ) : null}
      </CreamBlock>
    </>
  );
}
