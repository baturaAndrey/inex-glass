import type { ReactNode } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CompareRow {
  /** Stage name; when any row has a topic the 3-column layout (Home «Блок 2») is used. */
  topic?: ReactNode;
  self: ReactNode;
  inex: ReactNode;
}

export interface CompareProps {
  rows: CompareRow[];
  selfTitle?: ReactNode;
  inexTitle?: ReactNode;
  /** Header of the topic column (3-column layout only). */
  topicTitle?: ReactNode;
  /** Accessible name of the comparison table. */
  label?: string;
  className?: string | undefined;
}

const DEFAULT_SELF_TITLE = "Когда заказываете на заводе сами";
const DEFAULT_INEX_TITLE = "Когда через Inex Glass";
const DEFAULT_TOPIC_TITLE = "Этап";
const DEFAULT_LABEL = "Сравнение: заказ на заводе самостоятельно и через Inex Glass";

/** Phone labels inside each pair (`.ig-pair__lbl`). */
const SELF_LABEL = "Сами";
const INEX_LABEL = "Через Inex Glass";

/** Round icons of the Home prototype: `.ic--x` (warning tone) and `.ic--ok` (brand). */
function SelfIcon() {
  return (
    <span
      aria-hidden="true"
      className="bg-warning text-warning-text mt-px grid size-[22px] flex-none place-items-center rounded-full"
    >
      <X className="size-[13px]" strokeWidth={3} />
    </span>
  );
}

function InexIcon() {
  return (
    <span
      aria-hidden="true"
      className="bg-brand mt-px grid size-[22px] flex-none place-items-center rounded-full text-white"
    >
      <Check className="size-[13px]" strokeWidth={3} />
    </span>
  );
}

/**
 * «Сами / через Inex Glass» comparison.
 * - without `topic`: two columns `.ig-compare`;
 * - with `topic`: three columns `220px / 1fr / 1.12fr` (Home «Почему через нас»).
 * ≤760 px every row becomes a card (`.ig-pair`) with «Сами» / «Через Inex Glass» labels
 * (`max-[761px]:` — Tailwind `max-*` is `width < N`, so 761 means ≤760 as in the prototype).
 * Table semantics via ARIA roles, so the phone layout can restyle the same markup.
 */
export function Compare({
  rows,
  selfTitle = DEFAULT_SELF_TITLE,
  inexTitle = DEFAULT_INEX_TITLE,
  topicTitle = DEFAULT_TOPIC_TITLE,
  label = DEFAULT_LABEL,
  className,
}: CompareProps) {
  const withTopic = rows.some((row) => row.topic !== undefined && row.topic !== null);
  return withTopic ? (
    <TopicCompare
      rows={rows}
      selfTitle={selfTitle}
      inexTitle={inexTitle}
      topicTitle={topicTitle}
      label={label}
      className={className}
    />
  ) : (
    <TwoColumnCompare
      rows={rows}
      selfTitle={selfTitle}
      inexTitle={inexTitle}
      label={label}
      className={className}
    />
  );
}

type LayoutProps = Required<Pick<CompareProps, "rows" | "selfTitle" | "inexTitle" | "label">> & {
  className?: string | undefined;
};

/** `.ig-compare` (design system): two columns, warning vs primary-light; pairs ≤760. */
function TwoColumnCompare({ rows, selfTitle, inexTitle, label, className }: LayoutProps) {
  const lastIndex = rows.length - 1;
  return (
    <div
      role="table"
      aria-label={label}
      className={cn(
        "ig-compare max-[761px]:flex max-[761px]:flex-col max-[761px]:gap-3 max-[761px]:overflow-visible max-[761px]:rounded-none max-[761px]:bg-transparent max-[761px]:shadow-none",
        className
      )}
    >
      <div role="row" className="contents max-[761px]:hidden">
        <div role="columnheader" className="ig-compare__head ig-compare__head--self">
          <SelfIcon />
          {selfTitle}
        </div>
        <div role="columnheader" className="ig-compare__head ig-compare__head--inex">
          <InexIcon />
          {inexTitle}
        </div>
      </div>
      {rows.map((row, index) => {
        const last = index === lastIndex;
        return (
          <div key={index} role="row" className="ig-pair contents max-[761px]:flex">
            <div
              role="cell"
              className={cn(
                "ig-compare__cell ig-compare__cell--self",
                "max-[761px]:text-small max-[761px]:border-0 max-[761px]:px-4 max-[761px]:py-3.5 max-[761px]:text-left",
                last && "border-b-0"
              )}
            >
              <PairLabel tone="self">{SELF_LABEL}</PairLabel>
              {row.self}
            </div>
            <div
              role="cell"
              className={cn(
                "ig-compare__cell ig-compare__cell--inex",
                "max-[761px]:text-small max-[761px]:border-0 max-[761px]:px-4 max-[761px]:py-3.5 max-[761px]:font-medium",
                last && "border-b-0"
              )}
            >
              <PairLabel tone="inex">{INEX_LABEL}</PairLabel>
              {row.inex}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Phone-only label of a pair (`.ig-pair__lbl`); hidden on wider screens. */
function PairLabel({ tone, children }: { tone: "self" | "inex"; children: ReactNode }) {
  return (
    <span
      className={cn(
        "ig-pair__lbl hidden max-[761px]:block",
        tone === "self" ? "text-warning-text" : "text-primary-pressed"
      )}
    >
      {children}
    </span>
  );
}

/** Columns of the Home «Блок 2» grid: 220 / 160 px topic column, then 1fr / 1.12fr. */
const TOPIC_GRID =
  "grid grid-cols-[220px_minmax(0,1fr)_minmax(0,1.12fr)] gap-x-2 max-md:grid-cols-[160px_minmax(0,1fr)_minmax(0,1.12fr)] max-[761px]:grid-cols-1 max-[761px]:gap-x-0";

/** Three columns with a topic (rowheader); every row is a card ≤760. */
function TopicCompare({
  rows,
  selfTitle,
  inexTitle,
  topicTitle,
  label,
  className,
}: LayoutProps & { topicTitle: ReactNode }) {
  const lastIndex = rows.length - 1;
  return (
    <div
      role="table"
      aria-label={label}
      className={cn(
        "bg-surface/95 rounded-xl p-3 shadow-[0_12px_40px_rgba(22,64,61,.14)]",
        "max-[761px]:flex max-[761px]:flex-col max-[761px]:gap-3 max-[761px]:rounded-none max-[761px]:bg-transparent max-[761px]:p-0 max-[761px]:shadow-none",
        className
      )}
    >
      <div role="row" className={cn(TOPIC_GRID, "max-[761px]:hidden")}>
        <div role="columnheader" className="flex items-center px-6 py-[18px]">
          <span className="text-micro text-text-2 tracking-[.06em] uppercase">{topicTitle}</span>
        </div>
        <div
          role="columnheader"
          className="bg-warning-bg text-warning-text flex items-center gap-2.5 rounded-t-lg px-6 py-[18px] text-base leading-[1.3] font-semibold"
        >
          <SelfIcon />
          {selfTitle}
        </div>
        <div
          role="columnheader"
          className="bg-primary-light text-primary-dark flex items-center gap-2.5 rounded-t-lg px-6 py-[18px] text-base leading-[1.3] font-semibold"
        >
          <InexIcon />
          {inexTitle}
        </div>
      </div>
      {rows.map((row, index) => {
        const last = index === lastIndex;
        const divider = index > 0 && "border-t border-black/[.06] max-[761px]:border-t-0";
        return (
          <div
            key={index}
            role="row"
            className={cn(
              TOPIC_GRID,
              "max-[761px]:bg-surface max-[761px]:overflow-hidden max-[761px]:rounded-lg max-[761px]:shadow-[0_4px_16px_rgba(22,64,61,.12)]"
            )}
          >
            <div
              role="rowheader"
              className={cn(
                "text-primary-dark py-[18px] pr-6 pl-4 text-[15px] leading-[1.4] font-semibold",
                "max-[761px]:px-4 max-[761px]:pt-3.5 max-[761px]:pb-2.5 max-[761px]:text-[13px] max-[761px]:tracking-[.06em] max-[761px]:uppercase",
                divider
              )}
            >
              {row.topic}
            </div>
            <div
              role="cell"
              className={cn(
                "bg-warning-bg text-ink-3 flex items-start gap-3 px-6 py-[18px] text-base leading-[1.45]",
                "max-[761px]:px-4 max-[761px]:py-3.5 max-[761px]:text-[15px]",
                last && "rounded-b-lg max-[761px]:rounded-none",
                divider
              )}
            >
              <SelfIcon />
              <span>
                <PairLabel tone="self">{SELF_LABEL}</PairLabel>
                {row.self}
              </span>
            </div>
            <div
              role="cell"
              className={cn(
                "bg-primary-light text-text flex items-start gap-3 px-6 py-[18px] text-base leading-[1.45] font-medium",
                "max-[761px]:px-4 max-[761px]:py-3.5 max-[761px]:text-[15px]",
                last && "rounded-b-lg max-[761px]:rounded-none",
                divider
              )}
            >
              <InexIcon />
              <span>
                <PairLabel tone="inex">{INEX_LABEL}</PairLabel>
                {row.inex}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
