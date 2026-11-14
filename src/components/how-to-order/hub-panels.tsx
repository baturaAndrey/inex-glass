import { Check, Clock, File, PanelsTopLeft, Wrench, type LucideIcon } from "lucide-react";
import { PANEL_SHELL } from "@/components/processing/info-panels";
import { cn } from "@/lib/utils";
import { OrderTable } from "./order-table";

/**
 * Light-teal panels of the hub's cream block (Paper mockup `2560_kak-zakazat`, frame
 * `terms-resp`): «Условия» as four white icon tiles (2 × 2) and «Кто за что отвечает» as the
 * white table card. Side by side on desktop, stacked ≤1100 px (the caller lays them out).
 */

/**
 * Icons of the conditions in the order of the hub's list (teksty 04 §1): minimum order, no rush
 * orders, installation, files only. The list is CMS text, so a fifth item gets the check mark.
 */
const TERM_ICONS: readonly LucideIcon[] = [PanelsTopLeft, Clock, Wrench, File];

const PANEL = cn(PANEL_SHELL, "scroll-mt-24 p-10 max-lg:p-8 max-sm:p-5");

export function TermsPanel({
  heading,
  headingId,
  items,
}: {
  heading: string;
  headingId: string;
  items: readonly string[];
}) {
  return (
    <section aria-labelledby={headingId} className={PANEL} data-section="terms">
      <h2 id={headingId} className="ig-h2 m-0">
        {heading}
      </h2>
      <ul className="m-0 grid list-none grid-cols-2 gap-4 p-0 max-sm:grid-cols-1 max-sm:gap-3">
        {items.map((item, index) => {
          const Icon = TERM_ICONS[index] ?? Check;
          return (
            <li
              key={item}
              className="bg-surface flex items-center gap-4 rounded-lg p-6 text-lg leading-[1.35] font-semibold max-sm:p-4 max-sm:text-base"
            >
              <Icon aria-hidden="true" strokeWidth={2} className="text-brand size-6 shrink-0" />
              {item}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function WhoPaysPanel({
  heading,
  headingId,
  columns,
  rows,
}: {
  heading: string;
  headingId: string;
  columns: readonly [string, string];
  rows: ReadonlyArray<readonly [string, string]>;
}) {
  return (
    <section aria-labelledby={headingId} className={PANEL} data-section="who-pays">
      <h2 id={headingId} className="ig-h2 m-0">
        {heading}
      </h2>
      <OrderTable
        caption={heading}
        columns={[
          { label: columns[0], width: "50%" },
          { label: columns[1], width: "50%" },
        ]}
        rows={rows.map(([situation, payer], index) => ({
          key: String(index),
          cells: [situation, payer],
        }))}
        data-testid="who-pays"
      />
    </section>
  );
}
