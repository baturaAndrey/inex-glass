import { getContacts, primaryEmail, primaryPhone } from "@/lib/cms/globals";
import { priceState } from "@/lib/domain";
import type { PricesInput } from "@/lib/domain";
import type { Contact } from "@/payload-types";
import { absoluteAssetUrl, absoluteUrl, SITE_NAME, siteOrigin } from "./metadata";
import type { Crumb } from "./breadcrumbs";

/**
 * Schema.org JSON-LD (ТЗ §8.7): Organization, LocalBusiness ×2 (offices in Chelyabinsk and
 * Yekaterinburg, not the warehouse), BreadcrumbList (all pages except home), Product +
 * AggregateOffer (thickness cards, ONLY while the price is fresh), FAQPage, Article.
 *
 * Builders are pure and return plain objects; URLs are absolute from the runtime `SITE_URL`.
 */

export type JsonLdObject = Record<string, unknown>;

const CONTEXT = "https://schema.org";
const LOGO_PATH = "/brand/inex-glass-logo-dark.svg";
const COUNTRY = "RU";
const LANGUAGE = "ru";
const CURRENCY = "RUB";
/** Office hours (ТЗ: пн–пт 9:00–18:00). */
const OFFICE_HOURS = {
  "@type": "OpeningHoursSpecification",
  dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  opens: "09:00",
  closes: "18:00",
} as const;

type ContactLocation = Contact["locations"][number];

/** Drops `undefined`, `null`, `''` and empty arrays so the output has no empty properties. */
function compact<T extends JsonLdObject>(object: T): T {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => {
      if (value === undefined || value === null || value === "") return false;
      return !(Array.isArray(value) && value.length === 0);
    })
  ) as T;
}

/** Stable node ids, so pages can reference the organization instead of repeating it. */
export const organizationId = () => `${siteOrigin()}/#organization`;
const localBusinessId = (key: string) => `${siteOrigin()}/#office-${key}`;

function organizationRef(): JsonLdObject {
  return {
    "@type": "Organization",
    "@id": organizationId(),
    name: SITE_NAME,
    url: absoluteUrl("/"),
  };
}

/** Organization «Inex Glass» with logo, profiles and the sales contact point. */
export function organizationLd(contacts: Contact | null): JsonLdObject {
  const phone = primaryPhone(contacts);
  const email = primaryEmail(contacts);
  return compact({
    "@context": CONTEXT,
    "@type": "Organization",
    "@id": organizationId(),
    name: SITE_NAME,
    url: absoluteUrl("/"),
    logo: absoluteAssetUrl(LOGO_PATH),
    ...(email ? { email } : {}),
    sameAs: (contacts?.sameAs ?? []).map((item) => item.url).filter(Boolean),
    contactPoint: phone
      ? [
          compact({
            "@type": "ContactPoint",
            telephone: phone,
            email,
            contactType: "sales",
            areaServed: COUNTRY,
            availableLanguage: LANGUAGE,
          }),
        ]
      : [],
  });
}

/** LocalBusiness for one office of the `contacts` global. */
export function localBusinessLd(
  location: ContactLocation,
  contacts?: Contact | null
): JsonLdObject {
  const telephone = location.phones?.[0]?.number || primaryPhone(contacts ?? null);
  const email = location.email || primaryEmail(contacts ?? null);
  const hasGeo = Number.isFinite(location.lat) && Number.isFinite(location.lng);
  return compact({
    "@context": CONTEXT,
    "@type": "LocalBusiness",
    "@id": localBusinessId(location.key),
    name: `${SITE_NAME}, ${location.city}`,
    url: absoluteUrl("/kontakty/"),
    image: absoluteAssetUrl(LOGO_PATH),
    telephone,
    email,
    address: compact({
      "@type": "PostalAddress",
      streetAddress: location.address,
      addressLocality: location.city,
      addressRegion: location.region,
      postalCode: location.postalCode,
      addressCountry: COUNTRY,
    }),
    ...(hasGeo
      ? { geo: { "@type": "GeoCoordinates", latitude: location.lat, longitude: location.lng } }
      : {}),
    hasMap: location.mapUrl,
    openingHoursSpecification: [OFFICE_HOURS],
    parentOrganization: organizationRef(),
  });
}

/** Offices that get a LocalBusiness: `type: office` with the `localBusiness` flag (warehouse excluded). */
export function localBusinessLocations(contacts: Contact | null): ContactLocation[] {
  return (contacts?.locations ?? []).filter(
    (location) => location.type === "office" && location.localBusiness !== false
  );
}

/**
 * BreadcrumbList from `buildBreadcrumbs`. Crumbs without a page (`Инструменты`) are skipped —
 * every list item except the last must have a URL; the current page gets `currentPath` if passed.
 */
export function breadcrumbListLd(items: Crumb[], currentPath?: string): JsonLdObject | null {
  const lastIndex = items.length - 1;
  const listed = items.filter((item, index) => index === lastIndex || Boolean(item.href));
  if (listed.length < 2) return null;
  return {
    "@context": CONTEXT,
    "@type": "BreadcrumbList",
    itemListElement: listed.map((item, index) => {
      const isLast = index === listed.length - 1;
      const href = isLast ? (item.href ?? currentPath) : item.href;
      return compact({
        "@type": "ListItem",
        position: index + 1,
        name: item.label,
        item: href ? absoluteUrl(href) : undefined,
      });
    }),
  };
}

export interface ProductLdInput {
  name: string;
  /** Page path or absolute URL. */
  url: string;
  description?: string | null | undefined;
  /** Image path or absolute URL. */
  image?: string | null | undefined;
  /** Price «from», ₽/м². */
  lowPrice: number;
  /** Date of the price list (`YYYY-MM-DD` or ISO). */
  priceDate?: string | null | undefined;
}

/**
 * Product + AggregateOffer. Call ONLY when `priceState(...) === 'price'`; prefer
 * `thicknessProductLd`, which enforces it.
 */
export function productLd(input: ProductLdInput): JsonLdObject {
  const url = absoluteUrl(input.url);
  return compact({
    "@context": CONTEXT,
    "@type": "Product",
    name: input.name,
    url,
    description: input.description?.trim(),
    image: input.image ? absoluteAssetUrl(input.image) : undefined,
    brand: { "@type": "Brand", name: SITE_NAME },
    offers: compact({
      "@type": "AggregateOffer",
      lowPrice: input.lowPrice,
      priceCurrency: CURRENCY,
      offerCount: 1,
      validFrom: input.priceDate ? String(input.priceDate).slice(0, 10) : undefined,
      url,
    }),
  });
}

/**
 * Product JSON-LD of a thickness card, or `null` when the price is not shown (15/19 mm, no price,
 * older than `staleAfterDays`): then neither the offer nor the product is output.
 */
export function thicknessProductLd(
  input: Omit<ProductLdInput, "lowPrice" | "priceDate"> & {
    thickness: number;
    prices: PricesInput;
    now?: Date;
  }
): JsonLdObject | null {
  const { thickness, prices, now = new Date(), ...rest } = input;
  if (priceState(thickness, prices, now) !== "price") return null;
  const price = prices.items.find((item) => item.thickness === thickness)?.price;
  if (price === null || price === undefined) return null;
  const priceDate =
    prices.priceDate instanceof Date ? prices.priceDate.toISOString() : prices.priceDate;
  return productLd({ ...rest, lowPrice: price, priceDate });
}

/** HTML → plain text for FAQ answers (tags removed, whitespace collapsed). */
function toPlainText(text: string): string {
  return text
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** FAQPage. `answer` must be plain text (Lexical → text conversion is up to the caller). */
export function faqLd(
  items: ReadonlyArray<{ question: string; answer: string }>
): JsonLdObject | null {
  const entries = items
    .map((item) => ({ question: toPlainText(item.question), answer: toPlainText(item.answer) }))
    .filter((item) => item.question && item.answer);
  if (entries.length === 0) return null;
  return {
    "@context": CONTEXT,
    "@type": "FAQPage",
    mainEntity: entries.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export interface ArticleLdInput {
  headline: string;
  url: string;
  datePublished?: string | null | undefined;
  dateModified?: string | null | undefined;
  /** Author name; the organization when omitted. */
  author?: string | null | undefined;
  image?: string | null | undefined;
  description?: string | null | undefined;
}

export function articleLd(input: ArticleLdInput): JsonLdObject {
  const url = absoluteUrl(input.url);
  return compact({
    "@context": CONTEXT,
    "@type": "Article",
    headline: input.headline,
    description: input.description?.trim(),
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    datePublished: input.datePublished,
    dateModified: input.dateModified ?? input.datePublished,
    image: input.image ? [absoluteAssetUrl(input.image)] : undefined,
    author: input.author?.trim()
      ? { "@type": "Person", name: input.author.trim() }
      : organizationRef(),
    publisher: { ...organizationRef(), logo: absoluteAssetUrl(LOGO_PATH) },
  });
}

/** U+2028 / U+2029: valid in JSON, but line terminators for pre-ES2019 JavaScript parsers. */
const LINE_SEPARATOR = new RegExp(String.fromCharCode(0x2028), "g");
const PARAGRAPH_SEPARATOR = new RegExp(String.fromCharCode(0x2029), "g");

/**
 * Serialises JSON for an inline `<script>`: `<` is escaped so `</script>` or `<!--` inside a CMS
 * string cannot break out of the tag; U+2028/2029 are escaped for old parsers.
 */
export function serializeJsonLd(data: JsonLdObject | JsonLdObject[]): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(LINE_SEPARATOR, "\\u2028")
    .replace(PARAGRAPH_SEPARATOR, "\\u2029");
}

/** `<script type="application/ld+json">`; renders nothing for `null` / an empty list. */
export function JsonLd({ data }: { data: JsonLdObject | Array<JsonLdObject | null> | null }) {
  const items = Array.isArray(data)
    ? data.filter((item): item is JsonLdObject => item !== null)
    : data;
  if (items === null || (Array.isArray(items) && items.length === 0)) return null;
  const payload = Array.isArray(items) && items.length === 1 ? (items[0] as JsonLdObject) : items;
  return (
    <script
      type="application/ld+json"
      // Escaped by serializeJsonLd: no HTML can be injected through CMS strings.
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(payload) }}
    />
  );
}

/** Organization + LocalBusiness of the offices: home page, `/o-kompanii/`, `/kontakty/`. */
export async function OrgJsonLd() {
  const contacts = await getContacts();
  return (
    <JsonLd
      data={[
        organizationLd(contacts),
        ...localBusinessLocations(contacts).map((location) => localBusinessLd(location, contacts)),
      ]}
    />
  );
}
