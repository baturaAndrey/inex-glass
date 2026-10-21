import type { QuizPrefill } from "@/components/quiz/types";
import { FILM_THICKNESSES, QUIZ_KIND_IDS, QUIZ_TYPE_IDS, quizSrc, THICKNESSES } from "@/lib/domain";
import type { QuizKindId, QuizTypeId } from "@/lib/domain";

/**
 * Parser of the quiz URL (`/raschet-stoimosti/?type=&thick=&vid=&src=&w=&h=&q=&t1=&t2=&film=&resume=`).
 * Pure (no React / Next / browser APIs): the quiz page and the intercepted modal route parse
 * `searchParams` on the server and hand the result to `<Quiz/>`.
 *
 * The values are the domain ids (`QUIZ_TYPE_IDS`, `QUIZ_KIND_IDS`, `THICKNESSES`,
 * `FILM_THICKNESSES`) — the same dictionary `buildQuizHref` / `buildWeightQuizHref` write, with no
 * mapping layer. Anything unknown or out of range is ignored, never an error: a quiz link must
 * always open the quiz.
 */

/** Path of the quiz page (and of the intercepted modal route). */
export const QUIZ_PAGE_PATH = "/raschet-stoimosti/";

/** Longest accepted `src` path (after cutting query / hash). */
export const MAX_SRC_LENGTH = 200;
/** Upper bound of sizes (mm) and quantity: guards against absurd input, not a business limit. */
export const MAX_SIZE_MM = 100_000;
export const MAX_QUANTITY = 100_000;

export type QuizSearchParams = Record<string, string | string[] | undefined>;

export interface ParsedQuizParams {
  prefill: QuizPrefill;
  /** Validated `src` (masked by `quizSrc`), `''` when absent or invalid — the caller falls back. */
  entryPage: string;
  /** `resume=1`: restore the saved draft («Мой расчёт»). */
  resume: boolean;
}

/** Repeated parameters (`?type=a&type=b`): the first one wins. */
function first(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === undefined) return undefined;
  const text = raw.trim();
  return text === "" ? undefined : text;
}

function oneOf<T extends string>(ids: readonly T[], value: string | undefined): T | undefined {
  return value !== undefined && (ids as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}

/** Plain decimal number, `.` or `,` as the separator («1200», «0,76»); no signs, exponents, hex. */
const DECIMAL = /^\d+(?:[.,]\d+)?$/;

function decimal(value: string | undefined): number | undefined {
  if (value === undefined || !DECIMAL.test(value)) return undefined;
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}

/** A glass thickness from the canonical list (integer mm). */
function thickness(value: string | undefined): number | undefined {
  if (value === undefined || !/^\d+$/.test(value)) return undefined;
  const n = Number(value);
  return (THICKNESSES as readonly number[]).includes(n) ? n : undefined;
}

function film(value: string | undefined): number | undefined {
  const n = decimal(value);
  return n !== undefined && (FILM_THICKNESSES as readonly number[]).includes(n) ? n : undefined;
}

/** Size in mm: `0 < value ≤ MAX_SIZE_MM`. */
function size(value: string | undefined): number | undefined {
  const n = decimal(value);
  return n !== undefined && n > 0 && n <= MAX_SIZE_MM ? n : undefined;
}

/** Quantity: rounded to an integer, `1 ≤ value ≤ MAX_QUANTITY`. */
function quantity(value: string | undefined): number | undefined {
  const n = decimal(value);
  if (n === undefined) return undefined;
  const rounded = Math.round(n);
  return rounded >= 1 && rounded <= MAX_QUANTITY ? rounded : undefined;
}

/**
 * Safe site path for the entry page, or `''`. Rejects anything that is not a same-site path:
 * protocol-relative `//host`, schemes (`javascript:`), backslashes (browsers treat `/\host` as
 * `//host`), whitespace / control characters. Query and hash are cut; secret paths
 * (`/zakaz/<token>/`) are masked by `quizSrc`. The quiz page itself is no entry page.
 */
export function sanitizeEntryPath(value: string | null | undefined): string {
  if (!value) return "";
  const path = value.trim().split(/[?#]/, 1)[0] ?? "";
  if (
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes(":") ||
    path.includes("\\") ||
    // Whitespace and control characters never occur in our paths (C0, DEL, C1).
    /[\s\u0000-\u001f\u007f-\u009f]/.test(path) ||
    path.length > MAX_SRC_LENGTH
  ) {
    return "";
  }
  const masked = quizSrc(path);
  return masked === QUIZ_PAGE_PATH || masked === QUIZ_PAGE_PATH.slice(0, -1) ? "" : masked;
}

export function parseQuizSearchParams(searchParams: QuizSearchParams): ParsedQuizParams {
  const get = (key: string) => first(searchParams[key]);

  const type = oneOf<QuizTypeId>(QUIZ_TYPE_IDS, get("type"));
  const kind = oneOf<QuizKindId>(QUIZ_KIND_IDS, get("vid"));
  const maxW = size(get("w"));
  const maxH = size(get("h"));
  const positions = quantity(get("q"));

  const prefill: QuizPrefill = {};
  if (type) prefill.type = type;
  if (type === "triplex") {
    // Triplex is described by its layers: `thick` is ignored, `t1` / `t2` / `film` are used.
    const triplex = {
      glass1: thickness(get("t1")),
      glass2: thickness(get("t2")),
      film: film(get("film")),
    };
    const layers = Object.fromEntries(
      Object.entries(triplex).filter(([, value]) => value !== undefined)
    ) as NonNullable<QuizPrefill["triplex"]>;
    if (Object.keys(layers).length > 0) prefill.triplex = layers;
  } else {
    const thick = thickness(get("thick"));
    if (thick !== undefined) prefill.thickness = thick;
  }
  if (kind) prefill.kind = kind;
  if (maxW !== undefined) prefill.maxW = maxW;
  if (maxH !== undefined) prefill.maxH = maxH;
  if (positions !== undefined) prefill.positions = positions;

  return {
    prefill,
    entryPage: sanitizeEntryPath(get("src")),
    resume: get("resume") === "1",
  };
}
