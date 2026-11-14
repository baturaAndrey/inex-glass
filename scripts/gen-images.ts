/**
 * Dev-only generator of backgrounds and placeholder card illustrations via kie.ai.
 *
 *   pnpm tsx --env-file=.env scripts/gen-images.ts [options]
 *
 * Options:
 *   --only <id|group,…>  limit to these ids and/or groups
 *   --only-redo          limit to manifest entries flagged `needsRedo` (implies --force;
 *                        combinable with --only, which then narrows the redo set further)
 *   --dry-run            print prompts and the cost estimate; no API calls
 *   --force              regenerate even if output files (and the cached source) exist
 *   --model <name>       kie.ai model (default google/nano-banana; see KIE_MODELS)
 *   --concurrency <n>    parallel tasks (default 3)
 *   --check-credit       print the kie.ai credit balance and exit
 *   --sheet              write scripts/.cache/kie/contact-sheet.html (with --dry-run: sheet only)
 *   --no-convert         only download sources into scripts/.cache/kie/
 *
 * Flow per spec: create task → poll → download PNG to scripts/.cache/kie/<id>.png (+ <id>.json
 * with the model/taskId that produced it) → sharp → public/generated/<id>.{avif,webp}
 * (+ -1280 for backgrounds) → manifest.json. The manifest is rewritten atomically after each
 * image, so an interrupted run keeps progress. A spec counts as done (skipped without --force)
 * only when every expected output file exists AND it has a manifest entry.
 *
 * Output sizes: images are never upscaled. `google/nano-banana` returns at most 1344x768 for
 * 16:9, so backgrounds are 1344 px wide instead of the nominal 1920 (the -1280 variant is
 * still produced) and the manifest `width` records the real size; `next/image` serves that
 * file and its srcset never exceeds it. For true 1920 px backgrounds use
 * `--model nano-banana-pro` (resolution "2K", see scripts/lib/kie.ts) at a higher price.
 *
 * Review flags: a manifest entry may carry `needsRedo: true` + `redoReason` (set by hand after
 * review). Re-converting a cached source keeps the flag; a fresh, successful generation clears it.
 *
 * Never logs KIE_AI_API_KEY. Do not generate portfolio objects, staff, packaging or documents.
 */
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

import sharp from "sharp";

import {
  CacheMetaSchema,
  ManifestSchema,
  PromptFileSchema,
  StyleSchema,
  type Aspect,
  type CacheMeta,
  type Manifest,
  type ManifestEntry,
  type PromptSpec,
  type StyleSpec,
} from "./image-prompts/schema";
import { DEFAULT_MODEL, KIE_MODELS, KieClient, KieFatalError, KieTaskError } from "./lib/kie";

const ROOT = path.resolve(import.meta.dirname, "..");
const PROMPTS_DIR = path.join(ROOT, "scripts", "image-prompts");
const CACHE_DIR = path.join(ROOT, "scripts", ".cache", "kie");
const OUTPUT_DIR = path.join(ROOT, "public", "generated");
const MANIFEST_PATH = path.join(OUTPUT_DIR, "manifest.json");
const SHEET_PATH = path.join(CACHE_DIR, "contact-sheet.html");
/** Public URL prefix of OUTPUT_DIR (next.config images.localPatterns allows /generated/**). */
const PUBLIC_PREFIX = "/generated";
/** Manifest `model` for cached sources that predate the <id>.json metadata sidecar. */
const UNKNOWN_MODEL = "unknown";

const STYLE_FILE = "style.json";
const DEFAULT_CONCURRENCY = 3;
const MAX_CONCURRENCY = 10;

const AVIF_QUALITY = 50;
const WEBP_QUALITY = 72;
const BACKGROUND_WIDTH = 1920;
const BACKGROUND_SMALL_WIDTH = 1280;
const CARD_WIDTH = 960;
const CARD_WIDE_WIDTH = 1280;
const MIN_OUTPUT_WIDTH = 960;
const ASPECT_TOLERANCE = 0.03;

const ASPECT_RATIOS: Record<Aspect, number> = {
  "16:9": 16 / 9,
  "4:3": 4 / 3,
  "21:9": 21 / 9,
  "1:1": 1,
};

interface Options {
  only: Set<string> | null;
  onlyRedo: boolean;
  dryRun: boolean;
  force: boolean;
  model: string;
  concurrency: number;
  checkCredit: boolean;
  sheet: boolean;
  convert: boolean;
}

type Outcome =
  | { id: string; status: "created"; credits: number }
  | { id: string; status: "skipped" }
  | { id: string; status: "failed"; reason: string; credits: number }
  | { id: string; status: "not-run"; reason: string };

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------

function parseOptions(): Options {
  const { values } = parseArgs({
    options: {
      only: { type: "string" },
      "only-redo": { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
      force: { type: "boolean", default: false },
      model: { type: "string", default: DEFAULT_MODEL },
      concurrency: { type: "string", default: String(DEFAULT_CONCURRENCY) },
      "check-credit": { type: "boolean", default: false },
      sheet: { type: "boolean", default: false },
      "no-convert": { type: "boolean", default: false },
    },
    strict: true,
    allowPositionals: false,
  });

  const concurrency = Number(values.concurrency);
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > MAX_CONCURRENCY) {
    throw new Error(`--concurrency must be an integer 1..${MAX_CONCURRENCY}`);
  }
  if (!KIE_MODELS[values.model]) {
    throw new Error(
      `Unknown --model "${values.model}". Supported: ${Object.keys(KIE_MODELS).join(", ")}`
    );
  }
  const only = values.only
    ? new Set(
        values.only
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      )
    : null;

  const onlyRedo = values["only-redo"];
  return {
    only,
    onlyRedo,
    dryRun: values["dry-run"],
    // A redo must produce a new image, so reusing the cached (rejected) source is pointless.
    force: values.force || onlyRedo,
    model: values.model,
    concurrency,
    checkCredit: values["check-credit"],
    sheet: values.sheet,
    convert: !values["no-convert"],
  };
}

// ---------------------------------------------------------------------------
// Prompt specs
// ---------------------------------------------------------------------------

async function loadStyle(): Promise<StyleSpec> {
  const raw = await readFile(path.join(PROMPTS_DIR, STYLE_FILE), "utf8");
  return StyleSchema.parse(JSON.parse(raw));
}

async function loadSpecs(): Promise<PromptSpec[]> {
  const files = (await readdir(PROMPTS_DIR))
    .filter((f) => f.endsWith(".json") && f !== STYLE_FILE)
    .sort();
  const specs: PromptSpec[] = [];
  const seen = new Map<string, string>();
  for (const file of files) {
    const raw = await readFile(path.join(PROMPTS_DIR, file), "utf8");
    const result = PromptFileSchema.safeParse(JSON.parse(raw));
    if (!result.success) {
      throw new Error(`${file}: invalid prompt specs\n${result.error.message}`);
    }
    for (const spec of result.data) {
      const previous = seen.get(spec.id);
      if (previous) throw new Error(`Duplicate id "${spec.id}" in ${file} and ${previous}`);
      seen.set(spec.id, file);
      specs.push(spec);
    }
  }
  return specs;
}

function selectSpecs(specs: PromptSpec[], options: Options, manifest: ManifestIndex): PromptSpec[] {
  const { only, onlyRedo } = options;
  let selected = specs;
  if (only) {
    const known = new Set(specs.flatMap((s) => [s.id, s.group]));
    const unknown = [...only].filter((token) => !known.has(token));
    if (unknown.length > 0) throw new Error(`--only: unknown id/group: ${unknown.join(", ")}`);
    selected = selected.filter((s) => only.has(s.id) || only.has(s.group));
  }
  if (onlyRedo) selected = selected.filter((s) => manifest.get(s.id)?.needsRedo === true);
  return selected;
}

const buildPrompt = (style: StyleSpec, spec: PromptSpec) =>
  `${style.prefix} ${spec.subject} ${style.suffix[spec.kind]}`;

// ---------------------------------------------------------------------------
// Files and manifest
// ---------------------------------------------------------------------------

const sourcePath = (id: string) => path.join(CACHE_DIR, `${id}.png`);
const sourceMetaPath = (id: string) => path.join(CACHE_DIR, `${id}.json`);
const outputPath = (name: string) => path.join(OUTPUT_DIR, name);

type ManifestIndex = ReadonlyMap<string, ManifestEntry>;

function outputNames(spec: PromptSpec) {
  return {
    avif: `${spec.id}.avif`,
    webp: `${spec.id}.webp`,
    ...(spec.kind === "background"
      ? { avif1280: `${spec.id}-1280.avif`, webp1280: `${spec.id}-1280.webp` }
      : {}),
  };
}

/**
 * Done = every expected output (incl. the -1280 variants) exists AND the manifest has an
 * entry; a half-written run (files without entry, or a missing variant) is redone.
 */
function isDone(spec: PromptSpec, options: Options, manifest: ManifestIndex): boolean {
  if (!options.convert) return existsSync(sourcePath(spec.id));
  const allFiles = Object.values(outputNames(spec)).every((name) => existsSync(outputPath(name)));
  return allFiles && manifest.has(spec.id);
}

async function readManifest(): Promise<Manifest> {
  if (!existsSync(MANIFEST_PATH)) return [];
  return ManifestSchema.parse(JSON.parse(await readFile(MANIFEST_PATH, "utf8")));
}

async function readManifestIndex(): Promise<ManifestIndex> {
  return new Map((await readManifest()).map((entry) => [entry.id, entry]));
}

/** Model recorded for a cached source; null when the sidecar is missing or unreadable. */
async function readCacheMeta(id: string): Promise<CacheMeta | null> {
  const file = sourceMetaPath(id);
  if (!existsSync(file)) return null;
  const result = CacheMetaSchema.safeParse(JSON.parse(await readFile(file, "utf8")));
  return result.success ? result.data : null;
}

/** Atomic write: temp file in the same directory, then rename. */
async function writeFileAtomic(file: string, content: string | Buffer) {
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, content);
  await rename(tmp, file);
}

/**
 * Serialises manifest updates: workers run concurrently, and each update is a
 * read-modify-write of the same file.
 */
let manifestQueue: Promise<unknown> = Promise.resolve();
/**
 * `keepRedoFlag`: true when the image was only re-converted from the cached source — the
 * reviewed pixels are unchanged, so an existing `needsRedo`/`redoReason` must survive. A fresh
 * generation passes false, which drops the flag.
 */
function upsertManifest(entry: ManifestEntry, keepRedoFlag: boolean): Promise<void> {
  const next = manifestQueue.then(async () => {
    const current = await readManifest();
    const previous = current.find((e) => e.id === entry.id);
    const manifest = current.filter((e) => e.id !== entry.id);
    if (keepRedoFlag && previous?.needsRedo) {
      manifest.push({
        ...entry,
        needsRedo: true,
        ...(previous.redoReason ? { redoReason: previous.redoReason } : {}),
      });
    } else {
      manifest.push(entry);
    }
    manifest.sort((a, b) => a.id.localeCompare(b.id));
    await writeFileAtomic(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  });
  manifestQueue = next.catch(() => {});
  return next;
}

// ---------------------------------------------------------------------------
// Conversion
// ---------------------------------------------------------------------------

/** Centre crop of the source to the exact target aspect ratio (fit: "cover" semantics). */
function coverCrop(width: number, height: number, ratio: number) {
  if (width / height > ratio) {
    const cropWidth = Math.round(height * ratio);
    return { left: Math.floor((width - cropWidth) / 2), top: 0, width: cropWidth, height };
  }
  const cropHeight = Math.round(width / ratio);
  return { left: 0, top: Math.floor((height - cropHeight) / 2), width, height: cropHeight };
}

/**
 * Writes AVIF + WebP at `targetWidth` (never enlarging). Cropping happens before resizing
 * so the aspect ratio is exact even when the source is narrower than the target width —
 * `withoutEnlargement` alone would otherwise return the source frame untouched.
 */
async function encodeVariant(
  source: Buffer,
  ratio: number,
  targetWidth: number,
  names: { avif: string; webp: string }
) {
  const meta = await sharp(source).metadata();
  if (!meta.width || !meta.height) throw new Error("source image has no dimensions");
  const pipeline = () =>
    sharp(source)
      .extract(coverCrop(meta.width, meta.height, ratio))
      .resize({ width: targetWidth, withoutEnlargement: true });

  const [avif, webp] = await Promise.all([
    pipeline().avif({ quality: AVIF_QUALITY }).toBuffer({ resolveWithObject: true }),
    pipeline().webp({ quality: WEBP_QUALITY }).toBuffer({ resolveWithObject: true }),
  ]);
  await writeFileAtomic(outputPath(names.avif), avif.data);
  await writeFileAtomic(outputPath(names.webp), webp.data);
  return { width: avif.info.width, height: avif.info.height };
}

/** Validates an output file: non-empty, wide enough, aspect within ±3 %. */
async function verifyOutput(file: string, ratio: number) {
  const { size } = await stat(file);
  if (size === 0) throw new Error(`${path.basename(file)} is empty`);
  const meta = await sharp(file).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (width < MIN_OUTPUT_WIDTH) {
    throw new Error(`${path.basename(file)} is ${width}px wide (< ${MIN_OUTPUT_WIDTH})`);
  }
  const deviation = Math.abs(width / height - ratio) / ratio;
  if (deviation > ASPECT_TOLERANCE) {
    throw new Error(`${path.basename(file)} aspect ${width}x${height} is off by more than 3%`);
  }
}

async function convert(spec: PromptSpec, source: Buffer) {
  const ratio = ASPECT_RATIOS[spec.aspect];
  const names = outputNames(spec);
  const isWide = ratio >= ASPECT_RATIOS["16:9"];
  const mainWidth =
    spec.kind === "background" ? BACKGROUND_WIDTH : isWide ? CARD_WIDE_WIDTH : CARD_WIDTH;

  const size = await encodeVariant(source, ratio, mainWidth, names);
  const checks = [
    verifyOutput(outputPath(names.avif), ratio),
    verifyOutput(outputPath(names.webp), ratio),
  ];
  if (names.avif1280 && names.webp1280) {
    await encodeVariant(source, ratio, BACKGROUND_SMALL_WIDTH, {
      avif: names.avif1280,
      webp: names.webp1280,
    });
    checks.push(verifyOutput(outputPath(names.avif1280), ratio));
    checks.push(verifyOutput(outputPath(names.webp1280), ratio));
  }
  await Promise.all(checks);

  const toPublic = (name: string) => `${PUBLIC_PREFIX}/${name}`;
  const files: ManifestEntry["files"] = { avif: toPublic(names.avif), webp: toPublic(names.webp) };
  if (names.avif1280) files.avif1280 = toPublic(names.avif1280);
  if (names.webp1280) files.webp1280 = toPublic(names.webp1280);
  return { files, ...size };
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

interface Source {
  buffer: Buffer;
  credits: number;
  /** Model that actually produced the PNG (may differ from --model for cached sources). */
  model: string;
  /** True when generated in this run, false when reused from scripts/.cache/kie/. */
  fresh: boolean;
}

/**
 * Generates (or reuses the cached) source PNG; one task retry on `fail`/timeout.
 * `previousModel` (from the manifest) is the fallback for caches without a metadata sidecar.
 */
async function obtainSource(
  client: KieClient,
  spec: PromptSpec,
  prompt: string,
  options: Options,
  previousModel: string | undefined,
  log: (line: string) => void
): Promise<Source> {
  const cached = sourcePath(spec.id);
  if (!options.force && existsSync(cached)) {
    const meta = await readCacheMeta(spec.id);
    const model = meta?.model ?? previousModel ?? UNKNOWN_MODEL;
    log(`[${spec.id}] using cached source ${path.relative(ROOT, cached)} (${model})`);
    return { buffer: await readFile(cached), credits: 0, model, fresh: false };
  }

  let credits = 0;
  for (let attempt = 1; ; attempt++) {
    try {
      log(`[${spec.id}] generating (${options.model}, ${spec.aspect}), attempt ${attempt}`);
      const result = await client.generate(options.model, prompt, spec.aspect);
      credits += result.creditsConsumed;
      // Only the first URL is used: these models return one image per task.
      const buffer = await client.download(result.resultUrls[0]!);
      const meta: CacheMeta = {
        model: options.model,
        taskId: result.taskId,
        generatedAt: new Date().toISOString(),
      };
      await writeFileAtomic(cached, buffer);
      await writeFileAtomic(sourceMetaPath(spec.id), `${JSON.stringify(meta, null, 2)}\n`);
      return { buffer, credits, model: options.model, fresh: true };
    } catch (error) {
      if (error instanceof KieTaskError) {
        credits += error.creditsConsumed;
        if (attempt < 2) {
          log(`[${spec.id}] ${error.message}; retrying the task once`);
          continue;
        }
      }
      throw Object.assign(error as Error, { creditsConsumed: credits });
    }
  }
}

async function processSpec(
  client: KieClient,
  style: StyleSpec,
  spec: PromptSpec,
  options: Options,
  manifest: ManifestIndex,
  log: (line: string) => void
): Promise<Outcome> {
  let credits = 0;
  try {
    const prompt = buildPrompt(style, spec);
    const previousModel = manifest.get(spec.id)?.model;
    const source = await obtainSource(client, spec, prompt, options, previousModel, log);
    credits = source.credits;
    if (!options.convert) {
      log(`[${spec.id}] source saved (no conversion)`);
      return { id: spec.id, status: "created", credits };
    }
    const { files, width, height } = await convert(spec, source.buffer);
    await upsertManifest(
      {
        id: spec.id,
        kind: spec.kind,
        files,
        alt: spec.alt,
        target: spec.target,
        width,
        height,
        model: source.model,
        generatedAt: new Date().toISOString(),
      },
      !source.fresh
    );
    log(`[${spec.id}] done ${width}x${height}${credits ? `, ${credits} credits` : ""}`);
    return { id: spec.id, status: "created", credits };
  } catch (error) {
    if (error instanceof KieFatalError) throw error;
    const spent = (error as { creditsConsumed?: number }).creditsConsumed ?? credits;
    const reason = error instanceof Error ? error.message : String(error);
    log(`[${spec.id}] FAILED: ${reason}`);
    return { id: spec.id, status: "failed", reason, credits: spent };
  }
}

/** Runs specs through a fixed-size worker pool; a fatal error (401/402) stops everything. */
async function runAll(
  specs: PromptSpec[],
  style: StyleSpec,
  options: Options,
  manifest: ManifestIndex,
  apiKey: string
) {
  const controller = new AbortController();
  const log = (line: string) => console.log(line);
  const client = new KieClient({ apiKey, log, signal: controller.signal });
  const outcomes = new Map<string, Outcome>();
  let fatal: KieFatalError | null = null;
  let cursor = 0;

  const worker = async () => {
    while (!fatal && cursor < specs.length) {
      const spec = specs[cursor++]!;
      try {
        outcomes.set(spec.id, await processSpec(client, style, spec, options, manifest, log));
      } catch (error) {
        if (error instanceof KieFatalError) {
          fatal ??= error;
          controller.abort(error);
        } else if (!fatal) {
          throw error;
        }
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(options.concurrency, specs.length) }, worker));

  for (const spec of specs) {
    if (!outcomes.has(spec.id)) {
      outcomes.set(spec.id, { id: spec.id, status: "not-run", reason: "run stopped" });
    }
  }
  return { outcomes: [...outcomes.values()], fatal: fatal as KieFatalError | null };
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Contact sheet for manual review; links are relative to scripts/.cache/kie/. */
async function writeContactSheet(specs: PromptSpec[]) {
  await mkdir(CACHE_DIR, { recursive: true });
  const cards = specs.map((spec) => {
    const webp = outputPath(`${spec.id}.webp`);
    const src = existsSync(webp)
      ? webp
      : existsSync(sourcePath(spec.id))
        ? sourcePath(spec.id)
        : null;
    const img = src
      ? `<img src="${escapeHtml(path.relative(CACHE_DIR, src).split(path.sep).join("/"))}" loading="lazy" alt="">`
      : `<div class="missing">нет файла</div>`;
    return `<figure>${img}<figcaption><b>${escapeHtml(spec.id)}</b> · ${escapeHtml(spec.group)} · ${spec.aspect}<br>${escapeHtml(spec.alt)}</figcaption></figure>`;
  });
  const html = `<!doctype html><html lang="ru"><meta charset="utf-8"><title>kie.ai contact sheet</title>
<style>body{font:14px system-ui;margin:16px;background:#f4f5f3}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px}
figure{margin:0;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px #0002}img{width:100%;display:block}
figcaption{padding:8px 10px}.missing{aspect-ratio:4/3;display:grid;place-items:center;color:#b00}</style>
<h1>Generated images (${specs.length})</h1><main>${cards.join("\n")}</main></html>\n`;
  await writeFile(SHEET_PATH, html);
  console.log(`Contact sheet: ${path.relative(ROOT, SHEET_PATH)}`);
}

function printDryRun(
  specs: PromptSpec[],
  style: StyleSpec,
  options: Options,
  manifest: ManifestIndex
) {
  const pending = specs.filter((s) => options.force || !isDone(s, options, manifest));
  for (const spec of specs) {
    const state = pending.includes(spec) ? "WILL GENERATE" : "exists, skip";
    const entry = manifest.get(spec.id);
    const redo = entry?.needsRedo ? ` — needsRedo: ${entry.redoReason ?? "(no reason)"}` : "";
    console.log(`\n# ${spec.id} [${spec.group}, ${spec.kind}, ${spec.aspect}] — ${state}${redo}`);
    console.log(`alt: ${spec.alt}`);
    console.log(buildPrompt(style, spec));
  }
  const perImage = KIE_MODELS[options.model]!.estimatedCredits;
  console.log(
    `\n${specs.length} specs, ${pending.length} to generate with ${options.model}; ` +
      `estimate ≈ ${pending.length * perImage} credits (~${perImage}/image, +retries). No API calls made.`
  );
}

function printSummary(outcomes: Outcome[], fatal: KieFatalError | null) {
  const by = (status: Outcome["status"]) => outcomes.filter((o) => o.status === status);
  const credits = outcomes.reduce((sum, o) => sum + ("credits" in o ? o.credits : 0), 0);
  console.log(
    `\nCreated: ${by("created").length}, skipped: ${by("skipped").length}, ` +
      `failed: ${by("failed").length}, not run: ${by("not-run").length}, credits consumed: ${credits}`
  );
  for (const o of outcomes) {
    if (o.status === "failed") console.log(`  failed  ${o.id}: ${o.reason}`);
  }
  const missing = [...by("failed"), ...by("not-run")].map((o) => o.id);
  if (missing.length > 0) console.log(`Missing ids: ${missing.join(",")}`);
  if (fatal) console.error(`\nRun stopped: ${fatal.message}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const options = parseOptions();
  const apiKey = process.env.KIE_AI_API_KEY ?? "";

  if (options.checkCredit) {
    const credits = await new KieClient({ apiKey }).getCredits();
    console.log(`kie.ai credit balance: ${credits}`);
    return;
  }

  const style = await loadStyle();
  const manifest = await readManifestIndex();
  const specs = selectSpecs(await loadSpecs(), options, manifest);
  if (options.onlyRedo && specs.length === 0) {
    console.log("--only-redo: no selected manifest entries are flagged needsRedo");
    return;
  }

  if (options.dryRun) {
    printDryRun(specs, style, options, manifest);
    if (options.sheet) await writeContactSheet(specs);
    return;
  }

  await mkdir(CACHE_DIR, { recursive: true });
  await mkdir(OUTPUT_DIR, { recursive: true });

  const skipped: Outcome[] = [];
  const todo: PromptSpec[] = [];
  for (const spec of specs) {
    if (!options.force && isDone(spec, options, manifest))
      skipped.push({ id: spec.id, status: "skipped" });
    else todo.push(spec);
  }
  console.log(`${specs.length} specs: ${todo.length} to process, ${skipped.length} already done`);

  const { outcomes, fatal } = todo.length
    ? await runAll(todo, style, options, manifest, apiKey)
    : { outcomes: [], fatal: null };
  printSummary([...skipped, ...outcomes], fatal);
  const flagged = (await readManifest()).filter((e) => e.needsRedo).map((e) => e.id);
  if (flagged.length > 0) {
    console.log(`Still flagged needsRedo (${flagged.length}): ${flagged.join(",")}`);
  }
  if (options.sheet) await writeContactSheet(specs);
  if (fatal || outcomes.some((o) => o.status !== "created")) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
