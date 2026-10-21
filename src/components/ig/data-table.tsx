import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface DataTableColumn {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  /** Tabular figures, no wrapping (`.ig-num`). */
  numeric?: boolean;
  /** CSS width of the column on desktop, e.g. `"160px"` or `"20%"`. */
  width?: string;
}

export type DataTableRow = Record<string, ReactNode>;

export interface DataTableProps {
  columns: DataTableColumn[];
  rows: DataTableRow[];
  /** Visually hidden table caption (accessible name). */
  caption?: string;
  /** Index of the highlighted row (e.g. the current thickness). */
  highlightRow?: number;
  /** Key of the highlighted column (current thickness in the «neighbours» table). */
  highlightColumn?: string;
  /** Makes whole rows / mobile cards links (`.is-link`). */
  rowHref?: (row: DataTableRow, index: number) => string | undefined;
  /** Column used as the mobile card title (the first column by default). */
  mobileTitleKey?: string;
  /** ≤599 px: `cards` (default) — `.ig-mcard` list; `scroll` — the table scrolls horizontally. */
  mobile?: "cards" | "scroll";
  className?: string | undefined;
}

const ALIGN_CLASS = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
} as const;

/**
 * A link stretched over its whole row / card (`::after` covers the positioned ancestor):
 * the row is clickable without client JS and keyboard users get one tab stop per row.
 */
const STRETCHED_LINK =
  "text-inherit no-underline after:absolute after:inset-0 after:content-[''] hover:text-inherit focus-visible:outline-none focus-visible:after:-outline-offset-2 focus-visible:after:outline-2 focus-visible:after:outline-(--ig-focus-outline)";

function columnStyle(column: DataTableColumn): CSSProperties | undefined {
  return column.width ? { width: column.width } : undefined;
}

/**
 * Facts table (`.ig-table`, zebra rows). On phones (≤599 px) the same data is rendered as
 * `.ig-mcard` cards. Both views are in the HTML and switched by CSS — no JS, no layout shift.
 */
export function DataTable({
  columns,
  rows,
  caption,
  highlightRow,
  highlightColumn,
  rowHref,
  mobileTitleKey,
  mobile = "cards",
  className,
}: DataTableProps) {
  const cards = mobile === "cards";
  const titleKey = mobileTitleKey ?? columns[0]?.key;

  return (
    <div className={className}>
      <div className={cn("ig-table-wrap", cards && "max-sm:hidden")}>
        <table className={cn("ig-table", !cards && "max-sm:w-max max-sm:min-w-full")}>
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  style={columnStyle(column)}
                  className={cn(
                    ALIGN_CLASS[column.align ?? "left"],
                    column.key === highlightColumn && "bg-primary-light text-primary-dark"
                  )}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => {
              const href = rowHref?.(row, rowIndex);
              const isHighlighted = rowIndex === highlightRow;
              return (
                <tr
                  key={rowIndex}
                  aria-current={isHighlighted ? "true" : undefined}
                  className={cn(href && "is-link relative")}
                >
                  {columns.map((column, columnIndex) => (
                    <td
                      key={column.key}
                      className={cn(
                        ALIGN_CLASS[column.align ?? "left"],
                        column.numeric && "ig-num",
                        (isHighlighted || column.key === highlightColumn) && "bg-primary-light"
                      )}
                    >
                      {href && columnIndex === 0 ? (
                        <Link href={href} className={STRETCHED_LINK}>
                          {row[column.key]}
                        </Link>
                      ) : (
                        row[column.key]
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {cards ? (
        <ul className="m-0 hidden list-none flex-col gap-3 p-0 max-sm:flex">
          {rows.map((row, rowIndex) => (
            <MobileCard
              key={rowIndex}
              row={row}
              columns={columns}
              titleKey={titleKey}
              href={rowHref?.(row, rowIndex)}
              highlighted={rowIndex === highlightRow}
              highlightColumn={highlightColumn}
            />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

interface MobileCardProps {
  row: DataTableRow;
  columns: DataTableColumn[];
  titleKey: string | undefined;
  href: string | undefined;
  highlighted: boolean;
  highlightColumn: string | undefined;
}

/** One table row as a phone card: title + «label — value» lines. */
function MobileCard({
  row,
  columns,
  titleKey,
  href,
  highlighted,
  highlightColumn,
}: MobileCardProps) {
  // Columns without a label (e.g. an arrow column) carry no data for the card.
  const details = columns.filter((column) => column.key !== titleKey && column.label);
  const title = titleKey ? row[titleKey] : null;

  return (
    <li
      aria-current={highlighted ? "true" : undefined}
      className={cn(
        "ig-mcard",
        href && "hover:border-brand relative transition-colors duration-(--ig-dur-base)",
        highlighted && "border-brand bg-primary-light"
      )}
    >
      {/* A <div>, not a <p>: rich-text cells render their own <p>, and <p> inside <p> is invalid
          HTML — the parser splits it and hydration fails (React #418). */}
      <div className="m-0 text-lg leading-snug font-semibold">
        {href ? (
          <Link href={href} className={STRETCHED_LINK}>
            {title}
          </Link>
        ) : (
          title
        )}
      </div>
      {details.length > 0 ? (
        <dl className="m-0 flex flex-col gap-1.5">
          {details.map((column) => (
            <div
              key={column.key}
              className={cn(
                "ig-mcard__row",
                column.key === highlightColumn && "text-primary-dark",
                column.numeric && "tabular-nums"
              )}
            >
              <dt>{column.label}</dt>
              <dd>{row[column.key]}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </li>
  );
}
