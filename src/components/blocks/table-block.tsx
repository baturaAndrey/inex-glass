import { DataTable, type DataTableColumn, type DataTableRow } from "@/components/ig/data-table";
import { TextLink } from "@/components/ig/text-link";
import { BlockSection, fill, hasText } from "./shared";
import type { BlockProps } from "./types";

const columnKey = (index: number) => `c${index}`;

/**
 * Facts table (`DataTable`): columns with alignment / numeric flag, highlighted column,
 * cell links and whole-row links. ≤599 px: cards (`mobileMode: cards`) or a horizontally
 * scrolled table for «parameter — value» pairs.
 */
export function TableBlock({ block, ctx, section }: BlockProps<"table">) {
  const table = block.table;
  const columns: DataTableColumn[] = (table?.columns ?? []).map((column, index) => ({
    key: columnKey(index),
    label: fill(column.label, ctx),
    align: column.align ?? (column.numeric ? "right" : "left"),
    ...(column.numeric ? { numeric: true } : {}),
  }));
  if (columns.length === 0) return null;

  const sourceRows = table?.rows ?? [];
  const rows: DataTableRow[] = sourceRows.map((row) =>
    Object.fromEntries(
      columns.map((column, index) => {
        const cell = row.cells?.[index];
        const value = fill(cell?.value, ctx);
        const content = hasText(cell?.href) ? <TextLink href={cell.href}>{value}</TextLink> : value;
        return [
          column.key,
          cell?.positive ? (
            <span className="text-primary-pressed font-semibold">{content}</span>
          ) : (
            content
          ),
        ];
      })
    )
  );
  const highlight = table?.highlightColumn ? columns[table.highlightColumn - 1]?.key : undefined;
  const caption = fill(table?.caption, ctx);
  const footnote = fill(table?.footnote, ctx);

  return (
    <BlockSection block={block} section={section} ctx={ctx}>
      <DataTable
        columns={columns}
        rows={rows}
        mobile={table?.mobileMode === "pairs" ? "scroll" : "cards"}
        {...(caption ? { caption } : {})}
        {...(highlight ? { highlightColumn: highlight } : {})}
        rowHref={(_, index) => {
          const href = sourceRows[index]?.rowHref;
          return hasText(href) ? href : undefined;
        }}
      />
      {footnote ? <p className="text-small text-text-2 mt-4 mb-0">{footnote}</p> : null}
    </BlockSection>
  );
}
