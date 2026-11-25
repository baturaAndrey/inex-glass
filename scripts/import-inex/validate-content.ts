/**
 * Validator of the object card content files (portfolio-objects-import, task 01).
 *
 *   pnpm tsx scripts/import-inex/validate-content.ts [--slug=<slug>[,<slug>…]] [--content=<dir>] [--manifest=<file>]
 *
 * Loads `data/objects-manifest.json` and every `data/content/<slug>.json` (contract `ObjectContent`
 * of the spec README), prints errors and warnings per object and exits 1 on any error. No Payload,
 * no database. `validateAll()` is importable without side effects (task 07 calls it).
 *
 * Copy rules: ТЗ §11 (`checkStopWords` + the content-audit rules of `checkTextUnit`) and the
 * stricter object-card rule — no installation wording at all, no workshop claim.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import { checkStopWords } from "@/lib/domain/stop-words";

import { DEFAULT_SETTINGS, checkTextUnit } from "../audit/lib/content-rules";

import type { Manifest, ManifestObject } from "./build-manifest";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
export const DEFAULT_CONTENT_DIR = path.join(ROOT, "scripts", "import-inex", "data", "content");
export const DEFAULT_MANIFEST = path.join(ROOT, "scripts", "import-inex", "data", "objects-manifest.json");

/* ------------------------------------------------------------------------------------------ */
/* Contract and reference values                                                              */
/* ------------------------------------------------------------------------------------------ */

export interface ObjectContent {
  slug: string;
  name: string;
  city: string;
  objectType: string;
  year: number;
  products: string[];
  task: string;
  spec: { product: string; thickness: string; kind?: string; triplexFormula?: string; processing?: string }[];
  chips: string[];
  photos: { key: string; alt: string; caption?: string }[];
  featured: boolean;
  related: string[];
  notes: string[];
}

/** Product slugs on prod (README «Prod reference values», 2026-11-25). */
export const PRODUCT_SLUGS: ReadonlySet<string> = new Set([
  "dushevye-peregorodki",
  "kozyrki",
  "ograzhdeniya",
  "osteklenie-verand-i-terras",
  "peregorodki",
  "steklyannye-peregorodki",
  "steklyannyj-fasad",
  "torgovye-vitriny",
  "tripleks",
  "zakalennoe-steklo",
  "zerkala",
]);

/** Existing object types + the new ones content may introduce (created as data). */
export const OBJECT_TYPES: ReadonlySet<string> = new Set([
  "Аэропорты",
  "Арены",
  "Банки",
  "Концертный зал",
  "Коттедж",
  "Гостиницы",
  "Офисы",
  "Торговые центры",
  "Спорт и отдых",
  "Рестораны",
  "Медицина",
  "Госучреждения",
  "Производство",
  "Образование",
]);

const YEAR_MIN = 1990;
const YEAR_MAX = 2027;
const TASK_MIN = 40;
const TASK_MAX = 300;
const CHIPS_MAX = 3;
const CHIP_MAX_LENGTH = 40;
const RELATED_MAX = 4;
const ALT_MIN = 10;
const ALT_MAX = 200;
const FEATURED_MAX = 8;

const SPEC_FIELDS = ["product", "thickness", "kind", "triplexFormula", "processing"] as const;
const CONTENT_KEYS: ReadonlySet<string> = new Set([
  "slug",
  "name",
  "city",
  "objectType",
  "year",
  "products",
  "task",
  "spec",
  "chips",
  "photos",
  "featured",
  "related",
  "notes",
]);

/* ------------------------------------------------------------------------------------------ */
/* Copy rules                                                                                 */
/* ------------------------------------------------------------------------------------------ */

// `\b` does not work with Cyrillic: explicit look-arounds on letters and digits (as stop-words.ts).
const START = "(?<![\\p{L}\\p{N}])";
const END = "(?![\\p{L}\\p{N}])";
const rx = (source: string) => new RegExp(source, "giu");

interface CardRule {
  pattern: RegExp;
  message: string;
}

/** Object cards are stricter than the site: no installation wording, no workshop claim. */
const CARD_ERROR_RULES: readonly CardRule[] = [
  {
    pattern: rx(`${START}(?:смонтир|монтаж|установ|бригад|шеф-?монтаж|замер)\\p{L}*`),
    message: "в карточке объекта нет слов о монтаже, установке, бригаде, замере",
  },
  { pattern: rx(`${START}под\\s+ключ${END}`), message: "«под ключ» не пишем" },
  { pattern: rx(`${START}в\\s+сво[её]м\\s+цех\\p{L}*`), message: "«в своём цехе» не пишем в карточке" },
  {
    pattern: rx(`${START}собственн\\p{L}*\\s+производств\\p{L}*`),
    message: "«собственное производство» не пишем",
  },
  { pattern: rx(`${START}наш\\p{L}*\\s+производств\\p{L}*`), message: "«наше производство» не пишем" },
  { pattern: rx(`${START}закаливаем`), message: "стекло закаливает поставщик, не мы" },
  { pattern: rx(`${START}стеклопакет\\p{L}*`), message: "стеклопакеты не поставляем" },
  { pattern: rx(`ГОСТ\\s*24866`), message: "ГОСТ 24866 (стеклопакеты) не упоминается" },
  {
    pattern: rx(`${START}(?:армированн|солнцезащитн|бронированн|антиблик|шпион)\\p{L}*`),
    message: "такое стекло не продаём",
  },
  {
    pattern: rx(`${START}срочн\\p{L}*\\s+(?:изготовлен|производств)\\p{L}*`),
    message: "срочного изготовления нет",
  },
  { pattern: rx(`heat\\s*soak|${START}hst${END}`), message: "Heat Soak Test не упоминается" },
];

/** Allowed only when a source text says so — a human checks. */
const CARD_WARN_RULES: readonly CardRule[] = [
  {
    pattern: rx(`${START}(?:изготовили|изготовлены|поставили|поставлено)\\p{L}*`),
    message: "«изготовили/поставили» — только если так сказано в источнике",
  },
];

const PLACEHOLDER = "[…]";
const LATIN_WORD = /(?<![\p{L}\p{N}])[A-Za-z]{2,}(?![\p{L}\p{N}])/gu;
const CYRILLIC = /\p{Script=Cyrillic}/u;
const REGION = /(?:область|округ|край)/iu;

/* ------------------------------------------------------------------------------------------ */
/* Findings                                                                                   */
/* ------------------------------------------------------------------------------------------ */

export interface ValidationFinding {
  /** Object slug (or the file name for files outside the manifest). */
  slug: string;
  message: string;
}

export interface ValidationResult {
  errors: ValidationFinding[];
  warnings: ValidationFinding[];
}

class Collector {
  readonly errors: ValidationFinding[] = [];
  readonly warnings: ValidationFinding[] = [];
  error(slug: string, message: string) {
    this.errors.push({ slug, message });
  }
  warn(slug: string, message: string) {
    this.warnings.push({ slug, message });
  }
}

/** Stop-word checks of one text (field label for the message). */
function checkCopy(out: Collector, slug: string, field: string, text: string): void {
  if (!text.trim()) return;
  const seen = new Set<string>();
  const report = (severity: "error" | "warn", message: string) => {
    const line = `${field}: ${message}`;
    if (seen.has(line)) return;
    seen.add(line);
    if (severity === "error") out.error(slug, line);
    else out.warn(slug, line);
  };
  for (const finding of checkStopWords(text, { ignoreRules: ["experience"] })) {
    report("error", `${finding.message} («${finding.match}»)`);
  }
  for (const finding of checkTextUnit({ text, target: slug, field }, DEFAULT_SETTINGS)) {
    if (finding.severity === "info") continue;
    report(finding.severity, `${finding.message}${finding.fragment ? ` («${finding.fragment}»)` : ""}`);
  }
  for (const rule of CARD_ERROR_RULES) {
    for (const match of text.matchAll(new RegExp(rule.pattern.source, rule.pattern.flags))) {
      report("error", `${rule.message} («${match[0]}»)`);
    }
  }
  for (const rule of CARD_WARN_RULES) {
    for (const match of text.matchAll(new RegExp(rule.pattern.source, rule.pattern.flags))) {
      report("warn", `${rule.message} («${match[0]}»)`);
    }
  }
  if (text.includes(PLACEHOLDER)) report("warn", `заглушка ${PLACEHOLDER}`);
  const latin = [...text.matchAll(LATIN_WORD)].map((match) => match[0]);
  if (latin.length) report("warn", `слова латиницей: ${[...new Set(latin)].join(", ")}`);
}

/* ------------------------------------------------------------------------------------------ */
/* Structure                                                                                  */
/* ------------------------------------------------------------------------------------------ */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isString = (value: unknown): value is string => typeof value === "string";

function stringArray(out: Collector, slug: string, field: string, value: unknown): string[] {
  if (!Array.isArray(value) || !value.every(isString)) {
    out.error(slug, `${field}: ожидается массив строк`);
    return [];
  }
  return value;
}

function nonEmptyString(out: Collector, slug: string, field: string, value: unknown): string {
  if (!isString(value) || !value.trim()) {
    out.error(slug, `${field}: обязательная непустая строка`);
    return "";
  }
  return value;
}

interface Context {
  manifestSlugs: ReadonlySet<string>;
}

/** Checks one content file against its manifest object; returns `featured` for the total count. */
function validateObject(
  out: Collector,
  object: ManifestObject,
  data: unknown,
  context: Context
): boolean {
  const slug = object.slug;
  if (!isRecord(data)) {
    out.error(slug, "файл должен содержать JSON-объект");
    return false;
  }
  for (const key of Object.keys(data)) if (!CONTENT_KEYS.has(key)) out.warn(slug, `лишнее поле «${key}»`);

  if (data.slug !== slug) out.error(slug, `slug «${String(data.slug)}» не равен имени файла`);

  const name = nonEmptyString(out, slug, "name", data.name);
  checkCopy(out, slug, "name", name);

  const city = nonEmptyString(out, slug, "city", data.city);
  if (city && REGION.test(city)) out.error(slug, `city «${city}» — регион, нужен город`);

  const objectType = nonEmptyString(out, slug, "objectType", data.objectType);
  if (objectType && !OBJECT_TYPES.has(objectType)) {
    out.error(slug, `objectType «${objectType}» нет среди существующих и разрешённых новых`);
  }

  if (typeof data.year !== "number" || !Number.isInteger(data.year) || data.year < YEAR_MIN || data.year > YEAR_MAX) {
    out.error(slug, `year: целое число ${YEAR_MIN}..${YEAR_MAX}`);
  }

  const products = stringArray(out, slug, "products", data.products);
  if (!products.length) out.error(slug, "products: нужен хотя бы один продукт");
  for (const product of products) {
    if (!PRODUCT_SLUGS.has(product)) out.error(slug, `products: «${product}» нет на сайте`);
  }

  const task = nonEmptyString(out, slug, "task", data.task);
  if (task && (task.length < TASK_MIN || task.length > TASK_MAX)) {
    out.error(slug, `task: ${task.length} символов, нужно ${TASK_MIN}..${TASK_MAX}`);
  }
  checkCopy(out, slug, "task", task);

  const chips = stringArray(out, slug, "chips", data.chips);
  if (chips.length > CHIPS_MAX) out.error(slug, `chips: не больше ${CHIPS_MAX}`);
  chips.forEach((chip, index) => {
    if (!chip.trim()) out.error(slug, `chips[${index}]: пустая строка`);
    if (chip.length > CHIP_MAX_LENGTH) out.error(slug, `chips[${index}]: длиннее ${CHIP_MAX_LENGTH} символов`);
    checkCopy(out, slug, `chips[${index}]`, chip);
  });

  validateSpec(out, slug, data.spec);
  validatePhotos(out, object, data.photos);

  if (typeof data.featured !== "boolean") out.error(slug, "featured: ожидается true/false");

  const related = stringArray(out, slug, "related", data.related);
  if (related.length > RELATED_MAX) out.error(slug, `related: не больше ${RELATED_MAX}`);
  if (new Set(related).size !== related.length) out.error(slug, "related: повторы");
  for (const other of related) {
    if (other === slug) out.error(slug, "related: ссылка на себя");
    else if (!context.manifestSlugs.has(other)) out.error(slug, `related: «${other}» нет в манифесте`);
  }

  const notes = stringArray(out, slug, "notes", data.notes);
  if (!notes.length) out.warn(slug, "notes пусты — всё угаданное должно быть отмечено «уточнить: …»");

  return data.featured === true;
}

function validateSpec(out: Collector, slug: string, value: unknown): void {
  if (!Array.isArray(value) || !value.length) {
    out.error(slug, "spec: нужна хотя бы одна строка");
    return;
  }
  value.forEach((row, index) => {
    const field = `spec[${index}]`;
    if (!isRecord(row)) {
      out.error(slug, `${field}: ожидается объект`);
      return;
    }
    for (const key of Object.keys(row)) {
      if (!(SPEC_FIELDS as readonly string[]).includes(key)) out.warn(slug, `${field}: лишнее поле «${key}»`);
    }
    nonEmptyString(out, slug, `${field}.product`, row.product);
    nonEmptyString(out, slug, `${field}.thickness`, row.thickness);
    for (const key of SPEC_FIELDS) {
      const text = row[key];
      if (text === undefined) continue;
      if (!isString(text)) {
        out.error(slug, `${field}.${key}: ожидается строка`);
        continue;
      }
      checkCopy(out, slug, `${field}.${key}`, text);
    }
  });
}

function validatePhotos(out: Collector, object: ManifestObject, value: unknown): void {
  const slug = object.slug;
  if (!Array.isArray(value) || !value.length) {
    out.error(slug, "photos: нужно хотя бы одно фото");
    return;
  }
  const manifestKeys = new Set(object.photos.map((photo) => photo.key));
  const seen = new Set<string>();
  value.forEach((photo, index) => {
    const field = `photos[${index}]`;
    if (!isRecord(photo)) {
      out.error(slug, `${field}: ожидается объект`);
      return;
    }
    const key = nonEmptyString(out, slug, `${field}.key`, photo.key);
    if (key && !manifestKeys.has(key)) out.error(slug, `${field}.key «${key}» нет среди фото объекта в манифесте`);
    if (key && seen.has(key)) out.error(slug, `${field}.key «${key}» повторяется`);
    seen.add(key);
    const alt = nonEmptyString(out, slug, `${field}.alt`, photo.alt);
    if (alt) {
      if (alt.length < ALT_MIN || alt.length > ALT_MAX) {
        out.error(slug, `${field}.alt: ${alt.length} символов, нужно ${ALT_MIN}..${ALT_MAX}`);
      }
      if (!CYRILLIC.test(alt)) out.error(slug, `${field}.alt: текст должен быть на русском`);
      if (/^фото/iu.test(alt.trim())) out.error(slug, `${field}.alt: не начинать со слова «Фото»`);
      checkCopy(out, slug, `${field}.alt`, alt);
    }
    if (photo.caption !== undefined) {
      if (!isString(photo.caption)) out.error(slug, `${field}.caption: ожидается строка`);
      else checkCopy(out, slug, `${field}.caption`, photo.caption);
    }
  });
}

/* ------------------------------------------------------------------------------------------ */
/* API                                                                                        */
/* ------------------------------------------------------------------------------------------ */

export interface ValidateOptions {
  /** Parsed manifest or the path to `objects-manifest.json`. */
  manifest?: Manifest | string;
  /** Directory with `<slug>.json`. */
  contentDir?: string;
  /**
   * Check only these objects (missing-file errors only for them; the global checks — extra files,
   * batch completeness, featured total — are skipped).
   */
  slugs?: string[];
}

function loadManifest(manifest: Manifest | string): Manifest {
  if (typeof manifest !== "string") return manifest;
  return JSON.parse(readFileSync(manifest, "utf8")) as Manifest;
}

export function validateAll(options: ValidateOptions = {}): ValidationResult {
  const manifest = loadManifest(options.manifest ?? DEFAULT_MANIFEST);
  const contentDir = options.contentDir ?? DEFAULT_CONTENT_DIR;
  const out = new Collector();
  const manifestSlugs = new Set(manifest.objects.map((object) => object.slug));
  const filter = options.slugs?.length ? new Set(options.slugs) : null;
  const objects = filter ? manifest.objects.filter((object) => filter.has(object.slug)) : manifest.objects;
  if (filter) {
    for (const slug of filter) if (!manifestSlugs.has(slug)) out.error(slug, "объекта нет в манифесте");
  }

  let featured = 0;
  const covered = new Set<string>();
  for (const object of objects) {
    const file = path.join(contentDir, `${object.slug}.json`);
    if (!existsSync(file)) {
      out.error(object.slug, `нет файла контента ${path.relative(ROOT, file).split(path.sep).join("/")}`);
      continue;
    }
    let data: unknown;
    try {
      data = JSON.parse(readFileSync(file, "utf8").replace(/^﻿/, ""));
    } catch (error) {
      out.error(object.slug, `JSON не разбирается: ${(error as Error).message}`);
      continue;
    }
    covered.add(object.batch);
    if (validateObject(out, object, data, { manifestSlugs })) featured++;
  }

  if (!filter) {
    if (featured > FEATURED_MAX) out.error("*", `featured: ${featured} объектов, не больше ${FEATURED_MAX}`);
    const batches = new Set(manifest.objects.map((object) => object.batch));
    for (const batch of batches) {
      if (!covered.has(batch)) out.error("*", `нет ни одного файла контента пакета «${batch}»`);
    }
    const extra = existsSync(contentDir)
      ? readdirSync(contentDir).filter((file) => file.endsWith(".json") && !manifestSlugs.has(file.slice(0, -5)))
      : [];
    for (const file of extra) out.error(file, "файл контента не относится ни к одному объекту манифеста");
  }
  return { errors: out.errors, warnings: out.warnings };
}

/* ------------------------------------------------------------------------------------------ */
/* CLI                                                                                        */
/* ------------------------------------------------------------------------------------------ */

function cli(): void {
  const { values } = parseArgs({
    options: {
      slug: { type: "string" },
      content: { type: "string" },
      manifest: { type: "string" },
    },
  });
  const slugs = (values.slug ?? "")
    .split(",")
    .map((slug) => slug.trim())
    .filter(Boolean);
  const result = validateAll({
    manifest: values.manifest ? path.resolve(values.manifest) : DEFAULT_MANIFEST,
    contentDir: values.content ? path.resolve(values.content) : DEFAULT_CONTENT_DIR,
    ...(slugs.length ? { slugs } : {}),
  });
  const bySlug = new Map<string, { errors: string[]; warnings: string[] }>();
  const entry = (slug: string) => {
    const current = bySlug.get(slug) ?? { errors: [], warnings: [] };
    bySlug.set(slug, current);
    return current;
  };
  for (const finding of result.errors) entry(finding.slug).errors.push(finding.message);
  for (const finding of result.warnings) entry(finding.slug).warnings.push(finding.message);
  for (const [slug, findings] of bySlug) {
    process.stdout.write(`${slug}\n`);
    for (const message of findings.errors) process.stdout.write(`  ОШИБКА: ${message}\n`);
    for (const message of findings.warnings) process.stdout.write(`  внимание: ${message}\n`);
  }
  process.stdout.write(`ошибок: ${result.errors.length}, предупреждений: ${result.warnings.length}\n`);
  if (result.errors.length) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  cli();
}
