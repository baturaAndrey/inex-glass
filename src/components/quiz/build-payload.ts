import type { LeadAttribution } from "@/lib/client/attribution";
import { leadSubmitSchema, REQUIRED_MESSAGE, sanitizeQuizAnswers } from "@/lib/domain";
import type { QuizAnswersDraft } from "@/lib/domain";
import { triplexThickness } from "./derive";
import type { QuizErrorField, QuizFieldErrors, QuizStep, QuizUiState } from "./types";

/**
 * Body of `POST /api/forms/lead/` for the quiz (`leadSubmitSchema`, `formType: 'quiz'`) and its
 * client-side validation. Contacts live in `answers.contact`; the phone is sent as typed (the
 * schema normalizes it). Flags and `sourceLabel` are computed by the server.
 */

export interface QuizPayloadOptions {
  formToken: string;
  attribution: LeadAttribution;
  /** Value of the hidden `company_website` field (must stay empty for humans). */
  honeypot: string;
}

export type QuizLeadPayload = Record<string, unknown> & {
  formType: "quiz";
  answers: Record<string, unknown>;
};

const trimmed = (value: string | undefined): string | undefined => {
  const text = value?.trim();
  return text ? text : undefined;
};

/** Drops `undefined` values (they would vanish in JSON anyway; keeps tests readable). */
function defined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}

/** Full quiz answers for the lead from the draft answers. */
export function buildQuizAnswers(
  answers: QuizAnswersDraft,
  extra: LeadAttribution["extra"] = undefined
): Record<string, unknown> {
  const a = sanitizeQuizAnswers(answers);
  const contact = a.contact ?? {};
  const holes = a.holes?.has
    ? defined({ has: true, count: a.holes.count, diameters: a.holes.diameters })
    : { has: false };
  const packing = a.packing ?? [];

  return defined({
    type: a.type,
    thickness: a.type === "triplex" ? triplexThickness(a) : a.thickness,
    triplex: a.triplex,
    kind: a.kind,
    customNote: trimmed(a.customNote),
    tint: a.tint,
    ral: trimmed(a.ral),
    bendRadius: a.bendRadius,
    positions: a.positions,
    area: a.area,
    maxW: a.maxW,
    maxH: a.maxH,
    edges: a.edges ?? [],
    holes,
    holeInnerEdge: a.holeInnerEdge,
    cutouts: a.cutouts,
    decor: a.decor ?? [],
    stamp: a.stamp,
    stampNote: a.stamp === "custom" ? trimmed(a.stampNote) : undefined,
    file: a.file,
    noFile: a.file ? undefined : a.noFile,
    desiredDate: a.desiredDate,
    city: a.city,
    cityOther: trimmed(a.cityOther),
    packing,
    packingNote: packing.includes("carrier") ? trimmed(a.packingNote) : undefined,
    needDocs: a.needDocs,
    contact: defined({
      company: contact.company ?? "",
      inn: trimmed(contact.inn),
      name: contact.name ?? "",
      phone: contact.phone ?? "",
      email: trimmed(contact.email),
      role: contact.role,
      comment: trimmed(contact.comment),
    }),
    consent: a.consent === true,
    // Ad click ids / referrer: no lead columns exist for them, so they ride in the answers JSON.
    attribution: extra && Object.keys(extra).length > 0 ? extra : undefined,
  });
}

export function buildQuizLeadPayload(
  state: Pick<QuizUiState, "answers">,
  { formToken, attribution, honeypot }: QuizPayloadOptions
): QuizLeadPayload {
  const answers = buildQuizAnswers(state.answers, attribution.extra);
  const file = state.answers.file;
  return defined({
    formType: "quiz" as const,
    entryPage: attribution.entryPage,
    utm: Object.keys(attribution.utm).length > 0 ? attribution.utm : undefined,
    metrikaClientId: attribution.metrikaClientId,
    consent: state.answers.consent === true,
    formToken,
    company_website: honeypot,
    uploadTokens: file ? [file.uploadToken] : undefined,
    answers,
  });
}

/* ------------------------------------------------------------------------------------------ */
/* Validation                                                                                  */
/* ------------------------------------------------------------------------------------------ */

/** Step of each blocking field. */
export const ERROR_FIELD_STEP: Record<QuizErrorField, QuizStep> = {
  type: 1,
  thickness: 2,
  triplex: 2,
  customNote: 2,
  kind: 2,
  ral: 2,
  company: 7,
  inn: 7,
  name: 7,
  phone: 7,
  email: 7,
  consent: 7,
};

/** Focus order of the fields (top to bottom within a step). */
export const ERROR_FIELD_ORDER: readonly QuizErrorField[] = [
  "type",
  "thickness",
  "triplex",
  "customNote",
  "kind",
  "ral",
  "company",
  "inn",
  "name",
  "phone",
  "email",
  "consent",
];

const CHOICE_FIELDS: ReadonlySet<QuizErrorField> = new Set([
  "type",
  "thickness",
  "kind",
  "triplex",
]);
const CONTACT_FIELDS: ReadonlySet<string> = new Set(["company", "inn", "name", "phone", "email"]);
const ANSWER_FIELDS: ReadonlySet<string> = new Set([
  "type",
  "thickness",
  "kind",
  "triplex",
  "customNote",
  "ral",
]);

/** Maps a schema issue path to a quiz field, or `null` for transport fields (token, …). */
function fieldOfPath(path: readonly PropertyKey[]): QuizErrorField | null {
  const [root, second, third] = path.map(String);
  if (root === "consent") return "consent";
  if (root !== "answers") return null;
  if (second === "consent") return "consent";
  if (second === "contact" && third !== undefined && CONTACT_FIELDS.has(third)) {
    return third as QuizErrorField;
  }
  if (second !== undefined && ANSWER_FIELDS.has(second)) return second as QuizErrorField;
  return null;
}

export type QuizValidation =
  | { ok: true }
  | {
      ok: false;
      errors: QuizFieldErrors;
      /** First invalid field in focus order (`null` when only transport fields failed). */
      first: QuizErrorField | null;
      /** A non-user field failed (missing form token, …): show the generic submit error. */
      transport: boolean;
    };

/**
 * Validates the payload with the server schema. Contact and consent messages are the domain
 * texts (teksty/05); unanswered choices get the generic «Заполните поле…» message.
 */
export function validateQuizPayload(payload: QuizLeadPayload): QuizValidation {
  const result = leadSubmitSchema.safeParse(payload);
  if (result.success) return { ok: true };

  const errors: QuizFieldErrors = {};
  let transport = false;
  // The single-glass grid is hidden for triplex: a missing thickness means missing layers.
  const isTriplex = payload.answers.type === "triplex";
  for (const issue of result.error.issues) {
    const mapped = fieldOfPath(issue.path);
    const field = isTriplex && mapped === "thickness" ? "triplex" : mapped;
    if (field === null) {
      transport = true;
      continue;
    }
    if (errors[field]) continue;
    errors[field] = CHOICE_FIELDS.has(field) || !issue.message ? REQUIRED_MESSAGE : issue.message;
  }
  const first = ERROR_FIELD_ORDER.find((field) => errors[field] !== undefined) ?? null;
  return { ok: false, errors, first, transport };
}

/**
 * Field errors of a server `validation` response (`{ 'answers.contact.phone': '…' }`) mapped to
 * quiz fields; upload re-checks (`uploadTokens.0`, `answers.file`) and other paths are skipped.
 */
export function fieldErrorsFromServer(fields: Record<string, string>): {
  errors: QuizFieldErrors;
  first: QuizErrorField | null;
} {
  const errors: QuizFieldErrors = {};
  for (const [path, message] of Object.entries(fields)) {
    const field = fieldOfPath(path.split("."));
    if (field !== null && errors[field] === undefined) {
      errors[field] = CHOICE_FIELDS.has(field) || !message ? REQUIRED_MESSAGE : message;
    }
  }
  return { errors, first: ERROR_FIELD_ORDER.find((field) => errors[field] !== undefined) ?? null };
}
