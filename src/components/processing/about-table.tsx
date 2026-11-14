import { InlineText } from "@/components/glass-types/glass-type-sections";
import type { PlaceholderContext } from "@/lib/domain";
import { cn } from "@/lib/utils";

/**
 * The comparison table of an «about» panel (Paper mockup `2560_glass_matovoe`, «Два способа
 * сделать стекло матовым»): a micro caps caption, caps column headers, row labels bold
 * primary-dark, hairlines between the rows. The highlighted column (`highlightColumn` of the
 * `table` block) has its header in the brand colour.
 *
 * Cells are plain CMS text with the inline markup of the glass-type tables (`**bold**`,
 * `[text](/path/)`, see `InlineText`). ≤599 px the columns do not fit: every row becomes a group
 * (label, then each value under its caps column header).
 */

export interface AboutTableData {
  caption: string;
  /** Column headers; the first one is the (usually empty) corner above the row labels. */
  columns: readonly string[];
  /** Rows: the label first, then one value per column. */
  rows: ReadonlyArray<{ key: string; cells: readonly string[] }>;
  /** 1-based index of the highlighted column (the `table` block field), or `null`. */
  highlightColumn: number | null;
  footnote: string;
}

const HEADER = "text-micro tracking-[0.06em] uppercase font-medium";
const LABEL = "text-primary-dark text-[15px] leading-[1.2] font-semibold";
/** Links in cells: medium weight, underlined, in the text link colour. */
const VALUE =
  "text-body text-ink-3 [&_a]:text-primary-pressed [&_a]:font-medium [&_a]:underline [&_a]:underline-offset-2";

const headerColour = (index: number, highlight: number | null) =>
  highlight === index + 1 ? "text-primary-pressed" : "text-text-2";

export function AboutTable({
  table,
  ctx,
  captionId,
}: {
  table: AboutTableData;
  ctx: PlaceholderContext;
  captionId: string;
}) {
  const [, ...valueColumns] = table.columns;
  return (
    <div
      className="bg-surface border-hairline flex min-w-0 flex-col gap-4 rounded-xl border p-10 max-lg:p-8 max-sm:p-5"
      data-testid="about-table"
    >
      <p id={captionId} className={cn(HEADER, "text-text-2 m-0")}>
        {table.caption}
      </p>

      {/* ≥600 px: the table. */}
      <table className="w-full border-collapse max-sm:hidden" aria-labelledby={captionId}>
        <thead>
          <tr className="border-hairline border-b">
            <td className="w-[200px] py-3 pr-4 max-lg:w-[160px]" />
            {valueColumns.map((label, index) => (
              <th
                key={index}
                scope="col"
                className={cn(
                  HEADER,
                  "py-3 pr-4 text-left align-bottom last:pr-0",
                  headerColour(index + 1, table.highlightColumn)
                )}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => {
            const [label, ...values] = row.cells;
            return (
              <tr key={row.key} className="border-hairline border-b last:border-b-0">
                <th scope="row" className={cn(LABEL, "py-4 pr-4 text-left align-top")}>
                  <InlineText text={label} ctx={ctx} />
                </th>
                {values.map((value, index) => (
                  <td key={index} className={cn(VALUE, "py-4 pr-4 align-top last:pr-0")}>
                    <InlineText text={value} ctx={ctx} />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ≤599 px: one group per row. */}
      <div className="hidden flex-col max-sm:flex" role="list" aria-labelledby={captionId}>
        {table.rows.map((row) => {
          const [label, ...values] = row.cells;
          return (
            <div
              key={row.key}
              role="listitem"
              className="border-hairline flex flex-col gap-3 border-b py-4 last:border-b-0"
            >
              <p className={cn(LABEL, "m-0")}>
                <InlineText text={label} ctx={ctx} />
              </p>
              <dl className="m-0 flex flex-col gap-3">
                {values.map((value, index) => (
                  <div key={index} className="flex flex-col gap-1">
                    <dt className={cn(HEADER, headerColour(index + 1, table.highlightColumn))}>
                      {valueColumns[index]}
                    </dt>
                    <dd className={cn(VALUE, "m-0")}>
                      <InlineText text={value} ctx={ctx} />
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          );
        })}
      </div>

      {table.footnote ? (
        <p className="text-small text-text-2 m-0">
          <InlineText text={table.footnote} ctx={ctx} />
        </p>
      ) : null}
    </div>
  );
}
