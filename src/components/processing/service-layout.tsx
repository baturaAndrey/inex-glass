import { RenderBlocks } from "@/components/blocks/render-blocks";
import { asMedia, fill, hasText, mediaSrc, resolveLink } from "@/components/blocks/shared";
import type { BlockOf, BlockPageContext, LayoutBlock } from "@/components/blocks/types";
import type { PlaceholderContext } from "@/lib/domain";
import { HolesCalculatorPanel } from "./holes-calculator-panel";
import { ServiceAbout, type AboutFigure } from "./service-about";
import { UseCases } from "./use-cases";

/**
 * The `layout` of a processing service in the sections of the Paper mockups `2560_service_*`.
 * Blocks with a service-page design render through the processing components; every other
 * block renders as on any page (`RenderBlocks`), so nothing in the layout is lost.
 *
 * | Block                                   | Section                                  |
 * |-----------------------------------------|------------------------------------------|
 * | `richText` with a heading               | «about» (`ServiceAbout`)                 |
 * | … + the one-image `gallery` right after | «about» with the diagram panel           |
 * | `cards`                                 | «use-cases», numbered (`UseCases`)       |
 * | `holesCalculator`                       | calculator panel (`HolesCalculatorPanel`)|
 * | `twoColumns`                            | not here: «how-to-order» panels          |
 * | anything else                           | the site-wide block                      |
 *
 * The look of these blocks on other pages does not change: only the service template uses this
 * component.
 */

export interface ServiceLayoutProps {
  blocks: readonly LayoutBlock[];
  ctx: PlaceholderContext;
  page: BlockPageContext;
}

type Unit =
  | { kind: "about"; key: string; block: BlockOf<"richText">; figure: BlockOf<"gallery"> | null }
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
        if (!hasText(block.heading)) {
          pushPlain(block, index);
          break;
        }
        const next = blocks[index + 1];
        const figure = isFigure(next) ? next : null;
        units.push({ kind: "about", key, block, figure });
        if (figure) index += 1;
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

function figureOf(block: BlockOf<"gallery"> | null, ctx: PlaceholderContext): AboutFigure | null {
  const item = block?.images?.[0];
  const media = asMedia(item?.image);
  const src = media ? mediaSrc(media) : null;
  if (!item || !media || !src) return null;
  return {
    src,
    alt: fill(item.alt, ctx) || media.alt || "",
    caption: fill(item.caption, ctx) || media.caption || "",
    width: media.width ?? FALLBACK_SIZE.width,
    height: media.height ?? FALLBACK_SIZE.height,
  };
}

function toUseCases(block: BlockOf<"cards">, ctx: PlaceholderContext) {
  return (block.items ?? []).map((item, index) => ({
    key: item.id ?? String(index),
    title: fill(item.title, ctx),
    text: fill(item.text, ctx),
    href: resolveLink(item.link)?.href ?? null,
  }));
}

const anchorOf = (block: { anchorId?: string | null }) =>
  hasText(block.anchorId) ? block.anchorId : undefined;

export function ServiceLayout({ blocks, ctx, page }: ServiceLayoutProps) {
  return (
    <>
      {unitsOf(blocks).map((unit) => {
        switch (unit.kind) {
          case "about":
            return unit.block.content ? (
              <ServiceAbout
                key={unit.key}
                heading={fill(unit.block.heading, ctx)}
                headingId={`processing-${unit.key}-title`}
                body={unit.block.content}
                ctx={ctx}
                figure={figureOf(unit.figure, ctx)}
                anchorId={anchorOf(unit.block)}
              />
            ) : null;
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
