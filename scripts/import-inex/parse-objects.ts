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
  year?: number;
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

/**
 * Plain text of an element: `<br>` and block boundaries become line breaks, so sentences
 * written across `<br>` stay separate.
 */
export function blockText($: cheerio.CheerioAPI, selector: string): string {
  const parts: string[] = [];
  $(selector).each((_, element) => {
    const clone = $(element).clone();
    clone.find("br").replaceWith("\n");
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

/**
 * Applies the content rules of ТЗ §11 to imported text: removes contacts and sentences that
 * promise installation/measuring/turnkey work, flags door mentions and stop-words. Nothing is
 * rewritten silently — every change is returned as a note.
 */
export function cleanText(raw: string): { text: string; notes: TextNote[] } {
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
  for (const finding of checkStopWords(text)) {
    notes.push({ kind: "stop-word", text: `${finding.match} — ${finding.message}` });
  }
  return { text, notes };
}

/** File name of a photo URL (dedup key, also used by `sameObject`). */
export function photoFileName(src: string): string {
  try {
    return decodeURIComponent(path.posix.basename(new URL(src).pathname)).toLowerCase();
  } catch {
    return src.toLowerCase();
  }
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
    const key = photoFileName(src);
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

/* ------------------------------------------------------------------------------------------ */
/* Object page                                                                                */
/* ------------------------------------------------------------------------------------------ */

export function parseObject(entry: CacheEntry): ParseResult {
  const oldUrl = entry.oldUrl;
  if (!entry.ok) return { ok: false, oldUrl, reason: entry.error ?? "страница не получена" };
  const html = cachedHtml(entry);
  if (!html) return { ok: false, oldUrl, reason: "пустой HTML" };
  const $ = cheerio.load(html);

  const name = cleanTitle($(OBJECT.name).first().text());
  const photos = collectPhotos($, OBJECT.photoLinks, entry.url);
  // R7: nothing usable on the page.
  if (!name && photos.length === 0) return { ok: false, oldUrl, reason: "нет названия и фото" };

  let rawDescription = blockText($, OBJECT.description);
  if (!rawDescription) rawDescription = blockText($, OBJECT.descriptionFallback);
  const { text: taskText, notes } = cleanText(rawDescription);

  const specs = $(OBJECT.description)
    .find("li")
    .map((_, element) => squash($(element).text()))
    .get()
    .filter(Boolean);

  const explicitCity = squash($(OBJECT.city).first().text());
  const city = explicitCity || findCity(`${name}\n${rawDescription}`);
  const year = findYear(`${name}\n${rawDescription}`);
  const kindLabel = OBJECT.mapLabel.exec(html)?.[1]?.trim();

  const value: ParsedObject = {
    oldUrl,
    categorySlug: portfolioCategory(oldUrl) ?? "",
    name: name || lastSegment(oldUrl),
    taskText,
    photos,
    notes,
    ...(city ? { city } : {}),
    ...(year ? { year } : {}),
    ...(kindLabel ? { kindLabel } : {}),
    ...(specs.length > 0 ? { specs } : {}),
  };
  return { ok: true, value };
}

/**
 * R5 collision test: same name (case-insensitive) and at least half of the photo file names in
 * common (relative to the larger gallery).
 */
export function sameObject(a: ParsedObject, b: ParsedObject): boolean {
  if (a.name.trim().toLowerCase() !== b.name.trim().toLowerCase()) return false;
  const filesA = new Set(a.photos.map((photo) => photoFileName(photo.src)));
  const filesB = new Set(b.photos.map((photo) => photoFileName(photo.src)));
  const larger = Math.max(filesA.size, filesB.size);
  if (larger === 0) return false;
  const common = [...filesA].filter((file) => filesB.has(file)).length;
  return common / larger >= 0.5;
}

/** Parses every cached object page of the CSV (pages never crawled are left out). */
export async function parseAllObjects(): Promise<Map<string, ParseResult>> {
  const rows = await readSourceCsv();
  const results = new Map<string, ParseResult>();
  for (const target of crawlTargets(rows)) {
    if (target.kind !== "object") continue;
    const entry = await readCache(target.oldUrl);
    if (entry) results.set(target.oldUrl, parseObject(entry));
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
