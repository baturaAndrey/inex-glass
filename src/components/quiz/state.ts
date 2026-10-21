import {
  FILM_THICKNESSES,
  parseDiameters,
  parseNumber,
  QUIZ_CUSTOM_THICKNESS,
  QUIZ_THICKNESSES,
  sanitizeQuizAnswers,
  THICKNESSES,
} from "@/lib/domain";
import type {
  QuizAnswersDraft,
  QuizEdgeId,
  QuizKindId,
  QuizThickness,
  QuizTypeId,
  Thickness,
} from "@/lib/domain";
import { QUIZ_STEP_COUNT } from "./types";
import type {
  QuizFile,
  QuizPrefill,
  QuizRawFields,
  QuizRawKey,
  QuizStep,
  QuizUiState,
} from "./types";

/**
 * Quiz state: answers in the domain draft shape (`QuizAnswersDraft`) plus the raw text of the
 * numeric inputs, the current step and the furthest step reached. Pure reducer — persistence,
 * analytics and submission live in `use-quiz.ts`.
 */

export const EMPTY_RAW: QuizRawFields = {
  positions: "",
  area: "",
  maxW: "",
  maxH: "",
  holeCount: "",
  holeDiam: "",
  bendRadius: "",
  inn: "",
};

/** «Не знаю — подскажите» excludes every other edge option. */
export const UNKNOWN_EDGE: QuizEdgeId = "unknown";

type ContactKey = keyof NonNullable<QuizAnswersDraft["contact"]>;
type TriplexLayer = "glass1" | "glass2" | "film";

export type QuizAction =
  | { type: "setType"; value: QuizTypeId }
  | { type: "setThickness"; value: QuizThickness | undefined }
  | { type: "setKind"; value: QuizKindId | undefined }
  | { type: "patch"; patch: Partial<QuizAnswersDraft> }
  | { type: "setRaw"; key: QuizRawKey; value: string }
  | { type: "setTriplex"; layer: TriplexLayer; value: number | undefined }
  | { type: "setEdges"; value: QuizEdgeId[] }
  | { type: "setHoles"; has: boolean | undefined }
  | { type: "setContact"; key: Exclude<ContactKey, "inn">; value: string | undefined }
  | { type: "setFile"; file: QuizFile | undefined }
  | { type: "next" }
  | { type: "back" }
  | { type: "goTo"; step: QuizStep }
  | { type: "skipFile" }
  | { type: "replace"; state: QuizUiState };

const clampStep = (n: number): QuizStep =>
  Math.min(QUIZ_STEP_COUNT, Math.max(1, Math.round(n))) as QuizStep;

export function isQuizStep(value: unknown): value is QuizStep {
  return (
    typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= QUIZ_STEP_COUNT
  );
}

/** Removes `undefined` keys so the draft (and its JSON) stays minimal. */
function compact<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}

function withAnswers(state: QuizUiState, answers: QuizAnswersDraft): QuizUiState {
  return { ...state, answers: compact(sanitizeQuizAnswers(answers)) };
}

/** Non-negative number of a text input («12,5» → 12.5); `undefined` when empty or invalid. */
function nonNegative(raw: string, integer = false): number | undefined {
  const n = parseNumber(raw);
  if (n === null || n < 0) return undefined;
  return integer ? Math.round(n) : n;
}

/** Applies a raw text input to the parsed answers. */
function applyRaw(answers: QuizAnswersDraft, key: QuizRawKey, value: string): QuizAnswersDraft {
  switch (key) {
    case "positions":
      return { ...answers, positions: nonNegative(value, true) };
    case "area":
      return { ...answers, area: nonNegative(value) };
    case "maxW":
      return { ...answers, maxW: nonNegative(value) };
    case "maxH":
      return { ...answers, maxH: nonNegative(value) };
    case "bendRadius":
      return { ...answers, bendRadius: nonNegative(value) };
    case "holeCount":
      return { ...answers, holes: compact({ ...answers.holes, count: nonNegative(value, true) }) };
    case "holeDiam": {
      const diameters = parseDiameters(value);
      return {
        ...answers,
        holes: compact({
          ...answers.holes,
          diameters: diameters.length > 0 ? diameters : undefined,
        }),
      };
    }
    case "inn": {
      const inn = value.trim();
      return { ...answers, contact: compact({ ...answers.contact, inn: inn || undefined }) };
    }
  }
}

/**
 * Edge selection with the exclusive «не знаю»: choosing it clears the others, choosing any other
 * option clears «не знаю».
 */
export function nextEdges(
  previous: readonly QuizEdgeId[],
  next: readonly QuizEdgeId[]
): QuizEdgeId[] {
  const hadUnknown = previous.includes(UNKNOWN_EDGE);
  const hasUnknown = next.includes(UNKNOWN_EDGE);
  if (hasUnknown && !hadUnknown) return [UNKNOWN_EDGE];
  if (hasUnknown && next.length > 1) return next.filter((edge) => edge !== UNKNOWN_EDGE);
  return [...next];
}

export function quizReducer(state: QuizUiState, action: QuizAction): QuizUiState {
  const { answers } = state;
  switch (action.type) {
    case "setType":
      return withAnswers(state, { ...answers, type: action.value });
    case "setThickness":
      return withAnswers(state, { ...answers, thickness: action.value });
    case "setKind":
      // `sanitizeQuizAnswers` drops tint / RAL / bend radius that belong to another kind.
      return withAnswers(
        { ...state, raw: action.value === "bent" ? state.raw : { ...state.raw, bendRadius: "" } },
        { ...answers, kind: action.value }
      );
    case "patch":
      return withAnswers(state, { ...answers, ...action.patch });
    case "setRaw":
      return withAnswers(
        { ...state, raw: { ...state.raw, [action.key]: action.value } },
        applyRaw(answers, action.key, action.value)
      );
    case "setTriplex":
      return withAnswers(state, {
        ...answers,
        triplex: compact({ ...answers.triplex, [action.layer]: action.value }),
      });
    case "setEdges":
      return withAnswers(state, {
        ...answers,
        edges: nextEdges(answers.edges ?? [], action.value),
      });
    case "setHoles":
      return withAnswers(state, {
        ...answers,
        holes: compact({ ...answers.holes, has: action.has }),
      });
    case "setContact":
      return withAnswers(state, {
        ...answers,
        contact: compact({ ...answers.contact, [action.key]: action.value }),
      });
    case "setFile":
      // A real file makes «Нет чертежа» obsolete.
      return withAnswers(state, {
        ...answers,
        file: action.file,
        noFile: action.file ? undefined : answers.noFile,
      });
    case "next":
      return goTo(state, clampStep(state.step + 1));
    case "back":
      return goTo(state, clampStep(state.step - 1));
    case "goTo":
      return goTo(state, action.step);
    case "skipFile":
      return goTo(withAnswers(state, { ...answers, noFile: answers.file ? undefined : true }), 6);
    case "replace":
      return action.state;
  }
}

function goTo(state: QuizUiState, step: QuizStep): QuizUiState {
  if (step === state.step) return state;
  return {
    ...state,
    step,
    maxStepReached: step > state.maxStepReached ? step : state.maxStepReached,
  };
}

/* ------------------------------------------------------------------------------------------ */
/* Initial state                                                                               */
/* ------------------------------------------------------------------------------------------ */

const isThickness = (n: unknown): n is Thickness =>
  typeof n === "number" && (THICKNESSES as readonly number[]).includes(n);
const isFilm = (n: unknown): n is (typeof FILM_THICKNESSES)[number] =>
  typeof n === "number" && (FILM_THICKNESSES as readonly number[]).includes(n);
const isPositive = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n) && n > 0;

/** Rounds to 2 decimals (m² of the pre-filled area). */
const round2 = (n: number) => Math.round(n * 100) / 100;
const MM_PER_M = 1000;

/** «12,5» for the raw text of a pre-filled decimal. */
const rawNumber = (n: number) => String(n).replace(".", ",");

export function createInitialState(prefill?: QuizPrefill): QuizUiState {
  const answers: QuizAnswersDraft = {};
  const raw: QuizRawFields = { ...EMPTY_RAW };

  if (prefill?.type) answers.type = prefill.type;
  if (isThickness(prefill?.thickness)) answers.thickness = prefill.thickness;
  if (prefill?.kind) answers.kind = prefill.kind;
  if (prefill?.type === "triplex" && prefill.triplex) {
    const { glass1, glass2, film } = prefill.triplex;
    answers.triplex = compact({
      glass1: isThickness(glass1) ? glass1 : undefined,
      glass2: isThickness(glass2) ? glass2 : undefined,
      film: isFilm(film) ? film : undefined,
    });
  }
  if (isPositive(prefill?.maxW)) {
    answers.maxW = prefill.maxW;
    raw.maxW = rawNumber(prefill.maxW);
  }
  if (isPositive(prefill?.maxH)) {
    answers.maxH = prefill.maxH;
    raw.maxH = rawNumber(prefill.maxH);
  }
  if (isPositive(prefill?.positions)) {
    answers.positions = Math.round(prefill.positions);
    raw.positions = String(answers.positions);
  }
  // Calculator hand-off: W × H × quantity gives the area when it is not known yet.
  if (answers.maxW && answers.maxH && answers.positions && answers.area === undefined) {
    answers.area = round2(
      (answers.maxW / MM_PER_M) * (answers.maxH / MM_PER_M) * answers.positions
    );
    raw.area = rawNumber(answers.area);
  }

  return {
    step: 1,
    maxStepReached: 1,
    answers: compact(sanitizeQuizAnswers(answers)),
    raw,
    resumed: false,
  };
}

/** Whether a pre-fill carries anything to show in the «Из карточки» badge. */
export function hasPrefill(prefill: QuizPrefill | undefined): prefill is QuizPrefill {
  return Boolean(
    prefill &&
    (prefill.type ||
      prefill.thickness ||
      prefill.kind ||
      prefill.triplex ||
      prefill.maxW ||
      prefill.maxH ||
      prefill.positions)
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Selectors                                                                                   */
/* ------------------------------------------------------------------------------------------ */

/** Answers for hints, the draft and the payload (already sanitized by the reducer). */
export function toAnswersDraft(state: QuizUiState): QuizAnswersDraft {
  return state.answers;
}

/** Whether the thickness card «Подберите под нагрузку» is chosen. */
export const isCustomThickness = (answers: QuizAnswersDraft): boolean =>
  answers.thickness === QUIZ_CUSTOM_THICKNESS;

/** Valid thickness values, for narrowing ids coming from UI option values. */
export function parseThicknessValue(value: string): QuizThickness | undefined {
  if (value === QUIZ_CUSTOM_THICKNESS) return QUIZ_CUSTOM_THICKNESS;
  const n = Number(value);
  return (QUIZ_THICKNESSES as readonly unknown[]).includes(n) ? (n as QuizThickness) : undefined;
}
