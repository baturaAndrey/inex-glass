"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { reachGoal } from "@/components/analytics/reach-goal";
import {
  DEFAULT_HOLES_THICKNESS,
  buildHolesView,
} from "@/components/calculators/holes-calculator-model";
import { Field } from "@/components/ig/field";
import { Select } from "@/components/ig/select";
import { THICKNESSES, isThickness, type Thickness } from "@/lib/domain/types";

/**
 * Right half of the calculator panel of a service page (Paper mockup `2560_service_otverstiya`,
 * frame «holes-calculator»): thickness select, the `t · 2t · 6t` line, four white result tiles
 * (from the edge, between holes, from the corner, min. Ø) and the note.
 *
 * The numbers come from `buildHolesView` → `holeRules` (ГОСТ 30698-2014: 2t, 2t, 6t, Ø ≥ t), the
 * same model as the site-wide `HolesCalculator`, which keeps its look on other pages (tolerances
 * page). SSR renders the default thickness, so nothing flickers.
 */

/** Repeated `calc_holes` goals are sent at most once per this interval (as `HolesCalculator`). */
const GOAL_THROTTLE_MS = 3000;

export interface HolesDistanceCalculatorProps {
  defaultThickness?: Thickness | undefined;
  /** Paragraph under the tiles. */
  note?: string | undefined;
  /** Page slug, sent with the `calc_holes` goal. */
  source?: string | undefined;
}

const TILE =
  "bg-surface border-hairline flex min-w-0 flex-col gap-2 rounded-lg border px-6 py-5 max-sm:p-4";

/** `calc_holes`: the first change of the component's lifetime, then at most once per interval. */
function useHolesGoal(source: string | undefined) {
  const lastSentAt = useRef<number | null>(null);
  return (thickness: number) => {
    const now = Date.now();
    const last = lastSentAt.current;
    if (last !== null && now - last < GOAL_THROTTLE_MS) return;
    lastSentAt.current = now;
    reachGoal("calc_holes", { thickness, ...(source ? { source } : {}) });
  };
}

export function HolesDistanceCalculator({
  defaultThickness = DEFAULT_HOLES_THICKNESS,
  note,
  source,
}: HolesDistanceCalculatorProps) {
  const [thickness, setThickness] = useState<Thickness>(defaultThickness);
  const view = useMemo(() => buildHolesView(thickness), [thickness]);
  const sendGoal = useHolesGoal(source);
  const rootRef = useRef<HTMLDivElement>(null);

  // Hydration marker for tests and tooling: the server HTML is interactive only after this.
  useEffect(() => {
    rootRef.current?.setAttribute("data-hydrated", "");
  }, []);

  function handleThickness(event: ChangeEvent<HTMLSelectElement>) {
    const next = Number(event.target.value);
    if (!isThickness(next) || next === thickness) return;
    setThickness(next);
    sendGoal(next);
  }

  const { text } = view;

  return (
    <div
      ref={rootRef}
      className="flex min-w-0 grow basis-0 flex-col gap-5"
      data-testid="holes-calculator"
    >
      <div className="flex items-end gap-6 max-sm:flex-col max-sm:items-stretch max-sm:gap-3">
        <Field label="Толщина стекла, мм" className="w-70 shrink-0 max-sm:w-full">
          <Select
            value={String(thickness)}
            onChange={handleThickness}
            className="bg-surface h-14 text-xl font-semibold tabular-nums"
          >
            {THICKNESSES.map((t) => (
              <option key={t} value={String(t)}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
        <p className="text-small text-text-2 m-0 pb-[18px] tabular-nums max-sm:pb-0">
          t = {text.thickness} мм · 2t = {text.edge} мм · 6t = {text.corner} мм
        </p>
      </div>

      <div aria-live="polite" aria-atomic="true" data-testid="holes-results">
        <dl className="m-0 grid grid-cols-4 gap-3 max-md:grid-cols-2">
          <ResultTile label="От кромки стекла" value={`${text.edge} мм`} />
          <ResultTile label="Между отверстиями" value={`${text.between} мм`} />
          <ResultTile label="От угла стекла" value={`${text.corner} мм`} />
          <ResultTile label="Мин. диаметр" value={`Ø ${text.minDiameter} мм`} />
        </dl>
      </div>

      {note ? <p className="text-body text-ink-3 m-0 text-pretty">{note}</p> : null}
    </div>
  );
}

function ResultTile({ label, value }: { label: string; value: string }) {
  return (
    <div className={TILE}>
      <dt className="text-small text-text-2 m-0">{label}</dt>
      <dd className="text-primary-dark m-0 text-3xl leading-9 font-bold whitespace-nowrap tabular-nums max-sm:text-2xl">
        {value}
      </dd>
    </div>
  );
}
