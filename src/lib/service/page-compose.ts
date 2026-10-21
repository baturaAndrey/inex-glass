import type { BlockOf, BlockType, LayoutBlock } from "@/components/blocks/types";
import { lexicalToPlainText } from "@/payload/utils/lexical-text";

/**
 * Composition helpers of the service pages with their own layout (task 28: `/kak-zakazat/`,
 * `/kak-zakazat/trebovaniya-k-chertezham/`, `/kak-zakazat/oplata/`). Those routes read the same
 * `pages` document as the catch-all, but place its blocks into the sections of the prototype by
 * ROLE: «the first `steps` block is the timeline», «the second `table` is the limits table». A
 * missing block simply means its section is not rendered — never an error.
 *
 * Pure: no React rendering, no Payload client (unit-tested in `page-compose.test.ts`).
 */

type Layout = readonly LayoutBlock[] | null | undefined;

/** Every block of a type, in document order. */
export function pickAll<T extends BlockType>(layout: Layout, type: T): BlockOf<T>[] {
  return (layout ?? []).filter((block): block is BlockOf<T> => block.blockType === type);
}

/** The `index`-th (0-based) block of a type, or `null`. */
export function pickNth<T extends BlockType>(
  layout: Layout,
  type: T,
  index: number
): BlockOf<T> | null {
  return pickAll(layout, type)[index] ?? null;
}

/** The first block of a type, or `null`. */
export function pickFirst<T extends BlockType>(layout: Layout, type: T): BlockOf<T> | null {
  return pickNth(layout, type, 0);
}

/* ------------------------------------------------------------------------------------------ */
/* Steps                                                                                      */
/* ------------------------------------------------------------------------------------------ */

export interface StepLinkSource {
  label: string;
  url: string;
}

/** `[label](/url/)` at the very end of a text, optionally preceded by a «·» separator. */
const TRAILING_LINK = /\s*(?:·\s*)?\[([^\]\n]+)\]\(([^)\s]+)\)\s*$/u;
/** A «·» left dangling once the links are cut off. */
const TRAILING_SEPARATOR = /\s*·\s*$/u;

/**
 * A step has one schema link (`linkLabel` + `link`). Further links are written by the editor as
 * trailing markdown links in the step text: «… в Челябинске. [Документы](/kak-zakazat/dokumenty/)».
 * Returns the text without them and the links in reading order.
 */
export function splitStepText(text: string | null | undefined): {
  text: string;
  links: StepLinkSource[];
} {
  let rest = text?.trim() ?? "";
  const links: StepLinkSource[] = [];
  for (let match = TRAILING_LINK.exec(rest); match; match = TRAILING_LINK.exec(rest)) {
    const [whole, label, url] = match;
    if (!label || !url) break;
    links.unshift({ label: label.trim(), url });
    rest = rest.slice(0, rest.length - whole.length);
  }
  return { text: rest.replace(TRAILING_SEPARATOR, "").trim(), links };
}

/** Quiz page path; a step link to it becomes a quiz link with the page context (`?src=`). */
const QUIZ_PATH_PREFIX = "/raschet-stoimosti/";

/** `true` for a link to the quiz page (with or without a query string). */
export function isQuizUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const [pathname = ""] = url.trim().split(/[?#]/);
  return pathname === QUIZ_PATH_PREFIX || `${pathname}/` === QUIZ_PATH_PREFIX;
}

/* ------------------------------------------------------------------------------------------ */
/* «Кто за что отвечает»                                                                      */
/* ------------------------------------------------------------------------------------------ */

export type Payer = "factory" | "customer";

export interface PayerCell {
  /** `null` — the cell does not start with a payer: plain text. */
  payer: Payer | null;
  /** Badge text («Завод» / «Заказчик»), `""` without a payer. */
  badge: string;
  /** The rest of the cell after the badge, e.g. « — стекло переделывают за его счёт». */
  rest: string;
}

const PAYER_WORDS: ReadonlyArray<readonly [string, Payer]> = [
  ["Завод", "factory"],
  ["Заказчик", "customer"],
];

/**
 * «Завод — стекло переделывают за его счёт» → badge «Завод» + « — стекло …». Only a whole first
 * word counts («Заводы …» is plain text); the rest of the cell is kept verbatim.
 */
export function splitPayer(value: string | null | undefined): PayerCell {
  const text = value?.trim() ?? "";
  for (const [word, payer] of PAYER_WORDS) {
    if (!text.startsWith(word)) continue;
    const rest = text.slice(word.length);
    if (rest !== "" && /^[\p{L}\p{N}]/u.test(rest)) continue;
    return { payer, badge: word, rest };
  }
  return { payer: null, badge: "", rest: text };
}

/* ------------------------------------------------------------------------------------------ */
/* Rich text                                                                                  */
/* ------------------------------------------------------------------------------------------ */

type LexicalNode = { type?: unknown; children?: unknown };

const childrenOf = (node: unknown): LexicalNode[] => {
  if (typeof node !== "object" || node === null) return [];
  const children = (node as LexicalNode).children;
  return Array.isArray(children)
    ? children.filter((child): child is LexicalNode => typeof child === "object" && child !== null)
    : [];
};

/**
 * Items of the bulleted lists of a rich-text value as plain strings (the «Условия» card of the
 * hub). Without lists every paragraph is an item, so an editor may also type one per line.
 */
export function listItemsOf(value: unknown): string[] {
  const root =
    typeof value === "object" && value !== null && "root" in value
      ? (value as { root: unknown }).root
      : value;
  const blocks = childrenOf(root);
  const lists = blocks.filter((node) => node.type === "list");
  const nodes = lists.length > 0 ? lists.flatMap(childrenOf) : blocks;
  return nodes
    .filter((node) => node.type === "listitem" || node.type === "paragraph")
    .map((node) => lexicalToPlainText({ root: node }).replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/* ------------------------------------------------------------------------------------------ */
/* Section rhythm                                                                             */
/* ------------------------------------------------------------------------------------------ */

/**
 * Fixes the `bg` ↔ `sf` rhythm of a layout into each block's `background`. `RenderBlocks`
 * alternates by the position inside the array it receives; a route that renders blocks one by
 * one (to put its own component between them) would otherwise restart the rhythm every time.
 */
export function withExplicitBackgrounds(layout: Layout): LayoutBlock[] {
  return (layout ?? []).map((block, index) => {
    // The hero is the only block without section chrome (`sectionFields()`).
    if (block.blockType === "hero") return block;
    const current = "background" in block ? block.background : null;
    if (current && current !== "auto") return block;
    // Same rule as `sectionVariant` of the blocks: even positions on `bg`, odd on `sf`.
    return { ...block, background: index % 2 === 0 ? "bg" : "sf" } as LayoutBlock;
  });
}
