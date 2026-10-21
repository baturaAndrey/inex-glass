import { ArrowRight } from "lucide-react";
import { DataTable, type DataTableColumn, type DataTableRow } from "@/components/ig/data-table";
import { Section, SectionHead, type SectionVariant } from "@/components/ig/section";
import { replacePlaceholders, type PlaceholderContext } from "@/lib/domain";
import type { ProcessingService } from "@/payload-types";

/**
 * «Что делаем» of the hub `/obrabotka-stekla/` (teksty/07 §1): one row per published
 * processing service, «Операция | Главное ограничение | →». The whole row links to the service
 * page (stretched link of `DataTable`); ≤599 px the rows become `.ig-mcard` cards.
 */

export type OperationRow = Pick<ProcessingService, "id" | "title" | "card" | "keyLimit" | "path">;

export interface OperationsTableProps {
  services: readonly OperationRow[];
  ctx: PlaceholderContext;
  variant?: SectionVariant | undefined;
}

const HEADING = "Что делаем";
const HEADING_ID = "processing-operations-title";

const COLUMNS: DataTableColumn[] = [
  { key: "operation", label: "Операция" },
  { key: "limit", label: "Главное ограничение" },
  // No label: the arrow column carries no data for the phone cards.
  { key: "arrow", label: "", align: "right", width: "64px" },
];

const text = (value: string | null | undefined, ctx: PlaceholderContext) =>
  value?.trim() ? replacePlaceholders(value.trim(), ctx) : "";

export function OperationsTable({ services, ctx, variant = "sf" }: OperationsTableProps) {
  const linked = services.filter((service) => Boolean(service.path));
  if (linked.length === 0) return null;

  const rows: DataTableRow[] = linked.map((service) => ({
    operation: text(service.card?.title, ctx) || text(service.title, ctx),
    limit: text(service.keyLimit, ctx),
    arrow: (
      <ArrowRight
        aria-hidden="true"
        strokeWidth={2}
        className="text-primary-pressed ml-auto block size-5"
      />
    ),
  }));

  return (
    <Section variant={variant} aria-labelledby={HEADING_ID} data-testid="processing-operations">
      <SectionHead title={HEADING} headingId={HEADING_ID} />
      <DataTable
        columns={COLUMNS}
        rows={rows}
        caption={HEADING}
        rowHref={(_, index) => linked[index]?.path ?? undefined}
      />
    </Section>
  );
}
