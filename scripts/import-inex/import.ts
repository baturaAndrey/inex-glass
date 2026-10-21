/**
 * Import of the inex.su portfolio and shower catalogue into Payload as DRAFTS (task 37).
 *
 *   pnpm tsx --env-file=.env scripts/import-inex/import.ts [--dry-run] [--only=objects|showers]
 *        [--limit=N] [--fix-existing] [--i-know-this-is-prod]
 *
 * `--fix-existing` (wave-6 review) repairs documents written by an earlier run — only values
 * the import itself wrote and no editor has changed since:
 *   - `task` / shower `description` / `importNotes` equal to what the old parser produced (every
 *     `<br>` was a paragraph break, built-in stop words only) → re-parsed text;
 *   - `city` pointing at a «city» created from a region («Челябинская область») → the city found
 *     in the text or empty; such region records are deleted once nothing references them;
 *   - `sortDate` still equal to the creation time of a document created by an import run → the
 *     page date / fallback of `sortDateOf`.
 * Works from the Firecrawl cache only (no crawling); idempotent — a second run changes nothing.
 *
 * Input: the Firecrawl cache of `crawl.ts` (run it first). Steps:
 *   1. taxonomies (find or create): `products` per portfolio category, `cities` found on the
 *      page, `object-types` by keyword (existing task-30 records only — never created here);
 *   2. photos: download (4 in parallel, 30 s timeout, 3 tries) → JPEG/PNG/WebP signature,
 *      ≥ 10 KB, ≥ 400 px → `media` (dedup by source URL and by sha1 of the content);
 *   3. `objects`: upsert by `legacyUrls` — new documents are created as drafts, existing ones
 *      only get their EMPTY fields filled (editor changes are never overwritten);
 *   4. `shower-configs`: upsert by `legacyUrl`, same policy, relation to the shower construction;
 *   5. `scripts/.import-tmp/slugs.json` (`{ oldUrl: slug }`) for `fix-csv.ts`;
 *   6. `docs/reports/import-inex-report.md`;
 *   7. `POST /api/revalidate/` of the running site (writes outside the admin skip the hooks).
 *
 * Nothing is ever published. Media files go to `MEDIA_DIR` (the collection `staticDir`): for
 * production run this inside the `tools` container with `/data/media` mounted, otherwise the
 * files stay on the machine that ran the script (see docs/deploy.md).
 *
 * Safety: refuses to run against production (`SITE_ENV=production` or a `DATABASE_URL` host
 * listed in `IMPORT_PROD_GUARD_HOSTS`, comma-separated) without `--i-know-this-is-prod`.
 */
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

import sharp from "sharp";

import {
  fixRows,
  lastSegment,
  objectSlugFromUrl,
  portfolioCategory,
  toLatinSlug,
  type ImportStatus,
} from "@/lib/migration/rules";
import {
  SEED_REQUEST_CONTEXT,
  getSeedContext,
  revalidateSite,
  type SeedContext,
} from "@/seed/context";
import type { Object as PortfolioObject, ShowerConfig } from "@/payload-types";

import {
  parseAllObjects,
  photoFileName,
  photoKey,
  sameObject,
  type ParseResult,
  type ParsedObject,
  type StopWordCheck,
  type ParsedPhoto,
  type TextNote,
} from "./parse-objects";
import { parseAllShowers, type ParsedShower } from "./parse-showers";
import {
  CATEGORY_PRODUCTS,
  MIN_PHOTO_BYTES,
  MIN_PHOTO_SIDE,
  OBJECT_TYPE_RULES,
  REGION_LOCATION,
} from "./selectors";
import { cmsStopWordCheck, type CmsStopWord } from "./stop-words";
import {
  CRAWL_STATS_JSON,
  IMPORT_REPORT,
  SLUGS_JSON,
  TMP_DIR,
  inexUrl,
  mapLimit,
  mdRow,
  readJson,
  readSourceCsv,
  sleep,
  writeFileAtomic,
} from "./shared";

const PHOTO_DIR = path.join(TMP_DIR, "photos");
const MEDIA_INDEX_JSON = path.join(TMP_DIR, "media-index.json");
const RUNS_JSON = path.join(TMP_DIR, "import-runs.json");
const OUTCOME_LABELS: Readonly<Record<string, string>> = {
  created: "создано",
  updated: "дополнено",
  unchanged: "без изменений",
};

const DOWNLOAD_CONCURRENCY = 4;
const DOWNLOAD_TIMEOUT_MS = 30_000;
const DOWNLOAD_ATTEMPTS = 3;
const MAX_TASK_LENGTH = 300;
/** Slug of the shower construction (seeded by task 26). */
const SHOWER_CONSTRUCTION_SLUG = "dushevye-peregorodki";
const MEDIA_CREDIT = "inex.su";

/**
 * `sortDate` of an imported object without a date on its page or a year in its text (none of
 * the inex.su pages crawled on 2026-10-21 has either). A fixed date before the new site's
 * launch: the inex.su archive sorts below every object an editor dates for real, and runs on
 * different days give the same value (the import date used before made the archive look «new»
 * and its order depend on when the script ran). Editors set the real completion date.
 */
const IMPORT_SORT_DATE_FALLBACK = "2020-01-01T00:00:00.000Z";
/** A `sortDate` this close to `createdAt` was set by the import at creation, not by an editor. */
const SORT_DATE_DEFAULT_TOLERANCE_MS = 60_000;
/** Slack after an import run's recorded duration when matching `createdAt` to the run. */
const RUN_WINDOW_SLACK_MS = 60_000;

/** Aliases of the task-30 object types (reference data seeded earlier under other slugs). */
const OBJECT_TYPE_ALIASES: Readonly<Record<string, readonly string[]>> = {
  tc: ["torgovye-centry"],
  bank: ["banki"],
  office: ["ofisy"],
  arena: ["areny"],
  airport: ["aeroporty"],
};

/* ------------------------------------------------------------------------------------------ */
/* Safety guard                                                                               */
/* ------------------------------------------------------------------------------------------ */

function assertNotProduction(allowProd: boolean): void {
  const guardHosts = (process.env.IMPORT_PROD_GUARD_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  let dbHost = "";
  try {
    dbHost = new URL(process.env.DATABASE_URL ?? "").hostname.toLowerCase();
  } catch {
    // An unparsable URL fails later in Payload with a clear message.
  }
  const isProd = process.env.SITE_ENV === "production" || guardHosts.includes(dbHost);
  if (isProd && !allowProd) {
    throw new Error(
      `похоже на production (SITE_ENV=${process.env.SITE_ENV ?? "?"}, хост БД ${dbHost || "?"}). ` +
        "Запуск только с флагом --i-know-this-is-prod"
    );
  }
}

/* ------------------------------------------------------------------------------------------ */
/* Report state                                                                               */
/* ------------------------------------------------------------------------------------------ */

type UpsertOutcome = "created" | "updated" | "unchanged" | "planned";

interface ObjectRecord {
  slug: string;
  name: string;
  oldUrls: string[];
  outcome: UpsertOutcome;
  missing: string[];
  generatedAlts: string[];
  notes: TextNote[];
  merged: boolean;
  /** Fields repaired by `--fix-existing`. */
  fixed: string[];
}

interface ShowerRecord {
  slug: string;
  name: string;
  oldUrl: string;
  outcome: UpsertOutcome;
  notes: TextNote[];
  priceText?: string;
  fixed: string[];
}

const stats = {
  photosFound: 0,
  photosDownloaded: 0,
  mediaCreated: 0,
  mediaReused: 0,
  photosSkipped: [] as Array<{ src: string; reason: string }>,
  errors: [] as Array<{ what: string; error: string }>,
  objects: [] as ObjectRecord[],
  showers: [] as ShowerRecord[],
  parseFailed: [] as Array<{ oldUrl: string; reason: string }>,
  slugChanges: [] as Array<{ oldUrl: string; from: string; to: string; reason: string }>,
  /** Region «cities» removed by `--fix-existing` (or kept, with the reason). */
  regionCities: [] as Array<{ name: string; result: string }>,
  /** Where the stop-word list came from (report). */
  stopWordSource: "",
};

const errorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    const data = (error as { data?: unknown }).data;
    return data ? `${error.message} ${JSON.stringify(data)}` : error.message;
  }
  return String(error);
};

/* ------------------------------------------------------------------------------------------ */
/* Taxonomies                                                                                 */
/* ------------------------------------------------------------------------------------------ */

type TaxonomyCollection = "products" | "cities" | "object-types";

class Taxonomies {
  private readonly cache = new Map<string, string | null>();

  constructor(
    private readonly ctx: SeedContext,
    private readonly dryRun: boolean
  ) {}

  /** Id of the first record with one of `slugs`; `null` when none exists. */
  private async find(collection: TaxonomyCollection, slugs: readonly string[], name?: string) {
    const or = [{ slug: { in: [...slugs] } }, ...(name ? [{ name: { equals: name } }] : [])];
    const { docs } = await this.ctx.payload.find({
      collection,
      where: { or },
      limit: 10,
      depth: 0,
      pagination: false,
      overrideAccess: true,
    });
    const bySlug = slugs.map((slug) => docs.find((doc) => doc.slug === slug)).find(Boolean);
    return (bySlug ?? docs[0])?.id ?? null;
  }

  private async findOrCreate(
    collection: "products" | "cities",
    slug: string,
    name: string,
    aliases: readonly string[] = []
  ): Promise<string | null> {
    const key = `${collection}:${slug}`;
    if (this.cache.has(key)) return this.cache.get(key) ?? null;
    let id = await this.find(collection, [slug, ...aliases], name);
    if (!id && !this.dryRun) {
      const doc = await this.ctx.payload.create({
        collection,
        data: { name, slug },
        depth: 0,
        overrideAccess: true,
        context: SEED_REQUEST_CONTEXT,
      });
      this.ctx.log(`${collection} ${slug}: создан`);
      id = doc.id;
    }
    this.cache.set(key, id);
    return id;
  }

  product(category: string): Promise<string | null> {
    const spec = CATEGORY_PRODUCTS[category];
    if (!spec) return Promise.resolve(null);
    return this.findOrCreate("products", spec.slug, spec.name, spec.aliases);
  }

  city(name: string): Promise<string | null> {
    // Defense in depth: the parser already moves regions out of `city`.
    if (REGION_LOCATION.test(name)) return Promise.resolve(null);
    return this.findOrCreate("cities", toLatinSlug(name), name);
  }

  /** `cities` records whose name is a region — created by the first import (wave 6). */
  async regionCities(): Promise<Array<{ id: string; name: string; createdAt: string }>> {
    const { docs } = await this.ctx.payload.find({
      collection: "cities",
      pagination: false,
      depth: 0,
      overrideAccess: true,
    });
    return docs
      .filter((doc) => REGION_LOCATION.test(doc.name))
      .map(({ id, name, createdAt }) => ({ id, name, createdAt }));
  }

  /** Object type by keyword; only existing records are used. */
  async objectType(text: string): Promise<string | null> {
    const rule = OBJECT_TYPE_RULES.find(([, pattern]) => pattern.test(text));
    if (!rule) return null;
    const [slug] = rule;
    const key = `object-types:${slug}`;
    if (!this.cache.has(key)) {
      this.cache.set(
        key,
        await this.find("object-types", [slug, ...(OBJECT_TYPE_ALIASES[slug] ?? [])])
      );
    }
    return this.cache.get(key) ?? null;
  }
}

/* ------------------------------------------------------------------------------------------ */
/* Media                                                                                      */
/* ------------------------------------------------------------------------------------------ */

interface MediaIndex {
  /** sha1 of the file content → media id. */
  bySha1: Record<string, string>;
}

/** Recognises JPEG / PNG / WebP by their magic bytes; returns the MIME type. */
function sniffImage(bytes: Uint8Array): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  const riff = Buffer.from(bytes.slice(0, 4)).toString("ascii");
  const webp = Buffer.from(bytes.slice(8, 12)).toString("ascii");
  return riff === "RIFF" && webp === "WEBP" ? "image/webp" : null;
}

async function download(src: string): Promise<Uint8Array> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= DOWNLOAD_ATTEMPTS; attempt += 1) {
    try {
      // inex.su serves Cyrillic-free paths, but encode defensively.
      const response = await fetch(encodeURI(decodeURI(src)), {
        signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return new Uint8Array(await response.arrayBuffer());
    } catch (error) {
      lastError = error;
      if (attempt < DOWNLOAD_ATTEMPTS) await sleep(1000 * attempt);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

class MediaStore {
  private readonly bySource = new Map<string, string>();
  private index: MediaIndex = { bySha1: {} };

  constructor(
    private readonly ctx: SeedContext,
    private readonly dryRun: boolean
  ) {}

  /** Loads media already imported from inex.su (idempotency across runs). */
  async init(): Promise<void> {
    const { docs } = await this.ctx.payload.find({
      collection: "media",
      where: { sourceUrl: { like: "inex.su" } },
      pagination: false,
      depth: 0,
      overrideAccess: true,
      select: { sourceUrl: true },
    });
    for (const doc of docs) if (doc.sourceUrl) this.bySource.set(doc.sourceUrl, doc.id);
    const index = await readJson<MediaIndex>(MEDIA_INDEX_JSON, { bySha1: {} });
    // Keep only ids that still exist (media may have been deleted by an editor).
    const ids = new Set(docs.map((doc) => doc.id));
    this.index = {
      bySha1: Object.fromEntries(Object.entries(index.bySha1).filter(([, id]) => ids.has(id))),
    };
  }

  async save(): Promise<void> {
    if (!this.dryRun) await writeFileAtomic(MEDIA_INDEX_JSON, JSON.stringify(this.index, null, 2));
  }

  /**
   * Media ids for the photos (order kept, skipped photos dropped). Downloads in parallel,
   * creates the media documents one by one (Payload resizes with sharp).
   */
  async resolve(
    photos: readonly ParsedPhoto[],
    alts: readonly string[]
  ): Promise<Array<{ id: string; alt: string }>> {
    stats.photosFound += photos.length;
    if (this.dryRun)
      return photos.map((photo, index) => ({ id: `dry-run:${photo.src}`, alt: alts[index] ?? "" }));

    const files = await mapLimit(photos, DOWNLOAD_CONCURRENCY, async (photo) => {
      if (this.bySource.has(photo.src)) return { photo, reuse: this.bySource.get(photo.src) };
      try {
        const bytes = await download(photo.src);
        stats.photosDownloaded += 1;
        return { photo, bytes };
      } catch (error) {
        stats.photosSkipped.push({ src: photo.src, reason: `скачивание: ${errorMessage(error)}` });
        return { photo };
      }
    });

    const result: Array<{ id: string; alt: string }> = [];
    for (const [index, file] of files.entries()) {
      const alt = alts[index] ?? "";
      if (file.reuse) {
        stats.mediaReused += 1;
        result.push({ id: file.reuse, alt });
        continue;
      }
      if (!file.bytes) continue;
      const id = await this.createMedia(file.photo.src, file.bytes, alt);
      if (id) result.push({ id, alt });
    }
    return result;
  }

  private async createMedia(src: string, bytes: Uint8Array, alt: string): Promise<string | null> {
    const skip = (reason: string) => {
      stats.photosSkipped.push({ src, reason });
      return null;
    };
    if (bytes.byteLength < MIN_PHOTO_BYTES) return skip(`меньше ${MIN_PHOTO_BYTES / 1024} КБ`);
    const mime = sniffImage(bytes);
    if (!mime) return skip("не JPEG/PNG/WebP по сигнатуре");
    const meta = await sharp(bytes)
      .metadata()
      .catch(() => null);
    if (!meta?.width || !meta.height) return skip("не удалось прочитать размеры");
    if (Math.max(meta.width, meta.height) < MIN_PHOTO_SIDE) {
      return skip(`меньше ${MIN_PHOTO_SIDE} px (${meta.width}×${meta.height})`);
    }

    const sha1 = createHash("sha1").update(bytes).digest("hex");
    const known = this.index.bySha1[sha1];
    if (known) {
      stats.mediaReused += 1;
      this.bySource.set(src, known);
      return known;
    }

    // `<sha1>/<original name>`: Payload keeps the original file name (deduplicated on disk).
    const photoDir = path.resolve(PHOTO_DIR, sha1);
    const filePath = path.resolve(photoDir, photoFileName(src));
    // Defense in depth: `photoFileName` already sanitizes, but a name taken from a remote URL
    // must never escape the download directory.
    if (path.dirname(filePath) !== photoDir) return skip("недопустимое имя файла");
    await mkdir(path.dirname(filePath), { recursive: true });
    if (!existsSync(filePath)) await writeFile(filePath, bytes);
    try {
      const doc = await this.ctx.payload.create({
        collection: "media",
        data: { alt, kind: "photo", isPlaceholder: false, sourceUrl: src, credit: MEDIA_CREDIT },
        filePath,
        depth: 0,
        overrideAccess: true,
        context: SEED_REQUEST_CONTEXT,
      });
      stats.mediaCreated += 1;
      this.bySource.set(src, doc.id);
      this.index.bySha1[sha1] = doc.id;
      return doc.id;
    } catch (error) {
      stats.errors.push({ what: `media ${src}`, error: errorMessage(error) });
      return null;
    }
  }
}

/* ------------------------------------------------------------------------------------------ */
/* Helpers                                                                                    */
/* ------------------------------------------------------------------------------------------ */

/** Alt text per photo: the source caption, or the deterministic «<name> — фото N». */
function photoAlts(
  name: string,
  photos: readonly ParsedPhoto[]
): { alts: string[]; generated: string[] } {
  const generated: string[] = [];
  const alts = photos.map((photo, index) => {
    if (photo.alt?.trim()) return photo.alt.trim();
    const alt = `${name} — фото ${index + 1}`;
    generated.push(alt);
    return alt;
  });
  return { alts, generated };
}

const today = () => new Date().toISOString().slice(0, 10);

/** Date in the first line of import notes («Импорт с inex.su 2026-10-21 (task 37).»). */
const IMPORT_NOTES_DATE = /^Импорт с inex\.su (\d{4}-\d{2}-\d{2}) /;

function importNotesText(
  oldUrls: readonly string[],
  notes: readonly TextNote[],
  extra: readonly string[] = [],
  date: string = today()
): string {
  const labels: Record<TextNote["kind"], string> = {
    removed: "Удалено из текста (монтаж/замер/под ключ — ТЗ §11)",
    contact: "Удалено из текста (контакты inex.su)",
    flagged: "Проверить (двери остаются на inex.su)",
    "stop-word": "Стоп-слово (ТЗ §11)",
  };
  return [
    `Импорт с inex.su ${date} (task 37).`,
    ...oldUrls.map((url) => `Источник: ${inexUrl(url)}`),
    ...extra,
    ...notes.map((note) => `${labels[note.kind]}: ${note.text}`),
  ].join("\n");
}

/**
 * `sortDate` of an imported object: the page date, else 1 January of the year found in the
 * text, else `IMPORT_SORT_DATE_FALLBACK` (never the import date).
 */
function sortDateOf(parsed: readonly ParsedObject[]): string {
  const pageDate = parsed.map((item) => item.pageDate).find(Boolean);
  if (pageDate) return pageDate;
  const year = parsed.map((item) => item.year).find((value) => value !== undefined);
  return year ? `${year}-01-01T00:00:00.000Z` : IMPORT_SORT_DATE_FALLBACK;
}

/* ------------------------------------------------------------------------------------------ */
/* --fix-existing                                                                             */
/* ------------------------------------------------------------------------------------------ */

/** What `--fix-existing` needs to tell import-written values from editor changes. */
interface FixContext {
  /** Old-parser output per old URL (`legacyBr`, built-in stop words). */
  legacyObjects: Map<string, ParseResult>;
  legacyShowers: Map<string, ParsedShower>;
  /** Ids of region «cities» (see `Taxonomies.regionCities`). */
  regionCityIds: ReadonlySet<string>;
  /** [start, end] (ms) of the import runs that created documents. */
  runWindows: ReadonlyArray<readonly [number, number]>;
}

/** Whether the document was created by an import run (not a seed record the import adopted). */
function createdByImport(fix: FixContext, createdAt: string | null | undefined): boolean {
  const time = createdAt ? Date.parse(createdAt) : Number.NaN;
  return fix.runWindows.some(([from, to]) => time >= from && time <= to);
}

/** `sortDate` still holding the creation-time default the import used to write. */
function hasDefaultSortDate(doc: { sortDate?: string | null; createdAt: string }): boolean {
  if (!doc.sortDate) return false;
  return (
    Math.abs(Date.parse(doc.sortDate) - Date.parse(doc.createdAt)) <= SORT_DATE_DEFAULT_TOLERANCE_MS
  );
}

/** Import notes regenerated with the date of the original notes (so a re-run is a no-op). */
function notesDate(current: string | null | undefined): string | null {
  return IMPORT_NOTES_DATE.exec(current ?? "")?.[1] ?? null;
}

/** Group text / notes as the import composes them (shared by the new and the legacy parse). */
function objectTexts(parsed: readonly ParsedObject[]): {
  taskText: string;
  notes: TextNote[];
  extra: string[];
} {
  const primary = parsed[0];
  const specs = parsed.flatMap((item) => item.specs ?? []);
  const regions = [...new Set(parsed.map((item) => item.region).filter(Boolean))];
  return {
    taskText: parsed.map((item) => item.taskText).find((text) => text.trim() !== "") ?? "",
    notes: parsed.flatMap((item) => item.notes),
    extra: [
      ...(primary?.kindLabel ? [`Подпись на карте inex.su: ${primary.kindLabel}`] : []),
      ...(specs.length > 0 ? [`Изделия на странице: ${specs.join("; ")}`] : []),
      ...regions.map((region) => `Регион на inex.su (не город): ${region}`),
    ],
  };
}

/**
 * Repairs of an existing object (`--fix-existing`): only values equal to what the import wrote.
 * `next` is the new parse of the group, `cityId` the city it resolves to.
 */
function objectFixes(
  fix: FixContext,
  current: PortfolioObject,
  group: ObjectGroup,
  next: { taskText: string; notesText: (date: string) => string; cityId: string | null }
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  const legacyParsed = group.oldUrls
    .map((url) => fix.legacyObjects.get(url))
    .flatMap((result) => (result?.ok ? [result.value] : []));
  if (legacyParsed.length === group.oldUrls.length) {
    const legacy = objectTexts(legacyParsed);
    if (current.task === legacy.taskText && current.task !== next.taskText) {
      patch.task = next.taskText;
    }
    const date = notesDate(current.importNotes);
    // The first import wrote no region line: compare with the legacy extra without it.
    const legacyExtra = legacy.extra.filter((line) => !line.startsWith("Регион на inex.su"));
    if (
      date &&
      current.importNotes === importNotesText(group.oldUrls, legacy.notes, legacyExtra, date) &&
      current.importNotes !== next.notesText(date)
    ) {
      patch.importNotes = next.notesText(date);
    }
  }
  const cityId = typeof current.city === "string" ? current.city : (current.city?.id ?? null);
  if (cityId && fix.regionCityIds.has(cityId) && cityId !== next.cityId) {
    patch.city = next.cityId;
  }
  if (createdByImport(fix, current.createdAt) && hasDefaultSortDate(current)) {
    patch.sortDate = sortDateOf(group.parsed);
  }
  return patch;
}

/** Repairs of an existing shower configuration (`--fix-existing`), same policy as objects. */
function showerFixes(
  fix: FixContext,
  current: ShowerConfig,
  shower: ParsedShower,
  notesText: (date: string) => string
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  const legacy = fix.legacyShowers.get(shower.oldUrl);
  if (!legacy) return patch;
  if (current.description === legacy.description && current.description !== shower.description) {
    patch.description = shower.description;
  }
  const date = notesDate(current.importNotes);
  const extra = legacy.priceText ? [`Цена на inex.su (не импортируется): ${legacy.priceText}`] : [];
  if (
    date &&
    current.importNotes === importNotesText([legacy.oldUrl], legacy.notes, extra, date) &&
    current.importNotes !== notesText(date)
  ) {
    patch.importNotes = notesText(date);
  }
  return patch;
}

const isEmpty = (value: unknown): boolean =>
  value === null ||
  value === undefined ||
  value === "" ||
  (Array.isArray(value) && value.length === 0);

/** Fields of `patch` whose current value is empty (editor changes are never overwritten). */
function onlyEmpty<T extends Record<string, unknown>>(
  current: Record<string, unknown>,
  patch: T
): Partial<T> {
  return Object.fromEntries(
    Object.entries(patch).filter(([key, value]) => !isEmpty(value) && isEmpty(current[key]))
  ) as Partial<T>;
}

async function slugTaken(
  ctx: SeedContext,
  collection: "objects" | "shower-configs",
  slug: string
): Promise<{ id: string; hasLegacy: boolean } | null> {
  const { docs } = await ctx.payload.find({
    collection,
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    draft: true,
    overrideAccess: true,
  });
  const doc = docs[0] as (PortfolioObject | ShowerConfig) | undefined;
  if (!doc) return null;
  const hasLegacy =
    "legacyUrls" in doc ? (doc.legacyUrls?.length ?? 0) > 0 : !!(doc as ShowerConfig).legacyUrl;
  return { id: doc.id, hasLegacy };
}

/* ------------------------------------------------------------------------------------------ */
/* Objects                                                                                    */
/* ------------------------------------------------------------------------------------------ */

interface ObjectGroup {
  slug: string;
  oldUrls: string[];
  parsed: ParsedObject[];
}

/**
 * Groups object pages by their final slug, exactly as `fix-csv.ts` computes `new_url` (same
 * `fixRows` call): merged duplicates become one object with several `legacyUrls`.
 */
function groupObjects(
  rows: Awaited<ReturnType<typeof readSourceCsv>>,
  parsed: Map<string, ParseResult>,
  previousSlugs: Record<string, string>
): ObjectGroup[] {
  const fixed = fixRows(rows, {
    importStatus: (oldUrl): ImportStatus => {
      const result = parsed.get(oldUrl);
      return result ? (result.ok ? "imported" : "failed") : "unknown";
    },
    sameObject: (a, b) => {
      const left = parsed.get(a);
      const right = parsed.get(b);
      return !!left?.ok && !!right?.ok && sameObject(left.value, right.value);
    },
    importedSlug: (oldUrl) => previousSlugs[oldUrl],
  });
  const groups = new Map<string, ObjectGroup>();
  for (const row of fixed) {
    if (row.rule !== "R5") continue;
    const result = parsed.get(row.old_url);
    const slug = objectSlugFromUrl(row.new_url);
    if (!slug || !result?.ok) continue;
    const group = groups.get(slug) ?? { slug, oldUrls: [], parsed: [] };
    group.oldUrls.push(row.old_url);
    group.parsed.push(result.value);
    groups.set(slug, group);
  }
  return [...groups.values()];
}

async function upsertObject(
  ctx: SeedContext,
  group: ObjectGroup,
  taxonomies: Taxonomies,
  media: MediaStore,
  dryRun: boolean,
  slugs: Record<string, string>,
  fix: FixContext | null
): Promise<void> {
  const primary = group.parsed[0];
  if (!primary) return;
  const name = primary.name;
  const { taskText, notes, extra } = objectTexts(group.parsed);
  const region = group.parsed.map((parsed) => parsed.region).find(Boolean);

  // Photos of all merged pages, de-duplicated by source URL (`photoKey`, not the lossy sanitized
  // file name); identical bytes under different URLs are merged by sha1 in `createMedia`. The
  // first one is the cover.
  const seen = new Set<string>();
  const photos = group.parsed
    .flatMap((parsed) => parsed.photos)
    .filter((photo) => {
      const key = photoKey(photo.src);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  const { alts, generated } = photoAlts(name, photos);

  const city = group.parsed.map((parsed) => parsed.city).find(Boolean);
  const year = group.parsed.map((parsed) => parsed.year).find((value) => value !== undefined);
  const categories = [...new Set(group.oldUrls.map((url) => portfolioCategory(url) ?? ""))];
  const productIds = (
    await Promise.all(categories.map((category) => taxonomies.product(category)))
  ).filter((id): id is string => !!id);
  const cityId = city ? await taxonomies.city(city) : null;
  const typeId = await taxonomies.objectType(`${primary.kindLabel ?? ""} ${name}`);

  const missing: string[] = [];
  if (!cityId) missing.push(region ? `город (на inex.su указан регион: ${region})` : "город");
  if (!year) missing.push("год");
  if (!typeId) missing.push("тип объекта");
  if (!taskText) missing.push("задача (task)");
  else if (taskText.length > MAX_TASK_LENGTH)
    missing.push(`task сократить до ${MAX_TASK_LENGTH} (сейчас ${taskText.length})`);
  missing.push("спецификация (spec)");
  if (photos.length === 0) missing.push("фото");
  if (generated.length > 0) missing.push(`alt проверить (${generated.length})`);

  const record: ObjectRecord = {
    slug: group.slug,
    name,
    oldUrls: group.oldUrls,
    outcome: "planned",
    missing,
    generatedAlts: generated,
    notes,
    merged: group.oldUrls.length > 1,
    fixed: [],
  };
  stats.objects.push(record);

  // Existing document: by any of the old URLs (draft versions included). A read-only lookup,
  // also done by `--fix-existing --dry-run` to plan the repairs.
  const existing =
    dryRun && !fix
      ? null
      : await ctx.payload.find({
          collection: "objects",
          where: { "legacyUrls.url": { in: group.oldUrls } },
          limit: 2,
          depth: 0,
          draft: true,
          overrideAccess: true,
        });
  if (existing && existing.docs.length > 1) {
    stats.errors.push({
      what: `objects ${group.slug}`,
      error: "несколько документов с этими legacyUrls",
    });
    return;
  }
  let current = existing?.docs[0] as PortfolioObject | undefined;
  let slug = current?.slug ?? group.slug;

  if (!current && !dryRun) {
    const taken = await slugTaken(ctx, "objects", slug);
    if (taken && !taken.hasLegacy) {
      // A placeholder draft of the task-30 seed for the same object: adopt it.
      current = (await ctx.payload.findByID({
        collection: "objects",
        id: taken.id,
        depth: 0,
        draft: true,
        overrideAccess: true,
      })) as PortfolioObject;
    } else if (taken) {
      let candidate = `${slug}-${categories[0] ?? "obekt"}`;
      for (let n = 2; await slugTaken(ctx, "objects", candidate); n += 1)
        candidate = `${slug}-${n}`;
      stats.slugChanges.push({
        oldUrl: group.oldUrls[0] ?? "",
        from: slug,
        to: candidate,
        reason: "slug занят другим объектом в БД",
      });
      slug = candidate;
    }
  }
  record.slug = slug;
  for (const url of group.oldUrls) slugs[url] = slug;

  const resolvedPhotos = await media.resolve(photos, alts);
  const legacyUrls = group.oldUrls.map((url) => ({ url }));
  const full = {
    name,
    slug,
    task: taskText,
    city: cityId,
    objectType: typeId,
    year: year ?? null,
    products: productIds,
    photos: resolvedPhotos.map(({ id, alt }) => ({ image: id, alt })),
    sourceUrl: inexUrl(group.oldUrls[0] ?? ""),
    importNotes: importNotesText(group.oldUrls, notes, extra),
  };
  const fixes =
    fix && current
      ? objectFixes(fix, current, group, {
          taskText,
          notesText: (date) => importNotesText(group.oldUrls, notes, extra, date),
          cityId,
        })
      : {};
  record.fixed = Object.keys(fixes);

  if (dryRun) {
    const planned = record.fixed.length > 0 ? `; исправить: ${record.fixed.join(", ")}` : "";
    ctx.log(
      `[dry-run] objects ${slug}: ${photos.length} фото, ${group.oldUrls.length} URL${planned}`
    );
    return;
  }

  if (!current) {
    await ctx.payload.create({
      collection: "objects",
      data: {
        ...full,
        legacyUrls,
        featured: false,
        spec: [],
        sortDate: sortDateOf(group.parsed),
        _status: "draft",
      },
      draft: true,
      depth: 0,
      overrideAccess: true,
      context: SEED_REQUEST_CONTEXT,
    });
    record.outcome = "created";
    ctx.log(`objects ${slug}: создан (черновик)`);
    return;
  }

  // Existing: fill only empty fields, add missing legacy URLs; `--fix-existing` repairs on top.
  const patch: Record<string, unknown> = {
    ...onlyEmpty(current as unknown as Record<string, unknown>, full),
    ...fixes,
  };
  delete patch.slug;
  const knownUrls = new Set((current.legacyUrls ?? []).map((item) => item.url));
  const newUrls = group.oldUrls.filter((url) => !knownUrls.has(url));
  if (newUrls.length > 0) {
    patch.legacyUrls = [
      ...(current.legacyUrls ?? []).map(({ url }) => ({ url })),
      ...newUrls.map((url) => ({ url })),
    ];
  }
  if (Object.keys(patch).length === 0) {
    record.outcome = "unchanged";
    return;
  }
  await ctx.payload.update({
    collection: "objects",
    id: current.id,
    data: patch,
    draft: true,
    depth: 0,
    overrideAccess: true,
    context: SEED_REQUEST_CONTEXT,
  });
  record.outcome = "updated";
  ctx.log(
    `objects ${slug}: дополнены поля ${Object.keys(patch).join(", ")}` +
      (record.fixed.length > 0 ? ` (исправлено: ${record.fixed.join(", ")})` : "")
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Showers                                                                                    */
/* ------------------------------------------------------------------------------------------ */

type ConfigType = NonNullable<ShowerConfig["configType"]>;

/** Configuration type from the inex.su URL slug (draft value, checked by the editor). */
function showerConfigType(slug: string): ConfigType {
  if (slug.startsWith("uglovaya")) return "corner";
  if (slug.startsWith("trapecevidnaya")) return "trapezoid";
  if (/^pryamaya-s-otka/.test(slug)) return "sliding";
  if (slug.startsWith("pryamaya-s-raspashnoi")) return "straight-door";
  if (slug.startsWith("pryamaya-peregorodka")) return "walk-in";
  return "other";
}

function glassThicknesses(text: string): Array<"8" | "10"> {
  const found = new Set<"8" | "10">();
  for (const match of text.matchAll(/(?<!\d)(8|10)\s*мм/g)) found.add(match[1] as "8" | "10");
  return [...found];
}

async function upsertShower(
  ctx: SeedContext,
  shower: ParsedShower,
  constructionId: string | null,
  media: MediaStore,
  dryRun: boolean,
  fix: FixContext | null
): Promise<void> {
  let slug = toLatinSlug(lastSegment(shower.oldUrl));
  const record: ShowerRecord = {
    slug,
    name: shower.name,
    oldUrl: shower.oldUrl,
    outcome: "planned",
    notes: shower.notes,
    ...(shower.priceText ? { priceText: shower.priceText } : {}),
    fixed: [],
  };
  stats.showers.push(record);

  const photos = [shower.image, ...shower.gallery];
  const { alts } = photoAlts(shower.name, photos);
  const extra = shower.priceText ? [`Цена на inex.su (не импортируется): ${shower.priceText}`] : [];
  if (dryRun && !fix) {
    stats.photosFound += photos.length;
    ctx.log(`[dry-run] shower-configs ${slug}: ${photos.length} фото, order ${shower.order}`);
    return;
  }

  const { docs } = await ctx.payload.find({
    collection: "shower-configs",
    where: { legacyUrl: { equals: shower.oldUrl } },
    limit: 2,
    depth: 0,
    draft: true,
    overrideAccess: true,
  });
  let current = docs[0];
  if (!current) {
    const taken = await slugTaken(ctx, "shower-configs", slug);
    if (taken && !taken.hasLegacy) {
      current = await ctx.payload.findByID({
        collection: "shower-configs",
        id: taken.id,
        depth: 0,
        draft: true,
        overrideAccess: true,
      });
    } else if (taken) {
      slug = `${slug}-2`;
    }
  }
  record.slug = current?.slug ?? slug;

  const fixes =
    fix && current
      ? showerFixes(fix, current, shower, (date) =>
          importNotesText([shower.oldUrl], shower.notes, extra, date)
        )
      : {};
  record.fixed = Object.keys(fixes);
  if (dryRun) {
    stats.photosFound += photos.length;
    const planned = record.fixed.length > 0 ? `; исправить: ${record.fixed.join(", ")}` : "";
    ctx.log(`[dry-run] shower-configs ${record.slug}: ${photos.length} фото${planned}`);
    return;
  }

  const resolved = await media.resolve(photos, alts);
  const [image, ...gallery] = resolved;
  const full = {
    name: shower.name,
    description: shower.description,
    image: image?.id ?? null,
    gallery: gallery.map(({ id, alt }) => ({ image: id, alt })),
    order: shower.order,
    construction: constructionId,
    configType: showerConfigType(slug),
    glassThicknesses: glassThicknesses(shower.description),
    sourceUrl: inexUrl(shower.oldUrl),
    importNotes: importNotesText([shower.oldUrl], shower.notes, extra),
  };

  if (!current) {
    await ctx.payload.create({
      collection: "shower-configs",
      data: { ...full, slug, legacyUrl: shower.oldUrl, _status: "draft" },
      draft: true,
      depth: 0,
      overrideAccess: true,
      context: SEED_REQUEST_CONTEXT,
    });
    record.outcome = "created";
    ctx.log(`shower-configs ${slug}: создан (черновик)`);
    return;
  }
  const patch: Record<string, unknown> = {
    ...onlyEmpty(current as unknown as Record<string, unknown>, {
      ...full,
      legacyUrl: shower.oldUrl,
    }),
    ...fixes,
  };
  if (Object.keys(patch).length === 0) {
    record.outcome = "unchanged";
    return;
  }
  await ctx.payload.update({
    collection: "shower-configs",
    id: current.id,
    data: patch,
    draft: true,
    depth: 0,
    overrideAccess: true,
    context: SEED_REQUEST_CONTEXT,
  });
  record.outcome = "updated";
  ctx.log(
    `shower-configs ${record.slug}: дополнены поля ${Object.keys(patch).join(", ")}` +
      (record.fixed.length > 0 ? ` (исправлено: ${record.fixed.join(", ")})` : "")
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Report                                                                                     */
/* ------------------------------------------------------------------------------------------ */

interface CrawlStats {
  requested: number;
  ok: number;
  failed: Array<{ oldUrl: string; error: string }>;
  creditsUsed: number;
  creditsBefore: number | null;
  creditsAfter: number | null;
  sampleCredits?: number;
}

const countBy = <T>(items: readonly T[], key: (item: T) => string) =>
  items.reduce<Record<string, number>>((acc, item) => {
    acc[key(item)] = (acc[key(item)] ?? 0) + 1;
    return acc;
  }, {});

/** One line of the run history (`scripts/.import-tmp/import-runs.json`). */
interface RunSummary {
  at: string;
  mode: string;
  seconds: number;
  objects: Record<string, number>;
  showers: Record<string, number>;
  mediaCreated: number;
  mediaReused: number;
  photosSkipped: number;
  errors: number;
  /** `--fix-existing`: repaired field → number of documents. */
  fixed?: Record<string, number>;
  /** `--fix-existing`: region «cities» deleted. */
  regionCitiesRemoved?: string[];
}

/** Field → number of documents repaired by `--fix-existing` in this run. */
function fixedCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const record of [...stats.objects, ...stats.showers]) {
    for (const field of record.fixed) counts[field] = (counts[field] ?? 0) + 1;
  }
  return counts;
}

/** History cell: «task 70, sortDate 159; удалены cities: …». */
function fixSummary(run: RunSummary): string {
  const fields = Object.entries(run.fixed ?? {})
    .map(([field, count]) => `${field} ${count}`)
    .join(", ");
  const removed = run.regionCitiesRemoved?.length
    ? `; удалены cities: ${run.regionCitiesRemoved.join(", ")}`
    : "";
  return `${fields || "ничего"}${removed}`;
}

/** What `--fix-existing` repairs and the `sortDate` policy (report section). */
const FIX_EXISTING_SECTION: readonly string[] = [
  "## Исправления первого импорта (`--fix-existing`, ревью волны 6)",
  "",
  "Режим `--fix-existing` чинит только значения, записанные импортом и не изменённые редактором (сравнение с выводом старого парсера и со временем создания документа); повторный запуск ничего не меняет. Количество исправлений — в колонке «Исправлено» истории запусков.",
  "",
  "- **Переносы `<br>`.** Одиночный `<br>` на inex.su — перенос строки внутри абзаца, а не конец предложения; раньше каждый `<br>` становился абзацем и резал предложения. Теперь абзацы — только по блокам (`<p>`) и двойному `<br><br>`; поле `task` и «Заметки импорта» пересобраны (у душевых описания без таких переносов — не изменились).",
  "- **Регионы вместо городов.** Строка места на inex.su иногда содержит регион («Челябинская область», «Ханты-Мансийский автономный округ – Югра»). Такие значения больше не создают запись `cities`: город ищется в названии и тексте, иначе поле пустое, а регион записан в «Заметки импорта» и в таблицу «Чего не хватает для публикации». Ошибочные записи `cities` удалены, когда на них не осталось ссылок.",
  "- **Стоп-слова.** Проверка использует встроенные правила **и** список CMS (`site-settings.stopWords`: основы, фразы, заводы-партнёры; формулировка опыта — `experienceText`).",
  `- **\`sortDate\`.** Дата публикации со страницы (\`article:published_time\`, JSON-LD \`datePublished\`, \`<time datetime>\`), иначе 1 января года из текста, иначе фиксированная дата ${IMPORT_SORT_DATE_FALLBACK.slice(0, 10)} — архив inex.su ниже объектов, которым редактор поставит реальную дату. На страницах inex.su (обход 2026-10-21) дат и годов нет, поэтому у импортированных объектов стоит запасная дата; реальную дату сдачи указывает редактор при публикации. Дата импорта больше не используется.`,
  "",
];

async function writeReport(startedAt: Date, mode: string): Promise<void> {
  const crawl = await readJson<CrawlStats | null>(CRAWL_STATS_JSON, null);
  const objectOutcomes = countBy(stats.objects, (record) => record.outcome);
  const showerOutcomes = countBy(stats.showers, (record) => record.outcome);
  const seconds = Math.round((Date.now() - startedAt.getTime()) / 1000);
  // Every full run is kept, so the report shows both the first import and the idempotent re-runs.
  const history = await readJson<RunSummary[]>(RUNS_JSON, []);
  history.push({
    at: startedAt.toISOString(),
    mode,
    seconds,
    objects: objectOutcomes,
    showers: showerOutcomes,
    mediaCreated: stats.mediaCreated,
    mediaReused: stats.mediaReused,
    photosSkipped: stats.photosSkipped.length,
    errors: stats.errors.length,
    ...(mode.includes("--fix-existing")
      ? {
          fixed: fixedCounts(),
          regionCitiesRemoved: stats.regionCities
            .filter((city) => city.result === "удалён")
            .map((city) => city.name),
        }
      : {}),
  });
  await writeFileAtomic(RUNS_JSON, JSON.stringify(history, null, 2));
  const fmt = (counts: Record<string, number>) =>
    Object.entries(counts)
      .map(([key, value]) => `${OUTCOME_LABELS[key] ?? key} ${value}`)
      .join(", ");
  const lines: string[] = [];
  const push = (...items: string[]) => lines.push(...items);
  const allNotes = [
    ...stats.objects.flatMap((record) => record.notes.map((note) => ({ slug: record.slug, note }))),
    ...stats.showers.flatMap((record) =>
      record.notes.map((note) => ({ slug: `душевая ${record.slug}`, note }))
    ),
  ];

  push(
    "# Импорт портфолио и душевых с inex.su — отчёт",
    "",
    `Скрипт: \`scripts/import-inex/import.ts\` (${mode}). Запуск: ${startedAt.toISOString()}, длительность ${seconds} с.`,
    "Все объекты и конфигурации душевых созданы **черновиками** — на сайте и в sitemap их нет, пока редактор не опубликует.",
    "",
    "## Счётчики",
    "",
    "| Показатель | Значение |",
    "|---|---:|",
    mdRow(["Страниц запрошено у Firecrawl (объекты + душевые + листинг)", crawl?.requested ?? "—"]),
    mdRow(["Страниц получено успешно", crawl?.ok ?? "—"]),
    mdRow(["Страниц с ошибкой (404 и т. п.)", crawl?.failed.length ?? "—"]),
    mdRow(["Страниц объектов не разобрано (R7)", stats.parseFailed.length]),
    mdRow(["Фото найдено на страницах", stats.photosFound]),
    mdRow(["Фото скачано", stats.photosDownloaded]),
    mdRow(["Медиа создано", stats.mediaCreated]),
    mdRow(["Медиа переиспользовано (повторный запуск / дубль по sha1)", stats.mediaReused]),
    mdRow(["Фото пропущено", stats.photosSkipped.length]),
    mdRow(["Объектов (уникальных страниц)", stats.objects.length]),
    mdRow(["— создано", objectOutcomes.created ?? 0]),
    mdRow(["— дополнено (пустые поля)", objectOutcomes.updated ?? 0]),
    mdRow(["— без изменений", objectOutcomes.unchanged ?? 0]),
    mdRow(["Конфигураций душевых", stats.showers.length]),
    mdRow(["— создано", showerOutcomes.created ?? 0]),
    mdRow(["— дополнено", showerOutcomes.updated ?? 0]),
    mdRow(["— без изменений", showerOutcomes.unchanged ?? 0]),
    mdRow(["Ошибок", stats.errors.length]),
    "",
    "## История запусков",
    "",
    "Счётчики выше — последнего запуска. Повторный запуск не создаёт документов и медиа (идемпотентность).",
    "",
    "| Запуск | Объекты | Душевые | Медиа создано / переиспользовано / пропущено | Исправлено (`--fix-existing`) | Ошибок | Длительность, с |",
    "|---|---|---|---|---|---:|---:|",
    ...history.map((run) =>
      mdRow([
        run.at,
        fmt(run.objects),
        fmt(run.showers),
        `${run.mediaCreated} / ${run.mediaReused} / ${run.photosSkipped}`,
        run.fixed ? fixSummary(run) : "—",
        run.errors,
        run.seconds,
      ])
    ),
    "",
    ...FIX_EXISTING_SECTION,
    "## Расход Firecrawl",
    "",
    crawl
      ? `Потрачено ${crawl.creditsUsed} кредитов (из них ${crawl.sampleCredits ?? 0} — пробный \`--sample\`), было ${crawl.creditsBefore ?? "?"}, осталось ${crawl.creditsAfter ?? "?"}. Ответы закэшированы в \`scripts/.cache/firecrawl/\` — повторные запуски \`crawl.ts\` кредиты не тратят.`
      : "Нет данных (`crawl.ts` не запускался).",
    ""
  );

  if (stats.parseFailed.length > 0 || stats.errors.length > 0) {
    push(
      "## Ошибки",
      "",
      "| Что | Ошибка |",
      "|---|---|",
      ...stats.parseFailed.map((item) =>
        mdRow([
          `\`${item.oldUrl}\``,
          `${item.reason} → в CSV правило R7 (301 на /obekty/, спорный)`,
        ])
      ),
      ...stats.errors.map((item) => mdRow([item.what, item.error])),
      ""
    );
  }

  push(
    "## Чего не хватает для публикации",
    "",
    "Публикация объекта требует город, тип объекта, изделия, год, задачу (≤ 300 знаков), спецификацию (изделие + толщина) и фото с alt. Спецификацию импорт не заполняет никогда — это работа редактора.",
    "",
    "| Объект (slug) | Название | Не хватает |",
    "|---|---|---|",
    ...stats.objects.map((record) =>
      mdRow([`\`${record.slug}\``, record.name, record.missing.join(", ")])
    ),
    ""
  );

  const stopWords = allNotes.filter(({ note }) => note.kind === "stop-word");
  push(
    "## Стоп-слова (ТЗ §11)",
    "",
    stopWords.length > 0
      ? [
          "| Документ | Находка |",
          "|---|---|",
          ...stopWords.map(({ slug, note }) => mdRow([`\`${slug}\``, note.text])),
        ].join("\n")
      : "Не найдено (проверка `checkStopWords` по очищенным текстам).",
    "",
    `Список стоп-слов: ${stats.stopWordSource || "встроенные правила"}.`,
    ""
  );

  const removed = allNotes.filter(({ note }) => note.kind === "removed" || note.kind === "contact");
  push(
    "## Удалено из текстов (монтаж, замер, «под ключ», контакты)",
    "",
    "Тексты inex.su обещают монтаж и замер — Inex Glass этого не делает (ТЗ §11). Такие предложения не перенесены; полный список — в поле «Заметки импорта» каждого документа.",
    "",
    "| Документ | Удалённое предложение |",
    "|---|---|",
    ...removed.map(({ slug, note }) => mdRow([`\`${slug}\``, note.text])),
    ""
  );

  const flagged = allNotes.filter(({ note }) => note.kind === "flagged");
  push(
    "## Упоминания дверей — проверить редактору",
    "",
    "Двери остаются на inex.su. Предложения сохранены как есть (это часть описания конструкции), но требуют проверки.",
    "",
    `Всего: ${flagged.length}. Документы: ${[...new Set(flagged.map(({ slug }) => `\`${slug}\``))].join(", ") || "—"}.`,
    ""
  );

  const alts = stats.objects.filter((record) => record.generatedAlts.length > 0);
  push(
    "## Alt, сгенерированные импортом (требуют проверки редактора)",
    "",
    alts.length > 0
      ? alts.map((record) => `- \`${record.slug}\`: ${record.generatedAlts.join("; ")}`).join("\n")
      : "Нет: у всех фото на inex.su есть подпись (`title` ссылки), она перенесена в alt без хвоста «, фото N».",
    ""
  );

  const merged = stats.objects.filter((record) => record.merged);
  push(
    "## Объекты с дублями",
    "",
    merged.length > 0
      ? merged
          .map(
            (record) =>
              `- \`${record.slug}\`: ${record.oldUrls.map((url) => `\`${url}\``).join(" + ")}`
          )
          .join("\n")
      : "Слитых объектов нет (коллизии slug разведены суффиксом категории, см. `docs/reports/migration-disputed.md`).",
    "",
    ...(stats.slugChanges.length > 0
      ? [
          "Slug изменён из-за занятости в БД:",
          "",
          ...stats.slugChanges.map((c) => `- \`${c.oldUrl}\`: ${c.from} → ${c.to} (${c.reason})`),
          "",
        ]
      : []),
    "## Фото, пропущенные при загрузке",
    "",
    stats.photosSkipped.length > 0
      ? [
          "| URL | Причина |",
          "|---|---|",
          ...stats.photosSkipped.map((item) => mdRow([item.src, item.reason])),
        ].join("\n")
      : "Нет.",
    "",
    "## Цены душевых на inex.su (не импортированы)",
    "",
    "Цены на сайте Inex Glass берутся только из справочников CMS.",
    "",
    ...stats.showers.map((record) => `- \`${record.slug}\`: ${record.priceText ?? "—"}`),
    ""
  );
  await writeFileAtomic(IMPORT_REPORT, `${lines.join("\n")}\n`);
}

/* ------------------------------------------------------------------------------------------ */
/* Main                                                                                       */
/* ------------------------------------------------------------------------------------------ */

/**
 * Stop-word check with the CMS list (`site-settings.stopWords`, `experienceText`) merged into
 * the built-in rules. Without the global (empty DB) the built-ins alone are used.
 */
async function loadCmsStopWords(ctx: SeedContext): Promise<StopWordCheck> {
  const settings = await ctx.payload.findGlobal({
    slug: "site-settings",
    depth: 0,
    overrideAccess: true,
  });
  const rows: CmsStopWord[] = (settings.stopWords ?? []).flatMap((row) =>
    row.word?.trim() && row.kind ? [{ word: row.word, kind: row.kind }] : []
  );
  stats.stopWordSource =
    rows.length > 0
      ? `встроенные правила + список CMS (site-settings.stopWords: ${rows.length})`
      : "встроенные правила (в site-settings.stopWords пусто)";
  ctx.log(`стоп-слова: ${stats.stopWordSource}`);
  return cmsStopWordCheck({ stopWords: rows, experiencePhrase: settings.experienceText });
}

/** Old-parser output, region «cities» and import-run windows for `--fix-existing`. */
async function buildFixContext(ctx: SeedContext, taxonomies: Taxonomies): Promise<FixContext> {
  const legacy = { legacyBr: true } as const;
  const legacyShowers = new Map<string, ParsedShower>();
  for (const result of await parseAllShowers(legacy)) {
    if (result.ok) legacyShowers.set(result.value.oldUrl, result.value);
  }
  const runs = await readJson<RunSummary[]>(RUNS_JSON, []);
  const runWindows = runs
    .filter((run) => (run.objects.created ?? 0) + (run.showers.created ?? 0) > 0)
    .map((run) => {
      const from = Date.parse(run.at);
      return [from, from + run.seconds * 1000 + RUN_WINDOW_SLACK_MS] as const;
    });
  if (runWindows.length === 0) {
    ctx.log("--fix-existing: нет истории запусков (import-runs.json) — sortDate не исправляется");
  }
  const regions = await taxonomies.regionCities();
  ctx.log(`--fix-existing: регионы в cities: ${regions.map((r) => r.name).join(", ") || "нет"}`);
  return {
    legacyObjects: await parseAllObjects(legacy),
    legacyShowers,
    regionCityIds: new Set(regions.map((region) => region.id)),
    runWindows,
  };
}

/** Deletes region «cities» nothing references any more (objects, latest versions). */
async function removeRegionCities(
  ctx: SeedContext,
  fix: FixContext,
  dryRun: boolean
): Promise<void> {
  for (const id of fix.regionCityIds) {
    const city = await ctx.payload.findByID({
      collection: "cities",
      id,
      depth: 0,
      overrideAccess: true,
    });
    // Latest versions (drafts included): what an editor sees in the admin.
    const { totalDocs } = await ctx.payload.find({
      collection: "objects",
      where: { city: { equals: id } },
      draft: true,
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    // In --dry-run the planned repairs are not written, so the references are still there.
    if (totalDocs > 0 && !dryRun) {
      stats.regionCities.push({ name: city.name, result: `оставлен: ссылок ${totalDocs}` });
      continue;
    }
    if (!dryRun) {
      await ctx.payload.delete({
        collection: "cities",
        id,
        overrideAccess: true,
        context: SEED_REQUEST_CONTEXT,
      });
    }
    stats.regionCities.push({ name: city.name, result: dryRun ? "будет удалён" : "удалён" });
    ctx.log(`cities «${city.name}»: ${dryRun ? "будет удалён" : "удалён"} (регион, не город)`);
  }
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      "dry-run": { type: "boolean", default: false },
      only: { type: "string" },
      limit: { type: "string" },
      "fix-existing": { type: "boolean", default: false },
      "i-know-this-is-prod": { type: "boolean", default: false },
    },
  });
  const dryRun = values["dry-run"];
  const fixExisting = values["fix-existing"];
  const only = values.only;
  if (only && only !== "objects" && only !== "showers") throw new Error("--only=objects|showers");
  const limit = values.limit ? Number(values.limit) : Number.POSITIVE_INFINITY;
  assertNotProduction(values["i-know-this-is-prod"]);

  const startedAt = new Date();
  const ctx = await getSeedContext({ log: (msg) => process.stdout.write(`[import] ${msg}\n`) });
  const taxonomies = new Taxonomies(ctx, dryRun);
  const media = new MediaStore(ctx, dryRun);
  await media.init();
  const slugs = await readJson<Record<string, string>>(SLUGS_JSON, {});
  const parseOptions = { stopWords: await loadCmsStopWords(ctx) };
  const fix = fixExisting ? await buildFixContext(ctx, taxonomies) : null;

  if (only !== "showers") {
    const rows = await readSourceCsv();
    const parsed = await parseAllObjects(parseOptions);
    for (const [oldUrl, result] of parsed) {
      if (!result.ok) stats.parseFailed.push({ oldUrl, reason: result.reason });
    }
    const groups = groupObjects(rows, parsed, slugs).slice(0, limit);
    ctx.log(
      `объектов к импорту: ${groups.length} (страниц разобрано ${[...parsed.values()].filter((r) => r.ok).length}/${parsed.size})`
    );
    for (const group of groups) {
      try {
        await upsertObject(ctx, group, taxonomies, media, dryRun, slugs, fix);
      } catch (error) {
        stats.errors.push({ what: `objects ${group.slug}`, error: errorMessage(error) });
        ctx.log(`objects ${group.slug}: ОШИБКА ${errorMessage(error)}`);
      }
    }
    if (!dryRun) await writeFileAtomic(SLUGS_JSON, JSON.stringify(slugs, null, 2));
  }

  if (only !== "objects") {
    const { docs } = await ctx.payload.find({
      collection: "constructions",
      where: { slug: { equals: SHOWER_CONSTRUCTION_SLUG } },
      limit: 1,
      depth: 0,
      draft: true,
      overrideAccess: true,
    });
    const constructionId = docs[0]?.id ?? null;
    if (!constructionId && !dryRun) {
      throw new Error(
        `нет конструкции «${SHOWER_CONSTRUCTION_SLUG}» — сначала сид constructions (pnpm seed --only=constructions)`
      );
    }
    const showers = (await parseAllShowers(parseOptions)).slice(0, limit);
    for (const result of showers) {
      if (!result.ok) {
        stats.errors.push({ what: `shower ${result.oldUrl}`, error: result.reason });
        continue;
      }
      try {
        await upsertShower(ctx, result.value, constructionId, media, dryRun, fix);
      } catch (error) {
        stats.errors.push({
          what: `shower-configs ${result.value.oldUrl}`,
          error: errorMessage(error),
        });
        ctx.log(`shower-configs ${result.value.oldUrl}: ОШИБКА ${errorMessage(error)}`);
      }
    }
  }

  // Region «cities» are removed only after every object has been repaired.
  if (fix && only !== "showers" && !values.limit) await removeRegionCities(ctx, fix, dryRun);

  await media.save();
  const mode = [
    dryRun ? "--dry-run" : "запись в БД",
    fixExisting ? "--fix-existing" : "",
    only ? `--only=${only}` : "",
    values.limit ? `--limit=${values.limit}` : "",
  ]
    .filter(Boolean)
    .join(", ");
  if (dryRun) {
    ctx.log(
      `dry-run: объектов ${stats.objects.length}, душевых ${stats.showers.length}, фото ${stats.photosFound}; БД и медиа не изменены`
    );
  } else {
    // Only a full run describes the whole import; partial runs would overwrite it with a subset.
    if (!only && !values.limit) await writeReport(startedAt, mode);
    await revalidateSite(ctx);
  }
  ctx.log(
    `готово: объекты ${JSON.stringify(countBy(stats.objects, (r) => r.outcome))}, ` +
      `душевые ${JSON.stringify(countBy(stats.showers, (r) => r.outcome))}, медиа +${stats.mediaCreated} ` +
      `(переиспользовано ${stats.mediaReused}, пропущено ${stats.photosSkipped.length}), ошибок ${stats.errors.length}`
  );
  if (stats.errors.length > 0) {
    for (const error of stats.errors) process.stderr.write(`  ${error.what}: ${error.error}\n`);
  }
}

try {
  await main();
  process.exit(stats.errors.length > 0 ? 2 : 0);
} catch (error) {
  console.error("import: ошибка —", errorMessage(error));
  process.exit(1);
}
