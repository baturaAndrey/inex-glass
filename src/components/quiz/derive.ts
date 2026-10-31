import {
  computeQuizFlags,
  formatNumber,
  formatRub,
  getQuizHints,
  isUrgent,
  NBSP,
  priceState,
  QUIZ_CUSTOM_THICKNESS,
  QUIZ_TYPES,
  QUIZ_KINDS,
  quizEstimate,
  weightPerM2Single,
  weightPerM2Triplex,
} from "@/lib/domain";
import type {
  PriceState,
  QuizAnswersDraft,
  QuizContext,
  QuizFlag,
  QuizHint,
  QuizHintStep,
} from "@/lib/domain";
import type { QuizConfig, QuizPrefill } from "./types";

/**
 * Derived values of the quiz on top of the domain library: hints, the price estimate, flags,
 * weights for the option cards and display strings. No business formula is re-implemented
 * here — everything comes from `@/lib/domain`.
 */

/** Domain context from the serialized config. `now` is the server time of the render. */
export function quizContext(config: QuizConfig, opts: { atSubmit?: boolean } = {}): QuizContext {
  return {
    now: new Date(config.nowIso),
    holidays: config.holidays,
    workdays: config.workdays ?? [],
    prices: config.prices,
    promo: config.promo,
    limits: config.limits,
    ...(opts.atSubmit ? { atSubmit: true } : {}),
  };
}

/**
 * The thickness of a triplex order is defined by its layers, not by the single-glass grid (which
 * is hidden for triplex): the number picked before switching the type must not leak into hints
 * (hole rules for triplex are the general ones) or the lead.
 * - triplex + «Подберите под нагрузку» → `custom`;
 * - triplex with both layers → the thicker layer (`quizAnswersSchema` requires a thickness;
 *   the CRM e-mail shows the layer formula for triplex anyway);
 * - otherwise no thickness.
 */
export function triplexThickness(answers: QuizAnswersDraft): QuizAnswersDraft["thickness"] {
  if (answers.thickness === QUIZ_CUSTOM_THICKNESS) return QUIZ_CUSTOM_THICKNESS;
  const { glass1, glass2 } = answers.triplex ?? {};
  if (glass1 === undefined || glass2 === undefined) return undefined;
  return Math.max(glass1, glass2) as QuizAnswersDraft["thickness"];
}

/** Answers as the domain should see them for hints (triplex: no single-glass thickness). */
export function answersForHints(answers: QuizAnswersDraft): QuizAnswersDraft {
  if (answers.type !== "triplex") return answers;
  const { thickness: _thickness, ...rest } = answers;
  return answers.thickness === QUIZ_CUSTOM_THICKNESS ? answers : rest;
}

export interface QuizDerived {
  hints: QuizHint[];
  hintsByStep: Record<QuizHintStep, QuizHint[]>;
  estimate: { amount: number; text: string; lead: string; rest: string } | null;
  /** Price state of the chosen numeric thickness (`null` without one or for triplex). */
  priceState: PriceState | null;
  flags: QuizFlag[];
  urgent: boolean;
}

/** Splits «Ориентировочно от 120 400 ₽ за стекло …» into the big amount and the caption. */
export function splitEstimate(amount: number, text: string): { lead: string; rest: string } {
  const lead = `Ориентировочно от ${formatRub(amount)}`;
  if (!text.startsWith(lead)) return { lead: "", rest: text };
  return { lead, rest: text.slice(lead.length).trim() };
}

export function deriveQuiz(answers: QuizAnswersDraft, ctx: QuizContext): QuizDerived {
  const forHints = answersForHints(answers);
  const hints = getQuizHints(forHints, ctx);
  const hintsByStep: Record<QuizHintStep, QuizHint[]> = { 2: [], 3: [], 4: [], 6: [] };
  for (const hint of hints) hintsByStep[hint.step].push(hint);

  const estimated = quizEstimate(forHints, ctx);
  const thickness = typeof forHints.thickness === "number" ? forHints.thickness : null;

  return {
    hints,
    hintsByStep,
    estimate: estimated
      ? { ...estimated, ...splitEstimate(estimated.amount, estimated.text) }
      : null,
    priceState:
      thickness === null || answers.type === "triplex"
        ? null
        : priceState(thickness, ctx.prices, ctx.now),
    flags: computeQuizFlags(forHints, ctx),
    urgent: isUrgent(
      answers.desiredDate,
      ctx.now,
      answers.type === "triplex",
      ctx.holidays,
      ctx.workdays ?? []
    ),
  };
}

/** Flags of the submitted lead (a missing file counts as `no_file`), for the Metrika goal. */
export function submitFlags(answers: QuizAnswersDraft, config: QuizConfig): QuizFlag[] {
  return computeQuizFlags(answers, quizContext(config, { atSubmit: true }));
}

/** «10 кг/м²», «12,5 кг/м²» — weight of 1 m² of single glass. */
export function thicknessWeightLabel(t: number): string {
  return `${formatNumber(weightPerM2Single(t))}${NBSP}кг/м²`;
}

/** «Схема 6+6, плёнка 0,76 мм · вес ≈ 30,7 кг/м²»; `null` until both glasses are chosen. */
export function triplexSummary(triplex: QuizAnswersDraft["triplex"]): string | null {
  const { glass1, glass2, film } = triplex ?? {};
  if (glass1 === undefined || glass2 === undefined) return null;
  const scheme = `Схема ${glass1}+${glass2}`;
  if (film === undefined) return scheme;
  const weight = formatNumber(weightPerM2Triplex(glass1, glass2, film), { decimals: 1 });
  return `${scheme}, плёнка ${formatNumber(film)}${NBSP}мм · вес ≈ ${weight}${NBSP}кг/м²`;
}

/**
 * «Из карточки: Закалённое стекло, 10 мм, прозрачное» (prototype `Kviz.dc.html`); `null` when
 * the pre-fill names neither a type nor a thickness.
 */
export function prefillBadgeText(prefill: QuizPrefill | undefined): string | null {
  if (!prefill) return null;
  const parts: string[] = [];
  const type = QUIZ_TYPES.find((item) => item.id === prefill.type);
  if (type) parts.push(type.label);
  if (prefill.type === "triplex" && prefill.triplex?.glass1 && prefill.triplex.glass2) {
    parts.push(`${prefill.triplex.glass1}+${prefill.triplex.glass2}${NBSP}мм`);
  } else if (prefill.thickness) {
    parts.push(`${prefill.thickness}${NBSP}мм`);
  }
  const kind = QUIZ_KINDS.find((item) => item.id === prefill.kind);
  if (kind) parts.push(kind.label.toLowerCase());
  return parts.length > 0 ? `Из карточки: ${parts.join(", ")}` : null;
}
