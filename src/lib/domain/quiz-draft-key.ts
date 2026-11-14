/**
 * Storage contract of the quiz draft, without any schema code.
 *
 * Kept apart from `./quiz-schema` (zod) on purpose: the header «Мой расчёт» indicator only needs
 * to know whether a draft exists, and importing the schema module would pull zod (~33 KB gzip)
 * into the JS of every page (task 39, JS budget).
 */

/** `localStorage` key of the quiz draft; bump the version when the draft shape changes. */
export const QUIZ_DRAFT_KEY = "inex-quiz-draft-v1";

/** Fired on `window` after the draft was saved or cleared in this tab. */
export const QUIZ_DRAFT_EVENT = "inex:quiz-draft";
