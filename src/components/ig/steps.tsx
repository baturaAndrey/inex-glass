import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface StepItem {
  title: string;
  text?: ReactNode;
}

export interface StepsProps {
  steps: StepItem[];
  /**
   * Desktop columns (≥1366). Default: the number of steps, at most 6.
   * ≤1365 — 3 columns, ≤599 — a vertical list.
   */
  columns?: number;
  className?: string | undefined;
}

const MAX_COLUMNS = 6;
/** Columns at 600–1365 px (Home «Как заказать»). */
const TABLET_COLUMNS = 3;

/**
 * Process steps (`.ig-steps`): numbered circles joined by a dashed line.
 * The line is hidden after the last step of every visual row and on phones, where each step
 * is a row: number on the left, title next to it, text indented by 50 px.
 */
export function Steps({ steps, columns, className }: StepsProps) {
  const desktopColumns = Math.min(Math.max(columns ?? steps.length, 1), MAX_COLUMNS);
  const lastIndex = steps.length - 1;

  return (
    <ol
      className={cn(
        "ig-steps m-0 list-none p-0 max-lg:grid-cols-3 max-lg:gap-y-7 max-sm:grid-cols-1 max-sm:gap-y-5 lg:grid-cols-(--steps-cols)",
        className
      )}
      style={{ "--steps-cols": `repeat(${desktopColumns}, minmax(0, 1fr))` } as CSSProperties}
    >
      {steps.map((step, index) => {
        const endsDesktopRow = (index + 1) % desktopColumns === 0;
        const endsTabletRow = (index + 1) % TABLET_COLUMNS === 0;
        const hasLine = index !== lastIndex;
        return (
          <li
            key={index}
            className="ig-step max-sm:flex-row max-sm:flex-wrap max-sm:gap-x-3.5 max-sm:gap-y-0.5"
          >
            {hasLine ? (
              <span
                aria-hidden="true"
                className={cn(
                  "ig-step__line max-sm:hidden",
                  endsDesktopRow && "lg:hidden",
                  endsTabletRow && "max-lg:hidden"
                )}
              />
            ) : null}
            <span className="ig-step__num max-sm:size-9 max-sm:text-[15px]" aria-hidden="true">
              {index + 1}
            </span>
            <p className="ig-step__title max-sm:flex-1 max-sm:self-center">{step.title}</p>
            {step.text ? (
              <p className="ig-step__text text-small leading-normal max-sm:basis-full max-sm:pl-[50px]">
                {step.text}
              </p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
