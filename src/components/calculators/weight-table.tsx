import { DataTable, type DataTableColumn } from "@/components/ig/data-table";
import { formatNumber } from "@/lib/domain/format";
import { WEIGHT_TABLE } from "@/lib/domain/weight";
import { WEIGHT_PAGE_COPY } from "./weight-copy";

const COLUMNS: DataTableColumn[] = [
  { key: "thickness", label: WEIGHT_PAGE_COPY.table.columns.thickness },
  { key: "weight", label: WEIGHT_PAGE_COPY.table.columns.weight, numeric: true },
];

/**
 * «Толщина | Вес 1 м²» for 4–19 mm, computed from `WEIGHT_TABLE` (2.5 kg/m² per mm) instead of
 * being typed in: «5 мм — 12,5 кг» … «19 мм — 47,5 кг». Rows become `.ig-mcard` cards on ≤599 px.
 */
export function WeightTable({ className }: { className?: string | undefined }) {
  const rows = WEIGHT_TABLE.map(({ thickness, kgPerM2 }) => ({
    thickness: <b>{thickness} мм</b>,
    weight: `${formatNumber(kgPerM2)} кг`,
  }));
  return <DataTable columns={COLUMNS} rows={rows} className={className} />;
}
