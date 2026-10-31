import { isTrackablePath } from "./reach-goal";

/**
 * Session attribution: UTM tags, ad click ids and the entry page, for the lead card
 * (end-to-end analytics «заявка → КП → договор», ТЗ §6.1/§10).
 *
 * Technical request data, not analytics cookies: works regardless of the cookie choice and
 * lives only in `sessionStorage` (cleared with the tab). Captured once per page load by
 * `<AttributionCapture/>` (mounted globally through `<Metrika/>`); the quiz and forms read it
 * through the adapter `src/lib/client/attribution.ts` (task-20) and never capture themselves.
 */

export interface Attribution {
  utm: { source?: string; medium?: string; campaign?: string; term?: string; content?: string };
  yclid?: string;
  gclid?: string;
  /** Path of the first page of the session (pathname + search without utm/click-id params). */
  landing: string;
  /** `document.referrer` of the first page, only when external. */
  referrer?: string;
  /** ISO timestamp of the first capture. */
  capturedAt: string;
}

export const ATTRIBUTION_STORAGE_KEY = "inex-attribution-v1";

const UTM_KEYS = ["source", "medium", "campaign", "term", "content"] as const;
const CLICK_ID_KEYS = ["yclid", "gclid"] as const;

/** Same limits as the lead schema (`lead-schemas.ts`): longer values would fail validation. */
const MAX_VALUE_LENGTH = 200;
const MAX_PATH_LENGTH = 500;

/** Shown instead of order-page paths: `/zakaz/<token>/` must not leak into the CRM. */
const MASKED_LANDING = "/zakaz/";

function clean(value: string | null, max = MAX_VALUE_LENGTH): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

function isAttributionParam(key: string): boolean {
  const lower = key.toLowerCase();
  return lower.startsWith("utm_") || (CLICK_ID_KEYS as readonly string[]).includes(lower);
}

function readUtm(params: URLSearchParams): Attribution["utm"] | null {
  const utm: Attribution["utm"] = {};
  let found = false;
  for (const key of UTM_KEYS) {
    const value = clean(params.get(`utm_${key}`));
    if (value) {
      utm[key] = value;
      found = true;
    }
  }
  return found ? utm : null;
}

function landingOf(url: URL): string {
  if (!isTrackablePath(url.pathname)) return MASKED_LANDING;
  const kept = new URLSearchParams();
  url.searchParams.forEach((value, key) => {
    if (!isAttributionParam(key)) kept.append(key, value);
  });
  const search = kept.toString();
  return `${url.pathname}${search ? `?${search}` : ""}`.slice(0, MAX_PATH_LENGTH);
}

function externalReferrer(referrer: string, siteOrigin: string): string | undefined {
  if (!referrer) return undefined;
  try {
    return new URL(referrer).origin === siteOrigin ? undefined : clean(referrer, MAX_PATH_LENGTH);
  } catch {
    return undefined;
  }
}

/**
 * Pure merge step (exported for tests): the first visit of the session fixes `landing`,
 * `referrer` and `capturedAt`; later pages only overwrite the UTM group when they carry
 * `utm_*` (last tags win — the whole group is replaced so campaigns do not mix) and the click
 * ids when present. Returns `existing` unchanged (same reference) when there is nothing new.
 */
export function mergeAttribution(
  existing: Attribution | null,
  href: string,
  referrer: string,
  now: Date
): Attribution {
  const url = new URL(href);
  const utm = readUtm(url.searchParams);
  const clickIds: Pick<Attribution, "yclid" | "gclid"> = {};
  for (const key of CLICK_ID_KEYS) {
    const value = clean(url.searchParams.get(key));
    if (value) clickIds[key] = value;
  }

  if (!existing) {
    const external = externalReferrer(referrer, url.origin);
    return {
      utm: utm ?? {},
      ...clickIds,
      landing: landingOf(url),
      ...(external ? { referrer: external } : {}),
      capturedAt: now.toISOString(),
    };
  }
  if (!utm && Object.keys(clickIds).length === 0) return existing;
  return { ...existing, ...(utm ? { utm } : {}), ...clickIds };
}

function isAttribution(value: unknown): value is Attribution {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.landing === "string" &&
    typeof record.capturedAt === "string" &&
    typeof record.utm === "object" &&
    record.utm !== null
  );
}

/** Saved attribution of this session, or `null` (none yet, server, storage blocked/corrupt). */
export function getAttribution(): Attribution | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isAttribution(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Captures attribution of the current page load. Call on every load: stores the first page
 * of the session and refreshes UTM tags when the URL has new ones. Never throws (storage may
 * be blocked in private mode or by site-data policies — then attribution is simply absent).
 */
export function captureAttribution(): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getAttribution();
    const next = mergeAttribution(
      existing,
      window.location.href,
      typeof document === "undefined" ? "" : document.referrer,
      new Date()
    );
    if (next !== existing) {
      window.sessionStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(next));
    }
  } catch {
    // sessionStorage unavailable or quota exceeded: leads go without attribution.
  }
}
