"use client";

import { useSyncExternalStore } from "react";
import { getConsent, onConsentChange, type ConsentValue } from "./consent";

function subscribe(onStoreChange: () => void): () => void {
  return onConsentChange(() => onStoreChange());
}

/** Server render and hydration: the choice is unknown (it lives only in the browser). */
function getServerSnapshot(): undefined {
  return undefined;
}

/**
 * Visitor's cookie choice.
 * - `undefined` — not known yet (server render and the hydration pass): render nothing
 *   consent-dependent, otherwise the markup would differ from the server and break hydration;
 * - `null` — no choice made (show the banner);
 * - `'all' | 'necessary'` — the saved choice. Updates live on `inex:consent` and other tabs.
 */
export function useConsent(): ConsentValue | null | undefined {
  return useSyncExternalStore<ConsentValue | null | undefined>(
    subscribe,
    getConsent,
    getServerSnapshot
  );
}
