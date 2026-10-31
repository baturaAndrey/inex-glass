import { getAttribution } from "@/components/analytics/attribution";
import { getClientId } from "@/components/analytics/client-id";

/**
 * Lead attribution for the quiz (task-20) and the site forms (task-21): an ADAPTER over the
 * session attribution captured globally by `<AttributionCapture/>` (task-19, mounted through
 * `<Metrika/>` in the layout) and the Metrika client id. It never captures or writes anything
 * itself; every storage read is guarded inside `getAttribution()` / here.
 */

export interface LeadAttribution {
  /** `leadSubmitSchema.entryPage`. */
  entryPage: string;
  /** `leadSubmitSchema.utm` (empty object when the session has no tags). */
  utm: { source?: string; medium?: string; campaign?: string; term?: string; content?: string };
  /** `leadSubmitSchema.metrikaClientId`; absent without consent/counter or on timeout. */
  metrikaClientId?: string;
  /**
   * Ad click ids and the external referrer of the session. The `leads` collection has no
   * columns for them, so forms put them into the stored answers (`answers.attribution`).
   */
  extra?: { yclid?: string; gclid?: string; referrer?: string };
}

const UTM_KEYS = ["source", "medium", "campaign", "term", "content"] as const;
/** Same limits as `leadSubmitSchema` (longer values would fail validation). */
const MAX_PATH = 500;
const MAX_VALUE = 200;
const MAX_CLIENT_ID = 64;
/** Same limit as `leadAttributionSchema.referrer`. */
const MAX_REFERRER = 1000;

type Utm = LeadAttribution["utm"];

function clean(value: string | null | undefined, max = MAX_VALUE): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

function cleanUtm(source: Partial<Record<(typeof UTM_KEYS)[number], unknown>>): Utm {
  const utm: Utm = {};
  for (const key of UTM_KEYS) {
    const raw = source[key];
    const value = typeof raw === "string" ? clean(raw) : undefined;
    if (value) utm[key] = value;
  }
  return utm;
}

/** `utm_*` of the current URL: fallback when nothing was captured (storage blocked). */
function utmFromLocation(): Utm {
  try {
    const params = new URLSearchParams(window.location.search);
    return cleanUtm(Object.fromEntries(UTM_KEYS.map((key) => [key, params.get(`utm_${key}`)])));
  } catch {
    return {};
  }
}

function currentPath(): string {
  try {
    return window.location.pathname || "/";
  } catch {
    return "/";
  }
}

/**
 * Attribution for a lead submission.
 * - `entryPage`: `entryPageOverride` (quiz `src` / the form page) → the first page of the session
 *   (`attribution.landing`) → `location.pathname`;
 * - `utm`: the session tags, else `utm_*` of the current URL;
 * - `metrikaClientId`: `await getClientId()` (null / 1.5 s timeout → omitted).
 */
export async function getLeadAttribution(entryPageOverride?: string): Promise<LeadAttribution> {
  const session = typeof window === "undefined" ? null : getAttribution();

  const entryPage = (
    clean(entryPageOverride, MAX_PATH) ??
    clean(session?.landing, MAX_PATH) ??
    (typeof window === "undefined" ? "/" : currentPath())
  ).slice(0, MAX_PATH);

  const sessionUtm = session ? cleanUtm(session.utm) : {};
  const utm =
    Object.keys(sessionUtm).length > 0
      ? sessionUtm
      : typeof window === "undefined"
        ? {}
        : utmFromLocation();

  const extra: NonNullable<LeadAttribution["extra"]> = {};
  const yclid = clean(session?.yclid);
  const gclid = clean(session?.gclid);
  const referrer = clean(session?.referrer, MAX_REFERRER);
  if (yclid) extra.yclid = yclid;
  if (gclid) extra.gclid = gclid;
  if (referrer) extra.referrer = referrer;

  const clientId = clean(await getClientId(), MAX_CLIENT_ID);

  return {
    entryPage,
    utm,
    ...(clientId ? { metrikaClientId: clientId } : {}),
    ...(Object.keys(extra).length > 0 ? { extra } : {}),
  };
}
