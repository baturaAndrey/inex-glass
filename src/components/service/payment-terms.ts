import { fill, hasText } from "@/components/blocks/shared";
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
