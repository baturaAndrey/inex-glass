/**
 * Text normalization of the site search (task 35). The SAME function prepares the indexed text
 * (`search.title_norm` / `search.body_text`, written by the plugin's `beforeSync`) and the user
 * query, so «закалённое» and «закаленное» produce identical lexemes: Postgres' `russian`
 * dictionary does not fold «ё» into «е» on its own. Pure: no Payload / Next imports.
 */

/** HTML tags (`<mark>`, `<br/>`, stray markup pasted by editors). */
const HTML_TAG = /<\/?[a-z][^>]*>/gi;
/** HTML entities (`&nbsp;`, `&#171;`, `&laquo;`): replaced by a space, never decoded. */
const HTML_ENTITY = /&(?:#\d{1,7}|#x[0-9a-f]{1,6}|[a-z][a-z0-9]{1,31});/gi;
/** CMS placeholders resolved at render time (`{цена}`, `{N}`, `{вес}`): never indexed. */
export const PLACEHOLDER_PATTERN = /\{[^{}]+\}/g;
/**
 * Control and "service" characters: C0/C1 controls, zero-width characters, soft hyphen, BOM.
 * Removed outright (a soft hyphen inside a word must not split it).
 */
const INVISIBLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F­​-‍⁠﻿]/g;
/** Any whitespace, incl. no-break (U+00A0), narrow no-break (U+202F) and line separators. */
const WHITESPACE_RUN = /[\s   ]+/g;

/**
 * Lower case, «ё» → «е», HTML tags / entities / placeholders and invisible characters stripped,
 * whitespace (incl. no-break spaces and line breaks) collapsed to single spaces, trimmed.
 * Non-string input gives `""`.
 */
export function normalizeRu(text: unknown): string {
  if (typeof text !== "string" || text === "") return "";
  return text
    .replace(HTML_TAG, " ")
    .replace(HTML_ENTITY, " ")
    .replace(PLACEHOLDER_PATTERN, " ")
    .replace(INVISIBLE, "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(WHITESPACE_RUN, " ")
    .trim();
}
