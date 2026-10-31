/**
 * Paths that carry secrets and the masking of the quiz `src` parameter. Pure (no React / Next /
 * browser APIs), so both server components (`QuizLink`, `prefillToQuizParams`) and client code
 * (`CalcLink`, Metrika) share one rule.
 */

/** Path prefixes that must never reach Yandex: `/zakaz/<token>/` carries a secret token. */
const UNTRACKABLE_PREFIXES = ["/zakaz", "/admin"] as const;

/**
 * `false` for the order page (`/zakaz/<token>/`, task-33) and the admin: no counter init,
 * no hits there. Matches whole path segments only (`/zakazy` stays trackable).
 */
export function isTrackablePath(pathname: string | null | undefined): boolean {
  if (!pathname) return true;
  const path = pathname.toLowerCase();
  return !UNTRACKABLE_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

/**
 * The `src` value for the quiz link. Untrackable paths (`/zakaz/<token>/`, `/admin/…`) carry
 * secrets: the quiz page would report its URL to Metrika and store `src` in the lead context.
 * Such paths collapse to their first segment (`/zakaz/<token>/` → `/zakaz/`), so the origin
 * section is still known while the token never leaves the order page.
 */
export function quizSrc(pathname: string): string {
  if (isTrackablePath(pathname)) return pathname;
  const firstSegment = pathname.split("/").find((segment) => segment !== "");
  return firstSegment ? `/${firstSegment.toLowerCase()}/` : "/";
}
