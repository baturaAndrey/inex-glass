/**
 * Shared I/O of the inex.su import scripts (task 37): paths, the redirect CSV, the Firecrawl
 * cache. Dev tooling only — never bundled into the app.
 */
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { parse } from "csv-parse/sync";

import {
  classify,
  fixRow,
  isShowerConfigUrl,
  isShowerListingUrl,
  type Action,
  type Row,
} from "@/lib/migration/rules";

export const ROOT = path.resolve(import.meta.dirname, "..", "..");
export const SOURCE_CSV = path.join(ROOT, "docs", "inex", "12-migration-inex-su.csv");
export const FIXED_CSV = path.join(ROOT, "docs", "inex", "12-migration-inex-su.fixed.csv");
export const META_MD = path.join(ROOT, "docs", "inex", "17-meta.md");
export const DISPUTED_REPORT = path.join(ROOT, "docs", "reports", "migration-disputed.md");
export const IMPORT_REPORT = path.join(ROOT, "docs", "reports", "import-inex-report.md");
export const CACHE_DIR = path.join(ROOT, "scripts", ".cache", "firecrawl");
export const TMP_DIR = path.join(ROOT, "scripts", ".import-tmp");
export const SLUGS_JSON = path.join(TMP_DIR, "slugs.json");
export const CRAWL_STATS_JSON = path.join(TMP_DIR, "crawl-stats.json");
export const IMPORT_STATS_JSON = path.join(TMP_DIR, "import-stats.json");

export const INEX_ORIGIN = "https://inex.su";

/* ------------------------------------------------------------------------------------------ */
/* CSV                                                                                        */
/* ------------------------------------------------------------------------------------------ */

const ACTIONS: ReadonlySet<string> = new Set(["301", "stay"]);

/** Reads the source redirect map (`;`, UTF-8 with BOM). */
export async function readSourceCsv(file = SOURCE_CSV): Promise<Row[]> {
  const text = await readFile(file, "utf8");
  const records = parse(text, {
    delimiter: ";",
    bom: true,
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Array<Record<string, string | undefined>>;
  return records.map((record, index) => {
    const action = record.action ?? "";
    if (!ACTIONS.has(action)) throw new Error(`CSV строка ${index + 2}: action «${action}»`);
    return {
      old_url: record.old_url ?? "",
      new_url: record.new_url ?? "",
      action: action as Action,
      note: record.note ?? "",
    };
  });
}

/** Quotes a CSV cell only when needed (`;`, quote or newline inside). */
export function csvCell(value: string): string {
  return /[;"\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Writes rows as `;`-separated UTF-8 with BOM and LF line endings. */
export async function writeCsv(
  file: string,
  header: readonly string[],
  rows: ReadonlyArray<readonly string[]>
): Promise<void> {
  const lines = [header, ...rows].map((cells) => cells.map(csvCell).join(";"));
  await writeFileAtomic(file, `﻿${lines.join("\n")}\n`);
}

/* ------------------------------------------------------------------------------------------ */
/* Crawl targets                                                                              */
/* ------------------------------------------------------------------------------------------ */

export type PageKind = "object" | "shower" | "shower-listing" | "category";

export interface CrawlTarget {
  oldUrl: string;
  kind: PageKind;
}

/**
 * Pages worth a Firecrawl credit: portfolio objects that still redirect after R1–R4 (no stairs,
 * no interior finishing, no categories) and the shower configurations + their listing.
 */
export function crawlTargets(rows: readonly Row[]): CrawlTarget[] {
  const targets: CrawlTarget[] = [];
  for (const row of rows) {
    if (row.action !== "301") continue;
    if (classify(row) === "object" && fixRow(row) === null) {
      targets.push({ oldUrl: row.old_url, kind: "object" });
    } else if (isShowerConfigUrl(row.old_url)) {
      targets.push({ oldUrl: row.old_url, kind: "shower" });
    } else if (isShowerListingUrl(row.old_url)) {
      targets.push({ oldUrl: row.old_url, kind: "shower-listing" });
    }
  }
  return targets;
}

/** Absolute inex.su URL; non-ASCII (the Cyrillic «о») is percent-encoded. */
export function inexUrl(oldUrl: string): string {
  return encodeURI(`${INEX_ORIGIN}${oldUrl}`);
}

/* ------------------------------------------------------------------------------------------ */
/* Firecrawl cache                                                                            */
/* ------------------------------------------------------------------------------------------ */

export interface FirecrawlMetadata {
  title?: string;
  description?: string;
  sourceURL?: string;
  url?: string;
  statusCode?: number;
  [key: string]: unknown;
}

export interface FirecrawlDocument {
  markdown?: string;
  html?: string;
  rawHtml?: string;
  links?: string[];
  metadata?: FirecrawlMetadata;
}

/** One cached scrape: the full API `data` (or the error) plus when it was fetched. */
export interface CacheEntry {
  url: string;
  oldUrl: string;
  fetchedAt: string;
  ok: boolean;
  error?: string;
  data?: FirecrawlDocument;
  creditsUsed?: number;
}

export function cacheFile(url: string): string {
  const hash = createHash("sha1").update(url).digest("hex");
  return path.join(CACHE_DIR, `${hash}.json`);
}

export async function readCache(oldUrl: string): Promise<CacheEntry | null> {
  const file = cacheFile(inexUrl(oldUrl));
  if (!existsSync(file)) return null;
  return JSON.parse(await readFile(file, "utf8")) as CacheEntry;
}

export async function writeCache(entry: CacheEntry): Promise<void> {
  await writeFileAtomic(cacheFile(entry.url), JSON.stringify(entry, null, 2));
}

/** HTML of a cached page: prefer the raw page (galleries live outside the main content). */
export function cachedHtml(entry: CacheEntry | null): string {
  return entry?.data?.rawHtml ?? entry?.data?.html ?? "";
}

/* ------------------------------------------------------------------------------------------ */
/* Files                                                                                      */
/* ------------------------------------------------------------------------------------------ */

/** Write-then-rename, so an interrupted run never leaves a truncated file. */
export async function writeFileAtomic(file: string, content: string | Uint8Array): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, content);
  await rename(tmp, file);
}

export async function readJson<T>(file: string, fallback: T): Promise<T> {
  if (!existsSync(file)) return fallback;
  return JSON.parse(await readFile(file, "utf8")) as T;
}

/** Runs `worker` over `items` with at most `limit` in flight; keeps the result order. */
export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const run = async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index] as T, index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Markdown table row with `|` escaped. */
export function mdRow(cells: ReadonlyArray<string | number>): string {
  return `| ${cells.map((cell) => String(cell).replace(/\|/g, "\\|").replace(/\n/g, " ")).join(" | ")} |`;
}
