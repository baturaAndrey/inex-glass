import type { ReactNode } from "react";
import {
  RichText as LexicalRichText,
  type JSXConverters,
  type JSXConvertersFunction,
} from "@payloadcms/richtext-lexical/react";
import { DataTable, type DataTableColumn, type DataTableRow } from "@/components/ig/data-table";
import { TextLink } from "@/components/ig/text-link";
import { replacePlaceholders, type PlaceholderContext } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { lexicalToPlainText } from "@/payload/utils/lexical-text";
import { docToHref } from "./internal-links";
import type { SerializedPlaceholderContext } from "./placeholders-context";
import type {
  DefaultNodeTypes,
  SerializedHeadingNode,
  SerializedLinkNode,
  SerializedListNode,
  SerializedTextNode,
} from "@payloadcms/richtext-lexical";
import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";

/** A Lexical rich-text value as Payload returns it (`{ root: … }`). */
export type RichTextData = { root: unknown; [key: string]: unknown };

export interface RichTextProps {
  data: RichTextData | null | undefined;
  /** Placeholder context; without it `{…}` placeholders are rendered as they are. */
  ctx?: PlaceholderContext | undefined;
  className?: string | undefined;
  /** Render the nodes without the wrapping `<div>` (e.g. inside a `<p>`-less container). */
  disableContainer?: boolean | undefined;
}

const HEADING_CLASS: Record<string, string> = {
  h2: "ig-h2 mt-12 first:mt-0",
  h3: "ig-h3 mt-10 first:mt-0",
  h4: "ig-h4 mt-8 first:mt-0",
  h5: "ig-h5 mt-6 first:mt-0",
  h6: "ig-h6 mt-6 first:mt-0",
};
const HEADING_TAGS = new Set(["h2", "h3", "h4", "h5", "h6"]);

/** Paragraphs and lists keep a ≈72ch measure even inside wide blocks. */
const MEASURE = "max-w-[72ch]";

/** Lexical text format bit flags (`lexical` `TEXT_TYPE_TO_FORMAT`). */
const IS_BOLD = 1;
const IS_ITALIC = 1 << 1;

/** URL schemes an editor's custom link may use; anything else is rendered as plain text. */
const SAFE_LINK_SCHEMES: ReadonlySet<string> = new Set(["http:", "https:", "mailto:", "tel:"]);
/** Explicit scheme prefix (`javascript:`, `data:`…), per the URL spec's scheme grammar. */
const URL_SCHEME = /^([a-z][a-z\d+.-]*):/i;

/**
 * Custom-link `href` if it is safe to render: `http(s):`, `mailto:`, `tel:`, a root-relative
 * path (`/…`, but not the protocol-relative `//host`) or a fragment (`#…`). Browsers ignore
 * ASCII whitespace / control characters inside a scheme (`java\tscript:`) and drop tab /
 * newline anywhere in a URL (`/\t/host` → `//host`), so the checks run on the stripped form.
 */
export function safeExternalHref(url: string | null | undefined): string | null {
  const href = url?.trim();
  if (!href) return null;
  if (href.startsWith("#")) return href;
  // Roughly what the browser parses: C0 controls, space and DEL removed.
  const compact = href.replace(/[\u0000- \u007f]/g, "");
  if (href.startsWith("/")) {
    return compact.startsWith("//") || compact.startsWith("/\\") ? null : href;
  }
  const scheme = URL_SCHEME.exec(compact)?.[1];
  return scheme && SAFE_LINK_SCHEMES.has(`${scheme.toLowerCase()}:`) ? href : null;
}

function isEditorState(data: RichTextData | null | undefined): data is RichTextData {
  return typeof data === "object" && data !== null && typeof data.root === "object";
}

/** Text with substituted placeholders; bold / italic are kept (other formats are not in the editor). */
function renderText(node: SerializedTextNode, ctx: PlaceholderContext | undefined): ReactNode {
  const text = ctx ? replacePlaceholders(node.text, ctx) : node.text;
  let out: ReactNode = text;
  if (node.format & IS_ITALIC) out = <em>{out}</em>;
  if (node.format & IS_BOLD) out = <strong>{out}</strong>;
  return out;
}

/**
 * Cell content inside a table: the cell's paragraphs (links, bold…) without the measure, spacing
 * and font size of free-standing paragraphs — the table row / phone card sets the typography.
 */
const CELL_CLASS =
  "flex flex-col gap-1 [&_p]:m-0 [&_p]:max-w-none [&_p]:text-[length:inherit] [&_p]:leading-[inherit] [&_p]:text-inherit";

type LexicalChild = { type?: unknown; children?: unknown; headerState?: unknown };

const childrenOf = (node: LexicalChild): LexicalChild[] =>
  Array.isArray(node.children) ? (node.children as LexicalChild[]) : [];

/** Lexical `TableCellHeaderStates`: any non-zero state (row / column / both) is a header cell. */
const isHeaderCell = (cell: LexicalChild): boolean =>
  typeof cell.headerState === "number" && cell.headerState > 0;

/**
 * Lexical table → `DataTable` (`.ig-table-wrap > .ig-table` with `<thead>` / `<th scope="col">`,
 * one `.ig-mcard` per row on ≤599 px). A first row made only of header cells becomes the column
 * labels; a table without one has no labels for the cards, so it scrolls horizontally on phones.
 * Payload's default table converters (inline cell styles, no `<thead>`) are never used.
 */
function renderTable(node: LexicalChild, nodesToJSX: NodesToJSX): ReactNode {
  const rows = childrenOf(node).filter((row) => row.type === "tablerow");
  const [first, ...rest] = rows;
  if (!first) return null;
  const firstCells = childrenOf(first);
  const hasHeader = firstCells.length > 0 && firstCells.every(isHeaderCell);
  const bodyRows = hasHeader ? rest : rows;
  const width = Math.max(...rows.map((row) => childrenOf(row).length));

  const columns: DataTableColumn[] = Array.from({ length: width }, (_, index) => {
    const cell = hasHeader ? firstCells[index] : undefined;
    return {
      key: `c${index}`,
      label: cell ? lexicalToPlainText({ root: cell }).replace(/\s+/g, " ").trim() : "",
    };
  });
  const data: DataTableRow[] = bodyRows.map((row) => {
    const cells = childrenOf(row);
    return Object.fromEntries(
      columns.map((column, index) => {
        const cell = cells[index];
        const content = cell
          ? nodesToJSX({ nodes: childrenOf(cell) as Parameters<NodesToJSX>[0]["nodes"] })
          : null;
        return [column.key, content ? <div className={CELL_CLASS}>{content}</div> : null];
      })
    );
  });

  return (
    <DataTable
      columns={columns}
      rows={data}
      mobile={hasHeader ? "cards" : "scroll"}
      // The first column names the row («Прочность…», «Жилые дома…»): medium weight in the table.
      // Without a header row the empty label strip is hidden.
      className={cn("[&_tbody_td:first-child]:font-medium", !hasHeader && "[&_thead]:hidden")}
    />
  );
}

function buildConverters(ctx: PlaceholderContext | undefined): JSXConvertersFunction {
  return ({ defaultConverters }) => {
    const overrides: JSXConverters<DefaultNodeTypes> = {
      text: ({ node }) => renderText(node, ctx),
      paragraph: ({ node, nodesToJSX }) => {
        const children = nodesToJSX({ nodes: node.children });
        // Empty paragraphs (an editor's extra Enter) carry no content.
        if (children.length === 0) return null;
        return <p className={cn("ig-body", MEASURE)}>{children}</p>;
      },
      heading: ({ node, nodesToJSX }: { node: SerializedHeadingNode; nodesToJSX: NodesToJSX }) => {
        // h1 is reserved for the page title: a stray h1 in content is demoted to h2.
        const Tag = (HEADING_TAGS.has(node.tag) ? node.tag : "h2") as
          "h2" | "h3" | "h4" | "h5" | "h6";
        return <Tag className={HEADING_CLASS[Tag]}>{nodesToJSX({ nodes: node.children })}</Tag>;
      },
      list: ({ node, nodesToJSX }: { node: SerializedListNode; nodesToJSX: NodesToJSX }) => {
        const children = nodesToJSX({ nodes: node.children });
        const listClass = cn("ig-body m-0 flex flex-col gap-2 pl-6 marker:text-primary", MEASURE);
        return node.tag === "ol" ? (
          <ol className={cn(listClass, "list-decimal")}>{children}</ol>
        ) : (
          <ul className={cn(listClass, "list-disc")}>{children}</ul>
        );
      },
      quote: ({ node, nodesToJSX }) => (
        <blockquote className={cn("ig-body text-ink-3 m-0 italic", MEASURE)}>
          {nodesToJSX({ nodes: node.children })}
        </blockquote>
      ),
      horizontalrule: () => <hr className="border-line my-8 border-0 border-t" />,
      link: ({ node, nodesToJSX }: { node: SerializedLinkNode; nodesToJSX: NodesToJSX }) => {
        const children = nodesToJSX({ nodes: node.children });
        const { fields } = node;
        const internal = fields.linkType === "internal";
        const href = internal ? docToHref(fields.doc ?? null) : safeExternalHref(fields.url);
        // Unresolvable target (unpublished / not populated) or a disallowed URL scheme:
        // keep the words, drop the link.
        if (!href) return <>{children}</>;
        const external = !internal && /^https?:\/\//i.test(href);
        return (
          <TextLink
            href={href}
            target={fields.newTab ? "_blank" : undefined}
            // TextLink adds `noopener noreferrer` itself for `_blank`.
            rel={external && !fields.newTab ? "noopener noreferrer" : undefined}
          >
            {children}
          </TextLink>
        );
      },
    };

    return {
      ...defaultConverters,
      ...overrides,
      table: ({ node, nodesToJSX }) => renderTable(node, nodesToJSX),
      // Rows and cells are rendered by `renderTable`; these only drop Payload's inline-styled
      // `<tr>`/`<td>` for a row / cell reached outside a table.
      tablerow: ({ node, nodesToJSX }) => <>{nodesToJSX({ nodes: node.children })}</>,
      tablecell: ({ node, nodesToJSX }) => <>{nodesToJSX({ nodes: node.children })}</>,
    };
  };
}

type NodesToJSX = Parameters<
  Extract<NonNullable<JSXConverters["paragraph"]>, (...args: never[]) => unknown>
>[0]["nodesToJSX"];

/**
 * Lexical → JSX for site content. Every text node goes through the placeholder engine
 * (`{цена_10мм}`, `{дата_цен}`, `{N}`…; unknown placeholders stay as is), headings use the
 * design-system scale, internal links resolve through `docUrl`.
 * A plain (non-async) component: works in Server Components and inside client trees alike.
 */
export function RichText({ data, ctx, className, disableContainer }: RichTextProps) {
  if (!isEditorState(data)) return null;
  return (
    <LexicalRichText
      data={data as unknown as SerializedEditorState}
      converters={buildConverters(ctx)}
      disableIndent
      disableTextAlign
      {...(disableContainer
        ? { disableContainer: true }
        : { className: cn("flex flex-col gap-4", className) })}
    />
  );
}

/**
 * `PlaceholderContext` with ISO-string dates, for `PlaceholdersProvider` props. Lives here (not
 * in the `'use client'` provider module) so Server Components can call it.
 */
export function serializePlaceholderContext(ctx: PlaceholderContext): SerializedPlaceholderContext {
  const iso = (value: string | Date | null): string | null =>
    value instanceof Date ? value.toISOString() : value;
  return {
    ...ctx,
    now: ctx.now.toISOString(),
    prices: { ...ctx.prices, priceDate: iso(ctx.prices.priceDate) ?? "" },
    promo: ctx.promo
      ? { ...ctx.promo, startDate: iso(ctx.promo.startDate), endDate: iso(ctx.promo.endDate) }
      : null,
  };
}
