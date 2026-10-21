import type { QuizDerived } from "./derive";

/**
 * «Ориентировочно от … ₽» block (`.qz-est`): the amount in large type, the domain caption
 * («за стекло без обработки и доставки. Цены на …. Точная стоимость — в КП») below.
 * Rendered only when the domain returns an estimate (fresh price, area > 0, 4–12 mm, not triplex).
 */
export function QuizEstimate({ estimate }: { estimate: NonNullable<QuizDerived["estimate"]> }) {
  return (
    <div
      data-slot="quiz-estimate"
      role="status"
      aria-live="polite"
      className="bg-bg flex flex-col gap-1 rounded-[14px] px-[18px] py-4"
    >
      {estimate.lead ? (
        <>
          <span className="text-text text-[24px] leading-[1.2] font-bold">{estimate.lead}</span>
          <span className="text-text-2 text-[13px] leading-[1.45]">{estimate.rest}</span>
        </>
      ) : (
        <span className="text-small text-text">{estimate.text}</span>
      )}
    </div>
  );
}
