import type { ReactNode } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { fill, hasText } from "@/components/blocks/shared";
import type { LayoutBlock } from "@/components/blocks/types";
import { ArticleNote, ARTICLE_TEXT } from "@/components/how-to-order/article-pieces";
import { OrderTable, type OrderTableColumn } from "@/components/how-to-order/order-table";
import type { ArticlePiece } from "@/components/how-to-order/subpage-article";
import { TextLink } from "@/components/ig/text-link";
import { docToHref, type InternalDocRef } from "@/components/rich-text/internal-links";
import { RichText, safeExternalHref, type RichTextData } from "@/components/rich-text/rich-text";
import { isH2, lexicalFromNodes, rootNodes, type LexicalNodeLike } from "@/lib/blog/toc";
import type { PlaceholderContext } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { lexicalToPlainText } from "@/payload/utils/lexical-text";

/**
 * Content pieces of a «Клиентам» segment page (Paper mockup `2560_klientam_podryadchikam`, frame
 * `content`), on top of the generic «Как заказать» article (`buildArticle`): the segment pages
 * keep their teksty blocks as `richText`, and their shape picks the rendering —
 *
 * | Rich-text content (no H2)                 | Rendering                                     |
 * |-------------------------------------------|-----------------------------------------------|
 * | no heading                                | the info note: «{условия} · {акция_текст}»    |
 * | one bulleted list                         | white cards, one per item (`FeatureCards`)    |
 * | one table                                 | the white table card (`OrderTable`)           |
 * | one line «a · b · c → more»               | pills + the arrow link (`LinkRow`)            |
 * | anything else                             | the article rich text                         |
 *
 * `table` and `steps` blocks keep the generic article rendering (table card, step cards).
 */

type Node = LexicalNodeLike;

const childrenOf = (node: Node): Node[] =>
  Array.isArray(node.children)
    ? (node.children as unknown[]).filter((child): child is Node => typeof child === "object")
    : [];

const plainText = (node: Node) => lexicalToPlainText({ root: node }).replace(/\s+/g, " ").trim();

/** Root nodes that carry something (an editor's empty paragraph does not). */
const contentNodes = (value: unknown) =>
  rootNodes(value).filter((node) => node.type !== "paragraph" || plainText(node) !== "");

/** A paragraph node with the given inline children (to render a list item as text). */
const paragraphOf = (children: Node[]): Node => ({
  type: "paragraph",
  version: 1,
  format: "",
  indent: 0,
  direction: "ltr",
  textFormat: 0,
  children,
});

/** `href` of a Lexical link node: internal document or a safe custom URL. */
function linkHref(node: Node): string | null {
  const fields = (node.fields ?? {}) as {
    linkType?: string;
    url?: string;
    doc?: InternalDocRef | null;
  };
  return fields.linkType === "internal"
    ? docToHref(fields.doc ?? null)
    : safeExternalHref(fields.url);
}

const hasLinks = (node: Node): boolean =>
  node.type === "link" || node.type === "autolink" || childrenOf(node).some(hasLinks);

/* ------------------------------------------------------------------------------------------ */
/* Feature cards                                                                              */
/* ------------------------------------------------------------------------------------------ */

/**
 * A bulleted list as white cards (furniture «Что важно для серии», developers «Что получаете»):
 * a teal check, then the item text with its bold lead and links. Six items → 3 columns, four →
 * 4 (2 below 1366 px); 1 column on phones.
 */
export function FeatureCards({
  items,
  ctx,
}: {
  items: ReadonlyArray<{ key: string; nodes: Node[] }>;
  ctx: PlaceholderContext;
}) {
  const threeColumns = items.length % 3 === 0 && items.length % 4 !== 0;
  return (
    <ul
      className={cn(
        "m-0 grid list-none gap-4 p-0 max-sm:grid-cols-1 max-sm:gap-3",
        threeColumns ? "grid-cols-3 max-md:grid-cols-2" : "grid-cols-4 max-lg:grid-cols-2"
      )}
      data-testid="feature-cards"
    >
      {items.map((item) => (
        <li
          key={item.key}
          className="bg-surface border-hairline flex flex-col gap-4 rounded-lg border p-6 max-sm:gap-3 max-sm:p-5"
        >
          <span
            aria-hidden="true"
            className="bg-primary-light text-primary-pressed flex size-10 items-center justify-center rounded-full"
          >
            <Check strokeWidth={2.5} className="size-5" />
          </span>
          <RichText
            data={lexicalFromNodes([paragraphOf(item.nodes)])}
            ctx={ctx}
            className="text-ink-3 [&_strong]:text-text [&_a]:text-[length:inherit] [&_p]:m-0 [&_p]:max-w-none [&_p]:text-[17px] [&_p]:leading-[1.55] max-sm:[&_p]:text-base [&_strong]:font-semibold"
          />
        </li>
      ))}
    </ul>
  );
}

/** Items of a root that is exactly one bulleted list; `null` otherwise. */
function bulletItems(nodes: Node[]): Array<{ key: string; nodes: Node[] }> | null {
  const [list, ...rest] = nodes;
  if (!list || rest.length > 0 || list.type !== "list" || list.tag !== "ul") return null;
  const items = childrenOf(list)
    .filter((item) => item.type === "listitem")
    // A nested list sits in its own list item: such a list is not a flat card list.
    .map((item, index) => ({ key: String(index), nodes: childrenOf(item) }));
  if (items.some((item) => item.nodes.some((node) => node.type === "list"))) return null;
  return items.length > 0 ? items : null;
}

/* ------------------------------------------------------------------------------------------ */
/* Table                                                                                      */
/* ------------------------------------------------------------------------------------------ */

/** Cell paragraphs inherit the row typography (the first column is semibold). */
const CELL_TEXT =
  "flex flex-col gap-1 [&_a]:text-[length:inherit] [&_p]:m-0 [&_p]:max-w-none [&_p]:text-[length:inherit] [&_p]:leading-[inherit] [&_p]:text-inherit [&_p]:[font-weight:inherit]";

/** Width of the label column (mockup: 520 of 1780 px). */
const LABEL_COLUMN_WIDTH = "30%";

const isHeaderCell = (cell: Node) => typeof cell.headerState === "number" && cell.headerState > 0;

/**
 * A rich-text table (designers «Что можно сделать»: links in the cells) as the white table card
 * of the mockup (`E2Z-0`); `null` when the table has no header row (no labels for the phone cards).
 */
function richTable(table: Node, ctx: PlaceholderContext, caption: string): ReactNode {
  const [head, ...body] = childrenOf(table).filter((row) => row.type === "tablerow");
  const headCells = head ? childrenOf(head) : [];
  if (headCells.length === 0 || !headCells.every(isHeaderCell)) return null;
  const columns: OrderTableColumn[] = headCells.map((cell, index) => ({
    label: fill(plainText(cell), ctx),
    ...(headCells.length === 2 && index === 0 ? { width: LABEL_COLUMN_WIDTH } : {}),
  }));
  const rows = body.map((row, rowIndex) => {
    const cells = childrenOf(row);
    return {
      key: String(rowIndex),
      cells: columns.map((_, index) => {
        const cell = cells[index];
        return cell ? (
          <RichText data={lexicalFromNodes(childrenOf(cell))} ctx={ctx} className={CELL_TEXT} />
        ) : null;
      }),
    };
  });
  return <OrderTable columns={columns} rows={rows} caption={caption} data-testid="article-table" />;
}

/* ------------------------------------------------------------------------------------------ */
/* Link row                                                                                   */
/* ------------------------------------------------------------------------------------------ */

type RowItem = { key: string; label: string; href: string | null };

interface LinkRowData {
  items: RowItem[];
  /** The link after «→» («Стекло для мебели», «Все объекты»). */
  more: RowItem | null;
}

/**
 * One paragraph «a · b · c → more» (furniture «Виды стекла», developers «Объекты»): its links
 * and plain names in order and the link after the arrow; `null` for any other paragraph.
 */
function linkRowOf(nodes: Node[]): LinkRowData | null {
  const [paragraph, ...rest] = nodes;
  if (!paragraph || rest.length > 0 || paragraph.type !== "paragraph") return null;
  const items: RowItem[] = [];
  let more: RowItem | null = null;
  let afterArrow = false;
  let separators = 0;
  for (const node of childrenOf(paragraph)) {
    if (node.type === "link") {
      const item = { key: String(items.length), label: plainText(node), href: linkHref(node) };
      if (afterArrow) {
        if (more) return null;
        more = item;
      } else items.push(item);
    } else if (node.type === "text" && typeof node.text === "string") {
      // Plain names between the separators («ТРЦ «Алмаз», Челябинск · …»).
      const parts = node.text.split(/([·→])/u);
      for (const part of parts) {
        if (part === "→") {
          afterArrow = true;
          separators += 1;
        } else if (part === "·") {
          separators += 1;
        } else if (part.trim() !== "") {
          if (afterArrow) return null;
          items.push({ key: String(items.length), label: part.trim(), href: null });
        }
      }
    } else if (node.type !== "linebreak") {
      return null;
    }
  }
  return items.length >= 2 && separators >= items.length - 1 ? { items, more } : null;
}

const PILL =
  "inline-flex min-h-11 items-center rounded-[22px] border px-5 py-2 text-base leading-[1.3] font-medium";

export function LinkRow({ data }: { data: LinkRowData }) {
  return (
    <div className="flex flex-col items-start gap-5" data-testid="link-row">
      <ul className="m-0 flex list-none flex-wrap gap-3 p-0 max-sm:gap-2">
        {data.items.map((item) => (
          <li key={item.key} className="flex">
            {item.href ? (
              <Link
                href={item.href}
                className={cn(
                  PILL,
                  "bg-surface border-line text-text hover:border-brand hover:text-primary-pressed focus-visible:outline-brand ease-ig no-underline transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2"
                )}
              >
                {item.label}
              </Link>
            ) : (
              <span className={cn(PILL, "bg-surface border-hairline text-ink-3 font-normal")}>
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ul>
      {data.more?.href ? (
        <TextLink href={data.more.href} variant="arrow">
          {data.more.label}
        </TextLink>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Override of the article                                                                    */
/* ------------------------------------------------------------------------------------------ */

/** The closing note: its paragraphs on one line, «·»-separated, placeholders resolved. */
function closingNote(
  content: RichTextData,
  nodes: Node[],
  ctx: PlaceholderContext
): ArticlePiece[] {
  if (nodes.some(hasLinks)) {
    return [{ content: <ArticleNote data={content} ctx={ctx} /> }];
  }
  // «{условия}» + «{акция_текст}»: joined first, so an empty promo takes its «·» with it.
  const text = fill(nodes.map(plainText).join(" · "), ctx).trim();
  return hasText(text) ? [{ content: <ArticleNote text={text} ctx={ctx} /> }] : [];
}

/** Rendering of a segment-page block; `null` → the generic article rendering. */
export function segmentPieces(block: LayoutBlock, ctx: PlaceholderContext): ArticlePiece[] | null {
  if (block.blockType !== "richText") return null;
  const nodes = contentNodes(block.content);
  if (nodes.some(isH2)) return null;
  const heading = fill(block.heading, ctx).trim();
  if (!heading) return closingNote(block.content, nodes, ctx);

  const bullets = bulletItems(nodes);
  if (bullets) return [{ title: heading, content: <FeatureCards items={bullets} ctx={ctx} /> }];

  const [only, ...others] = nodes;
  if (only?.type === "table" && others.length === 0) {
    const table = richTable(only, ctx, heading);
    if (table) return [{ title: heading, content: table }];
  }

  const row = linkRowOf(nodes);
  if (row) return [{ title: heading, content: <LinkRow data={row} /> }];

  return [
    {
      title: heading,
      content: <RichText data={block.content} ctx={ctx} className={ARTICLE_TEXT} />,
    },
  ];
}
