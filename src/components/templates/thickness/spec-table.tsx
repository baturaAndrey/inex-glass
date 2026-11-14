import type { ThicknessView } from "@/lib/thickness-view";
import { cn } from "@/lib/utils";

/**
 * Spec table of a thickness card (Paper mockup `2560_zak_tolshchina_10mm`, hero `spec-table`):
 * a translucent white panel over the hero photo with Цена / Размер / Вес / Срок / Виды /
 * Стандарт. The price follows the 45-day rule: «от 1 400 ₽/м² — ориентир на 15.10.2026» or
 * «Цена по расчёту» with «пришлите чертёж — назовём цену в КП» under it.
 * `data-price-state` exposes the rule's state to tests and analytics.
 */

/** Standard of tempered glass (teksty/03, «Стандарт»). */
const STANDARD = "ГОСТ 30698-2014";

const LABEL =
  "text-text-2 w-[120px] shrink-0 text-[15px] leading-[1.2] max-sm:w-[84px] max-sm:text-[14px]";
const ROW =
  "border-hairline flex items-baseline gap-6 border-b py-3.5 last:border-b-0 max-sm:gap-3 max-sm:py-3";

export function SpecTable({ view }: { view: ThicknessView }) {
  const rows: Array<[string, string]> = [
    ["Размер", view.sizeText],
    ["Вес", view.weight.label],
    ["Срок", view.leadTimeText],
    ["Виды", view.kindsText],
    ["Стандарт", STANDARD],
  ];
  const isPrice = view.priceState === "price";

  return (
    <dl
      aria-label="Параметры толщины"
      data-price-state={view.priceState}
      data-thickness-spec=""
      className="bg-surface/90 border-hairline text-text m-0 flex w-full max-w-[640px] flex-col rounded-lg border px-7 py-2 max-sm:px-4"
    >
      <div className={ROW}>
        <dt className={LABEL}>Цена</dt>
        <dd className="m-0 text-base leading-[1.3]">
          <span
            data-spec-price=""
            className={cn(
              "text-[22px] leading-7 font-bold tabular-nums",
              !isPrice && "text-primary-dark"
            )}
          >
            {view.priceLabel}
          </span>
          {isPrice ? (
            <> — {view.priceNote}</>
          ) : (
            <span className="text-text-2 block text-[14px] leading-[1.4]">{view.priceNote}</span>
          )}
        </dd>
      </div>
      {rows
        .filter(([, value]) => value !== "")
        .map(([label, value]) => (
          <div key={label} className={ROW}>
            <dt className={LABEL}>{label}</dt>
            <dd className="m-0 text-base leading-[1.25] font-medium" data-spec-row={label}>
              {value}
            </dd>
          </div>
        ))}
    </dl>
  );
}
