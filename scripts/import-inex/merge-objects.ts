/**
 * Loader and publisher of the merged portfolio objects (portfolio-objects-import, task 07).
 *
 *   pnpm tsx --env-file=.env scripts/import-inex/merge-objects.ts [--input=<root>] [--content=<dir>]
 *        [--out=<dir>] [--dry-run] [--only=<slug,…>] [--no-publish] [--force-dev]
 *        [--allow-missing-covers] [--i-know-this-is-prod]
 *
 * Inputs (all relative to `--input`, default: the repo root; on prod a read-only bind mount):
 *   - `scripts/import-inex/data/objects-manifest.json` (task 01) — objects, photos, legacy URLs;
 *   - `<content>/<slug>.json` (tasks 04/05; `--content`, default `scripts/import-inex/data/content`);
 *   - `scripts/.import-tmp/covers/<sha1>.webp` + `covers/report.json` (task 06) — cover photos;
 *   - the photo files named in the manifest (`scripts/.import-tmp/photos/…`, `res/Объекты/…`).
 *
 * Writes ONLY to Payload (DB + media storage), to `--out` (default `scripts/.import-tmp`:
 * `media-index.json`, `slugs-objects.json`, `merge-objects-report.md`) and to a temp dir under
 * `os.tmpdir()` (WebP conversions, removed at the end). `--dry-run` writes nothing at all.
 *
 * Steps:
 *   1. content validation (`validateAll`, task 01) + CMS stop-word re-check; abort on errors;
 *   2. taxonomies: products must exist, object types may be created only from the allowed new
 *      names, cities are created as data;
 *   3. per object: find the target document (legacy URLs → slug → new), overwrite guard (seed
 *      KV markers, `mayOverwrite`), media (cover from `covers/`, other photos converted to WebP),
 *      new documents created as drafts;
 *   4. related + publish pass: full data with `_status: "published"`, compare first (unchanged →
 *      no write), validation errors re-saved as a draft; verification of the published state;
 *      `rememberSeedWrite` after the last write of each document;
 *   5. `slugs-objects.json` (for `fix-csv.ts`), report, `revalidateSite`.
 *
 * Idempotent: a second run with the same inputs writes nothing (media dedupe by exact
 * `sourceUrl`, which also works without `media-index.json`).
 *
 * Covers: a missing `covers/<sha1>.webp` is an object error (the object is skipped, exit 2) unless
 * `--allow-missing-covers` (the original photo is used; on production only when given explicitly,
 * and the report says so in bold).
 *
 * Seed placeholders: a document the guard refuses (no marker, legacy 2-second rule) is still
 * adopted while it has the seed placeholder shape — never published, no photos, no legacy URLs.
 *
 * Safety: refuses production (`SITE_ENV=production` or an `IMPORT_PROD_GUARD_HOSTS` DB host)
 * without `--i-know-this-is-prod`; `--force-dev` is refused there in any case.
 */
import { existsSync } from "node:fs";
import { copyFile, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";

import type { Where } from "payload";
import sharp from "sharp";

import { toLatinSlug } from "@/lib/migration/rules";
import type { Object as PortfolioObject } from "@/payload-types";
import {
  SEED_REQUEST_CONTEXT,
  getSeedContext,
  mayOverwrite,
  rememberSeedWrite,
  revalidateSite,
  type SeedContext,
} from "@/seed/context";

import type { Manifest, ManifestObject, ManifestPhoto } from "./build-manifest";
import { assertNotProduction, errorMessage, loadCmsStopWords } from "./lib/common";
import { MediaStore, emptyMediaStats } from "./lib/media-store";
import { Taxonomies } from "./lib/taxonomies";
import { REGION_LOCATION } from "./selectors";
import { ROOT, TMP_DIR, inexUrl, mdRow, readJson, writeFileAtomic } from "./shared";
import { validateAll, type ObjectContent } from "./validate-content";

/* ------------------------------------------------------------------------------------------ */
/* Constants                                                                                  */
/* ------------------------------------------------------------------------------------------ */

const LOG_PREFIX = "[merge-objects]";
/** First line of `importNotes` — deliberately without a date (a date would break idempotency). */
const IMPORT_NOTES_HEADER = "Импорт объектов (merge-objects)";

/** Object types content may introduce (created as data); any other unknown name is an error. */
const ALLOWED_NEW_OBJECT_TYPES: ReadonlySet<string> = new Set([
  "Спорт и отдых",
  "Рестораны",
  "Медицина",
  "Госучреждения",
  "Производство",
  "Образование",
]);
/** Products that exist but must not be linked (duplicates created by hand). */
const FORBIDDEN_PRODUCTS: Readonly<Record<string, string>> = {
  "steklyannye-peregorodki": "дубль, используйте «peregorodki»",
};

/** `media.sourceUrl` of own photos (`res/Объекты`): this prefix + the repo-relative path. */
const FOLDER_SOURCE_PREFIX = "inex-objects:";
/** Suffix of the upscaled cover's `sourceUrl`: it must not collide with the low-res original. */
const COVER_X2_SUFFIX = "#cover-x2";
const CREDIT_INEX = "inex.su";
const CREDIT_FOLDER = "Inex Glass";
/** Non-cover photos: no resize (long side of the inex.su originals is ≤ 1000 px). */
const WEBP_OPTIONS = { quality: 80, effort: 5 } as const;

/** Publish rules of the `objects` collection (mirrored for the dry-run check). */
const MIN_YEAR = 1990;
const MAX_TASK_LENGTH = 300;
const MAX_CHIPS = 3;
const MAX_RELATED = 4;

const SPEC_FIELDS = ["product", "thickness", "kind", "triplexFormula", "processing"] as const;

const MANIFEST_PATH = ["scripts", "import-inex", "data", "objects-manifest.json"] as const;
const CONTENT_PATH = ["scripts", "import-inex", "data", "content"] as const;
const COVERS_PATH = ["scripts", ".import-tmp", "covers"] as const;

const REPORT_FILE = "merge-objects-report.md";
const SLUGS_FILE = "slugs-objects.json";
const MEDIA_INDEX_FILE = "media-index.json";

/* ------------------------------------------------------------------------------------------ */
/* CLI                                                                                        */
/* ------------------------------------------------------------------------------------------ */

interface Cli {
  input: string;
  contentDir: string;
  out: string;
  dryRun: boolean;
  only: string[];
  publish: boolean;
  forceDev: boolean;
  /** Missing `covers/<sha1>.webp` → the original photo instead of an object error. */
  allowMissingCovers: boolean;
  allowProd: boolean;
}

function parseCli(): Cli {
  const { values } = parseArgs({
    options: {
      input: { type: "string" },
      content: { type: "string" },
      out: { type: "string" },
      "dry-run": { type: "boolean", default: false },
      only: { type: "string" },
      "no-publish": { type: "boolean", default: false },
      "force-dev": { type: "boolean", default: false },
      "allow-missing-covers": { type: "boolean", default: false },
      "i-know-this-is-prod": { type: "boolean", default: false },
    },
  });
  const input = path.resolve(values.input ?? ROOT);
  return {
    input,
    contentDir: path.resolve(values.content ?? path.join(input, ...CONTENT_PATH)),
    out: path.resolve(values.out ?? TMP_DIR),
    dryRun: values["dry-run"],
    only: (values.only ?? "")
      .split(",")
      .map((slug) => slug.trim())
      .filter(Boolean),
    publish: !values["no-publish"],
    forceDev: values["force-dev"],
    allowMissingCovers: values["allow-missing-covers"],
    allowProd: values["i-know-this-is-prod"],
  };
}

/** Whether the environment trips the production guard (same rule as `assertNotProduction`). */
function looksLikeProduction(): boolean {
  try {
    assertNotProduction(false);
    return false;
  } catch {
    return true;
  }
}

/** A problem that stops the whole run before anything is written. */
class FatalError extends Error {}

/* ------------------------------------------------------------------------------------------ */
/* Run state                                                                                  */
/* ------------------------------------------------------------------------------------------ */

interface PhotoRow {
  image: string;
  alt: string;
  caption?: string;
}

/** Fields this script writes (`seo`, `quizPrefill`, `legacyId`, `path` are never touched). */
interface ObjectData {
  name: string;
  slug: string;
  city: string | null;
  objectType: string | null;
  year: number;
  products: string[];
  task: string;
  spec: Array<Partial<Record<(typeof SPEC_FIELDS)[number], string>>>;
  chips: Array<{ text: string }>;
  photos: PhotoRow[];
  featured: boolean;
  sortDate: string;
  related: string[];
  legacyUrls: Array<{ url: string }>;
  sourceUrl?: string;
  importNotes: string;
}

/** How the target document was found. */
type TargetKind = "legacy" | "slug" | "new";
type RunResult =
  | "published"
  | "draft"
  | "unchanged"
  | "skipped"
  | "failed"
  | "publish-error"
  | "would-create"
  | "would-update"
  | "would-publish";

interface ObjectRun {
  object: ManifestObject;
  content: ObjectContent;
  kind: TargetKind;
  /** Document id; `dry-run:<slug>` for a document a dry run would create. */
  id: string;
  /** Final slug (an existing document keeps its own). */
  slug: string;
  /** Latest version of the existing document (`draft: true`). */
  existing: PortfolioObject | null;
  /** Other documents matching the legacy URLs (old one-page `import.ts` drafts). */
  duplicates: string[];
  cityId: string | null;
  objectTypeId: string | null;
  productIds: string[];
  photos: PhotoRow[];
  coverNote: string;
  /** The cover WebP was missing and the original was used (`--allow-missing-covers`). */
  coverMissing: boolean;
  result?: RunResult;
  /** Set once the script wrote this document in this run (marker needed). */
  written: boolean;
  errors: string[];
  remarks: string[];
  /** Skipped by the guard: what the import would add. */
  wouldAdd: string[];
}

interface CoverEntry {
  slug?: string;
  model?: string;
  status?: "ok" | "rejected" | "skipped-large" | "original";
  /** `pending`: flagged by the QA, the WebP is the original until `--accept` / `--reject`. */
  review?: "pending" | "accepted" | "rejected";
}

interface Taxa {
  created: string[];
  wouldCreate: string[];
}

const log = (message: string): void => {
  process.stdout.write(`${LOG_PREFIX} ${message}\n`);
};

/** Override hint of `mayOverwrite` (`src/seed/marker.ts`): the seed CLI flag, not this script's. */
const SEED_FORCE_HINT = "(перезапись: --force)";
const SCRIPT_FORCE_HINT = "(перезапись: --force-dev, только dev)";

/** Log for the seed context: rewrites the seed's `--force` hint to this script's `--force-dev`. */
const seedLog = (message: string): void => log(message.replace(SEED_FORCE_HINT, SCRIPT_FORCE_HINT));

/* ------------------------------------------------------------------------------------------ */
/* Step 1: inputs and validation                                                              */
/* ------------------------------------------------------------------------------------------ */

async function loadInputs(
  cli: Cli
): Promise<Array<{ object: ManifestObject; content: ObjectContent }>> {
  const manifestFile = path.join(cli.input, ...MANIFEST_PATH);
  if (!existsSync(manifestFile)) throw new FatalError(`нет манифеста ${manifestFile}`);
  const manifest = JSON.parse(await readFile(manifestFile, "utf8")) as Manifest;

  const result = validateAll({
    manifest,
    contentDir: cli.contentDir,
    ...(cli.only.length ? { slugs: cli.only } : {}),
  });
  for (const warning of result.warnings) log(`внимание: ${warning.slug}: ${warning.message}`);
  if (result.errors.length) {
    for (const error of result.errors) log(`ОШИБКА контента: ${error.slug}: ${error.message}`);
    throw new FatalError(`контент не прошёл проверку (ошибок: ${result.errors.length})`);
  }

  const only = new Set(cli.only);
  const objects = only.size
    ? manifest.objects.filter((object) => only.has(object.slug))
    : manifest.objects;
  return Promise.all(
    objects.map(async (object) => {
      const text = await readFile(path.join(cli.contentDir, `${object.slug}.json`), "utf8");
      return { object, content: JSON.parse(text.replace(/^﻿/, "")) as ObjectContent };
    })
  );
}

/** Every text of a card that ends up on the site (name, task, chips, spec, alts, captions). */
function contentTexts(content: ObjectContent): Array<[field: string, text: string]> {
  return [
    ["name", content.name],
    ["task", content.task],
    ...content.chips.map((chip, index): [string, string] => [`chips[${index}]`, chip]),
    ...content.spec.flatMap((row, index) =>
      SPEC_FIELDS.flatMap((key): Array<[string, string]> => {
        const value = row[key];
        return value ? [[`spec[${index}].${key}`, value]] : [];
      })
    ),
    ...content.photos.flatMap((photo, index): Array<[string, string]> => [
      [`photos[${index}].alt`, photo.alt],
      ...(photo.caption
        ? ([[`photos[${index}].caption`, photo.caption]] as Array<[string, string]>)
        : []),
    ]),
  ];
}

/** Re-check with the CMS stop-word list (partner factory names live in `site-settings`). */
async function checkCmsStopWords(
  ctx: SeedContext,
  items: ReadonlyArray<{ content: ObjectContent }>
): Promise<string> {
  const { check, source } = await loadCmsStopWords(ctx);
  const problems: string[] = [];
  for (const { content } of items) {
    for (const [field, text] of contentTexts(content)) {
      for (const finding of check(text)) {
        problems.push(`${content.slug}: ${field}: ${finding.message} («${finding.match}»)`);
      }
    }
  }
  for (const problem of problems) log(`ОШИБКА стоп-слово: ${problem}`);
  if (problems.length) throw new FatalError(`стоп-слова в контенте (${problems.length})`);
  return source;
}

/* ------------------------------------------------------------------------------------------ */
/* Step 2: taxonomies                                                                         */
/* ------------------------------------------------------------------------------------------ */

/** Name comparison key (as `Taxonomies`): trimmed, single spaces, lowercase, «ё» = «е». */
const nameKey = (name: string): string =>
  name.trim().replace(/\s+/g, " ").toLowerCase().replace(/ё/g, "е");

/**
 * Checks every product and object type BEFORE anything is created, so a bad content file never
 * leaves half-created reference data behind.
 */
async function precheckTaxonomies(
  ctx: SeedContext,
  items: ReadonlyArray<{ content: ObjectContent }>
): Promise<void> {
  const probe = new Taxonomies(ctx, true);
  const problems: string[] = [];
  for (const { content } of items) {
    for (const slug of content.products) {
      const forbidden = FORBIDDEN_PRODUCTS[slug];
      if (forbidden) problems.push(`${content.slug}: продукт «${slug}» — ${forbidden}`);
      await probe.productBySlug(slug).catch((error: unknown) => {
        problems.push(`${content.slug}: ${errorMessage(error)}`);
      });
    }
    const type = await probe.objectTypeByName(content.objectType, { create: false });
    if (type.status === "missing" && !ALLOWED_NEW_OBJECT_TYPES.has(content.objectType.trim())) {
      problems.push(
        `${content.slug}: тип объекта «${content.objectType}» не найден и не из разрешённых новых`
      );
    }
    if (REGION_LOCATION.test(content.city)) {
      problems.push(`${content.slug}: «${content.city}» — регион, нужен город`);
    }
  }
  for (const problem of problems) log(`ОШИБКА справочника: ${problem}`);
  if (problems.length) throw new FatalError(`справочники не сходятся (${problems.length})`);
}

/** Resolves (and outside dry-run creates) the city, object type and products of every object. */
async function resolveTaxonomies(
  ctx: SeedContext,
  runs: ObjectRun[],
  dryRun: boolean
): Promise<Taxa> {
  const taxonomies = new Taxonomies(ctx, dryRun);
  const taxa: Taxa = { created: [], wouldCreate: [] };
  const { docs: cities } = await ctx.payload.find({
    collection: "cities",
    pagination: false,
    depth: 0,
    overrideAccess: true,
    select: { name: true, slug: true },
  });
  const knownCities = new Set(cities.flatMap((city) => [nameKey(city.name), `slug:${city.slug}`]));
  const note = (list: string[], label: string) => {
    if (!list.includes(label)) list.push(label);
  };

  for (const run of runs) {
    const { content } = run;
    const cityName = content.city.trim();
    const cityKnown =
      knownCities.has(nameKey(cityName)) || knownCities.has(`slug:${toLatinSlug(cityName)}`);
    run.cityId = await taxonomies.city(cityName);
    if (!cityKnown) {
      note(dryRun ? taxa.wouldCreate : taxa.created, `город «${cityName}»`);
      knownCities.add(nameKey(cityName));
    }

    const type = await taxonomies.objectTypeByName(content.objectType, {
      create: ALLOWED_NEW_OBJECT_TYPES.has(content.objectType.trim()),
    });
    run.objectTypeId = type.id;
    if (type.status === "created") note(taxa.created, `тип объекта «${content.objectType}»`);
    if (type.status === "would-create")
      note(taxa.wouldCreate, `тип объекта «${content.objectType}»`);

    run.productIds = [];
    for (const slug of content.products) run.productIds.push(await taxonomies.productBySlug(slug));
  }
  return taxa;
}

/* ------------------------------------------------------------------------------------------ */
/* Step 3a/b: target document and overwrite guard                                             */
/* ------------------------------------------------------------------------------------------ */

const dryRunId = (slug: string): string => `dry-run:${slug}`;
const isDryRunId = (id: string): boolean => id.startsWith("dry-run:");

async function findLatest(ctx: SeedContext, where: Where) {
  const { docs } = await ctx.payload.find({
    collection: "objects",
    where,
    pagination: false,
    depth: 0,
    draft: true,
    overrideAccess: true,
    sort: "createdAt",
  });
  return docs;
}

/**
 * Target document of a manifest object: by legacy URL (earlier runs / `import.ts` drafts), else
 * by slug (seed placeholders), else a new one. Several legacy matches: the one with the content
 * slug, else the oldest; the rest are reported (never deleted). Documents already taken by
 * another object of this run are not reused.
 */
async function findTarget(ctx: SeedContext, run: ObjectRun, claimed: Set<string>): Promise<void> {
  const { object, content } = run;
  if (object.legacyUrls.length) {
    const docs = (await findLatest(ctx, { "legacyUrls.url": { in: object.legacyUrls } })).filter(
      (doc) => !claimed.has(doc.id)
    );
    const pick = docs.find((doc) => doc.slug === content.slug) ?? docs[0];
    if (pick) {
      run.kind = "legacy";
      run.existing = pick;
      run.duplicates = docs.filter((doc) => doc.id !== pick.id).map((doc) => doc.slug);
    }
  }
  if (!run.existing) {
    const [bySlug] = await findLatest(ctx, { slug: { equals: content.slug } });
    if (bySlug && claimed.has(bySlug.id)) {
      throw new Error(`slug «${content.slug}» уже занят другим объектом этого запуска`);
    }
    if (bySlug) {
      run.kind = "slug";
      run.existing = bySlug;
    }
  }
  if (run.existing) {
    run.id = run.existing.id;
    run.slug = run.existing.slug;
    claimed.add(run.id);
  } else {
    run.kind = "new";
    run.id = dryRunId(content.slug);
    run.slug = content.slug;
  }
}

const isEmpty = (value: unknown): boolean =>
  value === null ||
  value === undefined ||
  value === "" ||
  (Array.isArray(value) && value.length === 0);

/** What the import would add to a document the guard protects (empty there, filled in content). */
function wouldAddList(run: ObjectRun): string[] {
  const doc = run.existing;
  if (!doc) return [];
  const { content, object } = run;
  const list: string[] = [];
  const fill = (label: string, stored: unknown, incoming: unknown) => {
    if (isEmpty(stored) && !isEmpty(incoming)) list.push(label);
  };
  fill("город", doc.city, content.city);
  fill("тип объекта", doc.objectType, content.objectType);
  fill("год", doc.year, content.year);
  fill("изделия", doc.products, content.products);
  fill("задача", doc.task, content.task);
  fill("спецификация", doc.spec, content.spec);
  fill("метки", doc.chips, content.chips);
  fill("похожие объекты", doc.related, content.related);
  const storedPhotos = doc.photos?.length ?? 0;
  if (content.photos.length > storedPhotos) {
    list.push(`фото: в контенте ${content.photos.length}, в документе ${storedPhotos}`);
  }
  const storedUrls = new Set((doc.legacyUrls ?? []).map((row) => row.url));
  const missingUrls = object.legacyUrls.filter((url) => !storedUrls.has(url));
  if (missingUrls.length) list.push(`старые адреса: ${missingUrls.join(", ")}`);
  if (content.featured && !doc.featured) list.push("featured");
  return list;
}

/* ------------------------------------------------------------------------------------------ */
/* Step 3c: media                                                                             */
/* ------------------------------------------------------------------------------------------ */

interface MediaDeps {
  ctx: SeedContext;
  media: MediaStore;
  input: string;
  coversDir: string;
  coverReport: Record<string, CoverEntry>;
  /** `sourceUrl`s that already have media: no conversion needed (MediaStore reuses them). */
  knownSources: Set<string>;
  /** Lazily created temp dir for the WebP conversions. */
  tempDir: () => Promise<string>;
  dryRun: boolean;
  allowMissingCovers: boolean;
}

/** `media.sourceUrl` of the plain (non-upscaled) photo. */
const baseSourceUrl = (photo: ManifestPhoto): string =>
  photo.origin === "inex" && photo.sourceUrl
    ? photo.sourceUrl
    : `${FOLDER_SOURCE_PREFIX}${photo.file}`;

interface PhotoSource {
  /** File handed to Payload when the media has to be created. */
  file: string;
  sourceUrl: string;
  /** The file is the prepared cover WebP (no conversion, size checks relaxed). */
  preparedCover: boolean;
}

/** Cover (index 0): the prepared `covers/<sha1>.webp`; otherwise the original photo. */
function photoSource(
  deps: MediaDeps,
  run: ObjectRun,
  photo: ManifestPhoto,
  index: number
): PhotoSource {
  const original = {
    file: path.resolve(deps.input, photo.file),
    sourceUrl: baseSourceUrl(photo),
    preparedCover: false,
  };
  if (index !== 0) return original;

  const coverFile = path.join(deps.coversDir, `${photo.key}.webp`);
  const entry = deps.coverReport[photo.key];
  if (!existsSync(coverFile)) {
    // Without the flag the object is skipped: a low-res original must not go live silently.
    if (!deps.allowMissingCovers) {
      throw new Error(
        `обложка не подготовлена: нет ${path.relative(deps.input, coverFile)} — запустите upscale-covers (или --allow-missing-covers)`
      );
    }
    run.coverMissing = true;
    run.coverNote = "НЕТ ОБЛОЖКИ — оригинал (--allow-missing-covers)";
    run.remarks.push("обложка не подготовлена — используется оригинал (--allow-missing-covers)");
    return original;
  }
  if (!entry?.status) {
    run.coverNote = "нет записи в covers/report.json — оригинал";
    run.remarks.push(
      `обложка ${photo.key}.webp без записи в covers/report.json — используется оригинал`
    );
    return original;
  }
  run.coverNote = `${entry.model ?? "?"} (${entry.status}${entry.review === "pending" ? ", review pending" : ""})`;
  if (entry.status === "original" || entry.review === "pending") {
    run.remarks.push(
      entry.review === "pending"
        ? `внимание: обложка ${photo.key} помечена QA и ждёт проверки (upscale-covers --accept / --reject) — пока используется оригинал`
        : `внимание: обложка ${photo.key} не апскейлена (status original) — используется оригинал`
    );
  }
  const suffix = entry.status === "ok" ? COVER_X2_SUFFIX : "";
  return { file: coverFile, sourceUrl: `${original.sourceUrl}${suffix}`, preparedCover: true };
}

/** File to upload for a new media: a WebP in the temp dir (`<slug>-NN.webp`). */
async function uploadFile(deps: MediaDeps, run: ObjectRun, source: PhotoSource, index: number) {
  const target = path.join(
    await deps.tempDir(),
    `${run.slug}-${String(index + 1).padStart(2, "0")}.webp`
  );
  if (source.preparedCover) {
    await copyFile(source.file, target);
  } else {
    await sharp(source.file).rotate().webp(WEBP_OPTIONS).toFile(target);
  }
  return target;
}

/** Media ids of the content photos in content order (skipped photos are reported, not fatal). */
async function resolvePhotos(deps: MediaDeps, run: ObjectRun): Promise<void> {
  const byKey = new Map(run.object.photos.map((photo) => [photo.key, photo]));
  const seen = new Set<string>();
  run.photos = [];
  for (const [index, item] of run.content.photos.entries()) {
    const photo = byKey.get(item.key);
    if (!photo) {
      run.errors.push(`фото ${item.key}: нет в манифесте`);
      continue;
    }
    const source = photoSource(deps, run, photo, index);
    let file = source.file;
    // Known media are reused by `sourceUrl` without reading the file; dry-run never converts.
    if (!deps.dryRun && !deps.knownSources.has(source.sourceUrl) && existsSync(source.file)) {
      try {
        file = await uploadFile(deps, run, source, index);
      } catch (error) {
        run.errors.push(
          `фото ${index + 1} (${photo.file}): WebP не получен — ${errorMessage(error)}`
        );
        continue;
      }
    }
    const id = await deps.media.fromLocalFile(file, {
      alt: item.alt,
      sourceUrl: source.sourceUrl,
      credit: photo.origin === "inex" ? CREDIT_INEX : CREDIT_FOLDER,
      relaxSizeChecks: source.preparedCover,
    });
    if (!id) {
      run.errors.push(`фото ${index + 1} (${photo.file}) не загружено — см. «Проблемы медиа»`);
      continue;
    }
    if (seen.has(id)) {
      run.remarks.push(`фото ${index + 1}: то же медиа, что у другого фото объекта — пропущено`);
      continue;
    }
    seen.add(id);
    run.photos.push({
      image: id,
      alt: item.alt,
      ...(item.caption ? { caption: item.caption } : {}),
    });
  }
}

/* ------------------------------------------------------------------------------------------ */
/* Step 3c/4: document data, comparison, publish checks                                       */
/* ------------------------------------------------------------------------------------------ */

const unique = <T>(values: readonly T[]): T[] => [...new Set(values)];

function buildData(run: ObjectRun, related: string[]): ObjectData {
  const { content, object, existing } = run;
  const legacyUrls = unique([
    ...(existing?.legacyUrls ?? []).map((row) => row.url),
    ...object.legacyUrls,
  ]);
  const firstLegacy = object.legacyUrls[0];
  return {
    name: content.name,
    slug: run.slug,
    city: run.cityId,
    objectType: run.objectTypeId,
    year: content.year,
    products: run.productIds,
    task: content.task,
    spec: content.spec.map((row) =>
      Object.fromEntries(SPEC_FIELDS.flatMap((key) => (row[key]?.trim() ? [[key, row[key]]] : [])))
    ),
    chips: content.chips.map((text) => ({ text })),
    photos: run.photos,
    featured: content.featured,
    sortDate: `${content.year}-01-01T00:00:00.000Z`,
    related,
    legacyUrls: legacyUrls.map((url) => ({ url })),
    // Folder-only objects have no inex.su page: no source URL at all.
    ...(firstLegacy ? { sourceUrl: inexUrl(firstLegacy) } : {}),
    importNotes: unique([IMPORT_NOTES_HEADER, ...content.notes, ...object.notes]).join("\n"),
  };
}

const idOf = (value: unknown): string | null => {
  if (value && typeof value === "object" && "id" in value)
    return String((value as { id: unknown }).id);
  return typeof value === "string" ? value : null;
};
const text = (value: unknown): string => (typeof value === "string" ? value : "");

/**
 * Comparable form of the written keys: no array row ids, relations as ids, `related` and
 * `legacyUrls` as sorted sets, empty optional strings as "".
 */
function comparable(doc: Partial<ObjectData> | PortfolioObject, withSourceUrl: boolean) {
  const sortDate = Date.parse(text(doc.sortDate));
  return {
    name: text(doc.name),
    slug: text(doc.slug),
    city: idOf(doc.city),
    objectType: idOf(doc.objectType),
    year: doc.year ?? null,
    products: (doc.products ?? []).map(idOf),
    task: text(doc.task),
    spec: (doc.spec ?? []).map((row) =>
      SPEC_FIELDS.map((key) => text((row as Record<string, unknown>)[key]).trim())
    ),
    chips: (doc.chips ?? []).map((row) => text(row.text)),
    photos: (doc.photos ?? []).map((row) => [idOf(row.image), text(row.alt), text(row.caption)]),
    featured: Boolean(doc.featured),
    sortDate: Number.isFinite(sortDate) ? sortDate : null,
    related: (doc.related ?? []).map(idOf).sort(),
    legacyUrls: unique((doc.legacyUrls ?? []).map((row) => row.url)).sort(),
    sourceUrl: withSourceUrl ? text(doc.sourceUrl) : "",
    importNotes: text(doc.importNotes),
  };
}

const sameData = (stored: PortfolioObject, data: ObjectData): boolean =>
  JSON.stringify(comparable(stored, data.sourceUrl !== undefined)) ===
  JSON.stringify(comparable(data, data.sourceUrl !== undefined));

/** The collection's publish rules (city, type, products, year, task, spec, photos with alt). */
function publishProblems(data: ObjectData, dryRun: boolean): string[] {
  const problems: string[] = [];
  // In a dry run a reference that would be created has no id yet.
  if (!data.city && !dryRun) problems.push("нет города");
  if (!data.objectType && !dryRun) problems.push("нет типа объекта");
  if (!data.products.length) problems.push("нет изделий");
  const maxYear = new Date().getFullYear() + 1;
  if (!Number.isInteger(data.year) || data.year < MIN_YEAR || data.year > maxYear) {
    problems.push(`год ${data.year} вне ${MIN_YEAR}..${maxYear}`);
  }
  if (!data.task.trim()) problems.push("нет задачи");
  if (data.task.length > MAX_TASK_LENGTH) problems.push(`задача длиннее ${MAX_TASK_LENGTH}`);
  if (!data.spec.some((row) => row.product?.trim() && row.thickness?.trim())) {
    problems.push("в спецификации нет строки с изделием и толщиной");
  }
  if (data.chips.length > MAX_CHIPS) problems.push(`меток больше ${MAX_CHIPS}`);
  if (!data.photos.length) problems.push("нет фото");
  if (data.photos.some((photo) => !photo.alt.trim())) problems.push("фото без alt");
  if (data.related.length > MAX_RELATED) problems.push(`похожих больше ${MAX_RELATED}`);
  return problems;
}

/* ------------------------------------------------------------------------------------------ */
/* Step 4/5: writes                                                                           */
/* ------------------------------------------------------------------------------------------ */

async function createDraft(ctx: SeedContext, run: ObjectRun): Promise<void> {
  const data = buildData(run, []);
  const doc = await ctx.payload.create({
    collection: "objects",
    data: { ...data, _status: "draft" },
    draft: true,
    depth: 0,
    overrideAccess: true,
    context: SEED_REQUEST_CONTEXT,
  });
  run.id = doc.id;
  run.slug = doc.slug;
  run.written = true;
  log(`objects ${run.slug}: создан черновик`);
}

async function saveDraft(ctx: SeedContext, id: string, data: ObjectData): Promise<void> {
  await ctx.payload.update({
    collection: "objects",
    id,
    data: { ...data, _status: "draft" },
    draft: true,
    depth: 0,
    overrideAccess: true,
    context: SEED_REQUEST_CONTEXT,
  });
}

/**
 * Publishes with the FULL data (an adopted placeholder may lack fields publish validation needs;
 * a partial update would validate against the stored draft). A validation error re-saves the
 * data as a draft so nothing is lost.
 */
async function publish(ctx: SeedContext, run: ObjectRun, data: ObjectData): Promise<void> {
  const problems = publishProblems(data, false);
  if (problems.length) {
    await saveDraft(ctx, run.id, data);
    run.written = true;
    run.result = "publish-error";
    run.errors.push(`не опубликован: ${problems.join("; ")}`);
    return;
  }
  try {
    await ctx.payload.update({
      collection: "objects",
      id: run.id,
      data: { ...data, _status: "published" },
      draft: false,
      depth: 0,
      overrideAccess: true,
      context: SEED_REQUEST_CONTEXT,
    });
    run.written = true;
    run.result = "published";
  } catch (error) {
    run.errors.push(`публикация: ${errorMessage(error)}`);
    run.result = "publish-error";
    try {
      await saveDraft(ctx, run.id, data);
      run.written = true;
    } catch (draftError) {
      run.errors.push(`черновик после ошибки публикации: ${errorMessage(draftError)}`);
    }
  }
}

/**
 * Content slugs of `related` → ids (this run first, then the DB); unknown ones are reported.
 * Outside a dry run a `dry-run:<slug>` id means the draft was never created (the object failed):
 * such runs are left out (the DB lookup cannot find them either), so no fake id reaches `related`.
 */
async function relatedIds(
  ctx: SeedContext,
  runs: ObjectRun[],
  dryRun: boolean
): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const run of runs) {
    if (!dryRun && isDryRunId(run.id)) continue;
    ids.set(run.content.slug, run.id);
    ids.set(run.slug, run.id);
  }
  const missing = unique(runs.flatMap((run) => run.content.related)).filter(
    (slug) => !ids.has(slug)
  );
  if (missing.length) {
    for (const doc of await findLatest(ctx, { slug: { in: missing } })) ids.set(doc.slug, doc.id);
  }
  return ids;
}

/** Related + publish pass over the objects that are not skipped/failed. */
async function publishPass(ctx: SeedContext, runs: ObjectRun[], cli: Cli): Promise<void> {
  const slugIds = await relatedIds(ctx, runs, cli.dryRun);
  /** Objects of this run whose new document was not created (failed before `createDraft`). */
  const notCreated = new Set(
    cli.dryRun ? [] : runs.filter((run) => isDryRunId(run.id)).map((run) => run.content.slug)
  );
  const active = runs.filter((run) => !run.result);
  const realIds = active.map((run) => run.id).filter((id) => !isDryRunId(id));
  const latest = new Map(
    (realIds.length ? await findLatest(ctx, { id: { in: realIds } }) : []).map((doc) => [
      doc.id,
      doc,
    ])
  );

  for (const run of active) {
    const related: string[] = [];
    for (const slug of run.content.related) {
      const id = slugIds.get(slug);
      // Belt and braces: a dry-run id must never be written, whatever the map holds.
      if (id && id !== run.id && (cli.dryRun || !isDryRunId(id))) related.push(id);
      else if (id === run.id)
        run.remarks.push(`похожий объект «${slug}» — это сам объект — пропущен`);
      else if (notCreated.has(slug))
        run.remarks.push(`похожий объект «${slug}» не создан в этом запуске (ошибка) — пропущен`);
      else run.remarks.push(`похожий объект «${slug}» не найден в БД — пропущен`);
    }
    const data = buildData(run, related);
    const stored = latest.get(run.id) ?? null;
    const equal = stored !== null && sameData(stored, data);
    const isPublished = stored?._status === "published";

    if (cli.dryRun) {
      const problems = publishProblems(data, true);
      if (problems.length) run.errors.push(`не пройдёт публикацию: ${problems.join("; ")}`);
      run.result =
        equal && (isPublished || !cli.publish)
          ? "unchanged"
          : run.kind === "new"
            ? "would-create"
            : equal
              ? "would-publish"
              : "would-update";
      continue;
    }

    try {
      if (equal && (isPublished || !cli.publish)) {
        run.result = run.written ? (isPublished ? "published" : "draft") : "unchanged";
      } else if (!cli.publish) {
        await saveDraft(ctx, run.id, data);
        run.written = true;
        run.result = "draft";
      } else {
        await publish(ctx, run, data);
      }
    } catch (error) {
      run.result = "failed";
      run.errors.push(`запись: ${errorMessage(error)}`);
    }
    log(`objects ${run.slug}: ${RESULT_LABELS[run.result ?? "failed"]}`);
  }
}

/** What the site renders: every object that should be published must be (`draft: false`). */
async function verifyPublished(ctx: SeedContext, runs: ObjectRun[]): Promise<void> {
  const expected = runs.filter(
    (run) =>
      !isDryRunId(run.id) &&
      (run.result === "published" ||
        (run.result === "unchanged" && run.existing?._status === "published"))
  );
  if (!expected.length) return;
  const { docs } = await ctx.payload.find({
    collection: "objects",
    where: { id: { in: expected.map((run) => run.id) } },
    pagination: false,
    depth: 0,
    draft: false,
    overrideAccess: true,
    select: { _status: true },
  });
  const published = new Set(docs.filter((doc) => doc._status === "published").map((doc) => doc.id));
  for (const run of expected) {
    if (!published.has(run.id)) {
      run.result = "publish-error";
      run.errors.push("проверка: опубликованной версии нет (find draft: false)");
    }
  }
}

/* ------------------------------------------------------------------------------------------ */
/* Report                                                                                     */
/* ------------------------------------------------------------------------------------------ */

const RESULT_LABELS: Readonly<Record<RunResult, string>> = {
  published: "опубликован",
  draft: "черновик (--no-publish)",
  unchanged: "без изменений",
  skipped: "пропущен (изменён вручную)",
  failed: "ошибка",
  "publish-error": "ошибка публикации (сохранён черновиком)",
  "would-create": "будет создан и опубликован",
  "would-update": "будет обновлён (и опубликован без --no-publish)",
  "would-publish": "будет опубликован",
};
const KIND_LABELS: Readonly<Record<TargetKind, string>> = {
  legacy: "найден по старому адресу",
  slug: "принят по slug (заглушка)",
  new: "новый",
};

interface ReportInput {
  cli: Cli;
  runs: ObjectRun[];
  taxa: Taxa;
  media: MediaStore;
  stopWordSource: string;
  featuredInDb: Array<{ slug: string; reason: string }>;
  /** The run targets production (`--i-know-this-is-prod`). */
  production: boolean;
}

function countLine(runs: ObjectRun[]): string {
  const written = (run: ObjectRun) => run.written && run.result !== "failed";
  const counts = {
    создано: runs.filter(
      (run) => run.kind === "new" && (written(run) || run.result === "would-create")
    ).length,
    "принято заглушек": runs.filter(
      (run) => run.kind === "slug" && (written(run) || run.result?.startsWith("would-"))
    ).length,
    обновлено: runs.filter(
      (run) => run.kind === "legacy" && (written(run) || run.result?.startsWith("would-"))
    ).length,
    "без изменений": runs.filter((run) => run.result === "unchanged").length,
    "пропущено защитой": runs.filter((run) => run.result === "skipped").length,
    "ошибок публикации": runs.filter((run) => run.result === "publish-error").length,
    ошибок: runs.filter((run) => run.result === "failed").length,
  };
  return Object.entries(counts)
    .map(([label, count]) => `${label}: ${count}`)
    .join(", ");
}

/** Loud note on objects written with the original photo instead of the prepared cover. */
function missingCoversBanner(runs: ObjectRun[], production: boolean): string[] {
  const missing = runs.filter((run) => run.coverMissing).map((run) => `\`${run.slug}\``);
  if (!missing.length) return [];
  const where = production ? "НА PRODUCTION " : "";
  return [
    `**ВНИМАНИЕ: ${where}обложки не подготовлены (--allow-missing-covers), использованы оригиналы: ${missing.join(", ")}.** Запустите upscale-covers и повторите импорт.`,
    "",
  ];
}

function renderReport(input: ReportInput): string {
  const { cli, runs, taxa, media, stopWordSource, featuredInDb, production } = input;
  const stats = media.stats;
  const wouldCreateMedia = cli.dryRun
    ? runs.reduce(
        (sum, run) => sum + run.photos.filter((photo) => isDryRunId(photo.image)).length,
        0
      )
    : 0;
  const mode = [
    cli.dryRun ? "--dry-run (ничего не записано)" : "запись в БД",
    cli.publish ? "" : "--no-publish",
    cli.forceDev ? "--force-dev" : "",
    cli.allowMissingCovers ? "--allow-missing-covers" : "",
    cli.only.length ? `--only=${cli.only.join(",")}` : "",
  ].filter(Boolean);
  const lines = [
    "# Импорт объектов (merge-objects)",
    "",
    `Режим: ${mode.join(", ")}. Вход: \`${cli.input}\`, контент: \`${cli.contentDir}\`.`,
    `Стоп-слова: ${stopWordSource}.`,
    "",
    `**Объекты:** ${countLine(runs)}.`,
    "",
    ...missingCoversBanner(runs, production),
    cli.dryRun
      ? `**Медиа:** будет создано ${wouldCreateMedia}, переиспользовано ${stats.mediaReused}, пропущено ${stats.photosSkipped.length}.`
      : `**Медиа:** создано ${stats.mediaCreated}, переиспользовано ${stats.mediaReused}, пропущено ${stats.photosSkipped.length}, ошибок ${stats.errors.length}.`,
    "",
    `**Справочники:** создано — ${taxa.created.join(", ") || "нет"}; будет создано — ${taxa.wouldCreate.join(", ") || "нет"}.`,
    "",
    "## Объекты",
    "",
    mdRow(["slug", "документ", "результат", "фото", "обложка", "замечания"]),
    mdRow(["---", "---", "---", "---", "---", "---"]),
    ...runs.map((run) =>
      mdRow([
        run.slug === run.content.slug ? run.slug : `${run.slug} (контент: ${run.content.slug})`,
        KIND_LABELS[run.kind],
        RESULT_LABELS[run.result ?? "failed"],
        run.result === "skipped"
          ? `— (${run.content.photos.length} в контенте)`
          : run.photos.length,
        run.coverNote || "—",
        [...run.errors.map((error) => `ОШИБКА: ${error}`), ...run.remarks].join("; ") || "—",
      ])
    ),
  ];

  const skipped = runs.filter((run) => run.result === "skipped");
  lines.push("", "## Пропущено защитой от перезаписи", "");
  if (skipped.length) {
    lines.push(
      "Документ изменён или опубликован вручную после последней записи импорта (маркер `payload.kv`); перезапись — `--force-dev` (только dev). Импорт добавил бы:",
      ""
    );
    for (const run of skipped) {
      const status =
        run.existing?._status === "published" ? "опубликован вручную" : "изменён вручную";
      lines.push(
        `- \`${run.slug}\` (${status}): ${run.wouldAdd.join("; ") || "данные отличаются, пустых полей нет"}`
      );
    }
  } else lines.push("Нет.");

  const duplicates = runs.filter((run) => run.duplicates.length);
  lines.push("", "## Дубли старого импорта", "");
  if (duplicates.length) {
    lines.push("Документы с теми же старыми адресами (не удалены, не изменены):", "");
    for (const run of duplicates)
      lines.push(`- \`${run.slug}\` ← ${run.duplicates.map((slug) => `\`${slug}\``).join(", ")}`);
  } else lines.push("Нет.");

  const featuredRuns = runs.filter((run) => run.content.featured && run.result !== "skipped");
  lines.push(
    "",
    "## Избранные (лента «Объекты» на главной)",
    "",
    `Этот запуск: ${featuredRuns.map((run) => `\`${run.slug}\``).join(", ") || "нет"}.`,
    `Уже избранные в БД вне этого запуска: ${featuredInDb.map((item) => `\`${item.slug}\` (${item.reason})`).join(", ") || "нет"}.`,
    `**Итого в ленте: ${featuredRuns.length + featuredInDb.length}.**`
  );

  if (stats.photosSkipped.length || stats.errors.length) {
    lines.push("", "## Проблемы медиа", "");
    for (const item of stats.photosSkipped) lines.push(`- пропущено ${item.src}: ${item.reason}`);
    for (const item of stats.errors) lines.push(`- ошибка ${item.what}: ${item.error}`);
  }

  lines.push(
    "",
    "## После запуска",
    "",
    "- Поиск: плагин индексирует опубликованные документы сам; при расхождениях — `scripts/reindex-search.ts`.",
    `- Редиректы: \`${SLUGS_FILE}\` в \`--out\` → \`fix-csv.ts\` (вместе с \`slugs.json\`).`,
    ""
  );
  return lines.join("\n");
}

/** Published `featured` objects that this run does not set: they share the home marquee. */
async function featuredOutsideRun(ctx: SeedContext, runs: ObjectRun[]) {
  const { docs } = await ctx.payload.find({
    collection: "objects",
    where: { featured: { equals: true } },
    pagination: false,
    depth: 0,
    draft: false,
    overrideAccess: true,
    select: { slug: true, _status: true },
  });
  const bySlug = new Map(runs.map((run) => [run.slug, run]));
  return docs
    .filter((doc) => doc._status === "published")
    .flatMap((doc) => {
      const run = bySlug.get(doc.slug);
      if (!run) return [{ slug: doc.slug, reason: "нет в этом запуске" }];
      return run.result === "skipped" ? [{ slug: doc.slug, reason: "пропущен защитой" }] : [];
    });
}

/* ------------------------------------------------------------------------------------------ */
/* Main                                                                                       */
/* ------------------------------------------------------------------------------------------ */

function newRun(object: ManifestObject, content: ObjectContent): ObjectRun {
  return {
    object,
    content,
    kind: "new",
    id: dryRunId(content.slug),
    slug: content.slug,
    existing: null,
    duplicates: [],
    cityId: null,
    objectTypeId: null,
    productIds: [],
    photos: [],
    coverNote: "",
    coverMissing: false,
    written: false,
    errors: [],
    remarks: [],
    wouldAdd: [],
  };
}

/**
 * Whether a document the guard refused is still an untouched seed placeholder: the seed creates
 * them as drafts without photos or legacy URLs and may update them in a later slice, which the
 * legacy 2-second rule (documents without a KV marker, e.g. on prod) misreads as an edit. A
 * document that was ever published, or got photos / legacy URLs, stays protected.
 */
async function isSeedPlaceholder(ctx: SeedContext, doc: PortfolioObject): Promise<boolean> {
  if (doc._status !== "draft" || doc.photos?.length || doc.legacyUrls?.length) return false;
  const { totalDocs } = await ctx.payload.findVersions({
    collection: "objects",
    where: {
      and: [{ parent: { equals: doc.id } }, { "version._status": { equals: "published" } }],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  return totalDocs === 0;
}

/** Step 3 for one object: target, guard, media, draft creation. */
async function prepareObject(
  ctx: SeedContext,
  run: ObjectRun,
  deps: MediaDeps,
  claimed: Set<string>
) {
  await findTarget(ctx, run, claimed);
  if (run.existing && !(await mayOverwrite(ctx, "objects", { id: { equals: run.id } }, run.slug))) {
    if (!(await isSeedPlaceholder(ctx, run.existing))) {
      run.result = "skipped";
      run.wouldAdd = wouldAddList(run);
      return;
    }
    run.remarks.push(
      "заглушка сида принята (маркера нет или он устарел, но документ — неопубликованный черновик без фото и старых адресов)"
    );
    log(`objects ${run.slug}: заглушка сида принята — пропуск отменён`);
  }
  await resolvePhotos(deps, run);
  if (run.kind === "new" && !deps.dryRun) await createDraft(ctx, run);
}

async function main(): Promise<number> {
  const cli = parseCli();
  // `--force-dev` overwrites edited documents: never on production, whatever the other flags say.
  if (cli.forceDev && looksLikeProduction()) {
    throw new FatalError("--force-dev запрещён на production (SITE_ENV / IMPORT_PROD_GUARD_HOSTS)");
  }
  assertNotProduction(cli.allowProd);
  const production = looksLikeProduction();
  if (cli.allowMissingCovers && production) {
    log("ВНИМАНИЕ: --allow-missing-covers на PRODUCTION — объекты без обложки получат оригинал");
  }

  const inputs = await loadInputs(cli);
  log(`объектов: ${inputs.length}${cli.dryRun ? " (dry-run)" : ""}`);

  const ctx = await getSeedContext({ force: cli.forceDev, log: seedLog });
  const stopWordSource = await checkCmsStopWords(ctx, inputs);
  await precheckTaxonomies(ctx, inputs);

  const runs = inputs.map(({ object, content }) => newRun(object, content));
  const taxa = await resolveTaxonomies(ctx, runs, cli.dryRun);

  const media = new MediaStore(ctx, {
    dryRun: cli.dryRun,
    indexFile: path.join(cli.out, MEDIA_INDEX_FILE),
    stats: emptyMediaStats(),
  });
  await media.init();
  const coversDir = path.join(cli.input, ...COVERS_PATH);
  const coverReport = await readJson<Record<string, CoverEntry>>(
    path.join(coversDir, "report.json"),
    {}
  );

  const candidateSources = unique(
    runs.flatMap((run) =>
      run.object.photos.flatMap((photo) => [
        baseSourceUrl(photo),
        `${baseSourceUrl(photo)}${COVER_X2_SUFFIX}`,
      ])
    )
  );
  const { docs: knownMedia } = await ctx.payload.find({
    collection: "media",
    where: { sourceUrl: { in: candidateSources } },
    pagination: false,
    depth: 0,
    overrideAccess: true,
    select: { sourceUrl: true },
  });

  let tempDir: string | null = null;
  const deps: MediaDeps = {
    ctx,
    media,
    input: cli.input,
    coversDir,
    coverReport,
    knownSources: new Set(knownMedia.flatMap((doc) => (doc.sourceUrl ? [doc.sourceUrl] : []))),
    tempDir: async () => (tempDir ??= await mkdtemp(path.join(os.tmpdir(), "merge-objects-"))),
    dryRun: cli.dryRun,
    allowMissingCovers: cli.allowMissingCovers,
  };

  try {
    const claimed = new Set<string>();
    for (const run of runs) {
      try {
        await prepareObject(ctx, run, deps, claimed);
      } catch (error) {
        run.result = "failed";
        run.errors.push(errorMessage(error));
        log(`objects ${run.slug}: ОШИБКА ${errorMessage(error)}`);
      }
    }
    await media.save();

    await publishPass(ctx, runs, cli);
    if (!cli.dryRun) {
      await verifyPublished(ctx, runs);
      // Markers last: nothing writes to these documents after this point.
      for (const run of runs) if (run.written) await rememberSeedWrite(ctx, "objects", run.id);
    }
  } finally {
    if (tempDir) await rm(tempDir, { recursive: true, force: true });
  }

  const report = renderReport({
    cli,
    runs,
    taxa,
    media,
    stopWordSource,
    featuredInDb: await featuredOutsideRun(ctx, runs),
    production,
  });
  process.stdout.write(`\n${report}\n`);

  if (!cli.dryRun) {
    await mkdir(cli.out, { recursive: true });
    const slugsFile = path.join(cli.out, SLUGS_FILE);
    // A partial run (`--only`) merges into the existing map; a full run rewrites it.
    const slugs = cli.only.length ? await readJson<Record<string, string>>(slugsFile, {}) : {};
    for (const run of runs) for (const url of run.object.legacyUrls) slugs[url] = run.slug;
    await writeFileAtomic(slugsFile, `${JSON.stringify(slugs, null, 2)}\n`);
    await writeFileAtomic(path.join(cli.out, REPORT_FILE), report);
    log(`записано: ${slugsFile}, ${path.join(cli.out, REPORT_FILE)}`);
    await revalidateSite(ctx);
  }

  const failed = runs.filter(
    (run) => run.result === "failed" || run.result === "publish-error" || run.errors.length
  );
  return failed.length || media.stats.errors.length ? 2 : 0;
}

try {
  process.exit(await main());
} catch (error) {
  console.error(`${LOG_PREFIX} ошибка —`, errorMessage(error));
  process.exit(1);
}
