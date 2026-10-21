import { z } from "zod";
import {
  consentField,
  emailField,
  innField,
  MAX_LONG_TEXT,
  MAX_SHORT_TEXT,
  optionalText,
  phoneField,
  REQUIRED_MESSAGE,
  requiredText,
  softBoolean,
  softEnum,
  softEnumArray,
  softNumber,
} from "./contact-fields";
import { parseNumber } from "./format";
import { parseDiameters } from "./holes";
import { THICKNESSES } from "./types";
import { FILM_THICKNESSES } from "./weight";

/**
 * Quiz «Расчёт стоимости» (teksty/05-kviz.md, ТЗ p0 §4): option ids, labels and answer schemas.
 *
 * The ids are CANONICAL for the whole project: the same strings are the keys of the Payload
 * select fields (`quizPrefill.type/kind`, `tech-params.quizOptions`, `leads.role/productType`,
 * `products.quizType`) and the quiz URL parameters `type` / `vid`. There is no mapping layer, so
 * an id never changes after the schema freeze (task 10). `ids-consistency.test.ts` guards this.
 */

/** `{ id, label }` list from an id tuple and a label map (keeps ids as a literal tuple for zod). */
function optionList<const T extends readonly string[]>(ids: T, labels: Record<T[number], string>) {
  return ids.map((id: T[number]) => ({ id, label: labels[id] }));
}

export const QUIZ_TYPE_IDS = [
  "tempered",
  "triplex",
  "partitions",
  "railings",
  "shower",
  "canopies",
  "facade",
  "shopfronts",
  "verandas",
  "mirrors",
  "other",
] as const;
export type QuizTypeId = (typeof QUIZ_TYPE_IDS)[number];
export const QUIZ_TYPES = optionList(QUIZ_TYPE_IDS, {
  tempered: "Закалённое стекло",
  triplex: "Триплекс",
  partitions: "Перегородки",
  railings: "Ограждения",
  shower: "Душевые перегородки",
  canopies: "Козырьки",
  facade: "Стеклянный фасад",
  shopfronts: "Торговые витрины",
  verandas: "Остекление веранд и террас",
  mirrors: "Зеркала",
  other: "Другое",
});

/** «Подберите под нагрузку» — thickness picked by the manager. */
export const QUIZ_CUSTOM_THICKNESS = "custom";
export const QUIZ_CUSTOM_THICKNESS_LABEL = "Подберите под нагрузку";
export const QUIZ_THICKNESSES = [...THICKNESSES, QUIZ_CUSTOM_THICKNESS] as const;
export type QuizThickness = (typeof QUIZ_THICKNESSES)[number];

export const QUIZ_KIND_IDS = [
  "clear",
  "low-iron",
  "matte",
  "tinted",
  "painted",
  "ribbed",
  "bent",
] as const;
export type QuizKindId = (typeof QUIZ_KIND_IDS)[number];
export const QUIZ_KINDS = optionList(QUIZ_KIND_IDS, {
  clear: "Прозрачное",
  "low-iron": "Осветлённое",
  matte: "Матовое",
  tinted: "Тонированное",
  painted: "Крашеное по RAL",
  ribbed: "Рифлёное",
  bent: "Гнутое",
});

export const TINT_COLOR_IDS = ["bronze", "graphite", "grey"] as const;
export type TintColorId = (typeof TINT_COLOR_IDS)[number];
export const TINT_COLORS = optionList(TINT_COLOR_IDS, {
  bronze: "бронза",
  graphite: "графит",
  grey: "серое",
});

export const QUIZ_EDGE_IDS = [
  "ground",
  "polished",
  "trapezoid",
  "euro",
  "facet30",
  "facet50",
  "unknown",
] as const;
export type QuizEdgeId = (typeof QUIZ_EDGE_IDS)[number];
export const QUIZ_EDGES = optionList(QUIZ_EDGE_IDS, {
  ground: "шлифованная",
  polished: "полированная",
  trapezoid: "«трапеция»",
  euro: "«еврокромка»",
  facet30: "фацет 30 мм",
  facet50: "фацет 50 мм",
  unknown: "не знаю — подскажите",
});
/** Facet is offered for mirrors only (поправки 19.10). */
export const FACET_EDGE_IDS: readonly QuizEdgeId[] = ["facet30", "facet50"];
export const FACET_TYPE: QuizTypeId = "mirrors";

/** Whether an edge option is available for a product type. */
export function isEdgeAllowed(edge: QuizEdgeId, type: QuizTypeId | undefined): boolean {
  return !FACET_EDGE_IDS.includes(edge) || type === FACET_TYPE;
}

export const QUIZ_DECOR_IDS = ["matting", "print", "film"] as const;
export type QuizDecorId = (typeof QUIZ_DECOR_IDS)[number];
export const QUIZ_DECOR = optionList(QUIZ_DECOR_IDS, {
  matting: "матирование",
  print: "печать (до 1100 × 700 мм)",
  film: "плёнка",
});

export const QUIZ_STAMP_IDS = ["standard", "custom", "none"] as const;
export type QuizStampId = (typeof QUIZ_STAMP_IDS)[number];
export const QUIZ_STAMP = optionList(QUIZ_STAMP_IDS, {
  standard: "в стандартном месте",
  custom: "укажу место",
  none: "без клейма",
});

export const QUIZ_PACKING_IDS = ["film", "cardboard", "crate", "carrier"] as const;
export type QuizPackingId = (typeof QUIZ_PACKING_IDS)[number];
export const QUIZ_PACKING = optionList(QUIZ_PACKING_IDS, {
  film: "плёнка",
  cardboard: "картон",
  crate: "ящик под кран или погрузчик",
  carrier: "требования перевозчика",
});

export const QUIZ_ROLE_IDS = [
  "contractor",
  "manufacturer",
  "developer",
  "designer",
  "other",
] as const;
export type QuizRoleId = (typeof QUIZ_ROLE_IDS)[number];
export const QUIZ_ROLES = optionList(QUIZ_ROLE_IDS, {
  contractor: "подрядчик",
  manufacturer: "производитель мебели или изделий",
  developer: "застройщик или генподрядчик",
  designer: "дизайнер или архитектор",
  other: "другое",
});

/** Default delivery list; the source of truth is `tech-params.deliveryCities`. */
export const DEFAULT_DELIVERY_CITIES: readonly string[] = [
  "Челябинск",
  "Екатеринбург",
  "Тюмень",
  "Омск",
  "Новосибирск",
  "Кемерово",
  "Красноярск",
  "Уфа",
  "Пермь",
  "Самара",
  "Казань",
  "Сыктывкар",
  "Волгоград",
  "Другой",
  "Самовывоз (Челябинск)",
];

export { FILM_THICKNESSES };

/** `localStorage` key of the quiz draft; bump the version when the draft shape changes. */
export const QUIZ_DRAFT_KEY = "inex-quiz-draft-v1";

/* ------------------------------------------------------------------------------------------ */
/* Field schemas                                                                               */
/* ------------------------------------------------------------------------------------------ */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DIAMETERS = 50;
const MAX_UPLOAD_NAME = 255;

/** Numeric strings from forms/URLs («10») become numbers; «custom» stays as is. */
const toThicknessValue = (value: unknown): unknown =>
  typeof value === "string" && value !== QUIZ_CUSTOM_THICKNESS
    ? (parseNumber(value) ?? value)
    : value;

const thicknessSchema = z.preprocess(
  toThicknessValue,
  z.union([z.literal(THICKNESSES), z.literal(QUIZ_CUSTOM_THICKNESS)], { error: REQUIRED_MESSAGE })
);

const softThickness = z
  .preprocess(
    (value) => {
      const v = toThicknessValue(value);
      return (QUIZ_THICKNESSES as readonly unknown[]).includes(v) ? v : undefined;
    },
    z.union([z.literal(THICKNESSES), z.literal(QUIZ_CUSTOM_THICKNESS)]).optional()
  )
  .optional();

const layerThickness = z.preprocess(toThicknessValue, z.literal(THICKNESSES));
const filmThickness = z.preprocess(
  (value) => (typeof value === "string" ? (parseNumber(value) ?? value) : value),
  z.literal(FILM_THICKNESSES)
);

/** Diameters as a list of numbers or as free text («10, 12,5; 20»). */
const diametersSchema = z
  .preprocess((value) => {
    if (typeof value === "string") return parseDiameters(value);
    if (Array.isArray(value)) {
      return value
        .map((d) => parseNumber(typeof d === "number" || typeof d === "string" ? d : null))
        .filter((d): d is number => d !== null && d > 0);
    }
    return undefined;
  }, z.array(z.number()).max(MAX_DIAMETERS).optional())
  .optional();

const holesSchema = z.object({
  has: z.boolean().default(false),
  count: softNumber({ min: 0, integer: true }),
  diameters: diametersSchema,
});

/** Calendar date `YYYY-MM-DD`; anything else is dropped (the date is a hint, not a blocker). */
const softDate = z
  .preprocess(
    (value) => (typeof value === "string" && DATE_ONLY.test(value) ? value : undefined),
    z.string().optional()
  )
  .optional();

const fileSchema = z.object({
  uploadToken: z.string().min(1).max(MAX_SHORT_TEXT),
  name: z.string().max(MAX_UPLOAD_NAME),
  size: z.number().int().min(0),
});

const contactSchema = z.object({
  company: requiredText(),
  inn: innField(),
  name: requiredText(),
  phone: phoneField(),
  email: emailField(),
  role: softEnum(QUIZ_ROLE_IDS),
  comment: optionalText(MAX_LONG_TEXT),
});

/** Limits of the ad-click attribution values (longer values are dropped, never rejected). */
const MAX_CLICK_ID = 500;
const MAX_REFERRER = 1000;

/** One attribution value: a trimmed string within `max`; anything else is silently dropped. */
const softAttributionText = (max: number) =>
  z
    .preprocess(
      (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
      z.string().trim().max(max).optional()
    )
    .catch(undefined);

/**
 * Ad click ids and the external referrer of the session (`getLeadAttribution().extra`). The
 * `leads` collection has no columns for them, so they are stored in the `answers` JSON. Purely
 * informational: an invalid value (or the whole object) degrades to `undefined` and never fails
 * a lead.
 */
export const leadAttributionSchema = z
  .object({
    yclid: softAttributionText(MAX_CLICK_ID),
    gclid: softAttributionText(MAX_CLICK_ID),
    referrer: softAttributionText(MAX_REFERRER),
  })
  .partial()
  .optional()
  .catch(undefined);
export type LeadAttributionExtra = z.infer<typeof leadAttributionSchema>;

/** Optional, non-blocking answers shared by the full schema and the draft. */
const softAnswerFields = {
  customNote: optionalText(MAX_LONG_TEXT),
  tint: softEnum(TINT_COLOR_IDS),
  ral: optionalText(50),
  bendRadius: softNumber({ min: 0 }),
  positions: softNumber({ min: 0, integer: true }),
  area: softNumber({ min: 0 }),
  maxW: softNumber({ min: 0 }),
  maxH: softNumber({ min: 0 }),
  holeInnerEdge: softBoolean(),
  cutouts: softBoolean(),
  stamp: softEnum(QUIZ_STAMP_IDS),
  stampNote: optionalText(MAX_LONG_TEXT),
  file: fileSchema.optional(),
  noFile: softBoolean(),
  desiredDate: softDate,
  city: optionalText(100),
  cityOther: optionalText(100),
  packingNote: optionalText(MAX_LONG_TEXT),
  needDocs: softBoolean(),
};

/* ------------------------------------------------------------------------------------------ */
/* Draft                                                                                      */
/* ------------------------------------------------------------------------------------------ */

/**
 * Partial answers kept in `localStorage` (`QUIZ_DRAFT_KEY`) and used for live hints. Nothing is
 * required and nothing blocks: invalid or outdated values are dropped, never rejected.
 */
export const quizDraftSchema = z.object({
  type: softEnum(QUIZ_TYPE_IDS),
  thickness: softThickness,
  triplex: z
    .object({
      glass1: layerThickness.optional(),
      glass2: layerThickness.optional(),
      film: filmThickness.optional(),
    })
    .partial()
    .optional()
    .catch(undefined),
  kind: softEnum(QUIZ_KIND_IDS),
  ...softAnswerFields,
  file: fileSchema.optional().catch(undefined),
  edges: softEnumArray(QUIZ_EDGE_IDS).optional(),
  holes: z
    .object({
      has: softBoolean(),
      count: softNumber({ min: 0, integer: true }),
      diameters: diametersSchema,
    })
    .optional()
    .catch(undefined),
  decor: softEnumArray(QUIZ_DECOR_IDS).optional(),
  packing: softEnumArray(QUIZ_PACKING_IDS).optional(),
  contact: z
    .object({
      company: optionalText(),
      inn: optionalText(20),
      name: optionalText(),
      phone: optionalText(50),
      email: optionalText(254),
      role: softEnum(QUIZ_ROLE_IDS),
      comment: optionalText(MAX_LONG_TEXT),
    })
    .optional()
    .catch(undefined),
  consent: softBoolean(),
});
export type QuizAnswersDraft = z.infer<typeof quizDraftSchema>;

/* ------------------------------------------------------------------------------------------ */
/* Sanitize                                                                                   */
/* ------------------------------------------------------------------------------------------ */

/**
 * Drops answers that do not apply after the user changed an earlier choice: facet edges unless
 * `type === 'mirrors'`, `tint` unless tinted, `ral` unless painted, `bendRadius` unless bent,
 * `triplex` unless `type === 'triplex'`, `customNote` unless the thickness is «custom».
 */
export function sanitizeQuizAnswers<T extends QuizAnswersDraft>(answers: T): T {
  const result: T = { ...answers };
  if (result.edges) {
    result.edges = result.edges.filter((edge) => isEdgeAllowed(edge, result.type));
  }
  if (result.kind !== "tinted") delete result.tint;
  if (result.kind !== "painted") delete result.ral;
  if (result.kind !== "bent") delete result.bendRadius;
  if (result.type !== "triplex") delete result.triplex;
  if (result.thickness !== QUIZ_CUSTOM_THICKNESS) delete result.customNote;
  return result;
}

/* ------------------------------------------------------------------------------------------ */
/* Full answers                                                                               */
/* ------------------------------------------------------------------------------------------ */

/**
 * Complete answers sent with the quiz lead. Blocking user-facing checks are the contacts and the
 * consent; the remaining required parts (type, thickness, kind and their dependent fields) are
 * single-choice steps the quiz cannot skip. Soft fields never block: bad values are dropped.
 * Output is sanitized (see `sanitizeQuizAnswers`).
 */
export const quizAnswersSchema = z
  .object({
    type: z.enum(QUIZ_TYPE_IDS, { error: REQUIRED_MESSAGE }),
    thickness: thicknessSchema,
    triplex: z
      .object({ glass1: layerThickness, glass2: layerThickness, film: filmThickness })
      .optional(),
    kind: z.enum(QUIZ_KIND_IDS, { error: REQUIRED_MESSAGE }),
    ...softAnswerFields,
    edges: softEnumArray(QUIZ_EDGE_IDS),
    holes: holesSchema.default({ has: false }),
    decor: softEnumArray(QUIZ_DECOR_IDS),
    packing: softEnumArray(QUIZ_PACKING_IDS),
    contact: contactSchema,
    consent: consentField(),
    attribution: leadAttributionSchema,
  })
  .transform((answers) => sanitizeQuizAnswers(answers))
  .superRefine((answers, ctx) => {
    const require = (path: PropertyKey[]) =>
      ctx.addIssue({ code: "custom", message: REQUIRED_MESSAGE, path, input: undefined });
    if (answers.thickness === QUIZ_CUSTOM_THICKNESS && !answers.customNote) require(["customNote"]);
    if (answers.kind === "painted" && !answers.ral) require(["ral"]);
    if (answers.type === "triplex" && !answers.triplex) require(["triplex"]);
  });
export type QuizAnswers = z.infer<typeof quizAnswersSchema>;
