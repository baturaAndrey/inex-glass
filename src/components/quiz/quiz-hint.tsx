import type { ReactNode } from "react";
import { Check, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export type QuizHintVariant = "info" | "warn" | "promo";

const VARIANT_CLASS: Record<QuizHintVariant, string> = {
  info: "bg-info-bg text-info-text",
  warn: "bg-warning-bg text-warning-text",
  promo: "bg-primary-light text-primary-dark",
};

const VARIANT_ICON: Record<QuizHintVariant, typeof Info> = {
  info: Info,
  warn: TriangleAlert,
  promo: Check,
};

export interface QuizHintProps {
  variant: QuizHintVariant;
  children: ReactNode;
  /** Stable id for tests / `aria-describedby`. */
  id?: string | undefined;
  className?: string | undefined;
}

/** Domain hint (`getQuizHints`) → visual variant: the promo text gets the brand «promo» look. */
export function hintVariant(hint: { id: string; severity: "info" | "warn" }): QuizHintVariant {
  if (hint.id === "promo") return "promo";
  return hint.severity === "warn" ? "warn" : "info";
}

/** Renders the given domain hints in order. */
export function QuizHints({
  hints,
}: {
  hints: readonly { id: string; severity: "info" | "warn"; text: string }[];
}) {
  return (
    <>
      {hints.map((hint) => (
        <QuizHint key={hint.id} variant={hintVariant(hint)} id={`quiz-hint-${hint.id}`}>
          {hint.text}
        </QuizHint>
      ))}
    </>
  );
}

/**
 * Soft hint of a quiz step (`.qz-hint`): never blocks the lead. A polite live region, so a hint
 * that appears while typing (area, date) is announced.
 */
export function QuizHint({ variant, children, id, className }: QuizHintProps) {
  const Icon = VARIANT_ICON[variant];
  return (
    <div
      id={id}
      role="status"
      aria-live="polite"
      data-slot="quiz-hint"
      data-variant={variant}
      className={cn(
        "text-small flex items-start gap-2.5 rounded-(--ig-r-md) px-3.5 py-3",
        VARIANT_CLASS[variant],
        className
      )}
    >
      <Icon aria-hidden="true" className="mt-px size-[18px] flex-none" />
      <span>{children}</span>
    </div>
  );
}
