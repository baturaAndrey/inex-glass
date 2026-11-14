import type { ReactNode } from "react";
import { getPlaceholderContext } from "@/lib/cms/globals";
import type { PlaceholderContext } from "@/lib/domain";
import type { Page } from "@/payload-types";
import { ArticlesFeedBlock } from "./articles-feed-block";
import { CalloutBlock } from "./callout-block";
import { CardsBlock } from "./cards-block";
import { CollectionCardsBlock } from "./collection-cards-block";
import { CompareBlock } from "./compare-block";
import { ContactsMapBlock } from "./contacts-map-block";
import { CtaBlock } from "./cta-block";
import { DownloadBlock } from "./download-block";
import { FaqBlock, faqJsonLdIndex } from "./faq-block";
import { FormBlock } from "./form-block";
import { GalleryBlock } from "./gallery-block";
import { HeroBlock } from "./hero-block";
import { HolesCalculatorBlock } from "./holes-calculator-block";
import { LinkListBlock } from "./link-list-block";
import { ObjectsFeedBlock } from "./objects-feed-block";
import { PricesTableBlock } from "./prices-table-block";
import { QuizCtaBlock } from "./quiz-cta-block";
import { RequisitesBlock } from "./requisites-block";
import { RichTextBlock } from "./rich-text-block";
import { sectionVariant } from "./shared";
import { SnippetBlock } from "./snippet-block";
import { StatsBlock } from "./stats-block";
import { StepsBlock } from "./steps-block";
import { SystemsBlock } from "./systems-block";
import { TableBlock } from "./table-block";
import { TeamGridBlock } from "./team-grid-block";
import { TermsBlock } from "./terms-block";
import { TwoColumnsBlock } from "./two-columns-block";
import { WeightCalculatorBlock } from "./weight-calculator-block";
import { WhoDoesWhatBlock } from "./who-does-what-block";
import type { BlockPageContext, BlockProps, BlockType, LayoutBlock } from "./types";

type BlockComponent<T extends BlockType> = (props: BlockProps<T>) => ReactNode | Promise<ReactNode>;

/**
 * `blockType` → component, one per block of `src/payload/blocks` (29). The mapped type over the
 * `blockType` union of `payload-types` makes a missing block a type error. This file does not
 * change after task 16: Wave 5 replaces only the stub files (form, calculators, prices table,
 * contacts, requisites, team).
 */
const REGISTRY: { [K in BlockType]: BlockComponent<K> } = {
  hero: HeroBlock,
  richText: RichTextBlock,
  table: TableBlock,
  steps: StepsBlock,
  callout: CalloutBlock,
  terms: TermsBlock,
  cards: CardsBlock,
  collectionCards: CollectionCardsBlock,
  pricesTable: PricesTableBlock,
  faq: FaqBlock,
  cta: CtaBlock,
  compare: CompareBlock,
  download: DownloadBlock,
  holesCalculator: HolesCalculatorBlock,
  weightCalculator: WeightCalculatorBlock,
  form: FormBlock,
  snippet: SnippetBlock,
  stats: StatsBlock,
  objectsFeed: ObjectsFeedBlock,
  articlesFeed: ArticlesFeedBlock,
  whoDoesWhat: WhoDoesWhatBlock,
  systems: SystemsBlock,
  gallery: GalleryBlock,
  twoColumns: TwoColumnsBlock,
  linkList: LinkListBlock,
  contactsMap: ContactsMapBlock,
  requisites: RequisitesBlock,
  teamGrid: TeamGridBlock,
  quizCta: QuizCtaBlock,
};

/** Slugs rendered by `RenderBlocks` (for tests and the schema ↔ renderer consistency check). */
export const RENDERED_BLOCK_TYPES = Object.keys(REGISTRY) as BlockType[];

export interface RenderBlocksProps {
  blocks: Page["layout"] | null | undefined;
  /** Placeholder context; built from the globals (`getPlaceholderContext()`) when omitted. */
  ctx?: PlaceholderContext | undefined;
  /** Owning document (faq / systems in `doc` mode, hero H1 fallback, quiz pre-fill and `src`). */
  page?: BlockPageContext | undefined;
}

function isKnownBlock(block: { blockType?: unknown }): block is LayoutBlock {
  return typeof block.blockType === "string" && Object.hasOwn(REGISTRY, block.blockType);
}

/**
 * Renders a page layout. Every block gets the placeholder context and its section chrome:
 * background alternating `bg` ↔ `sf` by position (unless the block sets its own) and a unique
 * heading id. Unknown block types (stale data, a block removed from the schema) are skipped
 * with a dev warning instead of breaking the page.
 */
export async function RenderBlocks({ blocks, ctx, page }: RenderBlocksProps) {
  if (!blocks || blocks.length === 0) return null;
  const placeholders = ctx ?? (await getPlaceholderContext());
  // One `FAQPage` JSON-LD per page: only the first FAQ block that renders questions emits it.
  const faqLdIndex = faqJsonLdIndex(blocks, page);

  return (
    <>
      {blocks.map((block, index) => {
        if (!isKnownBlock(block)) {
          if (process.env.NODE_ENV !== "production") {
            console.warn(
              `[RenderBlocks] unknown block type «${String((block as { blockType?: unknown }).blockType)}» skipped`
            );
          }
          return null;
        }
        const Component = REGISTRY[block.blockType] as BlockComponent<BlockType>;
        const key = block.id ?? `${block.blockType}-${index}`;
        const background = "background" in block ? block.background : null;
        return (
          <Component
            key={key}
            block={block}
            ctx={placeholders}
            page={page}
            section={{
              index,
              variant: sectionVariant(background, index),
              headingId: `blk-${key}-title`,
              ...(block.blockType === "faq" ? { faqJsonLd: index === faqLdIndex } : {}),
            }}
          />
        );
      })}
    </>
  );
}
