/**
 * OG / JSON-LD image choice for content pages (articles, objects).
 *
 * Generated placeholder media (`isPlaceholder: true`, the `gen-*` files) must never reach
 * `og:image` or JSON-LD `image` (spec task-38): a share preview or a rich result would then
 * show a stock render instead of a real photo. Placeholders are skipped; when no real image
 * remains the caller passes `null` on and `buildMetadata` falls back to `DEFAULT_OG_IMAGE`,
 * while JSON-LD omits `image`.
 */

/** The subset of a Payload `Media` doc the choice needs; unpopulated relations are ids (strings). */
export interface OgMediaCandidate {
  url?: string | null | undefined;
  alt?: string | null | undefined;
  isPlaceholder?: boolean | null | undefined;
}

export interface OgImage {
  url: string;
  alt: string | null;
}

/** First populated, non-placeholder candidate with a URL, in priority order; else `null`. */
export function pickOgImage(
  candidates: ReadonlyArray<OgMediaCandidate | string | null | undefined>
): OgImage | null {
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") continue;
    if (candidate.isPlaceholder) continue;
    const url = candidate.url?.trim();
    if (!url) continue;
    return { url, alt: candidate.alt?.trim() || null };
  }
  return null;
}
