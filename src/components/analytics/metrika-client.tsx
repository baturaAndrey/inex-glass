"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";
import { useConsent } from "@/lib/use-consent";
import { isTrackablePath } from "./reach-goal";

export const METRIKA_TAG_URL = "https://mc.yandex.ru/metrika/tag.js";

interface MetrikaClientProps {
  counterId: number;
  /** `site-settings.analytics.webvisor`. */
  webvisor: boolean;
}

/**
 * Per-document counter state. Module scope (not React state) on purpose: it must survive
 * remounts (StrictMode double effects, consent toggles) — `ym('init')` runs once per document
 * and the same URL must never be hit twice.
 */
const counter = { initialized: false, lastHitUrl: null as string | null };

/**
 * The official Metrika snippet's queue: `ym(...)` calls made before tag.js arrives are
 * buffered in `ym.a` and replayed by tag.js. tag.js itself is loaded by `next/script`.
 */
function defineQueue(): void {
  if (typeof window.ym === "function") return;
  const queue = (...args: unknown[]) => {
    (queue.a = queue.a ?? []).push(args);
  };
  queue.a = undefined as unknown[][] | undefined;
  queue.l = Date.now();
  window.ym = queue;
}

function initCounter(counterId: number, webvisor: boolean, url: string): void {
  defineQueue();
  // `defer: true` — the first hit is sent manually below and every SPA navigation sends its
  // own hit (`MetrikaPageview`), so page views are counted exactly once.
  window.ym!(counterId, "init", {
    clickmap: true,
    trackLinks: true,
    accurateTrackBounce: true,
    webvisor,
    defer: true,
  });
  window.__INEX_YM_ID__ = counterId;
  window.ym!(counterId, "hit", url);
  counter.initialized = true;
  counter.lastHitUrl = url;
}

/**
 * Initializes the counter on the first trackable page and sends one `hit` per client
 * navigation. Never initializes on, and never hits, untrackable paths (`/zakaz/<token>/`).
 */
function MetrikaPageview({ counterId, webvisor }: MetrikaClientProps) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const trackable = isTrackablePath(pathname);

  useEffect(() => {
    const url = window.location.href;

    if (!trackable) {
      // Webvisor cannot be stopped at runtime (only `webvisor:false` at init), so if a client
      // navigation reaches the order page with a live counter, reload: the fresh document
      // never initializes Metrika on `/zakaz/*`, and no hit carries the token.
      if (counter.initialized) window.location.reload();
      return;
    }

    if (!counter.initialized) {
      initCounter(counterId, webvisor, url);
      return;
    }
    if (url === counter.lastHitUrl) return;

    const referrer = counter.lastHitUrl ?? undefined;
    counter.lastHitUrl = url;
    try {
      window.ym?.(counterId, "hit", url, { title: document.title, referer: referrer });
    } catch {
      // Analytics must never break navigation.
    }
  }, [counterId, webvisor, trackable, pathname, search]);

  // Rendered only once the counter exists or is about to be created on this page:
  // tag.js is never requested on `/zakaz/*` full loads. `next/script` dedupes by `id`.
  return trackable || counter.initialized ? (
    <Script id="ym-init" src={METRIKA_TAG_URL} strategy="afterInteractive" />
  ) : null;
}

/**
 * Loads Yandex Metrika (with Webvisor) only after the visitor clicked «Принять»
 * (`consent === 'all'`). `undefined` (hydration), `null` (no choice / `clearConsent()`) and
 * `'necessary'` load nothing: no `ym`, no requests or preconnects to mc.yandex.ru.
 *
 * A later «Принять» (event `inex:consent`) initializes the counter on the spot. Revoking
 * consent cannot unload tag.js: hits and goals stop (this subtree unmounts, `reachGoal`
 * checks consent), and the script is gone after the visitor's next page reload.
 */
export function MetrikaClient(props: MetrikaClientProps) {
  const consent = useConsent();
  if (consent !== "all") return null;

  return (
    <Suspense fallback={null}>
      <MetrikaPageview {...props} />
    </Suspense>
  );
}
