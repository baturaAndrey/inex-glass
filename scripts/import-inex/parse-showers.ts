/**
 * inex.su shower configuration page (cached Firecrawl scrape) → `ParsedShower` (task 37).
 *
 *   pnpm tsx scripts/import-inex/parse-showers.ts [--json]
 *
 * The card order is the order of the configurations on the listing `/produkciya/dushevye`
 * (fallback: CSV order). Prices and hardware thumbnails are deliberately not imported.
 */
import path from "node:path";
import { parseArgs } from "node:util";

import * as cheerio from "cheerio";

import { isShowerListingUrl, lastSegment } from "@/lib/migration/rules";

import {
  blockText,
  cleanText,
  cleanTitle,
  collectPhotos,
  squash,
  type ParseOptions,
  type ParsedPhoto,
  type TextNote,
} from "./parse-objects";
import { SHOWER, SHOWER_LISTING } from "./selectors";
import { cachedHtml, crawlTargets, readCache, readSourceCsv, type CacheEntry } from "./shared";

export interface ParsedShower {
  oldUrl: string;
  name: string;
  description: string;
  /** Product image (the slider photo named after the URL slug, else the first one). */
  image: ParsedPhoto;
  /** Other slider photos (installations), for the `gallery` field. */
  gallery: ParsedPhoto[];
  order: number;
  /** Price on inex.su — reported only, never imported (prices come from CMS globals). */
  priceText?: string;
  notes: TextNote[];
}

export type ShowerParseResult =
  { ok: true; value: ParsedShower } | { ok: false; oldUrl: string; reason: string };

/** Distance between card orders, so editors can slot a card in between. */
const ORDER_STEP = 10;

/** Config slugs in the order of the listing page (empty when the listing is not cached). */
export function listingOrder(entry: CacheEntry | null): string[] {
  const html = cachedHtml(entry);
  if (!html) return [];
  const $ = cheerio.load(html);
  const slugs: string[] = [];
  $(SHOWER_LISTING.items).each((_, element) => {
    const href = $(element).attr("href");
    if (!href) return;
    const slug = lastSegment(new URL(href, "https://inex.su").pathname);
    if (slug && slug !== "dushevye" && !slugs.includes(slug)) slugs.push(slug);
  });
  return slugs;
}

export function parseShower(
  entry: CacheEntry,
  order: number,
  options: ParseOptions = {}
): ShowerParseResult {
  const oldUrl = entry.oldUrl;
  if (!entry.ok) return { ok: false, oldUrl, reason: entry.error ?? "страница не получена" };
  const html = cachedHtml(entry);
  if (!html) return { ok: false, oldUrl, reason: "пустой HTML" };
  const $ = cheerio.load(html);

  const name = cleanTitle($(SHOWER.name).first().text());
  let photos = collectPhotos($, SHOWER.sliderLinks, entry.url);
  if (photos.length === 0) photos = collectPhotos($, SHOWER.sliderFallback, entry.url);
  const slug = lastSegment(oldUrl).toLowerCase();
  const image =
    photos.find((photo) =>
      path.posix.basename(new URL(photo.src).pathname).toLowerCase().startsWith(slug)
    ) ?? photos[0];
  if (!name || !image) return { ok: false, oldUrl, reason: !name ? "нет названия" : "нет фото" };

  const { text: description, notes } = cleanText(
    blockText($, SHOWER.description, options),
    options.stopWords
  );
  const priceText = squash($(SHOWER.price).first().text());
  const value: ParsedShower = {
    oldUrl,
    name,
    description,
    image: { src: image.src, alt: image.alt ?? name },
    gallery: photos.filter((photo) => photo !== image),
    order,
    notes,
    ...(priceText ? { priceText } : {}),
  };
  return { ok: true, value };
}

/** Parses every cached shower configuration; `order` follows the listing, then the CSV. */
export async function parseAllShowers(options: ParseOptions = {}): Promise<ShowerParseResult[]> {
  const targets = crawlTargets(await readSourceCsv());
  const listing = targets.find((target) => isShowerListingUrl(target.oldUrl));
  const order = listingOrder(listing ? await readCache(listing.oldUrl) : null);
  const showers = targets.filter((target) => target.kind === "shower");

  const results: ShowerParseResult[] = [];
  for (const [csvIndex, target] of showers.entries()) {
    const entry = await readCache(target.oldUrl);
    if (!entry) continue;
    const listed = order.indexOf(lastSegment(target.oldUrl));
    // Configurations missing from the listing go after the listed ones, in CSV order.
    const position = listed >= 0 ? listed : order.length + csvIndex;
    results.push(parseShower(entry, (position + 1) * ORDER_STEP, options));
  }
  return results.sort((a, b) => (a.ok && b.ok ? a.value.order - b.value.order : 0));
}

async function cli(): Promise<void> {
  const { values } = parseArgs({ options: { json: { type: "boolean", default: false } } });
  const results = await parseAllShowers();
  if (values.json) {
    process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
    return;
  }
  for (const result of results) {
    if (!result.ok) {
      process.stdout.write(`FAIL ${result.oldUrl}: ${result.reason}\n`);
      continue;
    }
    const s = result.value;
    process.stdout.write(
      `${String(s.order).padStart(4)} «${s.name}» image=${path.posix.basename(s.image.src)} ` +
        `gallery=${s.gallery.length} desc=${s.description.length}ch notes=${s.notes.length}\n`
    );
  }
  process.stdout.write(`итого: ${results.filter((r) => r.ok).length}/${results.length}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  await cli();
}
