/**
 * HTML helpers for MAX messages (`format: "html"`).
 *
 * MAX supports a small subset of HTML (`<b>`, `<i>`, `<u>`, `<s>`, `<a>`, `<code>`, `<pre>`); a
 * message is at most 4000 characters. Every value interpolated into a message must go through
 * `escapeHtml`, and every message through `truncateMaxText` (the client does it).
 */

/** Hard limit of `NewMessageBody.text` in the Bot API. */
export const MAX_TEXT_LIMIT = 4000;

const ELLIPSIS = "…";

const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ENTITIES[char] ?? char);
}

/** Tags that are closed after a cut so the message stays valid markup. */
const CLOSABLE_TAGS = new Set(["b", "i", "u", "a"]);
const TAG_PATTERN = /<(\/?)([a-z]+)\b[^>]*>/gi;

/** Tags opened (and not yet closed) in `html`, in the order they were opened. */
function openTags(html: string): string[] {
  const stack: string[] = [];
  for (const match of html.matchAll(TAG_PATTERN)) {
    const name = (match[2] ?? "").toLowerCase();
    if (!CLOSABLE_TAGS.has(name)) continue;
    if (match[1] === "/") {
      const index = stack.lastIndexOf(name);
      if (index !== -1) stack.splice(index, 1);
    } else {
      stack.push(name);
    }
  }
  return stack;
}

const closingTags = (stack: readonly string[]): string =>
  [...stack]
    .reverse()
    .map((name) => `</${name}>`)
    .join("");

const graphemeSegmenter = new Intl.Segmenter("ru", { granularity: "grapheme" });

/**
 * The longest prefix of `text` that is at most `end` UTF-16 units long and ends on a grapheme
 * boundary: a cut never leaves half of a surrogate pair (a lone surrogate is invalid UTF-8 for
 * the API) nor splits an emoji / combining sequence (👍🏽, «й» as и + ◌̆).
 */
function sliceAtGrapheme(text: string, end: number): string {
  let boundary = 0;
  for (const { index, segment } of graphemeSegmenter.segment(text)) {
    const next = index + segment.length;
    if (next > end) break;
    boundary = next;
  }
  return text.slice(0, boundary);
}

/**
 * Text no longer than `limit`. A cut never splits a grapheme, a tag or an entity; tags left
 * open are closed and «…» is appended. The result is still within `limit` (the cut point moves
 * left as long as the closing tags do not fit). `limit` counts UTF-16 units, like `length`, which
 * is never less than the number of characters the API counts.
 */
export function truncateMaxText(text: string, limit = MAX_TEXT_LIMIT): string {
  if (text.length <= limit) return text;

  let end = limit - ELLIPSIS.length;
  while (end > 0) {
    const head = sliceAtGrapheme(text, end)
      .replace(/<[^>]*$/, "")
      .replace(/&[#a-z0-9]*$/i, "");
    const result = `${head}${closingTags(openTags(head))}${ELLIPSIS}`;
    if (result.length <= limit) return result;
    // The closing tags did not fit: cut further by their length and try again.
    end -= result.length - limit;
  }
  return ELLIPSIS.slice(0, limit);
}
