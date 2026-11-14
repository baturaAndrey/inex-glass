import {
  formatNumber,
  pluralRu,
  QUIZ_CUSTOM_THICKNESS,
  QUIZ_TYPES,
  quizDraftSchema,
} from "@/lib/domain";
import type { QuizAnswersDraft, QuizTypeId } from "@/lib/domain";

/**
 * «Состав заказа» for a new order, built from the lead (ТЗ §6.2): «Закалённое стекло 10 мм,
 * 86 м², 42 позиции». Pure; never invents data — every part is optional and an empty string
 * means «nothing known» (the manager fills the field in the admin).
 */

/** The lead fields the composition is built from (a subset of `Lead`). */
export interface CompositionSource {
  productType?: string | null;
  area?: number | null;
  answers?: unknown;
}

const NBSP = " ";
const PART_SEPARATOR = ", ";
const POSITION_FORMS = ["позиция", "позиции", "позиций"] as const;
/** «Другое» says nothing about the order: left out of the composition. */
const UNINFORMATIVE_TYPE: QuizTypeId = "other";

const TYPE_LABELS: ReadonlyMap<string, string> = new Map(
  QUIZ_TYPES.map(({ id, label }) => [id, label])
);

const isPositive = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

/**
 * Quiz answers through the lenient draft schema of the domain: invalid or foreign values are
 * dropped instead of failing the whole object, so a partly broken answer set still yields the
 * parts that are valid. Anything that is not an object gives `null`.
 */
function parseAnswers(answers: unknown): QuizAnswersDraft | null {
  if (typeof answers !== "object" || answers === null || Array.isArray(answers)) return null;
  const parsed = quizDraftSchema.safeParse(answers);
  return parsed.success ? parsed.data : null;
}

function typePart(typeId: string | null | undefined): string | null {
  if (!typeId || typeId === UNINFORMATIVE_TYPE) return null;
  return TYPE_LABELS.get(typeId) ?? null;
}

function thicknessPart(answers: QuizAnswersDraft | null, typeId: string | null): string | null {
  if (!answers) return null;
  if (typeId === "triplex") {
    const { glass1, glass2 } = answers.triplex ?? {};
    if (isPositive(glass1) && isPositive(glass2)) {
      return `${formatNumber(glass1)}+${formatNumber(glass2)}${NBSP}мм`;
    }
  }
  const { thickness } = answers;
  if (thickness === undefined || thickness === QUIZ_CUSTOM_THICKNESS) return null;
  return isPositive(thickness) ? `${formatNumber(thickness)}${NBSP}мм` : null;
}

export function buildComposition(lead: CompositionSource): string {
  const answers = parseAnswers(lead.answers);
  const typeId = lead.productType || answers?.type || null;

  const area = isPositive(lead.area) ? lead.area : answers?.area;
  const positions = answers?.positions;

  const parts = [
    // Type and thickness read as one phrase: «Закалённое стекло 10 мм».
    [typePart(typeId), thicknessPart(answers, typeId)].filter(Boolean).join(" ") || null,
    isPositive(area) ? `${formatNumber(area)}${NBSP}м²` : null,
    isPositive(positions) && Number.isInteger(positions)
      ? `${positions} ${pluralRu(positions, POSITION_FORMS)}`
      : null,
  ];
  return parts.filter((part): part is string => Boolean(part)).join(PART_SEPARATOR);
}
