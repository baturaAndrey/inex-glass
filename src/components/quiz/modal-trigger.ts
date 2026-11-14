/**
 * DOM helpers shared by the quiz modal shell and its loading skeleton (client only; every
 * function is a no-op on the server).
 *
 * The skeleton (`@modal/(.)raschet-stoimosti/loading.tsx`, task 39) is committed BEFORE the
 * modal, in the same commit that unmounts the phone sticky CTA (hidden on the quiz path). The
 * modal can therefore no longer see the link that opened it, so the skeleton remembers it
 * (`rememberPendingTrigger`) and the modal takes it over (`takePendingTrigger`).
 */

/** A page-mode quiz already on screen (the modal was opened from `/raschet-stoimosti/` itself). */
export const PAGE_QUIZ_SELECTOR = '[data-slot="quiz"][data-variant="page"]';

/** A remembered trigger older than this belongs to an abandoned navigation. */
const PENDING_TRIGGER_TTL_MS = 10_000;

export interface QuizModalTrigger {
  element: HTMLElement;
  href: string | null;
}

/** Whether the page under the modal is the quiz page (client only; `null` on the server). */
export function pageQuizOnScreen(): HTMLElement | null {
  return typeof document === "undefined"
    ? null
    : document.querySelector<HTMLElement>(PAGE_QUIZ_SELECTOR);
}

/** The focused element outside any dialog (the link that opened the modal), with its `href`. */
export function activeTrigger(): QuizModalTrigger | null {
  if (typeof document === "undefined") return null;
  const active = document.activeElement;
  if (!(active instanceof HTMLElement) || active === document.body) return null;
  if (active.closest("[role=dialog]")) return null;
  return { element: active, href: active.getAttribute("href") };
}

let pending: { trigger: QuizModalTrigger; at: number } | null = null;

/** Called by the skeleton while the previous DOM (and focus) is still in place. */
export function rememberPendingTrigger(): void {
  const trigger = activeTrigger();
  pending = trigger ? { trigger, at: Date.now() } : null;
}

/**
 * The trigger remembered by the skeleton of this navigation. Not consumed on read: a concurrent
 * render may be discarded and retried (the state initialiser runs again); the next skeleton
 * overwrites it and the TTL retires it.
 */
export function takePendingTrigger(): QuizModalTrigger | null {
  return pending && Date.now() - pending.at < PENDING_TRIGGER_TTL_MS ? pending.trigger : null;
}
