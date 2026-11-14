/**
 * Pure helpers of the SEO widgets in the document edit form (task 07): the length counters of
 * `seo.title` / `seo.description` and the search snippet preview. No React, Payload or env
 * imports: the module runs in client components and in unit tests alike.
 */

/**
 * Same values as `SITE_NAME` / `TITLE_BRAND_SUFFIX` of `src/lib/seo/metadata.ts`. That module
 * reads the server env (`getEnv`) and cannot be imported by a client component, so the rule is
 * repeated here; keep both in sync.
 */
export const SNIPPET_SITE_NAME = "Inex Glass";
export const SNIPPET_BRAND_SUFFIX = ` | ${SNIPPET_SITE_NAME}`;

/** Shown when neither the SEO title nor the document title is filled in. */
export const SNIPPET_UNTITLED = "Без заголовка";

/** Separator of the breadcrumb-like URL line of search results. */
const URL_SEPARATOR = " › ";
const ELLIPSIS = "…";
/** A word boundary is used only when it keeps at least this share of the visible text. */
const MIN_WORD_CUT_RATIO = 0.6;
/** `{N}`, `{цена}`, `{вес}`… — resolved by the site at render time. */
const PLACEHOLDER = /\{[^{}\s][^{}]*\}/u;
const TRAILING_PUNCTUATION = /[\s,.;:!?—–-]+$/u;

export type CounterState = "empty" | "ok" | "over";

export interface CounterResult {
  length: number;
  limit: number;
  state: CounterState;
}

/** Characters of a string by Unicode code points (an emoji or «ё» counts as one). */
const charCount = (text: string): number => [...text].length;

const trimmedText = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

/** Length is counted by Unicode code points (`[...value].length`); edge whitespace is ignored. */
export function counterState(value: unknown, limit: number): CounterResult {
  const length = charCount(trimmedText(value));
  const state: CounterState = length === 0 ? "empty" : length <= limit ? "ok" : "over";
  return { length, limit, state };
}

/** `withBrand` of `src/lib/seo/metadata.ts`: the suffix is added unless the brand is present. */
function withBrand(title: string): string {
  return title.includes(SNIPPET_SITE_NAME) ? title : `${title}${SNIPPET_BRAND_SUFFIX}`;
}

/** Host of the origin (`https://inexglass.ru` → `inexglass.ru`), tolerant to a bare host. */
function hostOf(origin: string): string {
  try {
    return new URL(origin).host;
  } catch {
    return origin.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "").replace(/\/.*$/, "");
  }
}

/** `inexglass.ru › zakalennoe-steklo › 10-mm`; the root (or no path) is the host alone. */
function snippetUrl(origin: string, path: string | null | undefined): string {
  const segments = (path ?? "").split("/").filter((segment) => segment !== "");
  return [hostOf(origin), ...segments].join(URL_SEPARATOR);
}

export interface SnippetInput {
  seoTitle?: string | null;
  seoDescription?: string | null;
  /** `useAsTitle` value of the document. */
  docTitle?: string | null;
  /** The document's `path` field (`/zakalennoe-steklo/`), when the collection has one. */
  path?: string | null;
  /** Site origin, `https://inexglass.ru` (`serverURL` of the Payload config). */
  origin: string;
  noindex?: boolean | null;
}

export interface Snippet {
  /** `inexglass.ru › zakalennoe-steklo` (path segments joined by « › »; root — host only). */
  url: string;
  /** `seo.title`, or the document title with the brand suffix; empty → «Без заголовка». */
  title: string;
  /** The title is derived from the document title (the SEO title is empty). */
  titleIsFallback: boolean;
  /** `null` → the search engine takes a text from the page itself. */
  description: string | null;
  /** The title or the description contains `{…}` placeholders. */
  hasPlaceholders: boolean;
  noindex: boolean;
}

/** What a search engine shows for the document, by the same title rule as the site. */
export function buildSnippet(input: SnippetInput): Snippet {
  const seoTitle = trimmedText(input.seoTitle);
  const docTitle = trimmedText(input.docTitle);
  const description = trimmedText(input.seoDescription) || null;

  let title: string;
  if (seoTitle) title = seoTitle;
  else if (docTitle) title = withBrand(docTitle);
  else title = SNIPPET_UNTITLED;

  return {
    url: snippetUrl(input.origin, input.path),
    title,
    titleIsFallback: !seoTitle && docTitle !== "",
    description,
    hasPlaceholders:
      PLACEHOLDER.test(title) || (description !== null && PLACEHOLDER.test(description)),
    noindex: input.noindex === true,
  };
}

/**
 * Clips a text for display the way a search engine does: at most `limit` characters including
 * the trailing «…», cut at a word boundary when that does not lose too much of the text.
 */
export function clipForSnippet(text: string, limit: number): string {
  const chars = [...text.trim()];
  if (chars.length <= limit) return chars.join("");

  const head = chars.slice(0, Math.max(limit - 1, 0)).join("");
  const lastSpace = head.search(/\s\S*$/u);
  const cut =
    lastSpace > 0 && charCount(head.slice(0, lastSpace)) >= Math.floor(limit * MIN_WORD_CUT_RATIO)
      ? head.slice(0, lastSpace)
      : head;
  return `${cut.replace(TRAILING_PUNCTUATION, "")}${ELLIPSIS}`;
}
