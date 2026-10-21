import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getEnv } from "@/lib/env";
import { robotsFor, TITLE_BRAND_SUFFIX } from "@/lib/seo/metadata";
import { NotFoundContent, NOT_FOUND_TITLE } from "./not-found-content";
import type { Metadata } from "next";

/**
 * Server-rendered 404 for STATIC / ISR routes inside `(site)` (the `[...slug]` catch-all, typed
 * routes of Wave 5): return `<NotFoundResponse />` from the page instead of calling `notFound()`.
 *
 * ROOT CAUSE: WHY NOT A PLAIN `notFound()`
 * ----------------------------------------
 * In Next 16.4 a `notFound()` thrown by a page outside any `<Suspense>` escapes the SSR shell:
 * React's server renderer (Fizz) has no error boundaries, so the `not-found.tsx` boundary
 * (`HTTPAccessFallbackBoundary`, a client class component) only works in the browser. Next's
 * shell-error recovery then sends its error document — `<html id="__next_error__">` with an
 * EMPTY body — and the 404 UI appears only after hydration (`app-render.js`, «errorRecovery»).
 * It is not caused by the two root layouts / route groups / `global-not-found`: a fresh
 * single-layout Next 16.4.2 app behaves the same. Unmatched URLs are not affected (they render
 * `global-not-found.tsx` as a regular route).
 *
 * THE FIX
 * -------
 * The 404 body is ordinary page content (server HTML inside the site layout, with header and
 * footer), and `notFound()` is thrown by an empty component inside a `<Suspense>` boundary next
 * to it. Fizz handles an error inside a Suspense boundary by leaving just that boundary to the
 * client, so the shell survives. During a PRERENDER (build / ISR render — how the catch-all is
 * served: `generateStaticParams` + `revalidate`) Next's HTML error handler sees the HTTP-fallback
 * error and stores the response with **status 404** and `<meta name="robots" content="noindex">`
 * — Next documents this case in app-render («an HTTP access fallback … thrown inside a Suspense
 * boundary … preserving the prerendered content outside the boundary»). In the browser the
 * boundary re-throws on hydration and `(site)/not-found.tsx` (the same `NotFoundContent`) takes
 * over, so client navigations behave as before.
 *
 * LIMITATION: a DYNAMIC render (`next dev`, or a route using `headers()` / `cookies()` /
 * `connection()`) does not update the status for errors inside Suspense, so it answers 200 with
 * the same body + noindex. That is why the site layout must stay static/ISR, and why the
 * `e2e/not-found-ssr.spec.ts` status check runs against a production build. Dynamic routes should
 * keep a bare `notFound()` (404 status, client-rendered body).
 *
 * Pair it with `NOT_FOUND_METADATA` in the page's `generateMetadata`.
 */
export function NotFoundResponse() {
  return (
    <>
      <NotFoundContent />
      <Suspense fallback={null}>
        <NotFoundSignal />
      </Suspense>
    </>
  );
}

/** Raises the 404 for the response (see above). Renders nothing. */
function NotFoundSignal(): never {
  notFound();
}

/**
 * Metadata of an unknown URL (pair with `<NotFoundResponse />`).
 *
 * Production: no `robots` here — Next itself adds `<meta name="robots" content="noindex">` to
 * the `<head>` of every 404 render, so an explicit tag would only duplicate it.
 * Staging / dev: `robotsFor` (`noindex, nofollow`) like every other page of those stands.
 *
 * `robots` is a getter: `SITE_ENV` is read at request time (pages return this object from
 * `generateMetadata`), never at module evaluation during `next build`.
 */
export const NOT_FOUND_METADATA: Metadata = {
  title: { absolute: `${NOT_FOUND_TITLE}${TITLE_BRAND_SUFFIX}` },
  get robots(): Metadata["robots"] {
    return getEnv().SITE_ENV === "production" ? undefined : robotsFor(true);
  },
};
