import { QuizLink } from "@/components/page/quiz-cta";
import type { QuizPrefill } from "@/components/page/quiz-cta";
import type { PlaceholderContext } from "@/lib/domain";
import type { ThicknessView } from "@/lib/thickness-view";
import { cn } from "@/lib/utils";

/**
 * «Паспорт толщины» (`.th-pass` of `Thick10.dc.html` / `Thick19.dc.html`): price «from» or
 * «Цена по расчёту» with its note, size / weight / lead time / kinds / standard, the quiz button
 * pre-filled with the thickness and, under it, the price caption and the active promo.
 * `data-price-state` exposes the 45-day rule state to tests and analytics.
 */

/** Standard of tempered glass (teksty/03, «Стандарт»). */
const STANDARD = "ГОСТ 30698-2014";

export interface PassportProps {
  view: ThicknessView;
  /** Quiz pre-fill of the card (`type: tempered`, `thickness: N`, «Рассчитать стекло N мм»). */
  prefill: QuizPrefill;
  /** Page path (quiz `src`). */
  src: string;
  ctx: PlaceholderContext;
}

export function Passport({ view, prefill, src, ctx }: PassportProps) {
  const rows: Array<[string, string]> = [
    ["Размер", view.sizeText],
    ["Вес", view.weight.label],
    ["Срок", view.leadTimeText],
    ["Виды", view.kindsText],
    ["Стандарт", STANDARD],
  ];
  const isPrice = view.priceState === "price";

  return (
    <aside
      aria-label="Паспорт толщины"
      data-price-state={view.priceState}
      data-thickness-passport=""
      className="bg-surface flex flex-col gap-5 rounded-xl p-8 shadow-[0_8px_24px_rgba(28,31,34,0.10)] max-sm:p-5"
    >
      <span className="text-text-2 text-xs leading-[1.4] font-medium tracking-[0.06em] uppercase">
        Паспорт толщины
      </span>

      <div className="flex flex-col gap-1">
        <span
          data-passport-price=""
          className={cn(
            "leading-[1.1] font-bold tabular-nums",
            isPrice ? "text-text text-[30px]" : "text-primary-dark text-[26px]"
          )}
        >
          {view.priceLabel}
        </span>
        <span className="text-text-2 text-[13px] leading-[1.4]">{view.priceNote}</span>
      </div>

      <dl className="border-hairline m-0 flex flex-col border-t">
        {rows
          .filter(([, value]) => value !== "")
          .map(([label, value]) => (
            <div
              key={label}
              className="border-hairline grid grid-cols-[120px_1fr] gap-4 border-b py-3 text-[15px] leading-[1.45] max-sm:grid-cols-[100px_1fr]"
            >
              <dt className="text-text-2">{label}</dt>
              <dd className="m-0 font-medium" data-passport-row={label}>
                {value}
              </dd>
            </div>
          ))}
      </dl>

      <div className="flex flex-col gap-3">
        <QuizLink prefill={prefill} src={src} size="l" className="ig-btn--block w-full" ctx={ctx} />
        {view.caption || view.promoText ? (
          <p className="text-text-2 m-0 text-[13px] leading-[1.4]">
            {view.caption ? <span data-passport-caption="">{view.caption}</span> : null}
            {view.caption && view.promoText ? captionSeparator(view.caption) : null}
            {view.promoText ? <span data-passport-promo="">{view.promoText}</span> : null}
          </p>
        ) : null}
      </div>
    </aside>
  );
}

/** «…фиксируется» + promo → «…фиксируется. −5% …» (no double period). */
const captionSeparator = (caption: string) => (/[.!?…]$/u.test(caption) ? " " : ". ");
