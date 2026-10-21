import type { ReactNode } from "react";
import Image from "next/image";
import { CtaButtons } from "@/components/blocks/cta-buttons";
import { FaqBlock, faqBlockItems } from "@/components/blocks/faq-block";
import { FormBlock } from "@/components/blocks/form-block";
import { PricesTableBlock } from "@/components/blocks/prices-table-block";
import { RenderBlocks } from "@/components/blocks/render-blocks";
import { asMedia, fill, hasText, mediaSrc } from "@/components/blocks/shared";
import type {
  BlockBackground,
  BlockOf,
  BlockPageContext,
  BlockSectionInfo,
  LayoutBlock,
} from "@/components/blocks/types";
import { PageHero, PageHeroTerm } from "@/components/ig/page-hero";
import type { SectionVariant } from "@/components/ig/section";
import { RichText } from "@/components/rich-text/rich-text";
import { getConditions } from "@/lib/cms/globals";
import { listPublished } from "@/lib/cms/queries";
import type { PlaceholderContext } from "@/lib/domain";
import { CtCardsSection, CtSection } from "./ct-cards-section";
import { KindsSection } from "./kinds-section";
import { NumberedChecklist } from "./numbered-checklist";
import { WeightSection } from "./weight-section";
import type { Where } from "payload";

/**
 * Hub `/zakalennoe-steklo/` (`ZakHub.dc.html`): renders the hub document's `layout` block by
 * block. Known sections — keyed by `blockType` + `anchorId` — get the catalog components;
 * everything else (`objectsFeed`, blocks an editor adds) goes through `RenderBlocks`, so the
 * editor keeps full control over order and extra content.
 *
 * Companion blocks (`weights-cta`, `vidy-bridge`, `sroki-cta`) hold the buttons / link line of
 * the section they follow; that section reads them and they are not rendered on their own.
 *
 * Backgrounds: an explicit block `background` wins; `auto` continues the `bg` ↔ `sf` rhythm from
 * the previous VISIBLE section (the objects feed hides itself when there are no objects).
 */

/** Companion anchor → anchor of the section that consumes it. */
const COMPANIONS: Readonly<Record<string, string>> = {
  "weights-cta": "weights",
  "vidy-bridge": "vidy",
  "sroki-cta": "sroki",
};

const BACKGROUND_VARIANT: Record<Exclude<BlockBackground, "auto">, SectionVariant> = {
  bg: "bg",
  sf: "sf",
  dark: "dark",
  primaryDark: "primary-dark",
};
const VARIANT_BACKGROUND: Partial<Record<SectionVariant, BlockBackground>> = {
  bg: "bg",
  sf: "sf",
};

const anchorOf = (block: LayoutBlock): string =>
  "anchorId" in block && hasText(block.anchorId) ? block.anchorId.trim() : "";

const backgroundOf = (block: LayoutBlock): BlockBackground | null =>
  "background" in block ? (block.background ?? null) : null;

/** Next section background: explicit choice, otherwise the opposite of the previous one. */
function nextVariant(block: LayoutBlock, previous: SectionVariant): SectionVariant {
  const background = backgroundOf(block);
  if (background && background !== "auto") return BACKGROUND_VARIANT[background];
  return previous === "bg" ? "sf" : "bg";
}

/**
 * Whether the objects feed will render anything — mirrors the feed's own query (featured /
 * by product / manual). Needed only to keep the background rhythm when the feed is empty.
 */
async function feedHasObjects(block: BlockOf<"objectsFeed">): Promise<boolean> {
  if (block.mode === "manual") {
    return (block.objects ?? []).some(
      (doc) => typeof doc === "object" && doc !== null && doc._status !== "draft"
    );
  }
  const product = block.product;
  const productId = typeof product === "object" && product !== null ? product.id : product;
  if (block.mode === "byProduct" && !productId) return false;
  const where: Where =
    block.mode === "byProduct" && productId
      ? { products: { contains: productId } }
      : { featured: { equals: true } };
  const { totalDocs } = await listPublished("objects", { where, limit: 1, depth: 0 });
  return totalDocs > 0;
}

/** Blocks that render nothing (empty FAQ, empty objects feed) and so take no background. */
async function isVisible(block: LayoutBlock, page: BlockPageContext): Promise<boolean> {
  if (block.blockType === "objectsFeed") return feedHasObjects(block);
  if (block.blockType === "faq") return faqBlockItems(block, page).length > 0;
  return true;
}

interface HubSectionProps {
  block: LayoutBlock;
  companions: ReadonlyMap<string, LayoutBlock>;
  ctx: PlaceholderContext;
  section: BlockSectionInfo;
  page: BlockPageContext;
}

function companionOf<T extends LayoutBlock["blockType"]>(
  companions: ReadonlyMap<string, LayoutBlock>,
  anchor: string,
  type: T
): BlockOf<T> | undefined {
  const block = companions.get(anchor);
  return block && block.blockType === type ? (block as BlockOf<T>) : undefined;
}

/** «Сроки и доставка»: rich text + buttons of the companion `cta` block (`sroki-cta`). */
function TimingSection({
  block,
  companion,
  ctx,
  section,
  page,
}: {
  block: BlockOf<"richText">;
  companion: BlockOf<"cta"> | undefined;
  ctx: PlaceholderContext;
  section: BlockSectionInfo;
  page: BlockPageContext;
}) {
  return (
    <CtSection
      variant={section.variant}
      id={anchorOf(block) || undefined}
      heading={fill(block.heading, ctx) || undefined}
      headingId={section.headingId}
      lead={fill(block.sub, ctx) || undefined}
    >
      <RichText
        data={block.content}
        ctx={ctx}
        className="text-ink-3 max-w-[880px] text-[17px] leading-[1.6] max-sm:text-base [&_p]:max-w-none"
      />
      {companion ? (
        <CtaButtons buttons={companion.buttons} ctx={ctx} page={page} size="m" className="mt-6" />
      ) : null}
    </CtSection>
  );
}

/**
 * First screen (`.ct-hero` of `ZakHub.dc.html`): one column — the hub has no photo / passport
 * column, so the generic hero (which always reserves the 520 px aside) is not used. H1 from the
 * document, facts, the strong line, the CMS buttons and the terms strip of `conditions`.
 *
 * The hero block's `image` is a decorative background illustration on the right, the same
 * treatment as the one-column glass-type hero (`GlassTypeHero`): faded into the page colour,
 * hidden ≤1100 px where the hero is a narrow text column.
 */
async function HubHero({
  block,
  ctx,
  page,
}: {
  block: BlockOf<"hero">;
  ctx: PlaceholderContext;
  page: BlockPageContext;
}) {
  const conditions = block.showTerms === false ? null : await getConditions();
  const termItems =
    block.termsMode === "short" && conditions?.termsBarShort?.length
      ? conditions.termsBarShort
      : (conditions?.termsBar ?? []);
  const terms = termItems.map((item) => fill(item.text, ctx)).filter(Boolean);
  const background = asMedia(block.image);
  const backgroundSrc = background ? mediaSrc(background, "hero") : null;
  const hero = (
    <PageHero
      variant="ct-hero"
      className={backgroundSrc ? "bg-transparent" : undefined}
      title={fill(block.titleOverride, ctx) || page.title || ""}
      facts={fill(block.facts, ctx) || undefined}
      strong={fill(block.strong, ctx) || undefined}
      actions={<CtaButtons buttons={block.buttons} ctx={ctx} page={page} className="contents" />}
      terms={
        terms.length > 0
          ? terms.map((text, index) => <PageHeroTerm key={index}>{text}</PageHeroTerm>)
          : undefined
      }
    />
  );

  if (!backgroundSrc) return hero;
  return (
    <div className="bg-bg relative isolate overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-y-0 right-0 -z-10 w-[45%] [mask-image:linear-gradient(90deg,transparent_0%,black_55%)] max-md:hidden"
      >
        {/* The only priority image of the hub (above the fold on desktop). Hidden ≤1100 px: the
            1px slot makes the phone preload pick the smallest candidate (task 39). */}
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

function HubSection({ block, companions, ctx, section, page }: HubSectionProps): ReactNode {
  const anchor = anchorOf(block);
  switch (block.blockType) {
    case "hero":
      return <HubHero block={block} ctx={ctx} page={page} />;
    case "pricesTable":
      return <PricesTableBlock block={block} ctx={ctx} section={section} page={page} />;
    case "steps":
      if (anchor === "checklist") {
        return <NumberedChecklist block={block} ctx={ctx} section={section} />;
      }
      break;
    case "table":
      if (anchor === "weights") {
        return (
          <WeightSection
            block={block}
            companion={companionOf(companions, "weights-cta", "cta")}
            ctx={ctx}
            section={section}
            page={page}
          />
        );
      }
      break;
    case "cards":
      if (anchor === "vidy") {
        return (
          <KindsSection
            block={block}
            bridge={companionOf(companions, "vidy-bridge", "richText")}
            ctx={ctx}
            section={section}
          />
        );
      }
      if (block.layout === "ctCards") {
        return <CtCardsSection block={block} ctx={ctx} section={section} />;
      }
      break;
    case "richText":
      if (anchor === "sroki") {
        return (
          <TimingSection
            block={block}
            companion={companionOf(companions, "sroki-cta", "cta")}
            ctx={ctx}
            section={section}
            page={page}
          />
        );
      }
      break;
    case "faq":
      return <FaqBlock block={block} ctx={ctx} section={section} page={page} />;
    case "form":
      // The editor's form block as is (bullets, submit label, params…); `variant: "page"` keeps
      // the primary-light background of the forms task instead of the bg/sf rhythm.
      return <FormBlock block={block} ctx={ctx} section={section} page={page} />;
  }

  // Anything else: the generic renderer, with the background this page computed.
  const background = VARIANT_BACKGROUND[section.variant];
  const generic = (
    "background" in block && background ? { ...block, background } : block
  ) as LayoutBlock;
  return <RenderBlocks blocks={[generic]} ctx={ctx} page={page} />;
}

interface PlannedSection {
  key: string;
  block: LayoutBlock;
  section: BlockSectionInfo;
}

/** Visible sections with their background (rhythm over the VISIBLE ones) and heading ids. */
function planSections(
  sections: readonly LayoutBlock[],
  visible: readonly boolean[],
  faqLdBlock: LayoutBlock | undefined
): PlannedSection[] {
  const planned: PlannedSection[] = [];
  let previous: SectionVariant = "sf";
  sections.forEach((block, index) => {
    if (!visible[index]) return;
    const variant = block.blockType === "hero" ? "bg" : nextVariant(block, previous);
    previous = variant;
    const key = block.id ?? `${block.blockType}-${index}`;
    planned.push({
      key,
      block,
      section: {
        index,
        variant,
        headingId: `hub-${key}-title`,
        ...(block.blockType === "faq" ? { faqJsonLd: block === faqLdBlock } : {}),
      },
    });
  });
  return planned;
}

export interface HubPageProps {
  blocks: LayoutBlock[] | null | undefined;
  ctx: PlaceholderContext;
  page: BlockPageContext;
}

export async function HubPage({ blocks, ctx, page }: HubPageProps) {
  const layout = blocks ?? [];
  const anchors = new Set(layout.map(anchorOf).filter(Boolean));

  // Companions are consumed by their section only when that section is on the page.
  const companions = new Map<string, LayoutBlock>();
  for (const block of layout) {
    const anchor = anchorOf(block);
    const owner = COMPANIONS[anchor];
    if (owner && anchors.has(owner) && !companions.has(anchor)) companions.set(anchor, block);
  }

  const consumed = new Set(companions.values());
  const sections = layout.filter((block) => !consumed.has(block));
  const visible = await Promise.all(sections.map((block) => isVisible(block, page)));

  // Only one FAQPage JSON-LD per page: the first FAQ block that has questions emits it.
  const faqLdBlock = sections.find(
    (block) => block.blockType === "faq" && faqBlockItems(block, page).length > 0
  );

  const items = planSections(sections, visible, faqLdBlock);

  return (
    <>
      {items.map(({ key, block, section }) => (
        <HubSection
          key={key}
          block={block}
          companions={companions}
          ctx={ctx}
          section={section}
          page={page}
        />
      ))}
    </>
  );
}
