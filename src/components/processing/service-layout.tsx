import { Fragment, type ReactNode } from "react";
import { RenderBlocks } from "@/components/blocks/render-blocks";
import { asMedia, fill, hasText, mediaSrc, resolveLink } from "@/components/blocks/shared";
import type { BlockOf, BlockPageContext, LayoutBlock } from "@/components/blocks/types";
import type { PlaceholderContext } from "@/lib/domain";
import { HolesCalculatorPanel } from "./holes-calculator-panel";
import { ServiceAbout, type AboutFigure } from "./service-about";
import { UseCases } from "./use-cases";
import type { AboutTableData } from "./about-table";

/**
 * The `layout` of a processing service / glass type in the sections of the Paper mockups
 * `2560_service_*` and `2560_glass_*`. Blocks with a service-page design render through the
 * processing components; every other block renders as on any page (`RenderBlocks`), so nothing
 * in the layout is lost.
 *
 * | Block                                   | Section                                  |
 * |-----------------------------------------|------------------------------------------|
 * | `richText` with a heading               | «about» (`ServiceAbout`)                 |
 * | … + the one-image `gallery` right after | «about» with the diagram panel           |
 * | … + a `table` block right after         | «about» with the comparison table panel  |
 * | `cards`                                 | «use-cases», numbered (`UseCases`)       |
 * | `holesCalculator`                       | calculator panel (`HolesCalculatorPanel`)|
 * | `twoColumns`                            | not here: «how-to-order» panels          |
 * | anything else                           | the site-wide block                      |
 *
 * The look of these blocks on other pages does not change: only the service and glass-type
 * templates use this component.
 */

export interface ServiceLayoutProps {
  blocks: readonly LayoutBlock[];
  ctx: PlaceholderContext;
  page: BlockPageContext;
  /**
   * Rendered right after the first «about» section (glass types: the colours / patterns
   * section). Without an «about» section it is not rendered: check `hasAboutSection` first.
   */
  afterAbout?: ReactNode;
}

type AboutPanel = BlockOf<"gallery"> | BlockOf<"table">;

type Unit =
  | { kind: "about"; key: string; block: BlockOf<"richText">; panel: AboutPanel | null }
  | { kind: "useCases"; key: string; block: BlockOf<"cards"> }
  | { kind: "calculator"; key: string; index: number; block: BlockOf<"holesCalculator"> }
  | { kind: "blocks"; key: string; blocks: LayoutBlock[] };

/** Diagram width × height when the media document has no dimensions (the facet diagram). */
const FALLBACK_SIZE = { width: 1760, height: 600 } as const;

const keyOf = (block: LayoutBlock, index: number) => block.id ?? `${block.blockType}-${index}`;

/** A `gallery` block with exactly one image: the figure of the text section before it. */
function isFigure(block: LayoutBlock | undefined): block is BlockOf<"gallery"> {
  return block?.blockType === "gallery" && (block.images ?? []).length === 1;
}

/** A `table` block with columns and rows: the comparison panel of the text section before it. */
function isPanelTable(block: LayoutBlock | undefined): block is BlockOf<"table"> {
  return (
    block?.blockType === "table" &&
    (block.table?.columns ?? []).length >= 2 &&
    (block.table?.rows ?? []).length > 0
  );
}

/** A `richText` block with a heading and content: an «about» section. */
const isAbout = (block: LayoutBlock): block is BlockOf<"richText"> =>
  block.blockType === "richText" && hasText(block.heading) && Boolean(block.content);

/** `true` when the layout has an «about» section (a `richText` block with a heading). */
export function hasAboutSection(blocks: readonly LayoutBlock[]): boolean {
  return blocks.some(isAbout);
}

/** Groups the layout into sections; runs of site-wide blocks stay together. */
function unitsOf(blocks: readonly LayoutBlock[]): Unit[] {
  const units: Unit[] = [];
  const pushPlain = (block: LayoutBlock, index: number) => {
    const last = units.at(-1);
    if (last?.kind === "blocks") last.blocks.push(block);
    else units.push({ kind: "blocks", key: keyOf(block, index), blocks: [block] });
  };

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index]!;
    const key = keyOf(block, index);
    switch (block.blockType) {
      case "twoColumns":
        break;
      case "richText": {
        if (!isAbout(block)) {
          pushPlain(block, index);
          break;
        }
        const next = blocks[index + 1];
        const panel = isFigure(next) || isPanelTable(next) ? next : null;
        units.push({ kind: "about", key, block, panel });
        if (panel) index += 1;
        break;
      }
      case "cards":
        if (hasText(block.heading) && (block.items ?? []).length > 0) {
          units.push({ kind: "useCases", key, block });
        } else {
          pushPlain(block, index);
        }
        break;
      case "holesCalculator":
        units.push({ kind: "calculator", key, index, block });
        break;
      default:
        pushPlain(block, index);
    }
  }
  return units;
}

function figureOf(block: AboutPanel | null, ctx: PlaceholderContext): AboutFigure | null {
  if (block?.blockType !== "gallery") return null;
  const item = block.images?.[0];
  const media = asMedia(item?.image);
  const src = media ? mediaSrc(media) : null;
  if (!item || !media || !src) return null;
  return {
    src,
    alt: fill(item.alt, ctx) || media.alt || "",
    caption: fill(item.caption, ctx) || media.caption || "",
    width: media.width ?? FALLBACK_SIZE.width,
    height: media.height ?? FALLBACK_SIZE.height,
    photo: media.kind === "photo",
  };
}

/**
 * The `table` block as the about panel: its heading (or the table caption) is the caps caption;
 * every row gets one cell per column (missing cells empty). Cells keep their placeholders and
 * inline markup — `AboutTable` renders them through `InlineText`.
 */
function tableOf(block: AboutPanel | null, ctx: PlaceholderContext): AboutTableData | null {
  if (block?.blockType !== "table" || !block.table) return null;
  const { table } = block;
  const columns = (table.columns ?? []).map((column) => fill(column.label, ctx).trim());
  return {
    caption: fill(block.heading, ctx) || fill(table.caption, ctx),
    columns,
    rows: (table.rows ?? []).map((row, index) => ({
      key: row.id ?? String(index),
      cells: columns.map((_, cell) => row.cells?.[cell]?.value ?? ""),
    })),
    highlightColumn: table.highlightColumn ?? null,
    footnote: table.footnote ?? "",
  };
}

function toUseCases(block: BlockOf<"cards">, ctx: PlaceholderContext) {
  return (block.items ?? []).map((item, index) => {
    const media = asMedia(item.image);
    const src = media ? mediaSrc(media) : null;
    return {
      key: item.id ?? String(index),
      title: fill(item.title, ctx),
      text: fill(item.text, ctx),
      href: resolveLink(item.link)?.href ?? null,
      photo: media && src ? { src, alt: media.alt?.trim() ?? "" } : null,
    };
  });
}

const anchorOf = (block: { anchorId?: string | null }) =>
  hasText(block.anchorId) ? block.anchorId : undefined;

export function ServiceLayout({ blocks, ctx, page, afterAbout }: ServiceLayoutProps) {
  const units = unitsOf(blocks);
  const firstAbout = units.find((unit) => unit.kind === "about")?.key;
  return (
    <>
      {units.map((unit) => {
        switch (unit.kind) {
          case "about":
            return (
              <Fragment key={unit.key}>
                <ServiceAbout
                  heading={fill(unit.block.heading, ctx)}
                  headingId={`processing-${unit.key}-title`}
                  body={unit.block.content!}
                  ctx={ctx}
                  figure={figureOf(unit.panel, ctx)}
                  table={tableOf(unit.panel, ctx)}
                  anchorId={anchorOf(unit.block)}
                />
                {unit.key === firstAbout ? afterAbout : null}
              </Fragment>
            );
          case "useCases":
            return (
              <UseCases
                key={unit.key}
                heading={fill(unit.block.heading, ctx)}
                headingId={`processing-${unit.key}-title`}
                sub={fill(unit.block.sub, ctx) || undefined}
                items={toUseCases(unit.block, ctx)}
                columns={unit.block.layout === "g4" ? 4 : 3}
                anchorId={anchorOf(unit.block)}
              />
            );
          case "calculator":
            return (
              <HolesCalculatorPanel
                key={unit.key}
                block={unit.block}
                ctx={ctx}
                page={page}
                section={{ index: unit.index, variant: "bg", headingId: `blk-${unit.key}-title` }}
              />
            );
          case "blocks":
            return <RenderBlocks key={unit.key} blocks={unit.blocks} ctx={ctx} page={page} />;
        }
      })}
    </>
  );
}
