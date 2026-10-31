import type { ReactNode } from "react";
import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuizErrorField } from "../types";
import type { QuizController } from "../use-quiz";

/**
 * Compact radio cards of the quiz grid (`.qz-grid .ig-radio-card` of `Kviz.dc.html`): 16 px
 * padding, 40 px icon, 20 px mark; on phones 12 px padding, 14 px titles and no icons.
 */
export const QUIZ_CARD_GRID = cn(
  "gap-2 sm:gap-3",
  "[&_.ig-radio-card]:min-h-0 [&_.ig-radio-card]:gap-2.5 [&_.ig-radio-card]:p-4",
  "[&_.ig-radio-card__icon]:size-10",
  "[&_.ig-radio-card__mark]:top-3 [&_.ig-radio-card__mark]:right-3 [&_.ig-radio-card__mark]:size-5",
  "max-sm:[&_.ig-radio-card]:p-3 max-sm:[&_.ig-radio-card__icon]:hidden",
  "max-sm:[&_.ig-radio-card__title]:pr-[22px] max-sm:[&_.ig-radio-card__title]:text-[14px]"
);

/** Props of every step component. */
export interface QuizStepProps {
  q: QuizController;
  /** DOM id of a field (focus target on submit errors). */
  fieldId: (field: QuizErrorField | string) => string;
  /** DOM id of the step heading (focused on every step change). */
  titleId: string;
}

/** Step heading `h2` (`.qz-q`); focusable programmatically for the step change. */
export function StepTitle({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2
      id={id}
      tabIndex={-1}
      className="text-text m-0 text-[22px] leading-[1.3] font-semibold outline-none max-sm:text-[19px]"
    >
      {children}
    </h2>
  );
}

/** Sub-heading of a step section (`.qz-sub`). */
export function StepSub({
  id,
  children,
  className,
}: {
  id?: string | undefined;
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <p id={id} className={cn("text-text m-0 text-[16px] leading-[1.35] font-semibold", className)}>
      {children}
    </p>
  );
}

/** Labelled group of controls (`.qz-group` + `.qz-glabel`); the label names the group. */
export function QuizGroup({
  labelId,
  label,
  children,
  className,
}: {
  labelId: string;
  label: ReactNode;
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      <span id={labelId} className="text-small text-text font-medium">
        {label}
      </span>
      {children}
    </div>
  );
}

/** Error line of a group (same look as `.ig-field__error`). */
export function GroupError({ id, message }: { id: string; message: string | undefined }) {
  return (
    <div id={id} aria-live="polite" className={message ? "ig-field__error" : "contents"}>
      {message ? (
        <>
          <TriangleAlert aria-hidden="true" />
          <span>{message}</span>
        </>
      ) : null}
    </div>
  );
}

/** Two-column field grid (`.qz-fields`), one column on phones. */
export function FieldGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string | undefined;
}) {
  return <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2", className)}>{children}</div>;
}
