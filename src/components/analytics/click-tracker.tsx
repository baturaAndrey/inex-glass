"use client";

import { useEffect } from "react";
import { goalForHref } from "./goal-for-href";
import { isGoalName, isTrackablePath, reachGoal } from "./reach-goal";

/** Metrika class that excludes a link from `trackLinks` reports. */
const NO_TRACK_LINK_CLASS = "ym-disable-tracklink";
const DEFAULT_PLACE = "link";
const MIDDLE_BUTTON = 1;

/** Marks same-origin links to untrackable pages (`/zakaz/<token>/`) so `trackLinks` skips them. */
function protectUntrackableLink(link: HTMLAnchorElement): void {
  try {
    const url = new URL(link.href, window.location.href);
    if (url.origin === window.location.origin && !isTrackablePath(url.pathname)) {
      link.classList.add(NO_TRACK_LINK_CLASS);
    }
  } catch {
    // Unparsable href: nothing Metrika could report either.
  }
}

function handleActivation(event: MouseEvent): void {
  // `auxclick` fires for every non-primary button; only the middle one opens links.
  if (event.type === "auxclick" && event.button !== MIDDLE_BUTTON) return;
  const target = event.target;
  if (!(target instanceof Element)) return;

  const explicit = target.closest<HTMLElement>("[data-goal]")?.dataset.goal;
  const explicitGoal = isGoalName(explicit) ? explicit : null;
  if (explicitGoal) reachGoal(explicitGoal);

  const link = target.closest<HTMLAnchorElement>("a[href]");
  if (!link) return;
  protectUntrackableLink(link);

  const linkGoal = goalForHref(link.getAttribute("href"));
  if (!linkGoal || linkGoal === explicitGoal) return;
  // Never send the phone number / address itself: only where the link was clicked.
  reachGoal(linkGoal, { place: link.dataset.goalPlace || DEFAULT_PLACE });
}

/**
 * Global delegated click tracking: `tel:` → `click_phone`, `mailto:` → `click_email`,
 * `data-goal="<GoalName>"` on any element → that goal. One capture-phase listener on
 * `document` covers links rendered later (header, footer, modals). Ctrl/Cmd clicks arrive as
 * `click`, middle-button clicks as `auxclick`. Never calls `preventDefault`. Goals are
 * dropped by `reachGoal` without consent/counter, so this is safe to mount everywhere.
 */
export function ClickTracker() {
  useEffect(() => {
    const options = { capture: true } as const;
    document.addEventListener("click", handleActivation, options);
    document.addEventListener("auxclick", handleActivation, options);
    return () => {
      document.removeEventListener("click", handleActivation, options);
      document.removeEventListener("auxclick", handleActivation, options);
    };
  }, []);

  return null;
}
