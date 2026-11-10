import type { ReactNode } from "react";
import Link from "next/link";
import { Info, TriangleAlert } from "lucide-react";
import { fill, hasText, resolveLink } from "@/components/blocks/shared";
import type { BlockOf } from "@/components/blocks/types";
import { TextLink } from "@/components/ig/text-link";
import { RichText, type RichTextData } from "@/components/rich-text/rich-text";
import type { PlaceholderContext } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { OrderTable, type OrderTableColumn } from "./order-table";

/**
 * Content pieces of the «Как заказать» subpage article (Paper mockup
 * `2560_kak-zakazat_trebovaniya`, frame `content`), one per CMS block kind: rich text, the white
 * table card, notes (callouts), numbered check cards. They carry no section chrome: the article
 * (`./subpage-article.tsx`) places them under its H2.
 */

/**
 * Rich text of the article: 17 px paragraphs and lists with brand markers; links follow the size
 * of the text. Paragraphs keep the 72ch measure of `RichText` (the content column is wide).
 */
export const ARTICLE_TEXT = cn(
  "flex min-w-0 flex-col gap-4",
  "[&_p]:text-[17px] [&_p]:leading-[1.6] max-sm:[&_p]:text-base",
  "[&_ul]:gap-2.5 [&_ul]:text-[17px] [&_ul]:leading-[1.6] [&_ul]:marker:text-brand max-sm:[&_ul]:text-base",
  "[&_ol]:gap-2.5 [&_ol]:text-[17px] [&_ol]:leading-[1.6] [&_ol]:marker:font-bold [&_ol]:marker:text-primary-pressed max-sm:[&_ol]:text-base",
  "[&_a]:text-[length:inherit] [&_a]:leading-[inherit]",
  "[&>h3]:mt-4 [&>h3]:text-h4"
);

export function ArticleRichText({
  data,
  ctx,
  className,
}: {
  data: RichTextData | null | undefined;
  ctx: PlaceholderContext;
  className?: string | undefined;
}) {
  return <RichText data={data} ctx={ctx} className={cn(ARTICLE_TEXT, className)} />;
}

/* ------------------------------------------------------------------------------------------ */
/* Table                                                                                      */
/* ------------------------------------------------------------------------------------------ */

/** Width of the label column of a two-column «what → how» table (mockup: 380 of 1340 px). */
const LABEL_COLUMN_WIDTH = "30%";

/** A `table` block as the white table card (`OrderTable`): cell links, numeric columns. */
export function ArticleTable({
  block,
  ctx,
  caption,
}: {
  block: BlockOf<"table">;
  ctx: PlaceholderContext;
  /** Accessible name (the section heading). */
  caption?: string | undefined;
}) {
  const table = block.table;
  const sourceColumns = table?.columns ?? [];
  if (sourceColumns.length === 0) return null;
  const twoColumns = sourceColumns.length === 2;
  const columns: OrderTableColumn[] = sourceColumns.map((column, index) => ({
    label: fill(column.label, ctx),
    numeric: Boolean(column.numeric),
    ...(twoColumns && index === 0 ? { width: LABEL_COLUMN_WIDTH } : {}),
  }));
  const rows = (table?.rows ?? []).map((row, rowIndex) => ({
    key: row.id ?? String(rowIndex),
    cells: columns.map((_, index) => {
      const cell = row.cells?.[index];
      const value = fill(cell?.value, ctx);
      const content: ReactNode = hasText(cell?.href) ? (
        <TextLink href={cell.href}>{value}</TextLink>
      ) : (
        value
      );
      return cell?.positive ? (
        <span className="text-primary-pressed font-semibold">{content}</span>
      ) : (
        content
      );
    }),
  }));
  const tableCaption = caption || fill(table?.caption, ctx) || fill(block.heading, ctx);
  const footnote = fill(table?.footnote, ctx);

  return (
    <OrderTable
      columns={columns}
      rows={rows}
      {...(tableCaption ? { caption: tableCaption } : {})}
      {...(footnote ? { footnote } : {})}
      data-testid="article-table"
    />
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Notes                                                                                      */
/* ------------------------------------------------------------------------------------------ */

/**
 * A `callout` block as a note: info → light-teal (mockup «Пример: стекло 10 мм…»), warning →
 * warning panel with the triangle. Title bold, items as a bulleted list, the body after them.
 */
export function ArticleCallout({
  block,
  ctx,
}: {
  block: BlockOf<"callout">;
  ctx: PlaceholderContext;
}) {
  const warning = block.tone !== "info";
  const title = fill(block.title, ctx);
  const items = block.items ?? [];
  return (
    <aside
      className={cn(
        "flex gap-4 rounded-[12px] px-6 py-5 max-sm:gap-3 max-sm:px-4 max-sm:py-4",
        warning ? "bg-warning-bg border-warning border" : "bg-primary-light"
      )}
      data-tone={warning ? "warning" : "info"}
      data-testid="article-callout"
    >
      {warning ? (
        <TriangleAlert
          aria-hidden="true"
          strokeWidth={2}
          className="text-warning-text mt-0.5 size-6 shrink-0"
        />
      ) : null}
      <div className="flex min-w-0 flex-col gap-3">
        {title ? (
          <p
            className={cn(
              "m-0 text-lg leading-snug font-semibold",
              warning ? "text-warning-text" : "text-text"
            )}
          >
            {title}
          </p>
        ) : null}
        {items.length > 0 ? (
          <ul className="marker:text-brand m-0 flex list-disc flex-col gap-2 pl-5 text-base leading-[1.55]">
            {items.map((item, index) => (
              <li key={item.id ?? index} className="[&_p]:inline [&_p]:text-[length:inherit]">
                {hasText(item.lead) ? <strong>{fill(item.lead, ctx)} </strong> : null}
                <RichText data={item.text} ctx={ctx} disableContainer />
              </li>
            ))}
          </ul>
        ) : null}
        {block.body ? (
          <RichText
            data={block.body}
            ctx={ctx}
            className="flex flex-col gap-3 [&_a]:text-[length:inherit] [&_p]:max-w-none [&_p]:text-base [&_p]:leading-[1.55]"
          />
        ) : null}
      </div>
    </aside>
  );
}

/**
 * White note with the info icon (mockup `sec-check`, the responsibility line under the check
 * steps): a headless rich-text block right after a `steps` block.
 */
export function ArticleNote({
  data,
  ctx,
  text,
}: {
  data?: RichTextData | null | undefined;
  ctx: PlaceholderContext;
  /** Plain one-line note instead of rich text («{условия} · {акция_текст}» of «Клиентам»). */
  text?: string | undefined;
}) {
  return (
    <aside
      className="bg-surface border-hairline flex items-center gap-4 rounded-lg border px-6 py-5 max-sm:items-start max-sm:gap-3 max-sm:px-4 max-sm:py-4"
      data-testid="article-note"
    >
      <Info aria-hidden="true" strokeWidth={1.75} className="text-navy size-[26px] shrink-0" />
      {text ? (
        <p className="text-ink-3 m-0 text-base leading-[1.55]">{text}</p>
      ) : (
        <RichText
          data={data}
          ctx={ctx}
          className="text-ink-3 flex flex-col gap-2 [&_a]:text-[length:inherit] [&_p]:max-w-none [&_p]:text-base [&_p]:leading-[1.55]"
        />
      )}
    </aside>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Numbered steps                                                                             */
/* ------------------------------------------------------------------------------------------ */

const twoDigits = (index: number) => String(index + 1).padStart(2, "0");

export interface NumberedCardItem {
  key: string;
  /** Main text of the card (plain or rich: rendered in a `div`). */
  title: ReactNode;
  text?: string | undefined;
  link?: { href: string; label: string } | null | undefined;
}

/**
 * Numbered cards (mockups «Как мы проверяем файл», «Как работаем с объектом»): «01»… in brand
 * teal over the text; the last card is primary-dark (the step that starts production). Up to 4
 * columns, 2 at ≤1100 px, 1 at ≤599 px.
 */
export function NumberedCards({
  items,
  testId = "article-steps",
  className,
}: {
  items: readonly NumberedCardItem[];
  testId?: string | undefined;
  className?: string | undefined;
}) {
  if (items.length === 0) return null;
  const last = items.length - 1;
  const columns = Math.min(items.length, 4);
  return (
    <ol
      className={cn(
        "m-0 grid list-none gap-4 p-0 max-md:grid-cols-2 max-sm:grid-cols-1 max-sm:gap-3",
        columns === 4 && "grid-cols-4",
        columns === 3 && "grid-cols-3",
        columns === 2 && "grid-cols-2",
        columns === 1 && "grid-cols-1",
        className
      )}
      data-testid={testId}
    >
      {items.map((item, index) => {
        const dark = index === last && items.length > 1;
        return (
          <li
            key={item.key}
            className={cn(
              "flex flex-col gap-3 rounded-lg p-6 max-sm:p-5",
              dark ? "bg-primary-dark text-white" : "bg-surface border-hairline border"
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "text-[32px] leading-10 font-bold tabular-nums max-sm:text-[28px] max-sm:leading-9",
                dark ? "text-line-teal" : "text-brand"
              )}
            >
              {twoDigits(index)}
            </span>
            <div className="text-base leading-[1.55]">{item.title}</div>
            {item.text ? (
              <span
                className={cn("text-[15px] leading-[1.55]", dark ? "text-on-navy-2" : "text-ink-3")}
              >
                {item.text}
              </span>
            ) : null}
            {item.link ? (
              <Link
                href={item.link.href}
                className={cn(
                  "mt-auto self-start text-[15px] font-medium underline underline-offset-[3px]",
                  dark ? "text-white hover:text-white" : "text-primary-pressed"
                )}
              >
                {item.link.label}
              </Link>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

/** A `steps` block as `NumberedCards`, with the block footnote under them. */
export function ArticleSteps({ block, ctx }: { block: BlockOf<"steps">; ctx: PlaceholderContext }) {
  const items = (block.items ?? []).flatMap((item, index): NumberedCardItem[] => {
    const title = fill(item.title, ctx);
    if (!title) return [];
    const link = resolveLink(item.link);
    const linkLabel = fill(item.linkLabel, ctx) || link?.label || "";
    return [
      {
        key: item.id ?? String(index),
        title,
        text: fill(item.text, ctx),
        link: link && linkLabel ? { href: link.href, label: linkLabel } : null,
      },
    ];
  });
  if (items.length === 0) return null;
  const footnote = fill(block.footnote, ctx);

  return (
    <div className="flex flex-col gap-4">
      <NumberedCards items={items} />
      {footnote ? <p className="text-small text-text-2 m-0">{footnote}</p> : null}
    </div>
  );
}
