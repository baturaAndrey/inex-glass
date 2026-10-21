/**
 * Import of the inex.su portfolio and shower catalogue into Payload as DRAFTS (task 37).
 *
 *   pnpm tsx --env-file=.env scripts/import-inex/import.ts [--dry-run] [--only=objects|showers]
 *        [--limit=N] [--i-know-this-is-prod]
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
  sameObject,
  type ParseResult,
  type ParsedObject,
  type ParsedPhoto,
  type TextNote,
} from "./parse-objects";
import { parseAllShowers, type ParsedShower } from "./parse-showers";
import { CATEGORY_PRODUCTS, MIN_PHOTO_BYTES, MIN_PHOTO_SIDE, OBJECT_TYPE_RULES } from "./selectors";
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
}

interface ShowerRecord {
  slug: string;
  name: string;
  oldUrl: string;
  outcome: UpsertOutcome;
  notes: TextNote[];
  priceText?: string;
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
    return this.findOrCreate("cities", toLatinSlug(name), name);
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
    const filePath = path.join(PHOTO_DIR, sha1, photoFileName(src));
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

function importNotesText(
  oldUrls: readonly string[],
  notes: readonly TextNote[],
  extra: readonly string[] = []
): string {
  const labels: Record<TextNote["kind"], string> = {
    removed: "Удалено из текста (монтаж/замер/под ключ — ТЗ §11)",
    contact: "Удалено из текста (контакты inex.su)",
    flagged: "Проверить (двери остаются на inex.su)",
    "stop-word": "Стоп-слово (ТЗ §11)",
  };
  return [
    `Импорт с inex.su ${new Date().toISOString().slice(0, 10)} (task 37).`,
    ...oldUrls.map((url) => `Источник: ${inexUrl(url)}`),
    ...extra,
    ...notes.map((note) => `${labels[note.kind]}: ${note.text}`),
  ].join("\n");
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
  slugs: Record<string, string>
): Promise<void> {
  const primary = group.parsed[0];
  if (!primary) return;
  const name = primary.name;
  const notes = group.parsed.flatMap((parsed) => parsed.notes);

  // Photos of all merged pages, de-duplicated by file name; the first one is the cover.
  const seen = new Set<string>();
  const photos = group.parsed
    .flatMap((parsed) => parsed.photos)
    .filter((photo) => {
      const key = photoFileName(photo.src);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  const { alts, generated } = photoAlts(name, photos);

  const city = group.parsed.map((parsed) => parsed.city).find(Boolean);
  const year = group.parsed.map((parsed) => parsed.year).find((value) => value !== undefined);
  const taskText =
    group.parsed.map((parsed) => parsed.taskText).find((text) => text.trim() !== "") ?? "";
  const categories = [...new Set(group.oldUrls.map((url) => portfolioCategory(url) ?? ""))];
  const productIds = (
    await Promise.all(categories.map((category) => taxonomies.product(category)))
  ).filter((id): id is string => !!id);
  const cityId = city ? await taxonomies.city(city) : null;
  const typeId = await taxonomies.objectType(`${primary.kindLabel ?? ""} ${name}`);
  const specs = group.parsed.flatMap((parsed) => parsed.specs ?? []);

  const missing: string[] = [];
  if (!cityId) missing.push("город");
  if (!year) missing.push("год");
  if (!typeId) missing.push("тип объекта");
  if (!taskText) missing.push("задача (task)");
  else if (taskText.length > MAX_TASK_LENGTH)
    missing.push(`task сократить до ${MAX_TASK_LENGTH} (сейчас ${taskText.length})`);
  missing.push("спецификация (spec)");
  if (photos.length === 0) missing.push("фото");
  if (generated.length > 0) missing.push(`alt проверить (${generated.length})`);

  const extra = [
    ...(primary.kindLabel ? [`Подпись на карте inex.su: ${primary.kindLabel}`] : []),
    ...(specs.length > 0 ? [`Изделия на странице: ${specs.join("; ")}`] : []),
  ];
  const record: ObjectRecord = {
    slug: group.slug,
    name,
    oldUrls: group.oldUrls,
    outcome: "planned",
    missing,
    generatedAlts: generated,
    notes,
    merged: group.oldUrls.length > 1,
  };
  stats.objects.push(record);

  // Existing document: by any of the old URLs (draft versions included).
  const existing = dryRun
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

  if (dryRun) {
    ctx.log(`[dry-run] objects ${slug}: ${photos.length} фото, ${group.oldUrls.length} URL`);
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
        sortDate: new Date().toISOString(),
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

  // Existing: fill only empty fields, add missing legacy URLs.
  const patch: Record<string, unknown> = onlyEmpty(
    current as unknown as Record<string, unknown>,
    full
  );
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
  ctx.log(`objects ${slug}: дополнены поля ${Object.keys(patch).join(", ")}`);
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
  dryRun: boolean
): Promise<void> {
  let slug = toLatinSlug(lastSegment(shower.oldUrl));
  const record: ShowerRecord = {
    slug,
    name: shower.name,
    oldUrl: shower.oldUrl,
    outcome: "planned",
    notes: shower.notes,
    ...(shower.priceText ? { priceText: shower.priceText } : {}),
  };
  stats.showers.push(record);

  const photos = [shower.image, ...shower.gallery];
  const { alts } = photoAlts(shower.name, photos);
  if (dryRun) {
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

  const resolved = await media.resolve(photos, alts);
  const [image, ...gallery] = resolved;
  const extra = shower.priceText ? [`Цена на inex.su (не импортируется): ${shower.priceText}`] : [];
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
  const patch: Record<string, unknown> = onlyEmpty(current as unknown as Record<string, unknown>, {
    ...full,
    legacyUrl: shower.oldUrl,
  });
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
  ctx.log(`shower-configs ${record.slug}: дополнены поля ${Object.keys(patch).join(", ")}`);
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
}

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
    "| Запуск | Объекты | Душевые | Медиа создано / переиспользовано / пропущено | Ошибок | Длительность, с |",
    "|---|---|---|---|---:|---:|",
    ...history.map((run) =>
      mdRow([
        run.at,
        fmt(run.objects),
        fmt(run.showers),
        `${run.mediaCreated} / ${run.mediaReused} / ${run.photosSkipped}`,
        run.errors,
        run.seconds,
      ])
    ),
    "",
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

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      "dry-run": { type: "boolean", default: false },
      only: { type: "string" },
      limit: { type: "string" },
      "i-know-this-is-prod": { type: "boolean", default: false },
    },
  });
  const dryRun = values["dry-run"];
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

  if (only !== "showers") {
    const rows = await readSourceCsv();
    const parsed = await parseAllObjects();
    for (const [oldUrl, result] of parsed) {
      if (!result.ok) stats.parseFailed.push({ oldUrl, reason: result.reason });
    }
    const groups = groupObjects(rows, parsed, slugs).slice(0, limit);
    ctx.log(
      `объектов к импорту: ${groups.length} (страниц разобрано ${[...parsed.values()].filter((r) => r.ok).length}/${parsed.size})`
    );
    for (const group of groups) {
      try {
        await upsertObject(ctx, group, taxonomies, media, dryRun, slugs);
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
    const showers = (await parseAllShowers()).slice(0, limit);
    for (const result of showers) {
      if (!result.ok) {
        stats.errors.push({ what: `shower ${result.oldUrl}`, error: result.reason });
        continue;
      }
      try {
        await upsertShower(ctx, result.value, constructionId, media, dryRun);
      } catch (error) {
        stats.errors.push({
          what: `shower-configs ${result.value.oldUrl}`,
          error: errorMessage(error),
        });
        ctx.log(`shower-configs ${result.value.oldUrl}: ОШИБКА ${errorMessage(error)}`);
      }
    }
  }

  await media.save();
  const mode = [
    dryRun ? "--dry-run" : "запись в БД",
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
