import type { SectionVariant } from "@/components/ig/section";
import type { PlaceholderContext } from "@/lib/domain";
import type { Construction, Page } from "@/payload-types";

/** One page-builder block (union over the 29 `blockType`s of `src/payload/blocks`). */
export type LayoutBlock = NonNullable<Page["layout"]>[number];
export type BlockType = LayoutBlock["blockType"];
export type BlockOf<T extends BlockType> = Extract<LayoutBlock, { blockType: T }>;

/** Background chosen in the block (`background` of `sectionFields()`). */
export type BlockBackground = NonNullable<BlockOf<"richText">["background"]>;

/** Section chrome computed by `RenderBlocks` for every block. */
export interface BlockSectionInfo {
  /** Position of the block in the layout (0-based). */
  index: number;
  /** Background: the block's own choice, otherwise alternation `bg` ↔ `sf` by index. */
  variant: SectionVariant;
  /** Unique id for the block heading (`aria-labelledby` of the section). */
  headingId: string;
  /**
   * `faq` only: whether this block emits the page's `FAQPage` JSON-LD. A page carries at most
   * one `FAQPage`, so `RenderBlocks` sets `false` on every FAQ block after the first one that
   * renders questions. Omitted (block rendered on its own) → emits.
   */
  faqJsonLd?: boolean | undefined;
}

export type SystemItem = NonNullable<Construction["systems"]>[number];

/**
 * Optional data of the document that owns the layout. Blocks in `doc` mode read it:
 * `faq` (mode `doc`), `systems` (source `doc`), `hero` (H1 fallback), quiz buttons (prefill, `src`).
 * Every field is optional, so `RenderBlocks` also works without it.
 */
export interface BlockPageContext {
  /** Canonical path of the page, `/zakalennoe-steklo/` (quiz `src`). */
  path?: string | undefined;
  /** H1 of the document (`seo.h1` → title); used by `hero` without `titleOverride`. */
  title?: string | undefined;
  faq?: Page["faq"] | undefined;
  systems?: SystemItem[] | null | undefined;
  quizPrefill?: Page["quizPrefill"] | undefined;
}

/**
 * Props of every block component. Wave-5 replacements of the stub files keep this shape:
 * `block` + `ctx` are the contract; `section` and `page` are extra data they may use
 * (`BlockSection` from `./shared` renders the standard section chrome from them).
 */
export interface BlockProps<T extends BlockType> {
  block: BlockOf<T>;
  ctx: PlaceholderContext;
  section: BlockSectionInfo;
  page?: BlockPageContext | undefined;
}
