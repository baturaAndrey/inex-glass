/**
 * Cookie consent storage (client side, no React).
 *
 * The visitor's choice from the cookie banner: `all` (analytics allowed — Yandex Metrika may
 * load) or `necessary` (only what the site needs to work). Stored twice:
 * - `localStorage[CONSENT_STORAGE_KEY]` — primary source, syncs other tabs via `storage` events;
 * - cookie `CONSENT_COOKIE` — fallback when localStorage is blocked (private mode, policies)
 *   and readable by the server if ever needed.
 *
 * Every change is broadcast as `CustomEvent(CONSENT_EVENT, { detail: { value } })` on `window`.
 * This event is the single integration point for subscribers (Metrika, task-19).
 * All storage access is wrapped in try/catch: browsers may throw `SecurityError` on access.
 */

export type ConsentValue = "all" | "necessary";

export const CONSENT_STORAGE_KEY = "inex-consent-v1";
export const CONSENT_COOKIE = "inex_consent";
export const CONSENT_EVENT = "inex:consent";

/** Detail of the `inex:consent` event; `null` after `clearConsent()`. */
export type ConsentEventDetail = { value: ConsentValue | null };

/** One year, in seconds (cookie `Max-Age`). */
const CONSENT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

/** Narrows an untrusted stored string to a known consent value. */
export function parseConsent(raw: string | null | undefined): ConsentValue | null {
  return raw === "all" || raw === "necessary" ? raw : null;
}

function readStorage(): ConsentValue | null {
  try {
    return parseConsent(window.localStorage.getItem(CONSENT_STORAGE_KEY));
  } catch {
    return null;
  }
}

function readCookie(): ConsentValue | null {
  try {
    const prefix = `${CONSENT_COOKIE}=`;
    const entry = document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(prefix));
    return entry ? parseConsent(decodeURIComponent(entry.slice(prefix.length))) : null;
  } catch {
    return null;
  }
}

/** `value === null` deletes the cookie. */
function writeCookie(value: ConsentValue | null): void {
  try {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    const maxAge = value === null ? 0 : CONSENT_COOKIE_MAX_AGE;
    document.cookie = `${CONSENT_COOKIE}=${value ?? ""}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
  } catch {
    // Cookies blocked: localStorage (when available) still holds the choice.
  }
}

function writeStorage(value: ConsentValue | null): void {
  try {
    if (value === null) window.localStorage.removeItem(CONSENT_STORAGE_KEY);
    else window.localStorage.setItem(CONSENT_STORAGE_KEY, value);
  } catch {
    // localStorage unavailable: the cookie written alongside is the fallback.
  }
}

function broadcast(value: ConsentValue | null): void {
  try {
    window.dispatchEvent(new CustomEvent<ConsentEventDetail>(CONSENT_EVENT, { detail: { value } }));
  } catch {
    // CustomEvent unsupported (very old engines): subscribers re-read on next mount.
  }
}

/**
 * Current choice: localStorage first, then the cookie (localStorage blocked or wiped).
 * `null` — no choice yet (or on the server).
 */
export function getConsent(): ConsentValue | null {
  if (!isBrowser()) return null;
  return readStorage() ?? readCookie();
}

/** Saves the choice (localStorage + cookie for 1 year) and notifies subscribers. */
export function setConsent(value: ConsentValue): void {
  if (!isBrowser()) return;
  writeStorage(value);
  writeCookie(value);
  broadcast(value);
}

/** Forgets the choice (the banner shows again) and notifies subscribers with `null`. */
export function clearConsent(): void {
  if (!isBrowser()) return;
  writeStorage(null);
  writeCookie(null);
  broadcast(null);
}

/**
 * Subscribes to consent changes in this tab (`inex:consent`) and in other tabs (`storage`).
 * Returns the unsubscribe function. No-op on the server.
 */
export function onConsentChange(cb: (value: ConsentValue | null) => void): () => void {
  if (!isBrowser()) return () => {};

  const handleConsent = (event: Event) => {
    const detail = (event as CustomEvent<ConsentEventDetail | undefined>).detail;
    cb(detail ? parseConsent(detail.value) : getConsent());
  };
  // `key === null` means `localStorage.clear()` in another tab.
  const handleStorage = (event: StorageEvent) => {
    if (event.key === CONSENT_STORAGE_KEY || event.key === null) cb(getConsent());
  };

  window.addEventListener(CONSENT_EVENT, handleConsent);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(CONSENT_EVENT, handleConsent);
    window.removeEventListener("storage", handleStorage);
  };
}
