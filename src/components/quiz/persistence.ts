import { QUIZ_DRAFT_EVENT } from "@/lib/domain/quiz-draft-key";
import { QUIZ_DRAFT_KEY, quizDraftSchema } from "@/lib/domain/quiz-schema";
import type { QuizAnswersDraft } from "@/lib/domain/quiz-schema";
import { EMPTY_RAW, isQuizStep } from "./state";
import type { QuizRawFields, QuizStep } from "./types";

/**
 * Quiz draft in `localStorage[QUIZ_DRAFT_KEY]` (`{ v: 1, step, answers, raw, savedAt }`).
 * Never stored: the consent (always re-asked) and the uploaded file (short-lived token).
 * Every storage access is guarded: without `localStorage` the quiz simply has no draft.
 * Each save/clear dispatches `QUIZ_DRAFT_EVENT` on `window` so same-tab subscribers (the
 * «Мой расчёт» indicator) update; other tabs get the native `storage` event.
 */

export const QUIZ_DRAFT_VERSION = 1;
/** Fired on `window` after the draft was saved or cleared in this tab (see `quiz-draft-key`). */
export { QUIZ_DRAFT_EVENT };

export interface QuizDraftRecord {
  v: typeof QUIZ_DRAFT_VERSION;
  step: QuizStep;
  answers: QuizAnswersDraft;
  raw: QuizRawFields;
  savedAt: string;
}

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function notify(): void {
  try {
    window.dispatchEvent(new Event(QUIZ_DRAFT_EVENT));
  } catch {
    // No window / Event constructor (tests, very old browsers): nothing to notify.
  }
}

/** Removes the fields that must never be persisted. */
function persistable(answers: QuizAnswersDraft): QuizAnswersDraft {
  const { consent: _consent, file: _file, ...rest } = answers;
  return rest;
}

function parseRaw(value: unknown): QuizRawFields {
  const raw: QuizRawFields = { ...EMPTY_RAW };
  if (typeof value !== "object" || value === null) return raw;
  const record = value as Record<string, unknown>;
  for (const key of Object.keys(EMPTY_RAW) as (keyof QuizRawFields)[]) {
    const item = record[key];
    if (typeof item === "string") raw[key] = item.slice(0, 500);
  }
  return raw;
}

/** The saved draft, or `null` when absent, unreadable, of another version or broken. */
export function loadDraft(): QuizDraftRecord | null {
  const store = storage();
  if (!store) return null;
  try {
    const text = store.getItem(QUIZ_DRAFT_KEY);
    if (!text) return null;
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== "object" || parsed === null) return null;
    const record = parsed as Record<string, unknown>;
    if (record.v !== QUIZ_DRAFT_VERSION || !isQuizStep(record.step)) return null;
    const answers = quizDraftSchema.safeParse(record.answers);
    if (!answers.success) return null;
    return {
      v: QUIZ_DRAFT_VERSION,
      step: record.step,
      answers: persistable(answers.data),
      raw: parseRaw(record.raw),
      savedAt: typeof record.savedAt === "string" ? record.savedAt : "",
    };
  } catch {
    return null;
  }
}

/** Whether a valid draft exists. */
export function hasDraft(): boolean {
  return loadDraft() !== null;
}

/** Saves the draft (without consent and file). Silently does nothing when storage fails. */
export function saveDraft(
  draft: { step: QuizStep; answers: QuizAnswersDraft; raw: QuizRawFields },
  now: Date = new Date()
): void {
  const store = storage();
  if (!store) return;
  const record: QuizDraftRecord = {
    v: QUIZ_DRAFT_VERSION,
    step: draft.step,
    answers: persistable(draft.answers),
    raw: draft.raw,
    savedAt: now.toISOString(),
  };
  try {
    store.setItem(QUIZ_DRAFT_KEY, JSON.stringify(record));
  } catch {
    // Quota exceeded / blocked storage: the quiz works without a draft.
    return;
  }
  notify();
}

export function clearDraft(): void {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(QUIZ_DRAFT_KEY);
  } catch {
    return;
  }
  notify();
}
