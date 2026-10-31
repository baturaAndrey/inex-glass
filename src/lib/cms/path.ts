/**
 * Path of a `pages` document from the catch-all segments (`[...slug]`).
 *
 * Each segment is percent-decoded (Cyrillic slugs arrive encoded). A segment that decodes to a
 * `/` (`%2F`) or `\` (`%5C`) cannot belong to any stored path segment: decoding it would make
 * `/a%2Fb/` a duplicate URL of `/a/b/`. Such a request yields `null` (→ 404) instead.
 * Malformed encoding (`%E0%A4%A`) keeps the raw segment, which then simply matches nothing.
 */
const SEPARATOR_PATTERN = /[/\\]/;

export function pathFromSegments(segments: readonly string[]): string | null {
  const decoded: string[] = [];
  for (const segment of segments) {
    let value = segment;
    try {
      value = decodeURIComponent(segment);
    } catch {
      // Keep the raw segment.
    }
    if (value === "" || SEPARATOR_PATTERN.test(value)) return null;
    decoded.push(value);
  }
  if (decoded.length === 0) return null;
  return `/${decoded.join("/")}/`;
}
