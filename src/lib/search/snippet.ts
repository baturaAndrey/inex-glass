/**
 * Snippet helpers of the site search (task 35). `ts_headline` returns the indexed text with
 * `<mark>…</mark>` around the matched words, but the text itself is NOT HTML-escaped. Before the
 * snippet leaves the server (`/api/site-search/` JSON, `/poisk/`) everything except balanced
 * `<mark>` / `</mark>` pairs is escaped (`sanitizeSnippet`); the UI then splits it into segments
 * and lets React render the marks (`snippetSegments`, no `dangerouslySetInnerHTML`).
 * Pure: client- and test-safe.
 */

const MARK_TAG = /<\/?mark>/g;
/** Same tags as a capturing split pattern (keeps the tags in the result). */
const MARK_TAG_SPLIT = /(<\/?mark>)/;
const OPEN_MARK = "<mark>";
const CLOSE_MARK = "</mark>";

const HTML_ESCAPES: Readonly<Record<string, string>> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

const HTML_UNESCAPES: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(HTML_ESCAPES).map(([char, entity]) => [entity, char])
);

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char);
}

function unescapeHtml(text: string): string {
  return text.replace(/&(?:amp|lt|gt|quot|#39);/g, (entity) => HTML_UNESCAPES[entity] ?? entity);
}

/**
 * Escapes the snippet, keeping only `<mark>` / `</mark>` (exact lower-case tags, no attributes).
 * Marks are re-balanced: a stray closing tag is dropped, an unclosed one is closed at the end.
 */
export function sanitizeSnippet(raw: unknown): string {
  if (typeof raw !== "string" || raw === "") return "";
  let out = "";
  let open = false;
  let last = 0;
  for (const match of raw.matchAll(MARK_TAG)) {
    out += escapeHtml(raw.slice(last, match.index));
    last = match.index + match[0].length;
    const isClose = match[0] === CLOSE_MARK;
    if (isClose && open) {
      out += CLOSE_MARK;
      open = false;
    } else if (!isClose && !open) {
      out += OPEN_MARK;
      open = true;
    }
  }
  out += escapeHtml(raw.slice(last));
  return open ? out + CLOSE_MARK : out;
}

export interface SnippetSegment {
  text: string;
  /** Matched word(s): rendered inside `<mark>`. */
  mark: boolean;
}

/**
 * Splits a SANITIZED snippet into plain-text segments (entities decoded), so React renders the
 * marks as elements and escapes the text itself.
 */
export function snippetSegments(snippet: string): SnippetSegment[] {
  const segments: SnippetSegment[] = [];
  let mark = false;
  for (const part of snippet.split(MARK_TAG_SPLIT)) {
    if (part === OPEN_MARK) mark = true;
    else if (part === CLOSE_MARK) mark = false;
    else if (part !== "") segments.push({ text: unescapeHtml(part), mark });
  }
  return segments;
}
