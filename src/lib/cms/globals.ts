import { collectionTag, globalTag } from "@/lib/cache-tags";
import { DEFAULT_STALE_AFTER_DAYS, DEFAULT_TECH_LIMITS, tryDateKey } from "@/lib/domain";
import type { PlaceholderContext, PricesInput, PromoInput, TechLimits } from "@/lib/domain";
import { LINKABLE_COLLECTIONS } from "@/payload/fields/link";
import type {
  Condition,
  Contact,
  Navigation,
  Price,
  Promo,
  Requisite,
  SiteSetting,
  Snippet,
  TechParam,
} from "@/payload-types";
import { cached } from "./cache";
import { getPayloadClient } from "./payload";
import type { DataFromGlobalSlug, GlobalSlug } from "payload";

/**
 * Cached loaders of the Payload globals (`global:<slug>` tags, invalidated by
 * `revalidateGlobal` hooks) and adapters from the raw globals to the domain types of
 * `@/lib/domain`. Loaders return the Payload document or `null` when the global has no data.
 *
 * The adapters derive date-dependent state (stale price, active promo) nowhere: they return raw
 * data and the caller passes `now`. See the "time, not edits" rule in `./cache.ts`.
 */

/** Payload metadata keys that do not count as content. */
const META_KEYS: ReadonlySet<string> = new Set(["id", "globalType", "createdAt", "updatedAt"]);

/**
 * A global that was never saved still comes back with its default values, which are real
 * content here (e.g. the seed price list). Only a document with no fields at all is "empty".
 */
function isEmptyGlobal(doc: unknown): boolean {
  if (doc === null || typeof doc !== "object") return true;
  return Object.keys(doc).every((key) => META_KEYS.has(key));
}

interface GlobalLoaderOptions<S extends GlobalSlug> {
  depth: number;
  /** Extra tags for populated relationships (e.g. linked pages in the navigation). */
  extraTags?: string[];
  /**
   * Globals readable by anyone are read AS AN ANONYMOUS VISITOR (`overrideAccess: false`), so
   * field-level access hides private fields (bank details, unpublished legal address). Globals
   * that only staff may read (`site-settings`) are read with `overrideAccess: true` and must
   * strip their private parts in `sanitize`.
   */
  staffOnly?: { sanitize: (doc: DataFromGlobalSlug<S>) => DataFromGlobalSlug<S> };
}

function globalLoader<S extends GlobalSlug>(
  slug: S,
  { depth, extraTags = [], staffOnly }: GlobalLoaderOptions<S>
) {
  return cached(
    async (): Promise<DataFromGlobalSlug<S> | null> => {
      const payload = await getPayloadClient();
      const doc = await payload.findGlobal({ slug, depth, overrideAccess: Boolean(staffOnly) });
      if (isEmptyGlobal(doc)) return null;
      const typed = doc as DataFromGlobalSlug<S>;
      return staffOnly ? staffOnly.sanitize(typed) : typed;
    },
    ["cms", "global", slug, `depth:${depth}`],
    { tags: [globalTag(slug), ...extraTags] }
  );
}

/** Linked documents are populated in these globals: their paths/titles must stay fresh. */
const LINKED_DOC_TAGS = LINKABLE_COLLECTIONS.map((slug) => collectionTag(slug));
const MEDIA_TAGS = [collectionTag("media")];

function stripNotifications(settings: SiteSetting): SiteSetting {
  const { notifications: _private, ...rest } = settings;
  return rest;
}

export const getPrices: () => Promise<Price | null> = globalLoader("prices", { depth: 0 });
export const getPromo: () => Promise<Promo | null> = globalLoader("promo", { depth: 0 });
export const getConditions: () => Promise<Condition | null> = globalLoader("conditions", {
  depth: 0,
});
export const getContacts: () => Promise<Contact | null> = globalLoader("contacts", { depth: 0 });
export const getRequisites: () => Promise<Requisite | null> = globalLoader("requisites", {
  depth: 1,
  extraTags: MEDIA_TAGS,
});
export const getTechParams: () => Promise<TechParam | null> = globalLoader("tech-params", {
  depth: 0,
});
/**
 * `site-settings` is staff-only in the API; the site needs its public parts (holidays, Metrika ID,
 * 404 texts, branding). Lead notification recipients never leave the loader.
 */
export const getSiteSettings: () => Promise<SiteSetting | null> = globalLoader("site-settings", {
  depth: 1,
  extraTags: MEDIA_TAGS,
  staffOnly: { sanitize: stripNotifications },
});
export const getNavigation: () => Promise<Navigation | null> = globalLoader("navigation", {
  depth: 1,
  extraTags: LINKED_DOC_TAGS,
});
export const getSnippets: () => Promise<Snippet | null> = globalLoader("snippets", {
  depth: 1,
  extraTags: [...LINKED_DOC_TAGS, ...MEDIA_TAGS],
});

// ---------------------------------------------------------------------------------------------
// Adapters: Payload globals → domain types
// ---------------------------------------------------------------------------------------------

const isPositiveNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

/** `prices` global → `PricesInput`. A row marked «по запросу» or without a price has `null`. */
export function toPricesInput(prices: Price | null): PricesInput {
  if (!prices) return { items: [], priceDate: null, staleAfterDays: DEFAULT_STALE_AFTER_DAYS };
  return {
    items: (prices.rows ?? []).map((row) => ({
      thickness: row.thickness,
      price: !row.onRequest && isPositiveNumber(row.priceFrom) ? row.priceFrom : null,
    })),
    priceDate: prices.priceDate ?? null,
    staleAfterDays: isPositiveNumber(prices.staleAfterDays)
      ? prices.staleAfterDays
      : DEFAULT_STALE_AFTER_DAYS,
  };
}

/** `promo` global → `PromoInput` (`null` when the global is empty). */
export function toPromoInput(promo: Promo | null): PromoInput | null {
  if (!promo) return null;
  return {
    active: Boolean(promo.active),
    text: promo.text ?? "",
    startDate: promo.startDate ?? null,
    endDate: promo.endDate ?? null,
    thresholdArea: Number.isFinite(promo.thresholdArea) ? promo.thresholdArea : 0,
  };
}

type SizePair = { a: number; b: number };

/**
 * The schema stores sizes as W/H pairs whose meaning differs between groups; the domain works
 * with the long/short side. The larger of a pair is the long-side limit, the smaller the short.
 */
const longOf = ({ a, b }: SizePair) => Math.max(a, b);
const shortOf = ({ a, b }: SizePair) => Math.min(a, b);

const allFinite = (...values: unknown[]) =>
  values.every((value) => typeof value === "number" && Number.isFinite(value));

/** `tech-params` (+ `conditions.minOrderM2`) → `TechLimits`; per section fallback to defaults. */
export function toTechLimits(tech: TechParam | null, conditions: Condition | null): TechLimits {
  const d = DEFAULT_TECH_LIMITS;
  const minAreaM2 = isPositiveNumber(conditions?.minOrderM2) ? conditions.minOrderM2 : d.minAreaM2;
  if (!tech) return { ...d, minAreaM2 };

  const { flat, painted, bent, holes, print } = tech;

  const flatLimits: TechLimits["flat"] =
    flat && allFinite(flat.minW, flat.minH, flat.maxW, flat.maxH)
      ? {
          longMin: longOf({ a: flat.minW, b: flat.minH }),
          shortMin: shortOf({ a: flat.minW, b: flat.minH }),
          longMax: longOf({ a: flat.maxW, b: flat.maxH }),
          shortMax: shortOf({ a: flat.maxW, b: flat.maxH }),
        }
      : d.flat;

  const paintedLimits: TechLimits["painted"] =
    painted &&
    allFinite(
      painted.thickMin,
      painted.thickMax,
      painted.minW,
      painted.minH,
      painted.maxW,
      painted.maxH
    )
      ? {
          thickMin: painted.thickMin,
          thickMax: painted.thickMax,
          longMin: longOf({ a: painted.minW, b: painted.minH }),
          shortMin: shortOf({ a: painted.minW, b: painted.minH }),
          longMax: longOf({ a: painted.maxW, b: painted.maxH }),
          shortMax: shortOf({ a: painted.maxW, b: painted.maxH }),
        }
      : d.painted;

  const radiusMin = (bent?.radius ?? [])
    .filter((r) => allFinite(r.thicknessFrom, r.thicknessTo, r.minRadius))
    .map((r) => ({ thickFrom: r.thicknessFrom, thickTo: r.thicknessTo, mm: r.minRadius }));

  const bentLimits: TechLimits["bent"] =
    bent && allFinite(bent.thickMin, bent.thickMax, bent.maxW, bent.maxH)
      ? {
          thickMin: bent.thickMin,
          thickMax: bent.thickMax,
          longMax: longOf({ a: bent.maxW, b: bent.maxH }),
          shortMax: shortOf({ a: bent.maxW, b: bent.maxH }),
          radiusMin: radiusMin.length > 0 ? radiusMin : d.bent.radiusMin,
        }
      : d.bent;

  const holesLimits: TechLimits["holes"] =
    holes &&
    allFinite(
      holes.diameterMin,
      holes.diameterMax,
      holes.diameterMaxOneSide,
      holes.glassMinW,
      holes.glassMinH,
      holes.glassMaxW,
      holes.glassMaxH
    )
      ? {
          dMin: holes.diameterMin,
          dMax: holes.diameterMax,
          dMaxOneSide: holes.diameterMaxOneSide,
          glassLongMin: longOf({ a: holes.glassMinW, b: holes.glassMinH }),
          glassShortMin: shortOf({ a: holes.glassMinW, b: holes.glassMinH }),
          glassLongMax: longOf({ a: holes.glassMaxW, b: holes.glassMaxH }),
          glassShortMax: shortOf({ a: holes.glassMaxW, b: holes.glassMaxH }),
        }
      : d.holes;

  const printLimits: TechLimits["print"] =
    print && allFinite(print.maxW, print.maxH)
      ? {
          long: longOf({ a: print.maxW, b: print.maxH }),
          short: shortOf({ a: print.maxW, b: print.maxH }),
        }
      : d.print;

  return {
    flat: flatLimits,
    painted: paintedLimits,
    bent: bentLimits,
    holes: holesLimits,
    print: printLimits,
    minAreaM2,
  };
}

/** Primary phone of the `contacts` global («+7 (351) 247-05-57»), or `''`. */
export function primaryPhone(contacts: Contact | null): string {
  const phones = contacts?.phones ?? [];
  return (phones.find((p) => p.isPrimary) ?? phones[0])?.number ?? "";
}

/** Primary e-mail of the `contacts` global, or `''`. */
export function primaryEmail(contacts: Contact | null): string {
  const emails = contacts?.emails ?? [];
  return (emails.find((e) => e.isPrimary) ?? emails[0])?.address ?? "";
}

/** `{условия}`: the CMS sentence, or one assembled from the individual condition texts. */
function conditionsText(conditions: Condition | null): string {
  if (!conditions) return "";
  const inline = conditions.inlineText?.trim();
  if (inline) return inline;
  return [conditions.minOrderText, conditions.leadTimeText, conditions.kpText]
    .map((text) => text?.trim())
    .filter(Boolean)
    .join(" · ");
}

/** `{контакты}`: the CMS sentence, or «phone, e-mail, hours». */
function contactsText(contacts: Contact | null): string {
  if (!contacts) return "";
  const inline = contacts.inlineText?.trim();
  if (inline) return inline;
  return [primaryPhone(contacts), primaryEmail(contacts), contacts.workHours?.full]
    .filter(Boolean)
    .join(", ");
}

/** `{реквизиты}`: the CMS sentence, or «name, ИНН …». */
function requisitesText(requisites: Requisite | null): string {
  if (!requisites) return "";
  const inline = requisites.inlineText?.trim();
  if (inline) return inline;
  return [requisites.legalName, requisites.inn ? `ИНН ${requisites.inn}` : null]
    .filter(Boolean)
    .join(", ");
}

/** Holiday entries → `YYYY-MM-DD` keys (invalid dates dropped). */
function holidayKeys(settings: SiteSetting | null, workday: boolean): string[] {
  return (settings?.holidays ?? [])
    .filter((h) => Boolean(h.isWorkday) === workday)
    .map((h) => tryDateKey(h.date))
    .filter((key): key is string => key !== null);
}

export async function getPricesInput(): Promise<PricesInput> {
  return toPricesInput(await getPrices());
}

export async function getPromoInput(): Promise<PromoInput | null> {
  return toPromoInput(await getPromo());
}

/** Technological limits from `tech-params`; `DEFAULT_TECH_LIMITS` when the global is empty. */
export async function getTechLimits(): Promise<TechLimits> {
  const [tech, conditions] = await Promise.all([getTechParams(), getConditions()]);
  return toTechLimits(tech, conditions);
}

/**
 * Calendar adapters for callers that already hold `site-settings` (e.g. `getQuizConfig`), so the
 * global is not read once per helper.
 */
export const toHolidays = (settings: SiteSetting | null): string[] => holidayKeys(settings, false);
export const toWorkdays = (settings: SiteSetting | null): string[] => holidayKeys(settings, true);

/** Non-working weekdays (public holidays, moved days off) from `site-settings`, `YYYY-MM-DD`. */
export async function getHolidays(): Promise<string[]> {
  return toHolidays(await getSiteSettings());
}

/** Weekend days made working by a transfer (`isWorkday`), `YYYY-MM-DD`. */
export async function getWorkdays(): Promise<string[]> {
  return toWorkdays(await getSiteSettings());
}

/**
 * Placeholder context for `replacePlaceholders` (texts, blocks, meta). `now` defaults to the
 * render time — never cache the result across requests (see `./cache.ts`).
 */
export async function getPlaceholderContext(
  opts: { thickness?: number; now?: Date } = {}
): Promise<PlaceholderContext> {
  const [prices, promo, conditions, contacts, requisites] = await Promise.all([
    getPrices(),
    getPromo(),
    getConditions(),
    getContacts(),
    getRequisites(),
  ]);
  return {
    prices: toPricesInput(prices),
    promo: toPromoInput(promo),
    now: opts.now ?? new Date(),
    conditions: conditionsText(conditions),
    contacts: contactsText(contacts),
    requisites: requisitesText(requisites),
    phone: primaryPhone(contacts),
    ...(opts.thickness !== undefined ? { thickness: opts.thickness } : {}),
  };
}
