"use client";

import { useEffect, useId, useMemo, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { Calculator, Info, TriangleAlert } from "lucide-react";
import { reachGoal } from "@/components/analytics/reach-goal";
import { Button } from "@/components/ig/button";
import { ChipGroup, type ChipOption } from "@/components/ig/chip-group";
import { Field } from "@/components/ig/field";
import { Input } from "@/components/ig/input";
import { THICKNESSES, isThickness, type Thickness } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { DEFAULT_HOLES_THICKNESS, buildHolesView } from "./holes-calculator-model";
import { HolesScheme } from "./holes-scheme";

/**
 * Holes calculator (`Holes.dc.html`, `.p5-calc`): thickness chips → minimum distances from the
 * glass edge, between holes and from a corner (ГОСТ 30698-2014), the minimum diameter, and the
 * diameter tolerance for an optional diameter (ТЗ §7.2). The scheme redraws for the thickness.
 *
 * The only client island of the page; SSR renders the default thickness, so nothing flickers.
 */

/** Repeated `calc_holes` goals (thickness changes) are sent at most once per this interval. */
const GOAL_THROTTLE_MS = 3000;

export interface HolesCalculatorProps {
  defaultThickness?: Thickness | undefined;
  /** Show the SVG scheme (default `true`). */
  showScheme?: boolean | undefined;
  /** Paragraph under the results. */
  note?: string | undefined;
  /** Label of the optional link to the quiz with `thick={t}`; needs `quizHrefs`. */
  ctaLabel?: string | undefined;
  /**
   * Quiz URLs per thickness (`"10"` → `/raschet-stoimosti/?…&thick=10&src=…`), built on the
   * server with `buildQuizHref` (the quiz-link module is server-side; the `src` is masked there).
   */
  quizHrefs?: Readonly<Record<string, string>> | undefined;
  /** Page slug, sent with the `calc_holes` goal. */
  source?: string | undefined;
  className?: string | undefined;
}

const THICKNESS_OPTIONS: readonly ChipOption[] = THICKNESSES.map((t) => ({
  value: String(t),
  label: `${t} мм`,
}));

const CARD = "bg-surface shadow-card rounded-xl";

/**
 * `calc_holes`: on the first interaction (thickness or diameter) of the component's lifetime;
 * afterwards only on a thickness change, at most once per `GOAL_THROTTLE_MS`.
 */
function useHolesGoal(source: string | undefined) {
  const lastSentAt = useRef<number | null>(null);
  return (thickness: number, kind: "thickness" | "diameter") => {
    const now = Date.now();
    const last = lastSentAt.current;
    const first = last === null;
    if (!first && (kind !== "thickness" || now - last < GOAL_THROTTLE_MS)) return;
    lastSentAt.current = now;
    reachGoal("calc_holes", { thickness, ...(source ? { source } : {}) });
  };
}

export function HolesCalculator({
  defaultThickness = DEFAULT_HOLES_THICKNESS,
  showScheme = true,
  note,
  ctaLabel,
  quizHrefs,
  source,
  className,
}: HolesCalculatorProps) {
  const [thickness, setThickness] = useState<Thickness>(defaultThickness);
  const [diameterText, setDiameterText] = useState("");
  const view = useMemo(() => buildHolesView(thickness, diameterText), [thickness, diameterText]);
  const sendGoal = useHolesGoal(source);
  const messageId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  // Hydration marker for tests and tooling: the server HTML is interactive only after this.
  useEffect(() => {
    rootRef.current?.setAttribute("data-hydrated", "");
  }, []);

  function handleThickness(value: string | null) {
    const next = Number(value);
    // `allowClear` is off, so `null` never comes; a stale value is ignored all the same.
    if (!isThickness(next) || next === thickness) return;
    setThickness(next);
    sendGoal(next, "thickness");
  }

  function handleDiameter(event: ChangeEvent<HTMLInputElement>) {
    setDiameterText(event.target.value);
    sendGoal(thickness, "diameter");
  }

  const quizHref = ctaLabel ? quizHrefs?.[String(thickness)] : undefined;
  const diameter = view.diameter;

  return (
    <div
      className={cn(
        "grid items-stretch gap-8",
        showScheme && "lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]",
        !showScheme && "max-w-[720px]",
        className
      )}
      ref={rootRef}
      data-testid="holes-calculator"
    >
      {showScheme ? (
        <div className={cn(CARD, "flex flex-col gap-3 p-6 max-sm:p-4")}>
          <HolesScheme view={view} />
        </div>
      ) : null}

      <div className={cn(CARD, "flex flex-col gap-5 p-7 max-sm:p-4")}>
        {/* Visible caption; the group itself is named by `aria-label`. */}
        <span className="ig-field__label" aria-hidden="true">
          Толщина стекла
        </span>
        <ChipGroup
          mode="single"
          options={THICKNESS_OPTIONS}
          value={String(thickness)}
          onChange={handleThickness}
          ariaLabel="Толщина стекла"
        />

        <div
          aria-live="polite"
          aria-atomic="true"
          className="flex flex-col gap-5"
          data-testid="holes-results"
        >
          <dl className="m-0 grid grid-cols-3 gap-3 max-sm:grid-cols-1">
            <ResultTile value={view.text.edge} label="не ближе к кромке" />
            <ResultTile value={view.text.between} label="между отверстиями" />
            <ResultTile value={view.text.corner} label="от угла" />
          </dl>
          <p className="bg-bg m-0 flex items-center gap-2.5 rounded-md px-4 py-3.5 text-[15px] leading-snug font-medium">
            <Info aria-hidden="true" strokeWidth={2} className="text-info size-[18px] flex-none" />
            Минимальный диаметр — {view.text.minDiameter} мм; меньше — по согласованию
          </p>
        </div>

        <Field label="Диаметр отверстия, мм" optional>
          <Input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={diameterText}
            onChange={handleDiameter}
            aria-describedby={messageId}
            className="max-w-[240px] max-sm:max-w-none"
          />
        </Field>
        {/* Always mounted, so a newly shown message is announced. */}
        <div id={messageId} aria-live="polite" data-testid="holes-diameter-message">
          {diameter ? (
            <p
              className={cn(
                "m-0 flex items-start gap-2.5 rounded-md px-4 py-3 text-[15px] leading-snug",
                diameter.tone === "warn"
                  ? "bg-warning-bg text-warning-text"
                  : "bg-primary-light text-primary-dark font-medium"
              )}
            >
              {diameter.tone === "warn" ? (
                <TriangleAlert
                  aria-hidden="true"
                  strokeWidth={2}
                  className="mt-px size-[18px] flex-none"
                />
              ) : (
                <Info aria-hidden="true" strokeWidth={2} className="mt-px size-[18px] flex-none" />
              )}
              {diameter.message}
            </p>
          ) : null}
        </div>

        {note ? <p className="text-text-2 m-0 text-[15px] leading-normal">{note}</p> : null}

        {quizHref && ctaLabel ? (
          <Button
            asChild
            variant="secondary"
            className="self-start max-sm:w-full max-sm:self-stretch"
            leftIcon={<Calculator aria-hidden="true" strokeWidth={2} />}
          >
            <Link href={quizHref} data-quiz-cta="" data-goal="calc_to_quiz">
              {ctaLabel}
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/** One result tile: big number + «мм» and its caption; a «number — caption» row on phones. */
function ResultTile({ value, label }: { value: string; label: string }) {
  // `dt` (caption) precedes `dd` (number) in the DOM, as a definition list requires; the
  // reversed flex direction puts the number first visually.
  return (
    <div className="bg-primary-light flex flex-col-reverse justify-end gap-1.5 rounded-lg p-[18px] max-sm:flex-row-reverse max-sm:items-baseline max-sm:gap-3">
      <dt className="text-small text-text m-0">{label}</dt>
      <dd className="text-primary-dark m-0 text-[40px] leading-none font-bold tabular-nums max-sm:min-w-[110px] max-sm:flex-none max-sm:text-[32px]">
        {value}
        <small className="ml-1 text-lg font-medium">мм</small>
      </dd>
    </div>
  );
}
