import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ig/button";
import { cn } from "@/lib/utils";

export const BACK_LABEL = "Назад";
export const NEXT_LABEL = "Далее";
export const SUBMIT_LABEL = "Получить КП";

export interface QuizFooterProps {
  isFirst: boolean;
  isLast: boolean;
  variant: "page" | "modal";
  /** Consent not ticked: «Получить КП» looks disabled but stays clickable to show the error. */
  submitLooksDisabled: boolean;
  submitting: boolean;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

/**
 * «Назад / Далее / Получить КП» (`.qz-foot`). «Далее» never blocks. The bar is sticky at the
 * bottom of the scroll container in the modal and on phones (≤599 px); on the page at ≥600 px it
 * is a regular row.
 */
export function QuizFooter({
  isFirst,
  isLast,
  variant,
  submitLooksDisabled,
  submitting,
  onBack,
  onNext,
  onSubmit,
}: QuizFooterProps) {
  return (
    <div
      data-slot="quiz-footer"
      className={cn(
        "border-line bg-surface sticky bottom-0 z-10 flex items-center justify-between gap-4 border-t",
        "px-8 pt-5 pb-[calc(28px+env(safe-area-inset-bottom))]",
        "max-sm:gap-3 max-sm:px-4 max-sm:pt-3 max-sm:pb-[calc(12px+env(safe-area-inset-bottom))]",
        variant === "page" && "sm:static"
      )}
    >
      <Button variant="ghost" onClick={onBack} disabled={isFirst} className="max-sm:flex-1">
        {BACK_LABEL}
      </Button>
      {isLast ? (
        <Button
          variant="primary"
          onClick={onSubmit}
          loading={submitting}
          // Prototype `.qz-btn-off`: `.ig-btn--primary[aria-disabled]` is grey until the consent
          // is ticked, while the click still runs the validation and shows the consent error.
          aria-disabled={submitLooksDisabled || undefined}
          className="max-sm:flex-1"
        >
          {SUBMIT_LABEL}
        </Button>
      ) : (
        <Button
          variant="primary"
          onClick={onNext}
          rightIcon={<ArrowRight aria-hidden="true" />}
          className="max-sm:flex-1"
        >
          {NEXT_LABEL}
        </Button>
      )}
    </div>
  );
}
