import type { ReactNode } from "react";
import { fill, hasText } from "@/components/blocks/shared";
import type { SystemItem } from "@/components/blocks/types";
import { DataTable, type DataTableColumn } from "@/components/ig/data-table";
import { Section, SectionHead, type SectionVariant } from "@/components/ig/section";
import type { PlaceholderContext } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { SystemCard } from "./system-card";

export const DEFAULT_SYSTEMS_HEADING = "Какую систему выбрать";

/** Phones swipe the cards horizontally from this many systems on (fewer stack in one column). */
export const SWIPE_MIN_SYSTEMS = 4;

/** Desktop (≥1366) columns: one per system, at most four. Static strings for Tailwind. */
const DESKTOP_COLUMNS: Record<1 | 2 | 3 | 4, string> = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
};

/**
 * ≤599 with 4+ systems (`.p5-sys` on phones): a horizontal scroll-snap strip that bleeds to
 * the screen edges; the gutter is restored as padding / scroll padding so cards snap in line
 * with the page content.
 */
const SWIPE_CLASS =
  "max-sm:flex max-sm:gap-3 max-sm:overflow-x-auto max-sm:snap-x max-sm:snap-mandatory max-sm:-mx-(--ig-gutter) max-sm:px-(--ig-gutter) max-sm:scroll-px-(--ig-gutter) max-sm:pt-1 max-sm:pb-3";

/** Table columns (`systemsLayout: 'table'`, railings «Типы систем»). */
const TABLE_COLUMNS = [
  { key: "name", label: "Система" },
  { key: "howHeld", label: "Как устроена" },
  { key: "whereFits", label: "Где применяют" },
] as const satisfies ReadonlyArray<{ key: keyof SystemItem; label: string }>;

export interface SystemsSectionProps {
  systems: SystemItem[];
  heading?: string | null | undefined;
  layout?: "cards" | "table" | null | undefined;
  ctx: PlaceholderContext;
  variant: SectionVariant;
  /** Content under the cards / table (layout blocks of the `slot-systems-` slot). */
  footer?: ReactNode;
}

function SystemsCards({
  systems,
  ctx,
  label,
}: {
  systems: SystemItem[];
  ctx: PlaceholderContext;
  label: string;
}) {
  const count = systems.length;
  const swipe = count >= SWIPE_MIN_SYSTEMS;
  const desktop = DESKTOP_COLUMNS[Math.min(4, count) as 1 | 2 | 3 | 4];
  return (
    <div
      className={cn(
        "grid gap-5",
        count === 1 ? "grid-cols-1" : "grid-cols-2",
        desktop,
        swipe ? SWIPE_CLASS : "max-sm:grid-cols-1 max-sm:gap-4"
      )}
      // The strip scrolls on phones: keyboard users need a focus stop and a name.
      {...(swipe ? { role: "region", "aria-label": label, tabIndex: 0 } : {})}
      data-systems-count={count}
    >
      {systems.map((system, index) => (
        <SystemCard
          key={system.id ?? index}
          system={system}
          ctx={ctx}
          className={swipe ? "max-sm:flex-none max-sm:basis-[82%] max-sm:snap-start" : undefined}
        />
      ))}
    </div>
  );
}

function SystemsTable({ systems, ctx }: { systems: SystemItem[]; ctx: PlaceholderContext }) {
  // Only columns that carry data for at least one system (the name is always shown).
  const columns: DataTableColumn[] = TABLE_COLUMNS.filter(
    ({ key }) => key === "name" || systems.some((system) => hasText(system[key]))
  ).map(({ key, label }) => ({ key, label }));
  const rows = systems.map((system) =>
    Object.fromEntries(
      columns.map(({ key }) => [key, fill(system[key as keyof SystemItem] as string, ctx)])
    )
  );
  return <DataTable columns={columns} rows={rows} />;
}

/** «Какую систему выбрать» / «Схемы крепления» / «Типы систем»: cards or a table. */
export function SystemsSection({
  systems,
  heading,
  layout,
  ctx,
  variant,
  footer,
}: SystemsSectionProps) {
  if (systems.length === 0) return null;
  const title = fill(heading, ctx) || DEFAULT_SYSTEMS_HEADING;
  const headingId = "construction-systems-title";
  return (
    <Section variant={variant} aria-labelledby={headingId} id="sistemy" className="scroll-mt-24">
      <SectionHead title={title} headingId={headingId} />
      {layout === "table" ? (
        <SystemsTable systems={systems} ctx={ctx} />
      ) : (
        <SystemsCards systems={systems} ctx={ctx} label={title} />
      )}
      {footer ? <div className="mt-6 flex flex-col gap-6">{footer}</div> : null}
    </Section>
  );
}
