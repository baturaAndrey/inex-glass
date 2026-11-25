/**
 * Cover upscaler for the portfolio objects import (portfolio-objects-import, task 06).
 *
 *   pnpm tsx --env-file=.env scripts/import-inex/upscale-covers.ts --pilot=5 [--only=<slug>,…]
 *   pnpm tsx --env-file=.env scripts/import-inex/upscale-covers.ts --model=topaz|recraft [--only=<slug>,…] [--dry-run]
 *   pnpm tsx --env-file=.env scripts/import-inex/upscale-covers.ts --accept=<slug|sha1>,… | --reject=<slug|sha1>,…
 *
 * Only the cover (first photo) of every manifest object is upscaled ×2 via kie.ai; everything else
 * is converted by the loader (task 07) itself. Cover = `data/content/<slug>.json` `photos[0].key` when
 * the content file exists, else the manifest `coverKey`.
 *
 * Modes:
 * - `--pilot=N`: both models on the first N covers of PILOT (varied content), writes side-by-side
 *   comparisons to `covers/pilot/` and `covers/pilot/report.json`, prints a table and stops. It does
 *   not write `covers/<sha1>.webp` — the model is not approved yet.
 * - `--model=…`: the full run. Writes `covers/<sha1>.webp` (≤2000 px, < 2 MB) for every cover and an
 *   entry in `covers/report.json` (`{ <sha1>: CoverEntry }`, read by `merge-objects.ts`).
 * - `--accept` / `--reject`: the human decision for a flagged cover (see QA below); no API calls.
 *
 * Cost control and idempotency: every kie.ai result is kept in `covers/raw/<sha1>.<model>.<ext>`
 * (+ `.json` sidecar with taskId/credits), so a sha1 is never paid twice for the same model — re-running
 * the pilot is free and the full run reuses the pilot results. The full run also skips covers whose
 * report entry (same model) and WebP already exist; a rejected cover is never retried automatically.
 * The balance is printed before and after, and the run aborts when the estimate exceeds the balance.
 *
 * Input: the LOCAL photo file is always uploaded (`KieClient.uploadFile`, free, 24 h): it is exactly the
 * sha1 in the manifest, while 16 inex.su file names exist under several sha1s. The manifest `sourceUrl`
 * is used only when the local file is missing or unreadable.
 *
 * QA (automatic): output size (Topaz must be exactly ×2 ±1 px), then the result is downscaled back
 * with lanczos3 and compared in greyscale with the original: SSIM (8×8 sliding windows, standard
 * constants) and PSNR. Below the thresholds the cover is flagged: a heatmap goes to
 * `covers/flagged/<sha1>.png`, the WebP falls back to the original (status "original", review
 * "pending") until a human runs `--accept` (upscaled, status "ok") or `--reject` (status "rejected").
 *
 * Never logs the kie.ai key.
 */
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";

import sharp, { type OverlayOptions, type Sharp } from "sharp";

import {
  KIE_UPSCALE_MAX_INPUT_BYTES,
  KIE_UPSCALE_MODELS,
  KieClient,
  KieFatalError,
  kieApiKey,
  type UpscaleModel,
} from "../lib/kie";

import type { Manifest, ManifestObject, ManifestPhoto } from "./build-manifest";

/* ------------------------------------------------------------------------------------------ */
/* Paths and constants                                                                        */
/* ------------------------------------------------------------------------------------------ */

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const MANIFEST_PATH = path.join(ROOT, "scripts", "import-inex", "data", "objects-manifest.json");
const CONTENT_DIR = path.join(ROOT, "scripts", "import-inex", "data", "content");
const COVERS_DIR = path.join(ROOT, "scripts", ".import-tmp", "covers");
const RAW_DIR = path.join(COVERS_DIR, "raw");
const FLAGGED_DIR = path.join(COVERS_DIR, "flagged");
const PILOT_DIR = path.join(COVERS_DIR, "pilot");
const REPORT_PATH = path.join(COVERS_DIR, "report.json");
const PILOT_REPORT_PATH = path.join(PILOT_DIR, "report.json");

/** CLI short names → kie.ai model ids. */
const MODEL_ALIASES: Readonly<Record<string, UpscaleModel>> = {
  topaz: "topaz/image-upscale",
  recraft: "recraft/crisp-upscale",
};
const MODEL_SHORT: Readonly<Record<UpscaleModel, string>> = {
  "topaz/image-upscale": "topaz",
  "recraft/crisp-upscale": "recraft",
};
const PILOT_MODELS: readonly UpscaleModel[] = ["topaz/image-upscale", "recraft/crisp-upscale"];

const UPSCALE_FACTOR = 2;
/** Covers with a long side at or above this are already sharp enough: converted, not upscaled. */
const LARGE_LONG_SIDE_PX = 1600;
/** Topaz output must be exactly input × factor, within this tolerance per side. */
const SIZE_TOLERANCE_PX = 1;
const DEFAULT_CONCURRENCY = 2;

/** QA thresholds (tuned on the pilot, recorded in every report entry). */
const QA_THRESHOLDS = { ssim: 0.95, psnr: 30 } as const;
const SSIM_WINDOW = 8;
const SSIM_C1 = (0.01 * 255) ** 2;
const SSIM_C2 = (0.03 * 255) ** 2;
/** Heatmap gain: a grey difference of 64 already shows as full red. */
const HEATMAP_GAIN = 4;

const WEBP_MAX_SIDE = 2000;
const WEBP_QUALITY = 80;
const WEBP_FALLBACK_QUALITY = 72;
const WEBP_EFFORT = 5;
const WEBP_MAX_BYTES = 2 * 1024 * 1024;

/** Pilot crop size (in ×2 pixels) around the most detailed area of the cover. */
const PILOT_CROP_PX = 400;
const LABEL_HEIGHT_PX = 44;

/** Upload formats accepted by kie.ai as-is; anything else is re-encoded first. */
const UPLOADABLE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

/**
 * Pilot covers, chosen for varied content (2026-11-25 contact sheet of all 43 covers). Order matters:
 * `--pilot=N` takes the first N.
 */
const PILOT: readonly { slug: string; role: string }[] = [
  { slug: "trc-kuba", role: "text / signage (NADINE, SALE)" },
  { slug: "traktor-arena", role: "thin railings" },
  { slug: "ugorskaya-shahmatnaya-akademiya", role: "reflections (glossy floor, glass)" },
  { slug: "tk-kolco", role: "portrait" },
  { slug: "sokol-fit", role: "dark interior" },
];

/* ------------------------------------------------------------------------------------------ */
/* Types                                                                                      */
/* ------------------------------------------------------------------------------------------ */

type CoverStatus = "ok" | "rejected" | "skipped-large" | "original";
type ReviewState = "pending" | "accepted" | "rejected";

interface Cover {
  slug: string;
  sha1: string;
  photo: ManifestPhoto;
  /** Where the cover key came from: the content file (final) or the manifest default. */
  coverFrom: "content" | "manifest";
  /** Absolute local path, or null when the local file is missing (then `sourceUrl` is used). */
  localFile: string | null;
}

interface QaResult {
  out: [number, number];
  factor: number;
  ssim: number;
  psnr: number;
  flagged: boolean;
  reasons: string[];
}

/** One entry of `covers/report.json`, keyed by the cover sha1 (contract with task 07). */
interface CoverEntry {
  slug: string;
  model: UpscaleModel;
  status: CoverStatus;
  src: [number, number];
  out: [number, number];
  factor?: number;
  ssim?: number;
  psnr?: number;
  credits: number;
  taskId?: string;
  /** True when the kie.ai result came from `covers/raw/` (no new charge in this run). */
  cached?: boolean;
  flagged?: boolean;
  reasons?: string[];
  review?: ReviewState;
  coverFrom: Cover["coverFrom"];
  input?: "upload" | "sourceUrl";
  thresholds: typeof QA_THRESHOLDS;
  ms?: number;
  error?: string;
  at: string;
}
type Report = Record<string, CoverEntry>;

/** Sidecar of a downloaded kie.ai result in `covers/raw/`. */
interface RawMeta {
  model: UpscaleModel;
  taskId: string;
  credits: number;
  resultUrl: string;
  input: "upload" | "sourceUrl";
  ms: number;
  at: string;
}

interface UpscaleOutcome {
  buffer: Buffer;
  meta: RawMeta;
  cached: boolean;
}

interface PilotRow {
  slug: string;
  sha1: string;
  role: string;
  model: UpscaleModel;
  src: [number, number];
  out?: [number, number];
  factor?: number;
  ssim?: number;
  psnr?: number;
  credits: number;
  cached: boolean;
  flagged?: boolean;
  reasons?: string[];
  taskId?: string;
  ms?: number;
  error?: string;
}

interface Options {
  pilot: number | null;
  model: UpscaleModel | null;
  only: string[];
  dryRun: boolean;
  accept: string[];
  reject: string[];
  concurrency: number;
}

/* ------------------------------------------------------------------------------------------ */
/* CLI                                                                                        */
/* ------------------------------------------------------------------------------------------ */

function splitList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseOptions(): Options {
  const { values } = parseArgs({
    options: {
      pilot: { type: "string" },
      model: { type: "string" },
      only: { type: "string" },
      "dry-run": { type: "boolean", default: false },
      accept: { type: "string" },
      reject: { type: "string" },
      concurrency: { type: "string" },
    },
    strict: true,
  });

  let pilot: number | null = null;
  if (values.pilot !== undefined) {
    pilot = Number(values.pilot);
    if (!Number.isInteger(pilot) || pilot < 1 || pilot > PILOT.length) {
      throw new Error(`--pilot must be an integer 1…${PILOT.length}`);
    }
  }
  let model: UpscaleModel | null = null;
  if (values.model !== undefined) {
    model = MODEL_ALIASES[values.model] ?? null;
    if (!model) throw new Error(`--model must be one of: ${Object.keys(MODEL_ALIASES).join(", ")}`);
  }
  const accept = splitList(values.accept);
  const reject = splitList(values.reject);
  const modes = [pilot !== null, model !== null, accept.length + reject.length > 0].filter(Boolean);
  if (modes.length !== 1) {
    throw new Error("choose exactly one mode: --pilot=N, --model=topaz|recraft, or --accept/--reject");
  }
  if (values["dry-run"] && model === null && pilot === null) {
    throw new Error("--dry-run applies to --pilot or --model");
  }
  const concurrency = values.concurrency === undefined ? DEFAULT_CONCURRENCY : Number(values.concurrency);
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 4) {
    throw new Error("--concurrency must be an integer 1…4");
  }
  return {
    pilot,
    model,
    only: splitList(values.only),
    dryRun: values["dry-run"],
    accept,
    reject,
    concurrency,
  };
}

/* ------------------------------------------------------------------------------------------ */
/* Files                                                                                      */
/* ------------------------------------------------------------------------------------------ */

async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, "utf8")) as T;
}

/** Atomic write (tmp + rename) so an interrupted run never leaves a half-written JSON. */
async function writeJsonAtomic(file: string, data: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  await rename(tmp, file);
}

async function loadReport(): Promise<Report> {
  return existsSync(REPORT_PATH) ? readJson<Report>(REPORT_PATH) : {};
}

/**
 * Serialises report writes: workers update the in-memory map and queue a full rewrite, so writes
 * never interleave and an interrupted run keeps every finished cover.
 */
function createReportWriter(file: string, getData: () => unknown): () => Promise<void> {
  let chain = Promise.resolve();
  return () => {
    chain = chain.then(() => writeJsonAtomic(file, getData()));
    return chain;
  };
}

/* ------------------------------------------------------------------------------------------ */
/* Cover resolution                                                                           */
/* ------------------------------------------------------------------------------------------ */

/** The final cover key from `data/content/<slug>.json` (`photos[0].key`), or null without the file. */
async function contentCoverKey(slug: string): Promise<string | null> {
  const file = path.join(CONTENT_DIR, `${slug}.json`);
  if (!existsSync(file)) return null;
  const content = await readJson<{ photos?: { key?: unknown }[] }>(file);
  const key = content.photos?.[0]?.key;
  if (typeof key !== "string" || !key) {
    throw new Error(`${slug}: content file has no photos[0].key`);
  }
  return key;
}

async function resolveCover(object: ManifestObject): Promise<Cover> {
  const fromContent = await contentCoverKey(object.slug);
  const sha1 = fromContent ?? object.coverKey;
  const photo = object.photos.find((candidate) => candidate.key === sha1);
  if (!photo) {
    throw new Error(`${object.slug}: cover ${sha1} is not among the manifest photos of the object`);
  }
  const absolute = path.resolve(ROOT, photo.file);
  const localFile = existsSync(absolute) ? absolute : null;
  if (!localFile && !photo.sourceUrl) {
    throw new Error(`${object.slug}: local file ${photo.file} is missing and the photo has no sourceUrl`);
  }
  return { slug: object.slug, sha1, photo, coverFrom: fromContent ? "content" : "manifest", localFile };
}

async function resolveCovers(manifest: Manifest, slugs: readonly string[] | null): Promise<Cover[]> {
  const bySlug = new Map(manifest.objects.map((object) => [object.slug, object]));
  const objects = slugs
    ? slugs.map((slug) => {
        const object = bySlug.get(slug);
        if (!object) throw new Error(`unknown slug "${slug}" (not in the manifest)`);
        return object;
      })
    : manifest.objects;
  return Promise.all(objects.map(resolveCover));
}

/* ------------------------------------------------------------------------------------------ */
/* Images                                                                                     */
/* ------------------------------------------------------------------------------------------ */

/** Original bytes: the local file, or the inex.su `sourceUrl` when the local file is unavailable. */
async function loadOriginal(cover: Cover, client: KieClient | null): Promise<Buffer> {
  if (cover.localFile) {
    try {
      return await readFile(cover.localFile);
    } catch {
      // Unreadable local file: fall through to the sourceUrl fallback.
    }
  }
  if (!cover.photo.sourceUrl || !client) {
    throw new Error(`${cover.slug}: cannot read ${cover.photo.file} and no sourceUrl fallback`);
  }
  return client.download(cover.photo.sourceUrl);
}

/** Display size after EXIF orientation. */
async function orientedSize(buffer: Buffer): Promise<[number, number]> {
  const { info } = await sharp(buffer).rotate().toBuffer({ resolveWithObject: true });
  return [info.width, info.height];
}

interface GreyImage {
  data: Uint8Array;
  width: number;
  height: number;
}

/** Single-channel 8-bit greyscale pixels, optionally resized (lanczos3) to `size`. */
async function toGrey(buffer: Buffer, size?: [number, number]): Promise<GreyImage> {
  let pipeline = sharp(buffer).rotate();
  if (size) pipeline = pipeline.resize(size[0], size[1], { fit: "fill", kernel: "lanczos3" });
  const { data, info } = await pipeline
    .flatten({ background: "#ffffff" })
    .greyscale()
    .extractChannel(0)
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (info.channels !== 1) throw new Error(`expected 1 grey channel, got ${info.channels}`);
  return { data: new Uint8Array(data), width: info.width, height: info.height };
}

/** Summed-area table with one row/column of zero padding, for O(1) window sums. */
function integral(width: number, height: number, value: (index: number) => number): Float64Array {
  const stride = width + 1;
  const table = new Float64Array(stride * (height + 1));
  for (let y = 0; y < height; y++) {
    let rowSum = 0;
    for (let x = 0; x < width; x++) {
      rowSum += value(y * width + x);
      table[(y + 1) * stride + x + 1] = table[y * stride + x + 1]! + rowSum;
    }
  }
  return table;
}

function windowSum(table: Float64Array, stride: number, x: number, y: number, size: number): number {
  const x2 = x + size;
  const y2 = y + size;
  return table[y2 * stride + x2]! - table[y * stride + x2]! - table[y2 * stride + x]! + table[y * stride + x]!;
}

/**
 * Mean SSIM over all 8×8 windows (stride 1, uniform weights, C1 = (0.01·255)², C2 = (0.03·255)²).
 * Window statistics come from summed-area tables, so the whole image costs O(pixels).
 */
function computeSsim(a: GreyImage, b: GreyImage): number {
  const { width, height } = a;
  const x = a.data;
  const y = b.data;
  const sx = integral(width, height, (i) => x[i]!);
  const sy = integral(width, height, (i) => y[i]!);
  const sxx = integral(width, height, (i) => x[i]! * x[i]!);
  const syy = integral(width, height, (i) => y[i]! * y[i]!);
  const sxy = integral(width, height, (i) => x[i]! * y[i]!);
  const stride = width + 1;
  const n = SSIM_WINDOW * SSIM_WINDOW;
  let total = 0;
  let windows = 0;
  for (let top = 0; top + SSIM_WINDOW <= height; top++) {
    for (let left = 0; left + SSIM_WINDOW <= width; left++) {
      const mx = windowSum(sx, stride, left, top, SSIM_WINDOW) / n;
      const my = windowSum(sy, stride, left, top, SSIM_WINDOW) / n;
      const vx = windowSum(sxx, stride, left, top, SSIM_WINDOW) / n - mx * mx;
      const vy = windowSum(syy, stride, left, top, SSIM_WINDOW) / n - my * my;
      const cov = windowSum(sxy, stride, left, top, SSIM_WINDOW) / n - mx * my;
      total +=
        ((2 * mx * my + SSIM_C1) * (2 * cov + SSIM_C2)) /
        ((mx * mx + my * my + SSIM_C1) * (vx + vy + SSIM_C2));
      windows++;
    }
  }
  return windows === 0 ? 1 : total / windows;
}

function computePsnr(a: GreyImage, b: GreyImage): number {
  let squared = 0;
  for (let i = 0; i < a.data.length; i++) {
    const diff = a.data[i]! - b.data[i]!;
    squared += diff * diff;
  }
  const mse = squared / a.data.length;
  return mse === 0 ? Number.POSITIVE_INFINITY : 10 * Math.log10((255 * 255) / mse);
}

const round = (value: number, digits: number) => Number(value.toFixed(digits));

/** Size check + SSIM/PSNR of the result downscaled back to the original size. */
async function runQa(
  model: UpscaleModel,
  original: Buffer,
  result: Buffer
): Promise<{ qa: QaResult; reference: GreyImage; restored: GreyImage }> {
  const src = await orientedSize(original);
  const out = await orientedSize(result);
  const reasons: string[] = [];
  const expected: [number, number] = [src[0] * UPSCALE_FACTOR, src[1] * UPSCALE_FACTOR];
  if (
    model === "topaz/image-upscale" &&
    (Math.abs(out[0] - expected[0]) > SIZE_TOLERANCE_PX || Math.abs(out[1] - expected[1]) > SIZE_TOLERANCE_PX)
  ) {
    reasons.push(`size ${out.join("×")} ≠ ${expected.join("×")}`);
  }
  const srcRatio = src[0] / src[1];
  const outRatio = out[0] / out[1];
  if (Math.abs(srcRatio - outRatio) / srcRatio > 0.01) {
    reasons.push(`aspect ratio changed (${srcRatio.toFixed(3)} → ${outRatio.toFixed(3)})`);
  }

  const reference = await toGrey(original);
  const restored = await toGrey(result, src);
  const ssim = computeSsim(reference, restored);
  const psnr = computePsnr(reference, restored);
  if (ssim < QA_THRESHOLDS.ssim) reasons.push(`SSIM ${ssim.toFixed(4)} < ${QA_THRESHOLDS.ssim}`);
  if (psnr < QA_THRESHOLDS.psnr) reasons.push(`PSNR ${psnr.toFixed(2)} dB < ${QA_THRESHOLDS.psnr}`);

  return {
    qa: {
      out,
      factor: round(out[0] / src[0], 3),
      ssim: round(ssim, 4),
      psnr: round(psnr, 2),
      flagged: reasons.length > 0,
      reasons,
    },
    reference,
    restored,
  };
}

/** Escapes text for an SVG label. */
function escapeXml(text: string): string {
  return text.replace(/[<>&"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

function labelSvg(width: number, text: string): Buffer {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${LABEL_HEIGHT_PX}">` +
      `<rect width="100%" height="100%" fill="#1c1f22"/>` +
      `<text x="12" y="30" font-family="Arial, sans-serif" font-size="22" fill="#ffffff">${escapeXml(text)}</text>` +
      `</svg>`
  );
}

/** Lays panels out left to right, each with a label bar on top. */
async function sideBySide(
  panels: { image: Buffer; label: string }[],
  width: number,
  height: number
): Promise<Sharp> {
  const composites: OverlayOptions[] = [];
  panels.forEach((panel, index) => {
    composites.push(
      { input: labelSvg(width, panel.label), left: index * width, top: 0 },
      { input: panel.image, left: index * width, top: LABEL_HEIGHT_PX }
    );
  });
  return sharp({
    create: {
      width: width * panels.length,
      height: height + LABEL_HEIGHT_PX,
      channels: 3,
      background: "#808080",
    },
  }).composite(composites);
}

/** Flagged-cover heatmap: original | result downscaled back | |difference| × gain in red. */
async function writeHeatmap(sha1: string, reference: GreyImage, restored: GreyImage): Promise<string> {
  const { width, height } = reference;
  const rgb = Buffer.alloc(width * height * 3);
  for (let i = 0; i < reference.data.length; i++) {
    const diff = Math.abs(reference.data[i]! - restored.data[i]!);
    const dimmed = Math.round(reference.data[i]! * 0.3);
    rgb[i * 3] = Math.min(255, dimmed + diff * HEATMAP_GAIN);
    rgb[i * 3 + 1] = dimmed;
    rgb[i * 3 + 2] = dimmed;
  }
  const raw = (data: Uint8Array, channels: 1 | 3) =>
    sharp(Buffer.from(data), { raw: { width, height, channels } }).png().toBuffer();
  const sheet = await sideBySide(
    [
      { image: await raw(reference.data, 1), label: "original" },
      { image: await raw(restored.data, 1), label: "upscaled, downscaled back" },
      { image: await raw(rgb, 3), label: `|diff| x${HEATMAP_GAIN}` },
    ],
    width,
    height
  );
  await mkdir(FLAGGED_DIR, { recursive: true });
  const file = path.join(FLAGGED_DIR, `${sha1}.png`);
  await sheet.png().toFile(file);
  return file;
}

/** Final cover WebP (≤2000 px, < 2 MB; quality 72 when 80 is too heavy). */
async function writeCoverWebp(sha1: string, image: Buffer): Promise<number> {
  const encode = (quality: number) =>
    sharp(image)
      .rotate()
      .resize({ width: WEBP_MAX_SIDE, height: WEBP_MAX_SIDE, fit: "inside", withoutEnlargement: true })
      .webp({ quality, effort: WEBP_EFFORT })
      .toBuffer();
  let webp = await encode(WEBP_QUALITY);
  if (webp.length >= WEBP_MAX_BYTES) webp = await encode(WEBP_FALLBACK_QUALITY);
  if (webp.length >= WEBP_MAX_BYTES) {
    throw new Error(`${sha1}: WebP is ${webp.length} bytes even at quality ${WEBP_FALLBACK_QUALITY}`);
  }
  await mkdir(COVERS_DIR, { recursive: true });
  const file = path.join(COVERS_DIR, `${sha1}.webp`);
  await writeFile(file, webp);
  return webp.length;
}

/* ------------------------------------------------------------------------------------------ */
/* kie.ai                                                                                     */
/* ------------------------------------------------------------------------------------------ */

const rawBase = (sha1: string, model: UpscaleModel) => path.join(RAW_DIR, `${sha1}.${MODEL_SHORT[model]}`);

/** A previously downloaded result for this sha1 + model, if any (never paid twice). */
async function readRawCache(sha1: string, model: UpscaleModel): Promise<UpscaleOutcome | null> {
  const metaFile = `${rawBase(sha1, model)}.json`;
  if (!existsSync(metaFile)) return null;
  const meta = await readJson<RawMeta & { file: string }>(metaFile);
  const file = path.join(RAW_DIR, meta.file);
  if (!existsSync(file)) return null;
  return { buffer: await readFile(file), meta, cached: true };
}

/**
 * The file to upload: the local original as-is when kie.ai accepts it, else a normalised JPEG in the
 * OS temp dir (EXIF-rotated, size-limited) so the result has the same orientation as the original.
 */
async function uploadableFile(cover: Cover, original: Buffer): Promise<string> {
  const { localFile } = cover;
  if (!localFile) throw new Error("no local file");
  const metadata = await sharp(original).metadata();
  const extension = path.extname(localFile).toLowerCase();
  const needsRotation = (metadata.orientation ?? 1) > 1;
  if (UPLOADABLE_EXTENSIONS.has(extension) && !needsRotation && original.length <= KIE_UPSCALE_MAX_INPUT_BYTES) {
    return localFile;
  }
  const normalised = await sharp(original).rotate().jpeg({ quality: 95 }).toBuffer();
  if (normalised.length > KIE_UPSCALE_MAX_INPUT_BYTES) {
    throw new Error(`${cover.slug}: input is larger than ${KIE_UPSCALE_MAX_INPUT_BYTES} bytes after re-encoding`);
  }
  const file = path.join(os.tmpdir(), `inex-cover-${cover.sha1}.jpg`);
  await writeFile(file, normalised);
  return file;
}

/** Public input URLs per sha1, so the pilot uploads each cover once for both models. */
const inputUrlCache = new Map<string, Promise<{ url: string; input: "upload" | "sourceUrl" }>>();

function inputUrl(
  client: KieClient,
  cover: Cover,
  original: Buffer
): Promise<{ url: string; input: "upload" | "sourceUrl" }> {
  let pending = inputUrlCache.get(cover.sha1);
  if (!pending) {
    pending = (async () => {
      if (cover.localFile) {
        try {
          const file = await uploadableFile(cover, original);
          try {
            return { url: await client.uploadFile(file), input: "upload" as const };
          } finally {
            // Only the normalised temp JPEG is ours to delete, never the local original.
            if (file !== cover.localFile) await rm(file, { force: true });
          }
        } catch (error) {
          if (error instanceof KieFatalError || !cover.photo.sourceUrl) throw error;
          console.warn(`  ${cover.slug}: upload failed (${(error as Error).message}), using sourceUrl`);
        }
      }
      if (!cover.photo.sourceUrl) throw new Error(`${cover.slug}: no input URL`);
      return { url: cover.photo.sourceUrl, input: "sourceUrl" as const };
    })();
    inputUrlCache.set(cover.sha1, pending);
  }
  return pending;
}

/** Upscales one cover with one model (or reuses `covers/raw/`), downloading the result right away. */
async function upscaleCover(
  client: KieClient,
  cover: Cover,
  model: UpscaleModel,
  original: Buffer
): Promise<UpscaleOutcome> {
  const cached = await readRawCache(cover.sha1, model);
  if (cached) return cached;

  const started = Date.now();
  const { url, input } = await inputUrl(client, cover, original);
  const result = await client.upscale(model, url, UPSCALE_FACTOR);
  const resultUrl = result.resultUrls[0];
  if (!resultUrl) throw new Error(`${cover.slug}: kie.ai returned no result URL`);
  const buffer = await client.download(resultUrl);
  const format = (await sharp(buffer).metadata()).format ?? "bin";
  const extension = format === "jpeg" ? "jpg" : format;
  const meta: RawMeta = {
    model,
    taskId: result.taskId,
    credits: result.creditsConsumed,
    resultUrl,
    input,
    ms: Date.now() - started,
    at: new Date().toISOString(),
  };
  await mkdir(RAW_DIR, { recursive: true });
  const fileName = `${path.basename(rawBase(cover.sha1, model))}.${extension}`;
  await writeFile(path.join(RAW_DIR, fileName), buffer);
  await writeJsonAtomic(`${rawBase(cover.sha1, model)}.json`, { ...meta, file: fileName });
  return { buffer, meta, cached: false };
}

/** Runs `worker` over `items` with at most `limit` in flight; a fatal error aborts the rest. */
async function runPool<T>(
  items: readonly T[],
  limit: number,
  controller: AbortController,
  worker: (item: T) => Promise<void>
): Promise<void> {
  let next = 0;
  const lanes = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length && !controller.signal.aborted) {
      const item = items[next++] as T;
      try {
        await worker(item);
      } catch (error) {
        if (error instanceof KieFatalError) controller.abort(error);
        throw error;
      }
    }
  });
  const results = await Promise.allSettled(lanes);
  const failure = results.find((result) => result.status === "rejected");
  if (failure && failure.status === "rejected") throw failure.reason;
}

function createClient(controller: AbortController): KieClient {
  return new KieClient({
    apiKey: kieApiKey(),
    log: (line) => console.log(line),
    signal: controller.signal,
  });
}

/** Aborts when the uncached work would cost more than the balance. */
function assertAffordable(estimate: number, balance: number): void {
  console.log(`Estimated cost: ${estimate} credits (balance ${balance})`);
  if (estimate > balance) {
    throw new Error(`estimated cost ${estimate} exceeds the balance ${balance} — top up first`);
  }
}

/* ------------------------------------------------------------------------------------------ */
/* Pilot                                                                                      */
/* ------------------------------------------------------------------------------------------ */

/** Window (in original pixels) with the most gradient energy — the most detailed area to crop. */
function detailedArea(grey: GreyImage, size: number): { left: number; top: number } {
  const { width, height, data } = grey;
  const side = Math.min(size, width, height);
  const table = integral(width, height, (i) => {
    const x = i % width;
    const y = (i - x) / width;
    const dx = x + 1 < width ? Math.abs(data[i + 1]! - data[i]!) : 0;
    const dy = y + 1 < height ? Math.abs(data[i + width]! - data[i]!) : 0;
    return dx + dy;
  });
  const step = Math.max(1, Math.floor(side / 4));
  let best = { left: 0, top: 0, energy: -1 };
  for (let top = 0; top + side <= height; top += step) {
    for (let left = 0; left + side <= width; left += step) {
      const energy = windowSum(table, width + 1, left, top, side);
      if (energy > best.energy) best = { left, top, energy };
    }
  }
  return { left: best.left, top: best.top };
}

/** `pilot/<slug>.png` (full frames) and `pilot/<slug>.crops.png` (400×400 of the most detailed area). */
async function writePilotComparison(
  cover: Cover,
  original: Buffer,
  results: Map<UpscaleModel, { buffer: Buffer; label: string } | null>
): Promise<string[]> {
  const src = await orientedSize(original);
  const width = src[0] * UPSCALE_FACTOR;
  const height = src[1] * UPSCALE_FACTOR;
  const toPanel = (buffer: Buffer, kernel: "cubic" | "lanczos3") =>
    sharp(buffer).rotate().resize(width, height, { fit: "fill", kernel }).png().toBuffer();
  const failedPanel = () =>
    sharp({ create: { width, height, channels: 3, background: "#808080" } }).png().toBuffer();

  const panels: { image: Buffer; label: string }[] = [
    { image: await toPanel(original, "cubic"), label: `original bicubic x2 (${src.join("x")})` },
  ];
  for (const model of PILOT_MODELS) {
    const result = results.get(model);
    panels.push(
      result
        ? { image: await toPanel(result.buffer, "lanczos3"), label: result.label }
        : { image: await failedPanel(), label: `${MODEL_SHORT[model]}: failed` }
    );
  }

  await mkdir(PILOT_DIR, { recursive: true });
  const fullFile = path.join(PILOT_DIR, `${cover.slug}.png`);
  await (await sideBySide(panels, width, height)).png({ compressionLevel: 9 }).toFile(fullFile);

  const area = detailedArea(await toGrey(original), PILOT_CROP_PX / UPSCALE_FACTOR);
  const crop = Math.min(PILOT_CROP_PX, width, height);
  const region = { left: area.left * UPSCALE_FACTOR, top: area.top * UPSCALE_FACTOR, width: crop, height: crop };
  const cropPanels = await Promise.all(
    panels.map(async (panel) => ({
      image: await sharp(panel.image).extract(region).png().toBuffer(),
      // Crops are only 400 px wide: keep the first word (model / "original") of the label.
      label: panel.label.split(" ")[0] ?? panel.label,
    }))
  );
  const cropsFile = path.join(PILOT_DIR, `${cover.slug}.crops.png`);
  await (await sideBySide(cropPanels, crop, crop)).png().toFile(cropsFile);
  return [fullFile, cropsFile];
}

function printPilotTable(rows: readonly PilotRow[]): void {
  const header = ["slug", "model", "in → out", "factor", "SSIM", "PSNR", "credits", "flagged"];
  const lines = rows.map((row) => [
    row.slug,
    MODEL_SHORT[row.model],
    row.out ? `${row.src.join("×")} → ${row.out.join("×")}` : `${row.src.join("×")} → —`,
    row.factor?.toString() ?? "—",
    row.ssim?.toFixed(4) ?? "—",
    row.psnr?.toFixed(2) ?? "—",
    `${row.credits}${row.cached ? " (cached)" : ""}`,
    row.error ? `ERROR ${row.error}` : row.flagged ? `yes: ${row.reasons?.join("; ")}` : "no",
  ]);
  const widths = header.map((title, column) => Math.max(title.length, ...lines.map((line) => line[column]?.length ?? 0)));
  const format = (cells: string[]) => cells.map((cell, column) => cell.padEnd(widths[column] ?? 0)).join(" | ");
  console.log(`\n${format(header)}\n${widths.map((width) => "-".repeat(width)).join("-+-")}`);
  for (const line of lines) console.log(format(line));
}

async function runPilot(manifest: Manifest, options: Options): Promise<void> {
  const picks = options.only.length
    ? options.only.map((slug) => PILOT.find((entry) => entry.slug === slug) ?? { slug, role: "manual pick" })
    : PILOT.slice(0, options.pilot ?? PILOT.length);
  const covers = await resolveCovers(manifest, picks.map((pick) => pick.slug));
  const roleOf = new Map(picks.map((pick) => [pick.slug, pick.role]));

  const jobs: { cover: Cover; model: UpscaleModel }[] = [];
  let estimate = 0;
  for (const cover of covers) {
    for (const model of PILOT_MODELS) {
      jobs.push({ cover, model });
      if (!(await readRawCache(cover.sha1, model))) estimate += KIE_UPSCALE_MODELS[model].credits;
    }
  }
  console.log(`Pilot: ${covers.length} covers × ${PILOT_MODELS.length} models`);
  for (const cover of covers) {
    console.log(`  ${cover.slug} (${roleOf.get(cover.slug)}): ${cover.sha1} from ${cover.coverFrom}`);
  }

  const controller = new AbortController();
  const client = createClient(controller);
  const before = await client.getCredits();
  assertAffordable(estimate, before);
  if (options.dryRun) return;

  const originals = new Map<string, Buffer>();
  for (const cover of covers) originals.set(cover.sha1, await loadOriginal(cover, client));

  const rows: PilotRow[] = [];
  const outputs = new Map<string, Map<UpscaleModel, { buffer: Buffer; label: string } | null>>();
  await runPool(jobs, options.concurrency, controller, async ({ cover, model }) => {
    const original = originals.get(cover.sha1) as Buffer;
    const src = await orientedSize(original);
    const perCover = outputs.get(cover.sha1) ?? new Map();
    outputs.set(cover.sha1, perCover);
    const base = { slug: cover.slug, sha1: cover.sha1, role: roleOf.get(cover.slug) ?? "", model, src };
    console.log(`${cover.slug}: ${MODEL_SHORT[model]}…`);
    try {
      const outcome = await upscaleCover(client, cover, model, original);
      const { qa, reference, restored } = await runQa(model, original, outcome.buffer);
      if (qa.flagged) await writeHeatmap(`${cover.sha1}.${MODEL_SHORT[model]}`, reference, restored);
      rows.push({
        ...base,
        out: qa.out,
        factor: qa.factor,
        ssim: qa.ssim,
        psnr: qa.psnr,
        credits: outcome.meta.credits,
        cached: outcome.cached,
        flagged: qa.flagged,
        reasons: qa.reasons,
        taskId: outcome.meta.taskId,
        ms: outcome.meta.ms,
      });
      perCover.set(model, {
        buffer: outcome.buffer,
        label: `${MODEL_SHORT[model]} ${qa.out.join("x")} SSIM ${qa.ssim} PSNR ${qa.psnr}`,
      });
      console.log(`${cover.slug}: ${MODEL_SHORT[model]} done (${outcome.cached ? "cached" : `${outcome.meta.credits} cr`})`);
    } catch (error) {
      if (error instanceof KieFatalError) throw error;
      const message = (error as Error).message;
      console.error(`${cover.slug}: ${MODEL_SHORT[model]} failed — ${message}`);
      rows.push({ ...base, credits: 0, cached: false, error: message });
      perCover.set(model, null);
    }
  });

  const images: string[] = [];
  for (const cover of covers) {
    const files = await writePilotComparison(
      cover,
      originals.get(cover.sha1) as Buffer,
      outputs.get(cover.sha1) ?? new Map()
    );
    images.push(...files);
  }

  const after = await client.getCredits();
  const order = (row: PilotRow) => covers.findIndex((cover) => cover.slug === row.slug) * 10 + PILOT_MODELS.indexOf(row.model);
  rows.sort((a, b) => order(a) - order(b));
  printPilotTable(rows);
  // Merge with earlier pilot runs (e.g. a re-run with --only): rows of this run's slugs replace
  // older ones, other slugs are kept; `runs` keeps the credit history of every run.
  interface PilotReport {
    rows?: PilotRow[];
    runs?: { at: string; slugs: string[]; before: number; after: number; spent: number }[];
  }
  const previous: PilotReport = existsSync(PILOT_REPORT_PATH) ? await readJson<PilotReport>(PILOT_REPORT_PATH) : {};
  const slugs = new Set(covers.map((cover) => cover.slug));
  const allRows = [...(previous.rows ?? []).filter((row) => !slugs.has(row.slug)), ...rows];
  await writeJsonAtomic(PILOT_REPORT_PATH, {
    generatedAt: new Date().toISOString(),
    thresholds: QA_THRESHOLDS,
    runs: [
      ...(previous.runs ?? []),
      { at: new Date().toISOString(), slugs: [...slugs], before, after, spent: round(before - after, 2) },
    ],
    rows: allRows,
    images: [...new Set(allRows.map((row) => row.slug))].flatMap((slug) => [
      path.relative(ROOT, path.join(PILOT_DIR, `${slug}.png`)),
      path.relative(ROOT, path.join(PILOT_DIR, `${slug}.crops.png`)),
    ]),
  });
  console.log(`\nComparison images:\n${images.map((file) => `  ${path.relative(ROOT, file)}`).join("\n")}`);
  console.log(`Pilot report: ${path.relative(ROOT, PILOT_REPORT_PATH)}`);
  console.log(`Credits: before ${before}, after ${after}, spent ${round(before - after, 2)}`);
  console.log("Pilot done — choose the model, then run the full mode (task 08).");
}

/* ------------------------------------------------------------------------------------------ */
/* Full run                                                                                   */
/* ------------------------------------------------------------------------------------------ */

type Plan = "done" | "skip-large" | "upscale-cached" | "upscale";

async function planCover(cover: Cover, model: UpscaleModel, report: Report): Promise<Plan> {
  const entry = report[cover.sha1];
  const webpExists = existsSync(path.join(COVERS_DIR, `${cover.sha1}.webp`));
  // A finished cover (including a rejected or flagged one) is never redone automatically; only a
  // technical failure (status "original" with `error`) is retried.
  if (entry && entry.model === model && webpExists && !entry.error) return "done";
  const long = Math.max(cover.photo.width, cover.photo.height);
  if (long >= LARGE_LONG_SIDE_PX) return "skip-large";
  return (await readRawCache(cover.sha1, model)) ? "upscale-cached" : "upscale";
}

async function processCover(
  client: KieClient,
  cover: Cover,
  model: UpscaleModel,
  plan: Plan
): Promise<CoverEntry> {
  const original = await loadOriginal(cover, client);
  const src = await orientedSize(original);
  const common = { slug: cover.slug, model, src, coverFrom: cover.coverFrom, thresholds: QA_THRESHOLDS };

  if (plan === "skip-large") {
    await writeCoverWebp(cover.sha1, original);
    return { ...common, status: "skipped-large", out: src, credits: 0, at: new Date().toISOString() };
  }

  let outcome: UpscaleOutcome;
  try {
    outcome = await upscaleCover(client, cover, model, original);
  } catch (error) {
    if (error instanceof KieFatalError) throw error;
    // The cover must exist for the loader even when kie.ai failed; the next run retries.
    await writeCoverWebp(cover.sha1, original);
    const message = (error as Error).message;
    console.error(`${cover.slug}: upscale failed — ${message}`);
    return { ...common, status: "original", out: src, credits: 0, error: message, at: new Date().toISOString() };
  }

  const { qa, reference, restored } = await runQa(model, original, outcome.buffer);
  const upscaled = {
    ...common,
    out: qa.out,
    factor: qa.factor,
    ssim: qa.ssim,
    psnr: qa.psnr,
    credits: outcome.meta.credits,
    taskId: outcome.meta.taskId,
    cached: outcome.cached,
    input: outcome.meta.input,
    ms: outcome.meta.ms,
    flagged: qa.flagged,
    reasons: qa.reasons,
    at: new Date().toISOString(),
  };
  if (qa.flagged) {
    // Conservative default until a human looks at the heatmap: the loader gets the original.
    const heatmap = await writeHeatmap(cover.sha1, reference, restored);
    await writeCoverWebp(cover.sha1, original);
    console.warn(`${cover.slug}: FLAGGED (${qa.reasons.join("; ")}) — review ${path.relative(ROOT, heatmap)}`);
    return { ...upscaled, status: "original", review: "pending" };
  }
  await writeCoverWebp(cover.sha1, outcome.buffer);
  return { ...upscaled, status: "ok" };
}

async function runFull(manifest: Manifest, options: Options, model: UpscaleModel): Promise<void> {
  const covers = await resolveCovers(manifest, options.only.length ? options.only : null);
  const report = await loadReport();
  const plans = new Map<Cover, Plan>();
  for (const cover of covers) plans.set(cover, await planCover(cover, model, report));

  console.log(`Covers: ${covers.length} (model ${model})`);
  for (const cover of covers) {
    const source = cover.localFile ? path.relative(ROOT, cover.localFile) : `sourceUrl ${cover.photo.sourceUrl}`;
    console.log(
      `  ${cover.slug.padEnd(34)} ${cover.sha1.slice(0, 10)} ${cover.coverFrom.padEnd(8)} ` +
        `${`${cover.photo.width}×${cover.photo.height}`.padEnd(10)} ${(plans.get(cover) ?? "").padEnd(14)} ${source}`
    );
  }
  // Per-model estimate over every cover that needs an upscale (caches ignored), for the decision.
  const upscalable = covers.filter((cover) => Math.max(cover.photo.width, cover.photo.height) < LARGE_LONG_SIDE_PX);
  for (const candidate of PILOT_MODELS) {
    const { credits } = KIE_UPSCALE_MODELS[candidate];
    console.log(
      `  estimate ${MODEL_SHORT[candidate]}: ${upscalable.length} covers × ${credits} = ` +
        `${upscalable.length * credits} credits (without caches)`
    );
  }
  const estimate = covers.filter((cover) => plans.get(cover) === "upscale").length * KIE_UPSCALE_MODELS[model].credits;

  const controller = new AbortController();
  const client = createClient(controller);
  const before = await client.getCredits();
  assertAffordable(estimate, before);
  if (options.dryRun) return;

  const save = createReportWriter(REPORT_PATH, () => report);
  const pending = covers.filter((cover) => plans.get(cover) !== "done");
  await runPool(pending, options.concurrency, controller, async (cover) => {
    const entry = await processCover(client, cover, model, plans.get(cover) as Plan);
    report[cover.sha1] = entry;
    await save();
    console.log(`${cover.slug}: ${entry.status}${entry.flagged ? " (flagged)" : ""}`);
  });

  const after = await client.getCredits();
  const flagged = Object.values(report).filter((entry) => entry.review === "pending");
  console.log(`\nDone: ${pending.length} processed, ${covers.length - pending.length} already done.`);
  console.log(`Credits: before ${before}, after ${after}, spent ${round(before - after, 2)}`);
  if (flagged.length) {
    console.log(`Flagged, awaiting review (--accept / --reject): ${flagged.map((entry) => entry.slug).join(", ")}`);
  }
}

/* ------------------------------------------------------------------------------------------ */
/* Review                                                                                     */
/* ------------------------------------------------------------------------------------------ */

/** The cover record of a report entry (by its sha1, not the current content cover). */
async function coverBySha1(slug: string, sha1: string): Promise<Cover> {
  const manifest = await readJson<Manifest>(MANIFEST_PATH);
  const object = manifest.objects.find((candidate) => candidate.slug === slug);
  const photo = object?.photos.find((candidate) => candidate.key === sha1);
  if (!photo) throw new Error(`${slug}: photo ${sha1} is not in the manifest`);
  const absolute = path.resolve(ROOT, photo.file);
  return { slug, sha1, photo, coverFrom: "manifest", localFile: existsSync(absolute) ? absolute : null };
}

/** Applies the human decision on flagged covers: accept → upscaled WebP, reject → original kept. */
async function runReview(options: Options): Promise<void> {
  const report = await loadReport();
  const find = (ref: string) => {
    const match = Object.entries(report).find(([sha1, entry]) => sha1 === ref || entry.slug === ref);
    if (!match) throw new Error(`"${ref}" is not in ${path.relative(ROOT, REPORT_PATH)}`);
    return match;
  };
  for (const ref of options.accept) {
    const [sha1, entry] = find(ref);
    const cached = await readRawCache(sha1, entry.model);
    if (!cached) throw new Error(`${entry.slug}: no upscaled result in covers/raw for ${entry.model}`);
    await writeCoverWebp(sha1, cached.buffer);
    report[sha1] = { ...entry, status: "ok", review: "accepted", at: new Date().toISOString() };
    console.log(`${entry.slug}: accepted (upscaled cover)`);
  }
  for (const ref of options.reject) {
    const [sha1, entry] = find(ref);
    await writeCoverWebp(sha1, await loadOriginal(await coverBySha1(entry.slug, sha1), null));
    report[sha1] = { ...entry, status: "rejected", review: "rejected", at: new Date().toISOString() };
    console.log(`${entry.slug}: rejected (original kept)`);
  }
  await writeJsonAtomic(REPORT_PATH, report);
}

/* ------------------------------------------------------------------------------------------ */
/* Main                                                                                       */
/* ------------------------------------------------------------------------------------------ */

async function main(): Promise<void> {
  const options = parseOptions();
  if (options.accept.length || options.reject.length) {
    await runReview(options);
    return;
  }
  if (!(await stat(MANIFEST_PATH).catch(() => null))) throw new Error(`manifest not found: ${MANIFEST_PATH}`);
  const manifest = await readJson<Manifest>(MANIFEST_PATH);
  if (options.pilot !== null) await runPilot(manifest, options);
  else if (options.model) await runFull(manifest, options, options.model);
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
