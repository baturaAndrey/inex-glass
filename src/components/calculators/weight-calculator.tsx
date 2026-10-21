"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import Link from "next/link";
import { Calculator, User, Users } from "lucide-react";
import { reachGoal } from "@/components/analytics/reach-goal";
import { Button } from "@/components/ig/button";
import { Chip } from "@/components/ig/chip";
import { Field } from "@/components/ig/field";
import { Input } from "@/components/ig/input";
import { Select } from "@/components/ig/select";
import {
  WEIGHT_CALCULATOR_PATH,
  buildWeightQuizHref,
  type WeightMode,
} from "@/lib/blog/weight-quiz";
import { formatNumber, parseNumber } from "@/lib/domain/format";
import { THICKNESSES } from "@/lib/domain/types";
import {
  FILM_THICKNESSES,
  calcWeight,
  carryHint as defaultCarryHint,
  formatWeightKg,
} from "@/lib/domain/weight";
import { cn } from "@/lib/utils";

export { buildWeightQuizHref } from "@/lib/blog/weight-quiz";

/** One carry hint of the `tech-params` global (`upToKg: null` — «больше»). */
export interface CarryHintItem {
  upToKg: number | null;
  text: string;
}

export interface WeightCalculatorProps {
  defaultMode?: WeightMode | undefined;
  /** Carry hints from the CMS; the domain defaults (teksty/10 §1) when empty. */
  carryHints?: readonly CarryHintItem[] | undefined;
  /** Page path for the quiz `src`. */
  src?: string | undefined;
}

const DEFAULTS = {
  t: 10,
  t1: 8,
  t2: 8,
  film: 0.76,
  w: "1000",
  h: "2000",
  q: "10",
} as const;

/** `calc_weight` goes out this long after the last change (one goal per page view). */
const GOAL_DEBOUNCE_MS = 800;
/** Up to this weight of one glass one person can carry it (icon `user`, otherwise `users`). */
const ONE_PERSON_MAX_KG = 20;

const MODE_LABELS: Record<WeightMode, string> = {
  single: "Одинарное стекло",
  triplex: "Триплекс",
};

interface ParsedField {
  /** Value used for the calculation: > 0, otherwise 0. */
  value: number;
  /** Typed something that is not a non-negative number. */
  invalid: boolean;
}

/** Comma decimals accepted; empty → 0 (not an error); garbage / negative → 0 and invalid. */
function parseField(raw: string): ParsedField {
  if (raw.trim() === "") return { value: 0, invalid: false };
  const value = parseNumber(raw);
  if (value === null || value < 0) return { value: 0, invalid: true };
  return { value, invalid: false };
}

function pickHint(perGlassKg: number, hints: readonly CarryHintItem[] | undefined): string {
  if (!hints || hints.length === 0) return defaultCarryHint(perGlassKg);
  const hint = hints.find((item) => item.upToKg === null || perGlassKg <= item.upToKg);
  return hint?.text ?? defaultCarryHint(perGlassKg);
}

/** «1,14» — film thickness the Russian way. */
const filmLabel = (film: number) => formatNumber(film);

/**
 * Glass weight calculator (prototype `Weight`): single glass or triplex, sizes and quantity →
 * weight of 1 m², of one glass and of the batch, a carry hint and the quiz link with the same
 * parameters. Analytics: `calc_weight` once per page view (first change, debounced, non-zero
 * result), `calc_to_quiz` on the CTA click.
 */
export function WeightCalculator({
  defaultMode = "single",
  carryHints,
  src = WEIGHT_CALCULATOR_PATH,
}: WeightCalculatorProps) {
  const [mode, setMode] = useState<WeightMode>(defaultMode);
  const [t, setT] = useState<number>(DEFAULTS.t);
  const [t1, setT1] = useState<number>(DEFAULTS.t1);
  const [t2, setT2] = useState<number>(DEFAULTS.t2);
  const [film, setFilm] = useState<number>(DEFAULTS.film);
  const [wRaw, setWRaw] = useState<string>(DEFAULTS.w);
  const [hRaw, setHRaw] = useState<string>(DEFAULTS.h);
  const [qRaw, setQRaw] = useState<string>(DEFAULTS.q);

  const changedRef = useRef(false);
  const goalSentRef = useRef(false);

  const w = parseField(wRaw);
  const h = parseField(hRaw);
  const q = parseField(qRaw);

  const result = useMemo(
    () =>
      calcWeight({
        mode,
        t,
        t1,
        t2,
        film,
        widthMm: w.value,
        heightMm: h.value,
        qty: q.value,
      }),
    [mode, t, t1, t2, film, w.value, h.value, q.value]
  );
  // `calcWeight` counts at least one glass; an empty / zero quantity means an empty batch.
  const batch = result && q.value > 0 ? result.batch : 0;

  // `calc_weight`: after the first change only, 800 ms after the last one, non-zero result.
  // The cleanup cancels the pending timer on every change (debounce) and on unmount.
  useEffect(() => {
    if (!changedRef.current || goalSentRef.current || result === null) return;
    const timer = window.setTimeout(() => {
      goalSentRef.current = true;
      reachGoal("calc_weight", { mode });
    }, GOAL_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [mode, result]);

  /** Wraps a setter so that the change counts as user input for the analytics goal. */
  function track<T>(set: (value: T) => void) {
    return (value: T) => {
      changedRef.current = true;
      set(value);
    };
  }
  const onText =
    (set: (value: string) => void) =>
    (event: ChangeEvent<HTMLInputElement>): void =>
      track(set)(event.target.value);

  const quizHref = buildWeightQuizHref({
    mode,
    t,
    t1,
    t2,
    film,
    w: w.value || null,
    h: h.value || null,
    q: q.value || null,
    src,
  });

  const modeLabel =
    mode === "single" ? `Стекло ${t} мм` : `Триплекс ${t1}+${t2}, плёнка ${filmLabel(film)} мм`;
  const perGlassText = result ? formatWeightKg(result.perGlass, "perGlass") : "0";
  const hint = result ? pickHint(result.perGlass, carryHints) : null;

  return (
    <div className="grid grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] items-stretch gap-6 max-md:grid-cols-1">
      <div className="bg-surface shadow-card flex flex-col gap-7 rounded-xl p-9 max-sm:gap-6 max-sm:rounded-lg max-sm:p-5">
        <div
          role="group"
          aria-label="Вид стекла"
          className="bg-well inline-flex gap-1 self-start rounded-full p-1 max-sm:self-stretch"
        >
          {(["single", "triplex"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => track(setMode)(value)}
              className={cn(
                "text-text h-11 cursor-pointer rounded-full border-0 bg-transparent px-[22px] text-[15px] leading-none font-medium transition-colors duration-(--ig-dur-base)",
                "hover:text-primary-pressed focus-visible:shadow-[var(--ig-focus-ring)] focus-visible:outline-none",
                "whitespace-nowrap max-sm:flex-1 max-sm:px-1.5 max-sm:text-sm",
                mode === value &&
                  "bg-surface text-primary-dark hover:text-primary-dark shadow-[0_2px_8px_rgba(28,31,34,0.1)]"
              )}
            >
              {MODE_LABELS[value]}
            </button>
          ))}
        </div>

        {mode === "single" ? (
          <ChipRow label="Толщина" groupLabel="Толщина стекла">
            {THICKNESSES.map((value) => (
              <Chip
                key={value}
                active={t === value}
                onClick={() => track(setT)(value)}
                className="h-11 px-4 text-[15px]"
              >
                {value} мм
              </Chip>
            ))}
          </ChipRow>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              <span className="ig-field__label">Толщины слоёв</span>
              <div className="flex items-end gap-3">
                <LayerSelect label="Стекло 1" value={t1} onChange={track(setT1)} />
                <span
                  aria-hidden="true"
                  className="text-text-2 text-[22px] leading-[48px] font-semibold"
                >
                  +
                </span>
                <LayerSelect label="Стекло 2" value={t2} onChange={track(setT2)} />
              </div>
            </div>
            <ChipRow label="Толщина плёнки" groupLabel="Толщина плёнки">
              {FILM_THICKNESSES.map((value) => (
                <Chip
                  key={value}
                  active={film === value}
                  onClick={() => track(setFilm)(value)}
                  className="h-11 px-4 text-[15px]"
                >
                  {filmLabel(value)} мм
                </Chip>
              ))}
            </ChipRow>
          </>
        )}

        <div className="flex flex-wrap items-end gap-3">
          <Field label="Ширина, мм" className="flex-[1_1_140px] max-sm:basis-[100px]">
            <Input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={wRaw}
              invalid={w.invalid}
              onChange={onText(setWRaw)}
            />
          </Field>
          <span
            aria-hidden="true"
            className="text-text-2 mb-px text-[22px] leading-[48px] font-semibold"
          >
            ×
          </span>
          <Field label="Высота, мм" className="flex-[1_1_140px] max-sm:basis-[100px]">
            <Input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={hRaw}
              invalid={h.invalid}
              onChange={onText(setHRaw)}
            />
          </Field>
          <Field
            label="Количество, шт."
            className="ml-3 flex-[1_1_140px] max-sm:ml-0 max-sm:basis-full"
          >
            <Input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={qRaw}
              invalid={q.invalid}
              onChange={onText(setQRaw)}
            />
          </Field>
        </div>
      </div>

      <div
        aria-live="polite"
        className="bg-primary-dark text-on-navy flex flex-col gap-6 rounded-xl p-9 max-sm:rounded-lg max-sm:p-5"
      >
        <span className="ig-label tracking-[0.04em] text-[#A9CBC5]" data-testid="weight-mode-label">
          {modeLabel}
        </span>
        <dl className="m-0 flex flex-col">
          <ResultRow
            label="Вес 1 м²"
            value={result ? formatWeightKg(result.perM2, "perM2") : "0"}
            testId="weight-per-m2"
            small
          />
          <ResultRow label="Вес одного стекла" value={perGlassText} testId="weight-per-glass" />
          <ResultRow
            label="Вес партии"
            value={formatWeightKg(batch, "batch")}
            testId="weight-batch"
          />
        </dl>
        {result && hint ? (
          <p
            className="m-0 flex items-start gap-3.5 rounded-lg bg-white/8 p-4 text-[15px] leading-normal"
            data-testid="weight-hint"
          >
            <span
              aria-hidden="true"
              className="bg-primary-light text-primary-dark grid size-10 flex-none place-items-center rounded-full [&_svg]:size-5"
            >
              {result.perGlass <= ONE_PERSON_MAX_KG ? (
                <User strokeWidth={2} />
              ) : (
                <Users strokeWidth={2} />
              )}
            </span>
            <span className="self-center">
              <b>Одно стекло {perGlassText} кг:</b> {hint}
            </span>
          </p>
        ) : null}
        <Button
          asChild
          variant="primary"
          size="l"
          block
          className="max-sm:h-auto max-sm:min-h-14 max-sm:py-3 max-sm:text-center max-sm:whitespace-normal"
          leftIcon={<Calculator aria-hidden="true" strokeWidth={2} />}
        >
          <Link
            href={quizHref}
            data-quiz-cta=""
            data-testid="weight-cta"
            onClick={() => reachGoal("calc_to_quiz", { mode })}
          >
            Посчитать стоимость этого стекла
          </Link>
        </Button>
      </div>
    </div>
  );
}

function ChipRow({
  label,
  groupLabel,
  children,
}: {
  label: string;
  groupLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <span className="ig-field__label" aria-hidden="true">
        {label}
      </span>
      <div role="group" aria-label={groupLabel} className="ig-chips">
        {children}
      </div>
    </div>
  );
}

function LayerSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <Field label={label} className="max-w-[200px] flex-1">
      <Select value={String(value)} onChange={(event) => onChange(Number(event.target.value))}>
        {THICKNESSES.map((thickness) => (
          <option key={thickness} value={thickness}>
            {thickness} мм
          </option>
        ))}
      </Select>
    </Field>
  );
}

function ResultRow({
  label,
  value,
  testId,
  small = false,
}: {
  label: string;
  value: string;
  testId: string;
  /** The first row («Вес 1 м²») is set smaller: 32 / 26 px. */
  small?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-white/14 py-4">
      <dt className="text-base leading-[1.4] text-[#C9DCD8]">{label}</dt>
      <dd
        className={cn(
          "m-0 leading-none font-bold whitespace-nowrap tabular-nums",
          small ? "text-[32px] max-sm:text-[26px]" : "text-[44px] max-sm:text-[32px]"
        )}
      >
        <span data-testid={testId}>{value}</span>
        <small className="text-[20px] font-medium text-[#C9DCD8]"> кг</small>
      </dd>
    </div>
  );
}
