import { getConsent } from "@/lib/consent";
import { isTrackablePath } from "@/lib/domain/quiz-src";

// Shared with server code (quiz `src` masking); re-exported for the analytics modules.
export { isTrackablePath };

/**
 * Yandex Metrika goals (ТЗ §10, `docs/inex/16-tz-razrabotka.md`). Goal ids must match the
 * goals configured in the Metrika counter, so the list is closed: callers use `GoalName`.
 */
export const GOALS = [
  /** Quiz opened; params: `{ entry: <entry page> }`. */
  "quiz_start",
  /** Quiz step N completed. */
  "quiz_step_1",
  "quiz_step_2",
  "quiz_step_3",
  "quiz_step_4",
  "quiz_step_5",
  "quiz_step_6",
  "quiz_step_7",
  /** Quiz submitted; params: `{ type, flags }`. */
  "quiz_submit",
  /** Drawing file uploaded. */
  "file_upload",
  /** Any other form submitted; params: `{ form: <formKey> }`. */
  "form_submit",
  /** Calculators used. */
  "calc_weight",
  "calc_holes",
  /** Calculator → quiz transition. */
  "calc_to_quiz",
  "click_phone",
  "click_email",
] as const;

export type GoalName = (typeof GOALS)[number];

declare global {
  interface Window {
    /** Metrika command queue / API (defined by the loader in `metrika-client.tsx`). */
    ym?: (...args: unknown[]) => void;
    /** Counter id, set only after `ym(id, 'init')` ran: "the counter accepts goals". */
    __INEX_YM_ID__?: number;
  }
}

const GOAL_SET: ReadonlySet<string> = new Set(GOALS);

/** Narrows untrusted strings (e.g. a `data-goal` attribute) to a known goal. */
export function isGoalName(value: unknown): value is GoalName {
  return typeof value === "string" && GOAL_SET.has(value);
}

/**
 * The counter is initialized and the visitor accepted analytics. `ym` may still be the
 * snippet's queue (tag.js loading) — calls are buffered and replayed by tag.js.
 */
export function isMetrikaReady(): boolean {
  if (typeof window === "undefined") return false;
  return (
    getConsent() === "all" &&
    typeof window.__INEX_YM_ID__ === "number" &&
    typeof window.ym === "function"
  );
}

/**
 * Sends a Metrika goal. Safe no-op on the server, without consent (`'necessary'`, `null`
 * after `clearConsent()`), without a counter (dev/staging, empty id) or if `ym` throws:
 * analytics must never break the UI.
 */
export function reachGoal(name: GoalName, params?: Record<string, unknown>): void {
  if (!isMetrikaReady()) return;
  try {
    window.ym!(window.__INEX_YM_ID__, "reachGoal", name, params);
  } catch {
    // Broken/blocked tag.js: swallow, a lost goal is not worth a crash.
  }
}
