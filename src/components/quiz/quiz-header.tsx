import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Quiz title and meta line, verbatim teksty/05-kviz.md «Шапка квиза». */
export const QUIZ_TITLE = "Рассчитаем стоимость вашего заказа";
export const QUIZ_META_LINE = "7 вопросов · около 3 минут · КП в среднем за 2–3 рабочих дня";

export interface QuizHeaderProps {
  /** `h1` on the quiz page, `h2` (default) inside the modal. */
  as?: "h1" | "h2" | undefined;
  /** Heading id, e.g. for `aria-labelledby` of the modal. */
  id?: string | undefined;
  /** Renders the round close button (modal). */
  onClose?: (() => void) | undefined;
  closeLabel?: string | undefined;
  className?: string | undefined;
}

/**
 * Heading block of the quiz (`.qz-head__row` of `Kviz.dc.html`): title, meta line and the
 * optional close button. Used by the quiz page and the modal shell (task-34); `<Quiz/>` itself
 * never renders a page heading.
 */
export function QuizHeader({
  as: Heading = "h2",
  id,
  onClose,
  closeLabel = "Закрыть",
  className,
}: QuizHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <Heading
          id={id}
          className="text-text m-0 text-[28px] leading-[1.2] font-bold max-sm:text-[22px]"
        >
          {QUIZ_TITLE}
        </Heading>
        <p className="text-small text-text-2 mt-1.5 mb-0">{QUIZ_META_LINE}</p>
      </div>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="bg-bg text-text hover:bg-well grid size-11 flex-none cursor-pointer place-items-center rounded-full transition-colors duration-(--ig-dur-fast) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ig-focus-outline)"
        >
          <X aria-hidden="true" className="size-5" />
        </button>
      ) : null}
    </div>
  );
}
