/**
 * Client-safe part of the contacts map helpers: the widget URL and the point shape used by
 * `yandex-map.tsx`. Kept apart from `./contact-format` (task 39): that module imports the phone
 * normalizer of `@/lib/domain/contact-fields` (zod), and the client map pulled zod (~33 KB gzip)
 * into every page of the catch-all route. `./contact-format` re-exports everything below.
 */

export const YANDEX_WIDGET_BASE = "https://yandex.ru/map-widget/v1/";
/** Street-level zoom of the embedded widget. */
export const YANDEX_WIDGET_ZOOM = 16;

/** Embeddable widget URL (iframe `src`), loaded only after the visitor clicks «Показать карту». */
export function yandexWidgetUrl(query: string): string {
  const params = new URLSearchParams({ text: query, z: String(YANDEX_WIDGET_ZOOM) });
  return `${YANDEX_WIDGET_BASE}?${params.toString()}`;
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
