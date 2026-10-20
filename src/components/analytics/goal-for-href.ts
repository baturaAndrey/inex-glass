import type { GoalName } from "./reach-goal";

/**
 * Goal for a link `href`: `tel:` → `click_phone`, `mailto:` → `click_email`, otherwise `null`.
 * Case-insensitive; leading whitespace is ignored (browsers ignore it when navigating too).
 */
export function goalForHref(href: string | null | undefined): GoalName | null {
  if (!href) return null;
  const scheme = href.trimStart().toLowerCase();
  if (scheme.startsWith("tel:")) return "click_phone";
  if (scheme.startsWith("mailto:")) return "click_email";
  return null;
}
