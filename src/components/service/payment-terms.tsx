import { BlockSection, fill, hasText } from "@/components/blocks/shared";
import type { BlockProps } from "@/components/blocks/types";
import { listPlaceholders } from "@/lib/domain";

export interface PaymentTermRow {
  label: string;
  value: string;
}

type TableRows = NonNullable<NonNullable<BlockProps<"table">["block"]["table"]>["rows"]>;

/**
 * Key → value rows of the «Условия» table with placeholders substituted. A row whose value is
 * built from placeholders that all came out empty is dropped: «Скидка | {акция_текст}» is shown
 * only while the promo is active (the generic `table` block would print an empty cell).
 */
export function paymentTermRows(
  rows: TableRows | null | undefined,
  ctx: BlockProps<"table">["ctx"]
): PaymentTermRow[] {
  return (rows ?? []).flatMap((row) => {
    const rawValue = row.cells?.[1]?.value ?? "";
    const label = fill(row.cells?.[0]?.value, ctx);
    const value = fill(rawValue, ctx);
    if (!hasText(label)) return [];
    if (!hasText(value) && listPlaceholders(rawValue).length > 0) return [];
    return [{ label, value }];
  });
}

/**
 * «Условия» of `/kak-zakazat/oplata/` (teksty 11 §3): a key/value table WITHOUT a header row
 * (the column labels the schema requires are editor-only). ≤599 px: `.ig-mcard` cards — the
 * key as a small muted caption, the value under it.
 */
export function PaymentTerms({ block, ctx, section }: BlockProps<"table">) {
  const rows = paymentTermRows(block.table?.rows, ctx);
  if (rows.length === 0) return null;
  return (
    <BlockSection block={block} section={section} ctx={ctx}>
      <div className="max-w-[900px]" data-testid="payment-terms">
        <div className="ig-table-wrap max-sm:hidden">
          <table className="ig-table">
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  {/* `td`, not `th`: keeps the zebra rows and body type of `.ig-table` cells. */}
                  <td className="w-2/5 font-medium">{row.label}</td>
                  <td>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <dl className="m-0 hidden flex-col gap-3 max-sm:flex">
          {rows.map((row) => (
            <div key={row.label} className="ig-mcard">
              <dt className="text-small text-text-2">{row.label}</dt>
              <dd className="m-0 font-medium">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </BlockSection>
  );
}
