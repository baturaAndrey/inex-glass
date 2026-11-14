import { summarizeAnswers } from "@/emails/format-answers";
import { formatNumber } from "@/lib/domain/format";

/**
 * Pure helpers of the lead card (`lead-summary-view.tsx`): readable rows of the raw form answers
 * and small text normalizers.
 */

export type AnswerRow = { label: string; value: string | null };

/** Service keys of raw form payloads never shown to the manager. */
export const HIDDEN_ANSWER_KEYS = /token|consent|captcha|honeypot|hp_|upload|files?$/i;

/** Trimmed non-empty string, otherwise `null`. */
export const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() !== "" ? value.trim() : null;

/** Readable value of a raw answer (primitives, lists, small objects as compact JSON). */
export function answerValue(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "boolean") return value ? "да" : "нет";
  if (typeof value === "number") return Number.isFinite(value) ? formatNumber(value) : null;
  if (typeof value === "string") return text(value);
  if (Array.isArray(value)) {
    const parts = value.map(answerValue).filter((part): part is string => part !== null);
    return parts.length > 0 ? parts.join(", ") : null;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

/** Quiz answers in the e-mail wording; any other payload as key/value rows (empty ones dropped). */
export function answerRows(answers: unknown): AnswerRow[] {
  const known = summarizeAnswers(answers);
  if (known.length > 0) return known;
  if (typeof answers !== "object" || answers === null || Array.isArray(answers)) return [];
  return Object.entries(answers as Record<string, unknown>)
    .filter(([key]) => !HIDDEN_ANSWER_KEYS.test(key))
    .map(([key, value]) => ({ label: key, value: answerValue(value) }))
    .filter((row) => row.value !== null);
}

/** Upper-case extension of a file name for the file tile («DWG», «PDF»), at most 4 characters. */
export function fileExtension(name: string): string | null {
  const match = /\.([a-z0-9]{1,4})$/i.exec(name.trim());
  return match?.[1]?.toUpperCase() ?? null;
}
