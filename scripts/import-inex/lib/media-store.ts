/**
 * `media` documents for imported photos: download from inex.su (`resolve`) or upload a local
 * file (`fromLocalFile`), with deduplication across runs.
 *
 * Dedupe sources, in order:
 *   1. `media.sourceUrl` in the DB (loaded by `init()` for `inex.su` and `inex-objects:` URLs) —
 *      the source of truth, works on a fresh machine and on prod;
 *   2. the sha1 index file (`{ bySha1: { <sha1>: <media id> } }`) — an optional accelerator that
 *      also catches the same bytes under another URL. A missing or deleted index never causes
 *      duplicates of media that carry a `sourceUrl`.
 *
 * Sha1 is computed on the bytes handed to Payload; the `stripUploadMetadata` hook re-encodes
 * EXIF-bearing files afterwards, which does not affect the dedupe.
 */
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { SEED_REQUEST_CONTEXT, type SeedContext } from "@/seed/context";

import { photoFileName } from "../parse-objects";
import { MIN_PHOTO_BYTES, MIN_PHOTO_SIDE } from "../selectors";
import { TMP_DIR, mapLimit, readJson, sleep, writeFileAtomic } from "../shared";
import { errorMessage } from "./common";

/** Downloaded inex.su photos: `<PHOTO_DIR>/<sha1>/<original name>`. */
export const PHOTO_DIR = path.join(TMP_DIR, "photos");
/** Default sha1 index file (`import.ts`). */
export const MEDIA_INDEX_JSON = path.join(TMP_DIR, "media-index.json");

export const DOWNLOAD_CONCURRENCY = 4;
export const DOWNLOAD_TIMEOUT_MS = 30_000;
export const DOWNLOAD_ATTEMPTS = 3;
/** Default `media.credit` of imported photos. */
export const MEDIA_CREDIT = "inex.su";

/** `sourceUrl` prefixes (`like`) of imported media that `init()` loads for the dedupe. */
const IMPORTED_SOURCE_PATTERNS = ["inex.su", "inex-objects:"] as const;

interface MediaIndex {
  /** sha1 of the file content → media id. */
  bySha1: Record<string, string>;
}

/**
 * Counters and problems of a run. Pass the script's own report object to collect them there;
 * every `MediaStore` otherwise gets a fresh one (no state shared between scripts).
 */
export interface MediaStats {
  photosFound: number;
  photosDownloaded: number;
  mediaCreated: number;
  mediaReused: number;
  photosSkipped: Array<{ src: string; reason: string }>;
  errors: Array<{ what: string; error: string }>;
}

export const emptyMediaStats = (): MediaStats => ({
  photosFound: 0,
  photosDownloaded: 0,
  mediaCreated: 0,
  mediaReused: 0,
  photosSkipped: [],
  errors: [],
});

export interface MediaStoreOptions {
  /** No DB writes, no files written; ids are `dry-run:<source>`. */
  dryRun: boolean;
  /**
   * Sha1 index file. Default `MEDIA_INDEX_JSON` (`scripts/.import-tmp/media-index.json`); on prod
   * `/app` is read-only, so pass a path in a writable `--out` dir.
   */
  indexFile?: string;
  /** Where counters and skipped photos go (default: a fresh `MediaStats`, see `stats`). */
  stats?: MediaStats;
}

export interface LocalFileOptions {
  /** `media.alt` (required by the collection). */
  alt: string;
  /**
   * `media.sourceUrl` — the primary dedupe key (`inex-objects:<path>` for folder photos,
   * `<url>#cover-x2` for upscaled covers). Required: `init()` loads only media that carry a
   * `sourceUrl`, so a media created without one would not be re-found on the next run. A sha1
   * reuse under a new `sourceUrl` keeps the stored media as is; dedupe across runs is by
   * `sourceUrl`.
   */
  sourceUrl: string;
  /** `media.credit`, default `MEDIA_CREDIT` («inex.su»), e.g. «Inex Glass» for own photos. */
  credit?: string;
  /** Skip the ≥ 10 KB / ≥ 400 px checks (e.g. covers already checked by the caller). */
  relaxSizeChecks?: boolean;
}

/** Recognises JPEG / PNG / WebP by their magic bytes; returns the MIME type. */
export function sniffImage(bytes: Uint8Array): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  const riff = Buffer.from(bytes.slice(0, 4)).toString("ascii");
  const webp = Buffer.from(bytes.slice(8, 12)).toString("ascii");
  return riff === "RIFF" && webp === "WEBP" ? "image/webp" : null;
}

/** GET with a timeout and `DOWNLOAD_ATTEMPTS` tries (linear back-off). */
export async function download(src: string): Promise<Uint8Array> {
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

const sha1Of = (bytes: Uint8Array): string => createHash("sha1").update(bytes).digest("hex");

/**
 * Why the bytes are not an importable photo (`null` = fine): signature JPEG/PNG/WebP, and unless
 * `relaxSize` at least `MIN_PHOTO_BYTES` and `MIN_PHOTO_SIDE` px on the long side. Exported for
 * callers that convert a photo before `fromLocalFile` and must check the source file instead.
 */
export async function rejectReason(bytes: Uint8Array, relaxSize = false): Promise<string | null> {
  if (!relaxSize && bytes.byteLength < MIN_PHOTO_BYTES) {
    return `меньше ${MIN_PHOTO_BYTES / 1024} КБ`;
  }
  if (!sniffImage(bytes)) return "не JPEG/PNG/WebP по сигнатуре";
  const meta = await sharp(bytes)
    .metadata()
    .catch(() => null);
  if (!meta?.width || !meta.height) return "не удалось прочитать размеры";
  if (!relaxSize && Math.max(meta.width, meta.height) < MIN_PHOTO_SIDE) {
    return `меньше ${MIN_PHOTO_SIDE} px (${meta.width}×${meta.height})`;
  }
  return null;
}

export class MediaStore {
  /** Counters of this store (the sink passed in the options, or its own). */
  readonly stats: MediaStats;
  private readonly bySource = new Map<string, string>();
  private index: MediaIndex = { bySha1: {} };
  private readonly dryRun: boolean;
  private readonly indexFile: string;

  constructor(
    private readonly ctx: SeedContext,
    options: MediaStoreOptions
  ) {
    this.dryRun = options.dryRun;
    this.indexFile = options.indexFile ?? MEDIA_INDEX_JSON;
    this.stats = options.stats ?? emptyMediaStats();
  }

  /**
   * Loads media already imported (`sourceUrl` like `inex.su` or `inex-objects:`) and the sha1
   * index, keeping only index entries whose media still exist (an editor may delete media).
   * Call once before `resolve` / `fromLocalFile`.
   */
  async init(): Promise<void> {
    const { docs } = await this.ctx.payload.find({
      collection: "media",
      where: { or: IMPORTED_SOURCE_PATTERNS.map((pattern) => ({ sourceUrl: { like: pattern } })) },
      pagination: false,
      depth: 0,
      overrideAccess: true,
      select: { sourceUrl: true },
    });
    for (const doc of docs) if (doc.sourceUrl) this.bySource.set(doc.sourceUrl, doc.id);
    const index = await readJson<MediaIndex>(this.indexFile, { bySha1: {} });
    const ids = new Set(docs.map((doc) => doc.id));
    this.index = {
      bySha1: Object.fromEntries(Object.entries(index.bySha1).filter(([, id]) => ids.has(id))),
    };
  }

  /** Writes the sha1 index (atomically); nothing in dry-run. */
  async save(): Promise<void> {
    if (!this.dryRun) await writeFileAtomic(this.indexFile, JSON.stringify(this.index, null, 2));
  }

  /**
   * Media ids for photos on inex.su (order kept, skipped photos dropped). Downloads in parallel
   * (`DOWNLOAD_CONCURRENCY`), creates the media documents one by one (Payload resizes with sharp).
   * Downloaded files are kept under `PHOTO_DIR/<sha1>/`.
   */
  async resolve(
    photos: ReadonlyArray<{ src: string }>,
    alts: readonly string[]
  ): Promise<Array<{ id: string; alt: string }>> {
    this.stats.photosFound += photos.length;
    if (this.dryRun)
      return photos.map((photo, index) => ({ id: `dry-run:${photo.src}`, alt: alts[index] ?? "" }));

    const files = await mapLimit(photos, DOWNLOAD_CONCURRENCY, async (photo) => {
      if (this.bySource.has(photo.src)) return { photo, reuse: this.bySource.get(photo.src) };
      try {
        const bytes = await download(photo.src);
        this.stats.photosDownloaded += 1;
        return { photo, bytes };
      } catch (error) {
        this.stats.photosSkipped.push({
          src: photo.src,
          reason: `скачивание: ${errorMessage(error)}`,
        });
        return { photo };
      }
    });

    const result: Array<{ id: string; alt: string }> = [];
    for (const [index, file] of files.entries()) {
      const alt = alts[index] ?? "";
      if (file.reuse) {
        this.stats.mediaReused += 1;
        result.push({ id: file.reuse, alt });
        continue;
      }
      if (!file.bytes) continue;
      const id = await this.createMedia(file.photo.src, file.bytes, alt);
      if (id) result.push({ id, alt });
    }
    return result;
  }

  /**
   * Media id for a local file (never downloads, never writes into `PHOTO_DIR`).
   *
   * Dedupe: (1) exact `sourceUrl` among the loaded media → reuse; (2) sha1 of the file bytes (the
   * bytes that are uploaded — for an upscaled cover the converted WebP) in the index → reuse;
   * (3) otherwise checks the file (signature; size unless `relaxSizeChecks`) and creates the media
   * with the seed request context. A reused media keeps its stored `alt` / `credit`.
   *
   * @returns the media id, `dry-run:<sourceUrl>` in dry-run when it would be created, or
   *   `null` when the file is skipped or the create fails (reason in `stats.photosSkipped` /
   *   `stats.errors`).
   */
  async fromLocalFile(file: string, options: LocalFileOptions): Promise<string | null> {
    const { alt, sourceUrl, credit = MEDIA_CREDIT, relaxSizeChecks = false } = options;
    const label = sourceUrl;
    this.stats.photosFound += 1;

    const bySource = this.bySource.get(sourceUrl);
    if (bySource) {
      this.stats.mediaReused += 1;
      return bySource;
    }

    const filePath = path.resolve(file);
    let bytes: Uint8Array;
    try {
      bytes = new Uint8Array(await readFile(filePath));
    } catch (error) {
      this.stats.photosSkipped.push({ src: label, reason: `чтение: ${errorMessage(error)}` });
      return null;
    }
    const sha1 = sha1Of(bytes);
    const known = this.index.bySha1[sha1];
    if (known) {
      this.stats.mediaReused += 1;
      this.bySource.set(sourceUrl, known);
      return known;
    }

    const reason = await rejectReason(bytes, relaxSizeChecks);
    if (reason) {
      this.stats.photosSkipped.push({ src: label, reason });
      return null;
    }
    if (this.dryRun) return `dry-run:${label}`;

    try {
      const doc = await this.ctx.payload.create({
        collection: "media",
        data: {
          alt,
          kind: "photo",
          isPlaceholder: false,
          sourceUrl,
          credit,
        },
        filePath,
        depth: 0,
        overrideAccess: true,
        context: SEED_REQUEST_CONTEXT,
      });
      this.stats.mediaCreated += 1;
      this.bySource.set(sourceUrl, doc.id);
      this.index.bySha1[sha1] = doc.id;
      return doc.id;
    } catch (error) {
      this.stats.errors.push({ what: `media ${label}`, error: errorMessage(error) });
      return null;
    }
  }

  private async createMedia(src: string, bytes: Uint8Array, alt: string): Promise<string | null> {
    const skip = (reason: string) => {
      this.stats.photosSkipped.push({ src, reason });
      return null;
    };
    const reason = await rejectReason(bytes);
    if (reason) return skip(reason);

    const sha1 = sha1Of(bytes);
    const known = this.index.bySha1[sha1];
    if (known) {
      this.stats.mediaReused += 1;
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
      this.stats.mediaCreated += 1;
      this.bySource.set(src, doc.id);
      this.index.bySha1[sha1] = doc.id;
      return doc.id;
    } catch (error) {
      this.stats.errors.push({ what: `media ${src}`, error: errorMessage(error) });
      return null;
    }
  }
}
