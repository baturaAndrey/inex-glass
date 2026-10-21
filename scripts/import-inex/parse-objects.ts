/**
 * inex.su portfolio object page (cached Firecrawl scrape) → `ParsedObject` (task 37).
 *
 *   pnpm tsx scripts/import-inex/parse-objects.ts [--only=<substr>] [--json]
 *
 * As a CLI it parses every cached object page and prints a summary (or the JSON) — a dry check
 * of the selectors without touching the database. Selectors live in `./selectors.ts`.
 */
import path from "node:path";
import { parseArgs } from "node:util";

import * as cheerio from "cheerio";

import { checkStopWords } from "@/lib/domain/stop-words";
import { lastSegment, portfolioCategory } from "@/lib/migration/rules";

import {
  EMAIL,
  FLAG_SENTENCE,
  KNOWN_CITIES,
  OBJECT,
  PHONE,
  PHOTO_CAPTION_SUFFIX,
  PHOTO_EXTENSIONS,
  PHOTO_URL_ALLOW,
  PHOTO_URL_DENY,
  PAGE_DATE,
  REGION_LOCATION,
  REMOVE_SENTENCE,
  TITLE_SUFFIX,
  cityPattern,
} from "./selectors";
import { cachedHtml, crawlTargets, readCache, readSourceCsv, type CacheEntry } from "./shared";

export interface ParsedPhoto {
  src: string;
  alt?: string;
}

export interface ParsedObject {
  oldUrl: string;
  /** Portfolio category from the path (`/portfolio/<cat>/…`). */
  categorySlug: string;
  /** H1 without the site suffix. */
  name: string;
  /** Description as plain text (contacts and installation promises removed). */
  taskText: string;
  city?: string;
  /**
   * Region given as the location instead of a city («Челябинская область», «ХМАО – Югра»): not a
   * `cities` record — reported, the editor picks the city.
   */
  region?: string;
  year?: number;
  /** Publication date found on the page (ISO), the preferred `sortDate`. */
  pageDate?: string;
  /** Map label of the object («Частный коттедж», «ТРК»…), input for the object-type heuristic. */
  kindLabel?: string;
  photos: ParsedPhoto[];
  /** Product list found on the page, kept verbatim (not split into `spec[]`). */
  specs?: string[];
  /** What the text cleaning changed or flagged — goes to the report and `importNotes`. */
  notes: TextNote[];
}

export interface TextNote {
  kind: "removed" | "flagged" | "stop-word" | "contact";
  text: string;
}

export type ParseResult =
  { ok: true; value: ParsedObject } | { ok: false; oldUrl: string; reason: string };

/* ------------------------------------------------------------------------------------------ */
/* Text helpers (shared with parse-showers.ts)                                                */
/* ------------------------------------------------------------------------------------------ */

/** Collapses whitespace (incl. NBSP) and trims. */
export function squash(text: string): string {
  return text.replace(/[\s ]+/g, " ").trim();
}

export interface BlockTextOptions {
  /**
   * The first import (wave 6) turned EVERY `<br>` into a paragraph break, which cut sentences
   * wrapped with `<br>` into separate paragraphs. Kept only so `import.ts --fix-existing` can
   * recompute the old output and recognise texts no editor has touched.
   */
  legacyBr?: boolean;
}

/**
 * Plain text of an element. Paragraphs come from block boundaries (`<p>`, `<li>`, `<div>`,
 * headings) and from a double `<br><br>`; a single `<br>` is a soft line wrap inside the
 * paragraph (inex.su wraps sentences mid-way: «…на алюминиевом профиле,<br>двойной витраж…»),
 * so it becomes a space.
 */
export function blockText(
  $: cheerio.CheerioAPI,
  selector: string,
  options: BlockTextOptions = {}
): string {
  const parts: string[] = [];
  $(selector).each((_, element) => {
    const clone = $(element).clone();
    if (options.legacyBr) {
      clone.find("br").replaceWith("\n");
    } else {
      // Source line breaks are formatting, not text: only markup decides the paragraphs.
      clone
        .find("*")
        .addBack()
        .contents()
        .each((__, node) => {
          if (node.type === "text") node.data = node.data.replace(/\s+/g, " ");
        });
      // A `<br>` directly followed (whitespace aside) by another one: a paragraph break.
      clone.find("br").each((__, br) => {
        let next = br.nextSibling;
        while (next && next.type === "text" && !next.data.trim()) next = next.nextSibling;
        const double = next !== null && next.type === "tag" && next.name === "br";
        $(br).replaceWith(double ? "\n" : " ");
      });
    }
    clone.find("p, li, div, h2, h3, h4").each((__, block) => {
      $(block).append("\n");
    });
    parts.push(clone.text());
  });
  return parts.join("\n").split(/\n+/).map(squash).filter(Boolean).join("\n");
}

// Non-global copies: `test` on a /g regex is stateful (lastIndex).
const PHONE_TEST = new RegExp(PHONE.source);
const EMAIL_TEST = new RegExp(EMAIL.source);

/** Splits into sentences, keeping the terminal punctuation. */
function sentences(paragraph: string): string[] {
  return (
    paragraph
      .match(/[^.!?…]+(?:[.!?…]+|$)/g)
      ?.map(squash)
      .filter(Boolean) ?? []
  );
}

/** Stop-word check applied to imported texts (`checkStopWords` + the CMS list, see `./stop-words`). */
export type StopWordCheck = (text: string) => ReadonlyArray<{ match: string; message: string }>;

/** Built-in rules only: used when no CMS list is passed (offline CLI checks of the parser). */
const builtInStopWords: StopWordCheck = (text) => checkStopWords(text);

/**
 * Applies the content rules of ТЗ §11 to imported text: removes contacts and sentences that
 * promise installation/measuring/turnkey work, flags door mentions and stop-words. Nothing is
 * rewritten silently — every change is returned as a note.
 */
export function cleanText(
  raw: string,
  stopWords: StopWordCheck = builtInStopWords
): { text: string; notes: TextNote[] } {
  const notes: TextNote[] = [];
  const paragraphs = raw.split("\n").map((paragraph) => {
    const kept: string[] = [];
    for (const sentence of sentences(paragraph)) {
      if (PHONE_TEST.test(sentence) || EMAIL_TEST.test(sentence)) {
        notes.push({ kind: "contact", text: sentence });
        continue;
      }
      if (REMOVE_SENTENCE.some((pattern) => pattern.test(sentence))) {
        notes.push({ kind: "removed", text: sentence });
        continue;
      }
      if (FLAG_SENTENCE.some((pattern) => pattern.test(sentence))) {
        notes.push({ kind: "flagged", text: sentence });
      }
      kept.push(sentence);
    }
    return kept.join(" ");
  });
  const text = paragraphs.filter(Boolean).join("\n\n");
  for (const finding of stopWords(text)) {
    notes.push({ kind: "stop-word", text: `${finding.match} — ${finding.message}` });
  }
  return { text, notes };
}

/** Longest file name kept (well under the 255-byte limit of common file systems). */
const MAX_PHOTO_NAME_LENGTH = 120;
const FALLBACK_PHOTO_NAME = "photo";

/**
 * Identity of a photo for de-duplication (`collectPhotos`, the merged gallery in `import.ts`,
 * `sameObject`): host + decoded URL path, case preserved, query/hash ignored. NOT the sanitized
 * file name: sanitizing is lossy (`фото 1.jpg` and `фото_1.jpg`, `A.jpg` and `a.jpg`, or
 * `img.jpg` in two directories collapse to one name), which silently dropped distinct photos.
 * Identical content under different URLs is still merged later, by sha1 of the bytes
 * (`import.ts`).
 */
export function photoKey(src: string): string {
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return src;
  }
  let pathname = url.pathname;
  try {
    pathname = decodeURIComponent(pathname);
  } catch {
    // Malformed percent-encoding: the raw path is still a stable identity.
  }
  return `${url.host}${pathname.normalize("NFC")}`;
}

/**
 * Safe file name of a photo URL: the on-disk name of the download (`import.ts`, inside a
 * per-sha1 directory). Not a dedup key — see `photoKey`. The URL path is decoded BEFORE taking
 * the base name — decoding
 * afterwards turned `%2F..%2F` into `../` (path traversal) — and both `/` and `\` separate
 * segments. Anything outside letters, digits, `.`, `_`, `-` becomes `_`; leading dots are dropped
 * (no hidden files, no `..`).
 */
export function photoFileName(src: string): string {
  let pathname: string;
  try {
    pathname = new URL(src).pathname;
  } catch {
    pathname = src;
  }
  let decoded = pathname;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    // Malformed percent-encoding: keep the raw path, the sanitizer below makes it safe.
  }
  const base = decoded.split(/[/\\]/).pop() ?? "";
  const safe = base
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}._-]+/gu, "_")
    .replace(/^[._]+/, "")
    .slice(0, MAX_PHOTO_NAME_LENGTH)
    .toLowerCase();
  return safe || FALLBACK_PHOTO_NAME;
}

/** Collects absolute, de-duplicated photo URLs from links matching `selector`. */
export function collectPhotos(
  $: cheerio.CheerioAPI,
  selector: string,
  baseUrl: string
): ParsedPhoto[] {
  const seen = new Set<string>();
  const photos: ParsedPhoto[] = [];
  $(selector).each((_, element) => {
    const href = $(element).attr("href");
    if (!href) return;
    let src: string;
    try {
      src = new URL(href, baseUrl).toString();
    } catch {
      return;
    }
    if (!PHOTO_URL_ALLOW.test(src) || PHOTO_URL_DENY.test(src)) return;
    if (!PHOTO_EXTENSIONS.test(new URL(src).pathname)) return;
    const key = photoKey(src);
    if (seen.has(key)) return;
    seen.add(key);
    const caption = squash($(element).attr("title") ?? "").replace(PHOTO_CAPTION_SUFFIX, "");
    photos.push(caption ? { src, alt: caption } : { src });
  });
  return photos;
}

export function cleanTitle(title: string): string {
  return squash(title).replace(TITLE_SUFFIX, "");
}

const YEAR = /(?<!\d)((?:19|20)\d{2})(?!\d)/g;
const MIN_YEAR = 1990;

/** First plausible year in the text (1990 … next year). */
export function findYear(text: string, now = new Date()): number | undefined {
  for (const match of text.matchAll(YEAR)) {
    const year = Number(match[1]);
    if (year >= MIN_YEAR && year <= now.getFullYear() + 1) return year;
  }
  return undefined;
}

export function findCity(text: string): string | undefined {
  return KNOWN_CITIES.find((city) => cityPattern(city).test(text));
}

/**
 * Splits the inex.su location («Челябинск», «Челябинская область», «Сатка, Челябинская
 * область») into a settlement and a region. Comma-separated parts are classified one by one;
 * a part matching `REGION_LOCATION` is never a city.
 */
export function splitLocation(location: string): { city?: string; region?: string } {
  const parts = location.split(",").map(squash).filter(Boolean);
  const region = parts.find((part) => REGION_LOCATION.test(part));
  const city = parts.find((part) => !REGION_LOCATION.test(part));
  return { ...(city ? { city } : {}), ...(region ? { region } : {}) };
}

/**
 * Publication date of the page, when the markup has one (`article:published_time`, JSON-LD
 * `datePublished`, `<time datetime>`). The inex.su pages crawled on 2026-10-21 carry none — the
 * import then falls back (see `sortDateOf` in `import.ts`).
 */
export function findPageDate($: cheerio.CheerioAPI, html: string): string | undefined {
  const candidates = [
    $(PAGE_DATE.meta).first().attr("content"),
    PAGE_DATE.jsonLd.exec(html)?.[1],
    $(PAGE_DATE.time).first().attr("datetime"),
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const time = Date.parse(candidate);
    if (Number.isFinite(time)) return new Date(time).toISOString();
  }
  return undefined;
}

/* ------------------------------------------------------------------------------------------ */
/* Object page                                                                                */
/* ------------------------------------------------------------------------------------------ */

/** Parser options: the stop-word check (CMS list) and the legacy `<br>` mode (`BlockTextOptions`). */
export interface ParseOptions extends BlockTextOptions {
  stopWords?: StopWordCheck;
}

export function parseObject(entry: CacheEntry, options: ParseOptions = {}): ParseResult {
  const oldUrl = entry.oldUrl;
  if (!entry.ok) return { ok: false, oldUrl, reason: entry.error ?? "страница не получена" };
  const html = cachedHtml(entry);
  if (!html) return { ok: false, oldUrl, reason: "пустой HTML" };
  const $ = cheerio.load(html);

  const name = cleanTitle($(OBJECT.name).first().text());
  const photos = collectPhotos($, OBJECT.photoLinks, entry.url);
  // R7: nothing usable on the page.
  if (!name && photos.length === 0) return { ok: false, oldUrl, reason: "нет названия и фото" };

  let rawDescription = blockText($, OBJECT.description, options);
  if (!rawDescription) rawDescription = blockText($, OBJECT.descriptionFallback, options);
  const { text: taskText, notes } = cleanText(rawDescription, options.stopWords);

  const specs = $(OBJECT.description)
    .find("li")
    .map((_, element) => squash($(element).text()))
    .get()
    .filter(Boolean);

  // The location line may name a region instead of a city (wave-6 review: regions were imported
  // as cities); then the city is looked up in the name and description.
  const location = splitLocation(squash($(OBJECT.city).first().text()));
  const city = location.city ?? findCity(`${name}\n${rawDescription}`);
  const year = findYear(`${name}\n${rawDescription}`);
  const pageDate = findPageDate($, html);
  const kindLabel = OBJECT.mapLabel.exec(html)?.[1]?.trim();

  const value: ParsedObject = {
    oldUrl,
    categorySlug: portfolioCategory(oldUrl) ?? "",
    name: name || lastSegment(oldUrl),
    taskText,
    photos,
    notes,
    ...(city ? { city } : {}),
    ...(location.region ? { region: location.region } : {}),
    ...(year ? { year } : {}),
    ...(pageDate ? { pageDate } : {}),
    ...(kindLabel ? { kindLabel } : {}),
    ...(specs.length > 0 ? { specs } : {}),
  };
  return { ok: true, value };
}

/**
 * R5 collision test: same name (case-insensitive) and at least half of the photos (`photoKey`) in
 * common (relative to the larger gallery).
 */
export function sameObject(a: ParsedObject, b: ParsedObject): boolean {
  if (a.name.trim().toLowerCase() !== b.name.trim().toLowerCase()) return false;
  const filesA = new Set(a.photos.map((photo) => photoKey(photo.src)));
  const filesB = new Set(b.photos.map((photo) => photoKey(photo.src)));
  const larger = Math.max(filesA.size, filesB.size);
  if (larger === 0) return false;
  const common = [...filesA].filter((file) => filesB.has(file)).length;
  return common / larger >= 0.5;
}

/** Parses every cached object page of the CSV (pages never crawled are left out). */
export async function parseAllObjects(
  options: ParseOptions = {}
): Promise<Map<string, ParseResult>> {
  const rows = await readSourceCsv();
  const results = new Map<string, ParseResult>();
  for (const target of crawlTargets(rows)) {
    if (target.kind !== "object") continue;
    const entry = await readCache(target.oldUrl);
    if (entry) results.set(target.oldUrl, parseObject(entry, options));
  }
  return results;
}

/* ------------------------------------------------------------------------------------------ */
/* CLI                                                                                        */
/* ------------------------------------------------------------------------------------------ */

async function cli(): Promise<void> {
  const { values } = parseArgs({
    options: { only: { type: "string" }, json: { type: "boolean", default: false } },
  });
  const results = [...(await parseAllObjects()).values()].filter(
    (result) =>
      !values.only || (result.ok ? result.value.oldUrl : result.oldUrl).includes(values.only)
  );
  if (values.json) {
    process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
    return;
  }
  for (const result of results) {
    if (!result.ok) {
      process.stdout.write(`FAIL ${result.oldUrl}: ${result.reason}\n`);
      continue;
    }
    const o = result.value;
    process.stdout.write(
      `${o.oldUrl}\n  «${o.name}» city=${o.city ?? "-"} year=${o.year ?? "-"} kind=${o.kindLabel ?? "-"} ` +
        `photos=${o.photos.length} task=${o.taskText.length}ch notes=${o.notes.length}\n`
    );
  }
  const ok = results.filter((result) => result.ok).length;
  process.stdout.write(`итого: ${ok}/${results.length} разобрано\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  await cli();
}
