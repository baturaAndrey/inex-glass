import { telHref } from "@/components/layout/nav-data";
import type { Contact } from "@/payload-types";

/**
 * Pure helpers of the contacts page (task 29): what a location card shows and the Yandex.Maps
 * URLs of a location. No React, no CMS access — unit-tested in `contact-format.test.ts`.
 */

export type ContactLocation = Contact["locations"][number];

export interface LinkItem {
  label: string;
  href: string;
}

/** Card data of one address of the `contacts` global; empty values are dropped. */
export interface LocationCardData {
  key: string;
  /** Pin number shared with the map (1-based position in the global). */
  number: number;
  title: string;
  address: string;
  /** `tel:` links in the format `tel:+73512470557` (plain links: Metrika tracks them globally). */
  phones: LinkItem[];
  email: LinkItem | null;
  hours: string | null;
}

const trimmed = (value: string | null | undefined): string => value?.trim() ?? "";

export function toLocationCard(location: ContactLocation, index = 0): LocationCardData {
  const phones = (location.phones ?? [])
    .map((phone) => trimmed(phone.number))
    .filter(Boolean)
    .map((number) => ({ label: number, href: telHref(number) }));
  const email = trimmed(location.email);
  const hours = trimmed(location.hours);
  return {
    key: location.key,
    number: index + 1,
    title: trimmed(location.title),
    address: trimmed(location.address),
    phones,
    email: email ? { label: email, href: `mailto:${email}` } : null,
    hours: hours || null,
  };
}

/** Locations that have something to show (a title or an address). */
export function locationCards(contacts: Contact | null | undefined): LocationCardData[] {
  return (contacts?.locations ?? [])
    .map((location, index) => toLocationCard(location, index))
    .filter((card) => card.title !== "" || card.address !== "");
}

/**
 * Search text of a location for Yandex.Maps: «Челябинск, ул. Артиллерийская, 124А». The city is
 * prepended unless the address already names it. Coordinates are never invented (task 29).
 */
export function mapQuery(location: Pick<ContactLocation, "city" | "address">): string {
  const city = trimmed(location.city);
  const address = trimmed(location.address);
  if (!city) return address;
  if (!address) return city;
  return address.toLowerCase().includes(city.toLowerCase()) ? address : `${city}, ${address}`;
}

export const YANDEX_WIDGET_BASE = "https://yandex.ru/map-widget/v1/";
export const YANDEX_MAPS_BASE = "https://yandex.ru/maps/";
/** Street-level zoom of the embedded widget. */
export const YANDEX_WIDGET_ZOOM = 16;

/** Embeddable widget URL (iframe `src`), loaded only after the visitor clicks «Показать карту». */
export function yandexWidgetUrl(query: string): string {
  const params = new URLSearchParams({ text: query, z: String(YANDEX_WIDGET_ZOOM) });
  return `${YANDEX_WIDGET_BASE}?${params.toString()}`;
}

/** Only an `https://` link is trusted from the CMS; anything else falls back to a search URL. */
function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

/** «Открыть в Яндекс.Картах»: the editor's `mapUrl`, otherwise a search for the address. */
export function yandexMapsUrl(
  location: Pick<ContactLocation, "city" | "address" | "mapUrl">
): string {
  const custom = trimmed(location.mapUrl);
  if (custom && isHttpsUrl(custom)) return custom;
  const params = new URLSearchParams({ text: mapQuery(location) });
  return `${YANDEX_MAPS_BASE}?${params.toString()}`;
}

/** One point of the click-to-load map. */
export interface MapPoint {
  key: string;
  /** Number of the pin, the same as on the address card (1-based). */
  number: number;
  title: string;
  /** Widget search text. */
  query: string;
  /** «Открыть в Яндекс.Картах». */
  openUrl: string;
}

export function mapPoints(contacts: Contact | null | undefined): MapPoint[] {
  return (contacts?.locations ?? [])
    .map((location, index) => ({
      key: location.key,
      number: index + 1,
      title: trimmed(location.title) || mapQuery(location),
      query: mapQuery(location),
      openUrl: yandexMapsUrl(location),
    }))
    .filter((point) => point.query !== "");
}
