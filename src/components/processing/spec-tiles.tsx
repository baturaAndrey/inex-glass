import type { CSSProperties } from "react";
import { Container } from "@/components/ig/container";
import { replacePlaceholders, type PlaceholderContext } from "@/lib/domain";
import { cn } from "@/lib/utils";
import type { ProcessingService } from "@/payload-types";

/**
 * «specs» of a service page (Paper mockup `2560_service_facet`): a row of tiles right under the
 * hero — micro caps caption, the big value, a short description.
 *
 * Source: the service's `tables[]` (the schema has no dedicated field; `stats` items carry only
 * a value and a caption). Every row of a table is one tile: column 1 → caption, column 2 →
 * value, column 3 (optional) → description. A `positive` («Выгодное значение») value cell makes
 * the light-teal accent tile. Real tables of a service page live in its `layout` (`table` blocks).
 *
 * 4 tiles in a row, 2 ≤1100 px, 1 ≤599 px. Tiles of a row share the height (grid stretch).
 */

type ServiceTables = ProcessingService["tables"];

export interface SpecTile {
  key: string;
  label: string;
  value: string;
  text: string;
  accent: boolean;
}

export interface SpecTilesProps {
  tiles: readonly SpecTile[];
}

/** The mockup shows no heading; the outline keeps an `sr-only` one. */
const HEADING = "Основные параметры";
const HEADING_ID = "processing-specs-title";

/**
 * Value size. Short values («5–40 мм») keep the mockup's 48 px at 1920 (fluid down to 32 px);
 * long ones («2000 × 3180 мм») would wrap in a 1366–1920 tile, so the size is capped by the tile
 * width (`cqi` of the tile, an inline-size container) divided by the longest value of the row in
 * characters (`--spec-chars`) × 0.62 em (Rubik bold glyphs measure 0.54–0.65 em, figures ≈ 0.57).
 * One length for the whole row keeps the values the same size, as on the mockup (40 px for
 * «2000 × 3180 мм» at 1920); 22 px is the floor.
 */
const VALUE_SIZE =
  "text-[max(22px,min(clamp(32px,2.5vw,48px),calc(100cqi/(var(--spec-chars)*0.62))))]";

/** Characters of the longest value: the row's size is computed for it (`VALUE_SIZE`). */
const longestValue = (tiles: readonly SpecTile[]) =>
  Math.max(1, ...tiles.map((tile) => [...tile.value].length));

const cellText = (value: string | null | undefined, ctx: PlaceholderContext) =>
  value?.trim() ? replacePlaceholders(value.trim(), ctx) : "";

/**
 * Column labels that mark a table of `tables[]` as the spec tiles on pages whose `tables[]`
 * also holds real tables (glass types; the processing seed writes the same labels,
 * `SPEC_COLUMNS` of `src/seed/slices/processing.ts`).
 */
export const SPEC_TABLE_COLUMNS = ["Параметр", "Значение", "Пояснение"] as const;

type SpecTableCandidate = { columns?: Array<{ label?: string | null }> | null };

/** `true` for a table whose columns are exactly «Параметр | Значение | Пояснение». */
export function isSpecTable(table: SpecTableCandidate): boolean {
  const labels = (table.columns ?? []).map((column) => column.label?.trim() ?? "");
  return (
    labels.length === SPEC_TABLE_COLUMNS.length &&
    labels.every((label, index) => label === SPEC_TABLE_COLUMNS[index])
  );
}

/** Rows of every table of `tables[]` → tiles; rows without a value are skipped. */
export function specTilesFrom(tables: ServiceTables, ctx: PlaceholderContext): SpecTile[] {
  return (tables ?? []).flatMap((table, tableIndex) =>
    (table.rows ?? []).flatMap((row, rowIndex): SpecTile[] => {
      const [label, value, text] = row.cells ?? [];
      const valueText = cellText(value?.value, ctx);
      if (!valueText) return [];
      return [
        {
          key: row.id ?? `${tableIndex}-${rowIndex}`,
          label: cellText(label?.value, ctx),
          value: valueText,
          text: cellText(text?.value, ctx),
          accent: Boolean(value?.positive),
        },
      ];
    })
  );
}

export function SpecTiles({ tiles }: SpecTilesProps) {
  if (tiles.length === 0) return null;
  return (
    <section
      aria-labelledby={HEADING_ID}
      className="pt-16 pb-8 max-md:pt-12 max-sm:pt-8 max-sm:pb-4"
      data-testid="processing-specs"
    >
      <Container>
        <h2 id={HEADING_ID} className="sr-only">
          {HEADING}
        </h2>
        <dl
          className="m-0 grid grid-cols-4 gap-6 max-md:grid-cols-2 max-sm:grid-cols-1 max-sm:gap-3"
          // A number, not a colour: the only input of `VALUE_SIZE` that depends on the data.
          style={{ "--spec-chars": longestValue(tiles) } as CSSProperties}
        >
          {tiles.map((tile) => (
            <div
              key={tile.key}
              className={cn(
                "@container flex min-w-0 flex-col gap-3 rounded-xl border p-8 max-lg:p-6 max-sm:gap-2 max-sm:p-5",
                tile.accent ? "bg-primary-light border-line-teal" : "bg-surface border-hairline"
              )}
              data-testid="processing-spec"
              {...(tile.accent ? { "data-accent": "" } : {})}
            >
              {/* Caption first in the DOM (`dt` before `dd`), as on the mockup. */}
              <dt
                className={cn(
                  "text-micro m-0 tracking-[0.06em] uppercase",
                  tile.accent ? "text-primary-pressed" : "text-text-2"
                )}
              >
                {tile.label}
              </dt>
              <dd
                // Size first: tailwind-merge drops a `leading-*` that precedes a font-size class.
                className={cn(
                  VALUE_SIZE,
                  "text-primary-dark m-0 leading-none font-bold text-balance tabular-nums"
                )}
              >
                {tile.value}
              </dd>
              {tile.text ? (
                <dd className="text-body text-ink-3 m-0 text-pretty">{tile.text}</dd>
              ) : null}
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}
