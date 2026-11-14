import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Table of the «Как заказать» mockups (`2560_kak-zakazat` «Кто за что отвечает»,
 * `2560_kak-zakazat_trebovaniya` «Что указать в чертеже»): a white card, the header row on the
 * light-green tint in caps, the first column semibold, hairlines between the rows (no zebra).
 *
 * ≤599 px every row becomes a card (DESIGN.md §10): the first cell is the title, the other cells
 * follow under their caps column label. A headerless table (key → value, «Оплата и договор»)
 * becomes «key above value» cards.
 */

export interface OrderTableColumn {
  label: string;
  /** Tabular figures, right-aligned on desktop. */
  numeric?: boolean | undefined;
  /** Desktop width of the column (`"380px"`, `"40%"`); the rest share the remaining width. */
  width?: string | undefined;
}

export interface OrderTableProps {
  columns: readonly OrderTableColumn[];
  /** One entry per row, one cell per column. */
  rows: ReadonlyArray<{ key: string; cells: readonly ReactNode[] }>;
  /** Accessible name of the table (visually hidden). */
  caption?: string | undefined;
  /** No header row (key → value tables). */
  headerless?: boolean | undefined;
  footnote?: string | undefined;
  /**
   * The first column is «ours» (mockup `2560_o-kompanii`, «Inex Glass» vs «Заводы-партнёры»):
   * its header label is in the brand text colour.
   */
  accentFirstColumn?: boolean | undefined;
  className?: string | undefined;
  "data-testid"?: string | undefined;
}

const HEAD = "text-text-2 text-[13px] leading-4 font-medium tracking-[0.06em] uppercase";
const CELL = "text-text px-7 py-[18px] align-top text-base leading-normal max-md:px-5";

export function OrderTable({
  columns,
  rows,
  caption,
  headerless = false,
  footnote,
  accentFirstColumn = false,
  className,
  "data-testid": testId,
}: OrderTableProps) {
  const [, ...detailColumns] = columns;

  return (
    <div className={cn("flex min-w-0 flex-col gap-4", className)} data-testid={testId}>
      {/* ≥600 px: the table. */}
      <div className="bg-surface border-hairline overflow-x-auto rounded-lg border max-sm:hidden">
        <table className="w-full border-collapse" data-order-table="">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          {headerless ? (
            <colgroup>
              {columns.map((column, index) => (
                <col key={index} style={column.width ? { width: column.width } : undefined} />
              ))}
            </colgroup>
          ) : (
            <thead>
              <tr className="bg-tint-green">
                {columns.map((column, index) => (
                  <th
                    key={index}
                    scope="col"
                    style={column.width ? { width: column.width } : undefined}
                    className={cn(
                      HEAD,
                      "px-7 py-4 align-bottom max-md:px-5",
                      accentFirstColumn && index === 0 && "text-primary-pressed font-semibold",
                      column.numeric ? "text-right" : "text-left"
                    )}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-hairline border-b last:border-b-0">
                {columns.map((column, index) =>
                  index === 0 ? (
                    <th key={index} scope="row" className={cn(CELL, "text-left font-semibold")}>
                      {row.cells[index]}
                    </th>
                  ) : (
                    <td
                      key={index}
                      className={cn(
                        CELL,
                        column.numeric && "text-right whitespace-nowrap tabular-nums"
                      )}
                    >
                      {row.cells[index]}
                    </td>
                  )
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ≤599 px: one card per row. */}
      <ul className="m-0 hidden list-none flex-col gap-3 p-0 max-sm:flex" aria-label={caption}>
        {rows.map((row) => (
          <li
            key={row.key}
            className="bg-surface border-hairline flex flex-col gap-3 rounded-lg border p-4"
            data-order-card=""
          >
            {headerless ? (
              <>
                <span className="text-small text-text-2">{row.cells[0]}</span>
                {detailColumns.map((_, index) => (
                  <span key={index} className="text-base leading-normal font-medium">
                    {row.cells[index + 1]}
                  </span>
                ))}
              </>
            ) : (
              <>
                <span className="text-lg leading-snug font-semibold">{row.cells[0]}</span>
                <dl className="m-0 flex flex-col gap-2.5">
                  {detailColumns.map((column, index) => (
                    <div key={index} className="flex flex-col gap-1">
                      <dt className={HEAD}>{column.label}</dt>
                      <dd
                        className={cn(
                          "m-0 text-base leading-normal",
                          column.numeric && "tabular-nums"
                        )}
                      >
                        {row.cells[index + 1]}
                      </dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
          </li>
        ))}
      </ul>

      {footnote ? <p className="text-small text-text-2 m-0">{footnote}</p> : null}
    </div>
  );
}
