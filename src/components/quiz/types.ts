import type { ReactNode } from "react";
import type {
  FilmThickness,
  PricesInput,
  PromoInput,
  QuizAnswersDraft,
  QuizKindId,
  QuizTypeId,
  TechLimits,
  Thickness,
} from "@/lib/domain";

/**
 * Public types of the quiz «Расчёт стоимости» (task-20). `QuizConfig` is built on the server
 * (`getQuizConfig()`, `src/lib/cms/quiz-config.ts`) and must stay JSON-serializable.
 */

/**
 * Pre-fill from page cards (`type` / `thick` / `vid` / `src`) and the weight calculator
 * (`w`, `h`, `q`, `t1`, `t2`, `film`). Parsed from the URL by task-34 (`src/lib/quiz/prefill.ts`);
 * the quiz itself knows nothing about search params.
 */
export interface QuizPrefill {
  type?: QuizTypeId;
  /** 4…19 mm. */
  thickness?: number;
  kind?: QuizKindId;
  triplex?: { glass1?: number; glass2?: number; film?: number };
  maxW?: number;
  maxH?: number;
  positions?: number;
}

export type DeliveryCityKind = "city" | "other" | "pickup";

export interface QuizConfig {
  /** Server «now»: price freshness and the promo are computed from it (no hydration drift). */
  nowIso: string;
  prices: PricesInput;
  promo: PromoInput | null;
  limits: TechLimits;
  /** Non-working weekdays, `YYYY-MM-DD` (`site-settings.holidays` without `isWorkday`). */
  holidays: string[];
  /** Weekend days made working by a transfer (`isWorkday`), `YYYY-MM-DD`. */
  workdays?: string[];
  /** `tech-params.deliveryCities`: `other` → the «Город» field, `pickup` → self-pickup. */
  cities: { name: string; kind: DeliveryCityKind }[];
  /** EVA film thicknesses, mm (`tech-params.weight.filmLayers`). */
  films: number[];
  /** Primary phone of `contacts`, for the submit error text. */
  phone: string;
  /** `conditions.minOrderM2` (50). */
  minOrderArea: number;
  /** `site-settings.forms`; `submitErrorText` contains the `{телефон}` placeholder. */
  forms: { thankYouTitle: string; thankYouText: string; submitErrorText: string };
}

export interface QuizProps {
  config: QuizConfig;
  prefill?: QuizPrefill | undefined;
  /** Path of the entry page (quiz `src`); `''` / absent → session landing or `location.pathname`. */
  entryPage?: string | undefined;
  variant?: "page" | "modal" | undefined;
  /** Restore the saved draft («Мой расчёт»). */
  resume?: boolean | undefined;
  /** For the modal shell; the close button is drawn by the shell or `QuizHeader`. */
  onClose?: (() => void) | undefined;
  /**
   * Optional heading block rendered at the top of the quiz card, above the progress
   * (e.g. `<QuizHeader as="h2" onClose={…} />` in the modal shell).
   */
  header?: ReactNode;
}

export type QuizStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export const QUIZ_STEP_COUNT = 7;

/**
 * Text inputs kept exactly as typed (comma decimals, partial values). Their parsed numbers live
 * in `answers`; the raw strings are stored in the draft so a restored field shows what was typed.
 */
export interface QuizRawFields {
  positions: string;
  area: string;
  maxW: string;
  maxH: string;
  holeCount: string;
  holeDiam: string;
  bendRadius: string;
  inn: string;
}

export type QuizRawKey = keyof QuizRawFields;

/** Uploaded drawing (token is short-lived: never stored in the draft). */
export interface QuizFile {
  uploadToken: string;
  name: string;
  size: number;
}

/** Field ids that can carry a blocking error at submit. */
export type QuizErrorField =
  | "type"
  | "thickness"
  | "kind"
  | "triplex"
  | "customNote"
  | "ral"
  | "company"
  | "name"
  | "phone"
  | "email"
  | "inn"
  | "consent";

export type QuizFieldErrors = Partial<Record<QuizErrorField, string>>;

export interface QuizUiState {
  step: QuizStep;
  maxStepReached: QuizStep;
  answers: QuizAnswersDraft;
  raw: QuizRawFields;
  /** The state came from a saved draft («Продолжаем ваш расчёт»). */
  resumed: boolean;
}

export type { FilmThickness, QuizAnswersDraft, Thickness };
