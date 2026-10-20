import type { CSSProperties, ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type TimelineState = "done" | "current" | "todo";

export interface TimelineStep {
  key: string;
  title: string;
  date?: string;
  state: TimelineState;
  /** Replaces the default dot icon (check for `done`, filled ring for `current`). */
  icon?: ReactNode;
}

export interface TimelineProps {
  steps: TimelineStep[];
  /** `responsive` (default): horizontal ≥600 px, vertical ≤599 px — one markup, CSS only. */
  orientation?: "responsive" | "horizontal" | "vertical";
  /** Accessible name of the list. */
  label?: string;
  className?: string | undefined;
}

const STATE_CLASS: Record<TimelineState, string | null> = {
  done: "is-done",
  current: "is-current",
  todo: null,
};

/** Visually hidden state for screen readers (the colour alone carries no meaning for them). */
const STATE_LABEL: Record<TimelineState, string> = {
  done: "выполнено",
  current: "текущий этап",
  todo: "ожидается",
};

/** Vertical layout classes of `.ig-tl--v`, applied only ≤599 px for `responsive`. */
const RESPONSIVE_LIST = "max-sm:grid-cols-1 max-sm:gap-0";
const RESPONSIVE_STEP = "max-sm:flex-row max-sm:gap-3.5 max-sm:pt-0 max-sm:pr-0 max-sm:pb-[22px]";
const RESPONSIVE_BAR =
  "max-sm:top-8 max-sm:right-auto max-sm:bottom-0 max-sm:left-[15px] max-sm:h-auto max-sm:w-0.5";

function DefaultIcon({ state }: { state: TimelineState }) {
  if (state === "done") return <Check strokeWidth={2.5} />;
  if (state === "current") return <span className="size-2.5 rounded-full bg-current" />;
  return null;
}

/**
 * Order status timeline (`.ig-tl`, 5 columns / `.ig-tl--v`). States `done` / `current`
 * (highlighted ring, `aria-current="step"`) / `todo` (muted). Dates in `.ig-tl__date`.
 */
export function Timeline({
  steps,
  orientation = "responsive",
  label = "Этапы заказа",
  className,
}: TimelineProps) {
  const responsive = orientation === "responsive";
  const vertical = orientation === "vertical";
  const lastIndex = steps.length - 1;

  return (
    <ol
      aria-label={label}
      className={cn(
        "ig-tl m-0 list-none p-0",
        !vertical && "grid-cols-(--tl-cols)",
        vertical && "ig-tl--v",
        responsive && RESPONSIVE_LIST,
        className
      )}
      style={
        vertical
          ? undefined
          : ({ "--tl-cols": `repeat(${steps.length}, minmax(0, 1fr))` } as CSSProperties)
      }
    >
      {steps.map((step, index) => {
        const isLast = index === lastIndex;
        return (
          <li
            key={step.key}
            aria-current={step.state === "current" ? "step" : undefined}
            className={cn(
              "ig-tl__step min-w-0",
              STATE_CLASS[step.state],
              responsive && RESPONSIVE_STEP,
              isLast && (vertical ? "pb-0" : responsive && "max-sm:pb-0")
            )}
          >
            {isLast ? null : (
              <span aria-hidden="true" className={cn("ig-tl__bar", responsive && RESPONSIVE_BAR)} />
            )}
            <span className="ig-tl__dot flex-none" aria-hidden="true">
              {step.icon ?? <DefaultIcon state={step.state} />}
            </span>
            <span className="flex min-w-0 flex-col gap-1 [overflow-wrap:anywhere] hyphens-auto">
              <span className="ig-tl__title">
                {step.title}
                <span className="sr-only">, {STATE_LABEL[step.state]}</span>
              </span>
              {step.date ? <span className="ig-tl__date">{step.date}</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
