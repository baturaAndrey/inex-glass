import { lexicalToPlainText } from "@/payload/utils/lexical-text";

/**
 * Plain text of CMS documents for the site search index (task 35). Pure: no Payload / Next
 * imports, so the plugin hook, the reindex script and unit tests share it.
 */

/** Hard limit of `search.body_text` (ТЗ: 50 000 characters). */
export const BODY_TEXT_MAX_LENGTH = 50_000;

/**
 * Lexical state (`SerializedEditorState` or its `root`) → one line of text: every text node,
 * block nodes (paragraphs, headings, list items, table cells…) separated by a space.
 */
export function lexicalToText(value: unknown): string {
  return lexicalToPlainText(value).replace(/\n+/g, " ").trim();
}

/** `{ root: { children: [...] } }` — the shape of every `richText` value. */
export function isLexicalState(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const root = (value as { root?: unknown }).root;
  return (
    typeof root === "object" &&
    root !== null &&
    Array.isArray((root as { children?: unknown }).children)
  );
}

/**
 * Keys that never carry readable copy: identifiers, routing, technical settings, media
 * credits / alt texts, import bookkeeping. `seo` is walked separately (its description goes
 * last, see `documentToText`).
 */
const SKIPPED_KEYS: ReadonlySet<string> = new Set([
  "id",
  "_status",
  "_order",
  "_parent_id",
  "blockType",
  "blockName",
  "slug",
  "path",
  "pathPrefix",
  "url",
  "href",
  "anchor",
  "type",
  "relationTo",
  "createdAt",
  "updatedAt",
  "publishedAt",
  "sortDate",
  "legacyId",
  "legacyUrl",
  "legacyUrls",
  "sourceUrl",
  "importNotes",
  "canonical",
  "template",
  "icon",
  "key",
  "alt",
  "imageAlt",
  "credit",
  "phone",
  "email",
  "quizPrefill",
  "documentVersion",
  "seo",
]);

/**
 * Lower-case ASCII tokens without spaces: select / radio values (`generic`, `primary`), slugs,
 * UUIDs of unpopulated relations, camelCase variants (`p5Top`). Real copy is Russian or at
 * least capitalized («Optiwhite»); bare numbers («2014») are kept.
 */
const TECHNICAL_TOKEN = /^(?=[a-z0-9_-]*[a-z])[a-z0-9_-]+$|^[a-z][a-z0-9]*[A-Z][A-Za-z0-9]*$/;
/** URLs, paths, file names, e-mails, ISO timestamps: no spaces and a technical separator. */
const TECHNICAL_STRING = /^\S*[/@:\\]\S*$|^\S+\.[a-z0-9]{2,5}$/i;
/** At least one letter or digit. */
const HAS_WORD = /[\p{L}\p{N}]/u;

function isReadableString(value: string): boolean {
  const text = value.trim();
  if (text === "" || !HAS_WORD.test(text)) return false;
  return !TECHNICAL_TOKEN.test(text) && !TECHNICAL_STRING.test(text);
}

type PlainObject = Record<string, unknown>;

const isObject = (value: unknown): value is PlainObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * A populated relationship (another CMS document or a media file) inside the walked document:
 * its text belongs to that document's own index entry, not to this one. Array rows and blocks
 * also have an `id`, but never timestamps.
 */
const isPopulatedDocument = (value: PlainObject): boolean =>
  "id" in value && ("createdAt" in value || "updatedAt" in value);

/** Depth guard against pathological / cyclic data (Payload documents are trees). */
const MAX_DEPTH = 24;

function collect(value: unknown, out: string[], depth: number): void {
  if (depth > MAX_DEPTH || value === null || value === undefined) return;
  if (typeof value === "string") {
    if (isReadableString(value)) out.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collect(item, out, depth + 1);
    return;
  }
  if (!isObject(value)) return; // numbers, booleans: no copy.
  if (isLexicalState(value)) {
    const text = lexicalToText(value);
    if (text !== "") out.push(text);
    return;
  }
  if (depth > 0 && isPopulatedDocument(value)) return;
  for (const [key, child] of Object.entries(value)) {
    if (SKIPPED_KEYS.has(key)) continue;
    collect(child, out, depth + 1);
  }
}

/** Short strings repeated verbatim (the H1 = `title`, repeated card captions) are kept once. */
const DEDUPE_MAX_LENGTH = 200;

function dedupe(parts: readonly string[]): string[] {
  const seen = new Set<string>();
  return parts.filter((part) => {
    if (part.length > DEDUPE_MAX_LENGTH) return true;
    const key = part.toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export interface DocumentToTextOptions {
  /** Leading text (the H1 / title), placed before the document's own copy. */
  lead?: string | null | undefined;
  /** Maximum length of the result, `BODY_TEXT_MAX_LENGTH` by default. */
  maxLength?: number;
}

/**
 * All readable copy of a CMS document as one string: the `lead` (H1), then every text / textarea
 * value and every rich-text field in document order (intro, typed sections, `layout[]` blocks:
 * rich text, card titles and captions, table cells, FAQ questions and answers…), then the SEO
 * description. Identifiers, routing fields and populated relations are skipped (`SKIPPED_KEYS`).
 * NOT normalized: pass the result through `normalizeRu` before indexing. Cut to `maxLength`.
 */
export function documentToText(doc: unknown, opts: DocumentToTextOptions = {}): string {
  const { lead, maxLength = BODY_TEXT_MAX_LENGTH } = opts;
  const parts: string[] = [];
  if (typeof lead === "string" && lead.trim() !== "") parts.push(lead.trim());
  if (isObject(doc)) {
    collect(doc, parts, 0);
    const seo = doc.seo;
    if (isObject(seo) && typeof seo.description === "string" && seo.description.trim() !== "") {
      parts.push(seo.description.trim());
    }
  }
  const text = dedupe(parts).join(" ").replace(/\s+/g, " ").trim();
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}
