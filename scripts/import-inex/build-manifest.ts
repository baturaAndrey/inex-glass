/**
 * Merge manifest of the inex.su portfolio objects (portfolio-objects-import, task 01).
 *
 *   pnpm tsx scripts/import-inex/build-manifest.ts           # write the manifest + contact sheets
 *   pnpm tsx scripts/import-inex/build-manifest.ts --check   # rebuild in memory, exit 1 on a diff
 *
 * Pure Node (no Payload, no network). Inputs:
 *   - research of the Firecrawl cache: `specs/portfolio-objects-import/research/*.json`
 *     (grouping of the inex.su pages into real objects, photo files, `res/Объекты` photos);
 *   - the Firecrawl cache itself (`scripts/.cache/firecrawl`, via `parse-objects.ts`) for the full
 *     description text and the page date — `pages.json` keeps only 200 characters;
 *   - `res/Объекты/Объекты.xlsx` (user data, overrides everything);
 *   - the redirect CSV `docs/inex/12-migration-inex-su.csv` (slug fallback, never edited).
 *
 * Outputs: `scripts/import-inex/data/objects-manifest.json` (committed) and the contact sheets
 * `scripts/.import-tmp/sheets/<slug>-NN.jpg` + `<slug>-NN.json` (not in git) that the content
 * writers look at instead of opening every photo.
 *
 * The selection is the hard-coded allow-list `GROUP_KEYS` (+ `USER_ONLY` objects): re-run the
 * builder after changing it.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

import ExcelJS from "exceljs";
import sharp from "sharp";

import { objectSlugFromUrl } from "@/lib/migration/rules";
import { transliterate } from "@/payload/fields/transliterate";

import { parseObject } from "./parse-objects";
import { ROOT, readCache, readSourceCsv } from "./shared";

/* ------------------------------------------------------------------------------------------ */
/* Paths                                                                                      */
/* ------------------------------------------------------------------------------------------ */

const RESEARCH_DIR = path.join(ROOT, "specs", "portfolio-objects-import", "research");
const GROUPED_JSON = path.join(RESEARCH_DIR, "objects-grouped.json");
const PAGES_JSON = path.join(RESEARCH_DIR, "pages.json");
const INEX_FILES_JSON = path.join(RESEARCH_DIR, "inex-files.json");
const OWN_PHOTOS_JSON = path.join(RESEARCH_DIR, "own-photos.json");
const OWN_DIR = path.join(ROOT, "res", "Объекты");
const XLSX_FILE = path.join(OWN_DIR, "Объекты.xlsx");
const XLSX_SHEET = "Лист1";

export const DATA_DIR = path.join(ROOT, "scripts", "import-inex", "data");
export const MANIFEST_FILE = path.join(DATA_DIR, "objects-manifest.json");
const SHEETS_DIR = path.join(ROOT, "scripts", ".import-tmp", "sheets");

/* ------------------------------------------------------------------------------------------ */
/* Data contract (README «Data contracts»)                                                    */
/* ------------------------------------------------------------------------------------------ */

export interface ManifestPhoto {
  key: string;
  file: string;
  sourceUrl?: string;
  origin: "inex" | "folder";
  pageUrl?: string;
  width: number;
  height: number;
  caption?: string;
}

export interface SourceText {
  url: string;
  title: string;
  text: string;
}

export interface ManifestObject {
  slug: string;
  batch: "a" | "b";
  name: string;
  city: string;
  yearHint?: number;
  legacyUrls: string[];
  categories: string[];
  productHints: string[];
  objectTypeHint?: string;
  xlsx?: Record<string, unknown>;
  sourceTexts: SourceText[];
  photos: ManifestPhoto[];
  coverKey: string;
  featuredDefault: boolean;
  notes: string[];
}

export interface Manifest {
  generatedAt: string;
  objects: ManifestObject[];
}

/* ------------------------------------------------------------------------------------------ */
/* Selection (approved 2026-11-25)                                                            */
/* ------------------------------------------------------------------------------------------ */

/**
 * Exact `key` values of `objects-grouped.json`: the 39 approved groups + Концертный зал (Омск).
 * `L:сбербанк` is Сбербанк (Ишим), `L:сбербанк@Омск` the Омск one.
 */
const GROUP_KEYS: readonly string[] = [
  "L:сургутнефтегаз",
  "L:березка",
  "L:сбербанк",
  "L:шахматная академия",
  "L:аркаим плаза",
  "L:buta spa",
  "L:родник",
  "L:рестостар",
  "L:sokol fit",
  "L:урал",
  "L:комсомольский",
  "L:горки",
  "L:краснодеревщик",
  "L:кольцо",
  "L:трактор",
  "L:сбербанк@Омск",
  "L:бовид",
  "L:восточная",
  "L:куба",
  "L:банк снежинский",
  "L:мтс",
  "L:орто-ленд",
  "L:стройком",
  "L:строймеханизация",
  "L:банк ммб",
  "L:кхп",
  "L:ростикс",
  "L:администрация",
  "L:детский мир",
  "L:рэкком",
  "L:чук",
  "L:miras",
  "L:фристайл",
  "L:проспект",
  "L:промсвязьбанк",
  "L:энергоинвест",
  "L:бум",
  "L:панорама",
  "L:уралсибпромсервис",
  "L:концертный зал",
];

/** Groups whose inex.su glass classification is «unclear» but which are imported anyway. */
const KEEP_UNCLEAR_KEYS: ReadonlySet<string> = new Set(["L:концертный зал"]);

/** Objects with photos only in `res/Объекты` (no cached inex.su page, no group). */
interface UserOnlyObject {
  folder: string;
  /** xlsx slug (the row supplies name, city, year…); absent for Мизар. */
  xlsxSlug?: string;
  name?: string;
  city?: string;
  /** inex.su pages that exist but were never crawled (stairs). */
  legacyUrls?: string[];
  notes?: string[];
}

const USER_ONLY: readonly UserOnlyObject[] = [
  { folder: "02 РМК-Арена", xlsxSlug: "rmk-arena" },
  { folder: "03 Аэропорт Челябинск", xlsxSlug: "aeroport-chelyabinsk" },
  {
    folder: "014 Мизар",
    name: "ОЦ «Випр (Мизар)»",
    city: "Челябинск",
    legacyUrls: ["/portfolio/lestnicy/bolcovye/oc-vipr-mizar"],
    notes: [
      "название по файлу «данные.txt» («офисный центр Випр (Мизар)»), уточнить",
      "страница inex.su /portfolio/lestnicy/bolcovye/oc-vipr-mizar не скачана (лестницы) — тексты только из папки",
      "год неизвестен, уточнить",
      "категорий стекла нет (лестница на больцах): изделия выбрать по фото",
    ],
  },
];

/** `res/Объекты` folders that are not imported (reason goes to the build log). */
const SKIPPED_FOLDERS: Readonly<Record<string, string>> = {
  "04 ТРЦ «Алмаз»": "нет фото; .txt в папке — текст Аркаим Плаза",
  "07 Сбербанк Ишим": "пустая папка — фото со страниц inex.su",
  Коттедж: "пустая папка",
};

/** Folder `.txt` files that do not describe their folder's object. */
const WRONG_FOLDER_TEXTS: ReadonlySet<string> = new Set(["04 ТРЦ «Алмаз»"]);

/** Home-marquee objects (by group key or folder). */
const FEATURED: ReadonlySet<string> = new Set([
  "L:кольцо",
  "L:родник",
  "L:трактор",
  "L:сургутнефтегаз",
  "L:шахматная академия",
  "L:урал",
  "03 Аэропорт Челябинск",
  "02 РМК-Арена",
]);

/** Seed placeholders on prod (README «Prod reference values»), adopted by slug. */
const PROD_PLACEHOLDER_BY_KEY: Readonly<Record<string, string>> = {
  "L:концертный зал": "koncertnyj-zal-omsk",
  "L:аркаим плаза": "arkaim-plaza",
  "L:сургутнефтегаз": "glavnoe-upravlenie-surgutneftegaz",
  "L:сбербанк": "sberbank-ishim",
  "L:трактор": "traktor-arena",
  "L:родник": "trk-rodnik",
  "L:урал": "trk-ural",
  "L:шахматная академия": "ugorskaya-shahmatnaya-akademiya",
  "L:кольцо": "tk-kolco",
};

/**
 * Slugs chosen instead of the CSV one when the CSV slug names a single construction of a merged
 * object (`dveri-mayatnik-01`, `fasad-kozyrek-berezka`…): the object slug must name the object.
 */
const SLUG_OVERRIDES: Readonly<Record<string, string>> = {
  "L:buta spa": "buta-spa",
  "L:березка": "berezka-plast",
  "L:sokol fit": "sokol-fit",
  "L:краснодеревщик": "tk-krasnoderevschik",
  "L:строймеханизация": "stroimehanizaciya",
};

/** Display names for objects without an xlsx row (map label + kind). */
const BUILT_NAMES: Readonly<Record<string, string>> = {
  "L:березка": "SPA-комплекс «Берёзка»",
  "L:buta spa": "Банный комплекс «Buta Spa»",
  "L:рестостар": "Группа «Рестостар»",
  "L:sokol fit": "Фитнес-клуб «Sokol Fit»",
  "L:комсомольский": "ТЦ «Комсомольский»",
  "L:горки": "ТРК «Горки»",
  "L:краснодеревщик": "ТК «Краснодеревщик»",
  "L:бовид": "ТД «Бовид»",
  "L:восточная": "Золотодобывающая компания «Восточная»",
  "L:куба": "ТРЦ «Куба»",
  "L:банк снежинский": "Банк «Снежинский»",
  "L:мтс": "Офис МТС",
  "L:орто-ленд": "«Орто-ленд»",
  "L:стройком": "СК «Стройком»",
  "L:строймеханизация": "«Строймеханизация»",
  "L:банк ммб": "Московский Международный Банк",
  "L:кхп": "КХП (Варна)",
  "L:ростикс": "«Ростикс»",
  "L:администрация": "Администрация (Омск)",
  "L:детский мир": "«Детский мир»",
  "L:рэкком": "«Рэкком»",
  "L:чук": "Челябинская угольная компания",
  "L:miras": "ТД «Miras»",
  "L:фристайл": "«Фристайл»",
  "L:проспект": "ОЦ «Проспект»",
  "L:промсвязьбанк": "Промсвязьбанк",
  "L:энергоинвест": "«Энергоинвест»",
  "L:бум": "ТЦ «Бум»",
  "L:панорама": "ТК «Панорама»",
  "L:уралсибпромсервис": "«Уралсибпромсервис»",
};

/** City fixes: the okrug given on the page / in xlsx → the real city. */
const CITY_OVERRIDES: Readonly<Record<string, { city: string; note: string }>> = {
  "L:шахматная академия": {
    city: "Ханты-Мансийск",
    note: "город: на inex.su «ХМАО – Югра»/«Сургут», в xlsx «Югра»; академия — Ханты-Мансийск, ул. Лопарёва 6",
  },
};

/* ------------------------------------------------------------------------------------------ */
/* Rules                                                                                      */
/* ------------------------------------------------------------------------------------------ */

/** Photos smaller than this are thumbnails or icons — not imported. */
const MIN_LONG_SIDE = 400;
const MIN_BYTES = 10 * 1024;
/** Default cover: the long side must be at least this (it is upscaled ×2 later). */
const COVER_MIN_LONG_SIDE = 900;
const IMAGE_FORMATS: ReadonlySet<string> = new Set(["jpeg", "png", "webp"]);

/** Category order inside an object: atrium/facade first, then railings, partitions, showers. */
function categoryRank(category: string): number {
  if (category === "ograzhdeniya/atriumnye" || category.startsWith("fasady")) return 0;
  if (category.startsWith("ograzhdeniya")) return 1;
  if (category.startsWith("peregorodki")) return 2;
  if (category.startsWith("kozyrki") || category.startsWith("osteklenie")) return 3;
  if (category.startsWith("dushevye")) return 4;
  return 5;
}

/** inex.su category → existing product slug (never invented). */
function productOfCategory(category: string): string | null {
  if (category.startsWith("ograzhdeniya")) return "ograzhdeniya";
  // NOT `steklyannye-peregorodki`: a duplicate product created by hand on 23.11.
  if (category.startsWith("peregorodki")) return "peregorodki";
  if (category.startsWith("fasady")) return "steklyannyj-fasad";
  if (category.startsWith("kozyrki")) return "kozyrki";
  if (category.startsWith("dushevye")) return "dushevye-peregorodki";
  if (category.startsWith("osteklenie")) return "osteklenie-verand-i-terras";
  return null;
}

/** xlsx «Изделия» words → product slugs. */
const XLSX_PRODUCTS: ReadonlyArray<[RegExp, string]> = [
  [/ограждени/iu, "ograzhdeniya"],
  [/перегородк/iu, "peregorodki"],
  [/фасад/iu, "steklyannyj-fasad"],
  [/козыр/iu, "kozyrki"],
  [/душев/iu, "dushevye-peregorodki"],
];

const TRIPLEX = /триплекс/iu;

/** Map label / H1 heuristic → object type (existing names and the allowed new ones). */
const OBJECT_TYPE_RULES: ReadonlyArray<[RegExp, string]> = [
  [/(?<![\p{L}])(?:трк|трц|тц|тк|тд)(?![\p{L}])|торгов/iu, "Торговые центры"],
  [/банк/iu, "Банки"],
  [/арен/iu, "Арены"],
  [/аэропорт/iu, "Аэропорты"],
  [/гостиниц|отел/iu, "Гостиницы"],
  [/spa|fit|фитнес|банн/iu, "Спорт и отдых"],
  [/ресторан|рестостар|ростикс/iu, "Рестораны"],
  [/медицин|орто/iu, "Медицина"],
  [/администрац/iu, "Госучреждения"],
  [/кхп|завод|комбинат/iu, "Производство"],
  [/академи|школ|гимнази/iu, "Образование"],
  [/офис|управлени|компани|делов/iu, "Офисы"],
];

/* ------------------------------------------------------------------------------------------ */
/* Input types                                                                                */
/* ------------------------------------------------------------------------------------------ */

interface GroupPage {
  url: string;
  category: string;
  name: string;
  mapLabel: string | null;
  location: string | null;
  photos: number;
  glass: string;
}

interface Group {
  groupName: string;
  key: string;
  city: string | null;
  cities: string[];
  pages: GroupPage[];
  categories: string[];
  uncachedSiblings: string[];
  xlsx: { folder: string; name: string | null; slug: string | null } | null;
}

interface GroupedFile {
  groups: Group[];
}

interface PhotoInfo {
  src: string;
  sha1: string | null;
  candidates?: string[];
}

interface PageRecord {
  url: string;
  cat: string;
  name: string;
  kind?: string;
  task: string;
  photos: string[];
  photoInfo: PhotoInfo[];
}

interface InexFile {
  file: string;
  w: number;
  h: number;
  bytes: number;
  fmt: string;
}

interface OwnPhoto {
  dir: string;
  file: string;
  isDir?: boolean;
  w?: number;
  h?: number;
  fmt?: string;
  bytes?: number;
  sha1?: string;
}

interface XlsxRow {
  /** Header → value (strings / numbers, empty cells left out). */
  raw: Record<string, unknown>;
  name?: string;
  year?: number;
  slug?: string;
  city?: string;
  type?: string;
  products?: string;
  task?: string;
}

interface Inputs {
  groups: Map<string, Group>;
  pages: Map<string, PageRecord>;
  inexFiles: Record<string, InexFile>;
  inexByName: Map<string, string[]>;
  ownPhotos: OwnPhoto[];
  xlsx: XlsxRow[];
  csvSlug: Map<string, string | null>;
}

/* ------------------------------------------------------------------------------------------ */
/* Loading                                                                                    */
/* ------------------------------------------------------------------------------------------ */

async function readJsonFile<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, "utf8")) as T;
}

/** Plain text of an ExcelJS cell value (rich text, hyperlinks and formulas included). */
function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value instanceof Date) return value.toISOString();
  if ("richText" in value) return value.richText.map((part) => part.text).join("");
  if ("text" in value && typeof value.text === "string") return value.text;
  if ("result" in value && value.result !== undefined) return cellText(value.result as ExcelJS.CellValue);
  return "";
}

const squash = (text: string) => text.replace(/[\s ]+/g, " ").trim();

/** Columns of the xlsx whose header cell is empty (№, keywords, year). */
const UNNAMED_COLUMNS: Readonly<Record<number, string>> = { 1: "№", 2: "Ключевые слова", 4: "Год" };

/** Header name of an xlsx column; repeated headers («Спецификация») get « (2)», « (3)»… */
function headerName(raw: string, column: number, seen: Map<string, number>): string {
  const base = raw || UNNAMED_COLUMNS[column] || `Колонка ${column}`;
  const count = (seen.get(base) ?? 0) + 1;
  seen.set(base, count);
  return count === 1 ? base : `${base} (${count})`;
}

async function readXlsx(): Promise<XlsxRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(XLSX_FILE);
  const sheet = workbook.getWorksheet(XLSX_SHEET);
  if (!sheet) throw new Error(`xlsx: нет листа «${XLSX_SHEET}»`);
  const headers: string[] = [];
  const seen = new Map<string, number>();
  for (let column = 1; column <= sheet.columnCount; column++) {
    headers[column] = headerName(squash(cellText(sheet.getRow(1).getCell(column).value)), column, seen);
  }
  const rows: XlsxRow[] = [];
  sheet.eachRow((row, index) => {
    if (index === 1) return;
    const raw: Record<string, unknown> = {};
    for (let column = 1; column <= sheet.columnCount; column++) {
      const value = row.getCell(column).value;
      const text = typeof value === "number" ? value : squash(cellText(value));
      if (text === "") continue;
      raw[headers[column] ?? `Колонка ${column}`] = text;
    }
    const str = (key: string) => {
      const value = raw[key];
      return value === undefined ? undefined : String(value);
    };
    const year = Number(str("Год"));
    const row_: XlsxRow = { raw };
    const assign = (field: "name" | "slug" | "city" | "type" | "products" | "task", key: string) => {
      const value = str(key);
      if (value) row_[field] = value;
    };
    assign("name", "Название");
    assign("slug", "Слаг");
    assign("city", "Город");
    assign("type", "Тип объекта");
    assign("products", "Изделия");
    assign("task", "Задача и сложность одной фразой");
    if (Number.isInteger(year)) row_.year = year;
    if (row_.name) rows.push(row_);
  });
  return rows;
}

async function loadInputs(): Promise<Inputs> {
  const grouped = await readJsonFile<GroupedFile>(GROUPED_JSON);
  const pages = await readJsonFile<PageRecord[]>(PAGES_JSON);
  const inexFiles = await readJsonFile<Record<string, InexFile>>(INEX_FILES_JSON);
  const ownPhotos = await readJsonFile<OwnPhoto[]>(OWN_PHOTOS_JSON);
  const inexByName = new Map<string, string[]>();
  for (const [sha1, info] of Object.entries(inexFiles).sort(([a], [b]) => a.localeCompare(b))) {
    const name = path.basename(info.file).toLowerCase();
    inexByName.set(name, [...(inexByName.get(name) ?? []), sha1]);
  }
  const csvSlug = new Map<string, string | null>();
  for (const row of await readSourceCsv()) csvSlug.set(row.old_url, objectSlugFromUrl(row.new_url));
  return {
    groups: new Map(grouped.groups.map((group) => [group.key, group])),
    pages: new Map(pages.map((page) => [page.url, page])),
    inexFiles,
    inexByName,
    ownPhotos,
    xlsx: await readXlsx(),
    csvSlug,
  };
}

/* ------------------------------------------------------------------------------------------ */
/* Photos                                                                                     */
/* ------------------------------------------------------------------------------------------ */

interface PhotoCandidate extends ManifestPhoto {
  bytes: number;
}

const toRepoPath = (file: string) => path.relative(ROOT, file).split(path.sep).join("/");

/** sha1 of the file bytes (the directory name of an inex photo is the same hash). */
function sha1Of(file: string): string {
  return createHash("sha1").update(readFileSync(file)).digest("hex");
}

/** Lower-cased file name of a photo URL, the way the downloader stored it. */
function urlFileName(src: string): string {
  let name = new URL(src).pathname.split("/").pop() ?? "";
  try {
    name = decodeURIComponent(name);
  } catch {
    // keep the raw name
  }
  return name.normalize("NFC").toLowerCase();
}

/**
 * URL → local inex photo. `photoInfo` of `pages.json` is authoritative; several sha1 dirs with the
 * same file name (no URL → sha1 index) resolve to the first candidate, with a note.
 */
function resolveInexPhoto(
  inputs: Inputs,
  info: PhotoInfo | undefined,
  src: string,
  notes: string[]
): string | null {
  if (info?.sha1) return info.sha1;
  const candidates = info?.candidates ?? inputs.inexByName.get(urlFileName(src)) ?? [];
  const first = candidates[0];
  if (!first) {
    notes.push(`фото не найдено локально: ${src}`);
    return null;
  }
  if (candidates.length > 1) {
    notes.push(`фото ${src}: несколько файлов с этим именем, взят ${first.slice(0, 8)} — проверить`);
  }
  return first;
}

function inexPhotosOfPage(inputs: Inputs, page: PageRecord, notes: string[]): PhotoCandidate[] {
  const result: PhotoCandidate[] = [];
  const captions = pageCaptions(page);
  page.photos.forEach((src, index) => {
    const info = page.photoInfo.find((item) => item.src === src) ?? page.photoInfo[index];
    const sha1 = resolveInexPhoto(inputs, info, src, notes);
    const file = sha1 ? inputs.inexFiles[sha1] : undefined;
    if (!sha1 || !file) return;
    const caption = captions.get(src);
    result.push({
      key: sha1,
      file: toRepoPath(path.resolve(file.file)),
      sourceUrl: src,
      origin: "inex",
      pageUrl: page.url,
      width: file.w,
      height: file.h,
      bytes: file.bytes,
      ...(caption ? { caption } : {}),
    });
  });
  return result;
}

/** Folder photos of `res/Объекты/<folder>` (images only, sorted by numeric file name). */
function folderPhotos(inputs: Inputs, folder: string): PhotoCandidate[] {
  const number = (file: string) => Number(/^\d+/.exec(file)?.[0] ?? Number.MAX_SAFE_INTEGER);
  return inputs.ownPhotos
    .filter((photo) => photo.dir === folder && !photo.isDir && photo.sha1 && photo.w && photo.h)
    .filter((photo) => IMAGE_FORMATS.has(photo.fmt ?? ""))
    .sort((a, b) => number(a.file) - number(b.file) || a.file.localeCompare(b.file))
    .map((photo) => ({
      key: photo.sha1 ?? "",
      file: toRepoPath(path.join(OWN_DIR, photo.dir, photo.file)),
      origin: "folder" as const,
      width: photo.w ?? 0,
      height: photo.h ?? 0,
      bytes: photo.bytes ?? 0,
    }));
}

/* ------------------------------------------------------------------------------------------ */
/* Page texts (Firecrawl cache, parsed like import.ts)                                        */
/* ------------------------------------------------------------------------------------------ */

interface ParsedPage {
  text: string;
  pageDate?: string;
  captions: Map<string, string>;
}

const parsedPages = new Map<string, ParsedPage>();

/** Full description, page date and photo alts from the cached page (empty when not cached). */
async function parsePage(url: string): Promise<ParsedPage> {
  const cached = parsedPages.get(url);
  if (cached) return cached;
  const entry = await readCache(url);
  const result = entry ? parseObject(entry) : null;
  const parsed: ParsedPage = { text: "", captions: new Map() };
  if (result?.ok) {
    parsed.text = result.value.taskText;
    if (result.value.pageDate) parsed.pageDate = result.value.pageDate;
    const title = result.value.name.toLowerCase();
    for (const photo of result.value.photos) {
      // inex.su alts are «<H1>, <city>» — only a different text is a real caption.
      const alt = photo.alt ? squash(photo.alt) : "";
      if (alt && !alt.toLowerCase().startsWith(title)) parsed.captions.set(photo.src, alt);
    }
  }
  parsedPages.set(url, parsed);
  return parsed;
}

function pageCaptions(page: PageRecord): Map<string, string> {
  return parsedPages.get(page.url)?.captions ?? new Map();
}

/** Text files of a `res/Объекты` folder, as source texts. */
function folderTexts(folder: string): SourceText[] {
  if (WRONG_FOLDER_TEXTS.has(folder)) return [];
  const dir = path.join(OWN_DIR, folder);
  const files = OWN_TEXTS.get(folder) ?? [];
  return files.map((file) => {
    const content = readFileSync(path.join(dir, file), "utf8").replace(/^﻿/, "");
    const lines = content.split(/\r?\n/).map(squash).filter(Boolean);
    return {
      url: toRepoPath(path.join(dir, file)),
      title: lines[0] ?? file,
      text: lines.slice(1).join("\n"),
    };
  });
}

/** `.txt` files per folder (filled by `build()` from own-photos.json). */
const OWN_TEXTS = new Map<string, string[]>();

/* ------------------------------------------------------------------------------------------ */
/* Object assembly                                                                            */
/* ------------------------------------------------------------------------------------------ */

interface Draft extends Omit<ManifestObject, "batch" | "coverKey"> {
  /** Group key or folder, for the featured / ordering rules. */
  id: string;
  xlsxIndex: number;
}

function cityOf(raw: string | null | undefined, notes: string[]): string {
  const value = squash(raw ?? "");
  const settlement = /^(?:поселок|посёлок|пос\.|п\.)\s+(.+)$/iu.exec(value);
  if (settlement?.[1]) {
    notes.push(`город: «${value}» → «${settlement[1]}»`);
    return settlement[1];
  }
  return value;
}

function objectTypeOf(texts: readonly string[]): string | undefined {
  const joined = texts.join("\n");
  return OBJECT_TYPE_RULES.find(([pattern]) => pattern.test(joined))?.[1];
}

function productHintsOf(categories: readonly string[], xlsxProducts: string | undefined, texts: string): string[] {
  const hints: string[] = [];
  const add = (slug: string | null) => {
    if (slug && !hints.includes(slug)) hints.push(slug);
  };
  for (const category of categories) add(productOfCategory(category));
  for (const [pattern, slug] of XLSX_PRODUCTS) if (xlsxProducts && pattern.test(xlsxProducts)) add(slug);
  if (TRIPLEX.test(texts)) add("tripleks");
  return hints;
}

/** Orders photos (pages by category, folder-only last), drops small files and known keys. */
function collectPhotos(
  candidates: readonly PhotoCandidate[],
  excluded: ReadonlySet<string>,
  taken: Map<string, string>,
  owner: string,
  notes: string[]
): ManifestPhoto[] {
  const photos: ManifestPhoto[] = [];
  const seen = new Set<string>();
  let small = 0;
  let metal = 0;
  let duplicates = 0;
  for (const candidate of candidates) {
    const absolute = path.join(ROOT, candidate.file);
    if (!existsSync(absolute)) {
      notes.push(`файл не найден: ${candidate.file}`);
      continue;
    }
    const key = sha1Of(absolute);
    if (key !== candidate.key) notes.push(`sha1 файла ${candidate.file} не совпадает с исследованием`);
    if (seen.has(key)) {
      duplicates++;
      continue;
    }
    if (excluded.has(key)) {
      metal++;
      continue;
    }
    if (Math.max(candidate.width, candidate.height) < MIN_LONG_SIDE || candidate.bytes < MIN_BYTES) {
      small++;
      continue;
    }
    const otherOwner = taken.get(key);
    if (otherOwner && otherOwner !== owner) {
      notes.push(`фото ${key.slice(0, 8)} уже у объекта ${otherOwner} — не повторяется`);
      continue;
    }
    seen.add(key);
    taken.set(key, owner);
    const { bytes: _bytes, ...photo } = candidate;
    photos.push({ ...photo, key });
  }
  if (duplicates) notes.push(`дубли по sha1 убраны: ${duplicates}`);
  if (metal) notes.push(`фото металлических страниц пропущены: ${metal}`);
  if (small) notes.push(`маленькие файлы (< ${MIN_LONG_SIDE} px или < 10 КБ) пропущены: ${small}`);
  return photos;
}

async function draftFromGroup(
  inputs: Inputs,
  group: Group,
  taken: Map<string, string>
): Promise<Draft> {
  const notes: string[] = [];
  const keepUnclear = KEEP_UNCLEAR_KEYS.has(group.key);
  const isGlass = (page: GroupPage) =>
    page.glass.startsWith("yes") || (keepUnclear && page.glass.startsWith("unclear"));
  // Stable sort: inex.su page order inside a category rank.
  const pages = group.pages
    .map((page, index) => ({ page, index }))
    .sort((a, b) => categoryRank(a.page.category) - categoryRank(b.page.category) || a.index - b.index)
    .map(({ page }) => page);
  const imported = pages.filter(isGlass);
  const dropped = pages.filter((page) => !isGlass(page));
  for (const page of dropped) notes.push(`страница без стекла не импортируется: ${page.url} (${page.glass})`);
  if (keepUnclear) notes.push("стекло на страницах inex.su не определено по фото — проверить каждое фото");
  for (const sibling of group.uncachedSiblings) notes.push(`страница inex.su не скачана: ${sibling}`);

  const records = imported.map((page) => {
    const record = inputs.pages.get(page.url);
    if (!record) throw new Error(`pages.json: нет страницы ${page.url}`);
    return record;
  });
  for (const record of records) await parsePage(record.url);

  // Photos of dropped (metal-only) pages must not come back through the folder.
  const metalKeys = new Set<string>();
  for (const page of dropped) {
    const record = inputs.pages.get(page.url);
    for (const info of record?.photoInfo ?? []) if (info.sha1) metalKeys.add(info.sha1);
  }
  const folder = group.xlsx?.folder;
  const inexCandidates = records.flatMap((record) => inexPhotosOfPage(inputs, record, notes));
  const folderCandidates = folder ? folderPhotos(inputs, folder) : [];
  const inexKeys = new Set(inexCandidates.map((photo) => photo.key));
  const folderMetal = folderCandidates.filter((photo) => metalKeys.has(photo.key)).length;
  if (folderMetal) notes.push(`фото из папки, совпавшие с фото металлических страниц, пропущены: ${folderMetal}`);
  const folderOnly = folderCandidates.filter((photo) => !inexKeys.has(photo.key) && !metalKeys.has(photo.key));
  if (folderOnly.length) notes.push(`фото только из папки res/Объекты/${folder}: ${folderOnly.length}`);
  const photos = collectPhotos([...inexCandidates, ...folderOnly], metalKeys, taken, group.key, notes);

  const xlsx = group.xlsx?.slug ? inputs.xlsx.find((row) => row.slug === group.xlsx?.slug) : undefined;
  const sourceTexts: SourceText[] = records.map((record) => ({
    url: record.url,
    title: record.name,
    text: parsedPages.get(record.url)?.text || record.task,
  }));
  if (folder) sourceTexts.push(...folderTexts(folder));

  let name = xlsx?.name;
  if (!name) {
    name = BUILT_NAMES[group.key] ?? group.groupName;
    notes.push(`название по метке карты, уточнить («${group.pages[0]?.mapLabel ?? group.groupName}»)`);
  }
  if (group.key === "L:шахматная академия") {
    notes.push("название: в xlsx «Угорская», на inex.su «Югорская» шахматная академия — уточнить");
  }

  const override = CITY_OVERRIDES[group.key];
  let city: string;
  if (override) {
    city = override.city;
    notes.push(override.note);
  } else {
    city = cityOf(xlsx?.city ?? group.city, notes);
  }
  if (group.cities.length > 1 && !override) notes.push(`разные города на страницах: ${group.cities.join(" / ")}`);

  const legacyUrls = imported.map((page) => page.url);
  const csvSlug = legacyUrls.map((url) => inputs.csvSlug.get(url)).find(Boolean) ?? null;
  const slug =
    xlsx?.slug ??
    PROD_PLACEHOLDER_BY_KEY[group.key] ??
    SLUG_OVERRIDES[group.key] ??
    csvSlug ??
    transliterate(name);
  if (slug !== csvSlug) notes.push(`слаг «${slug}» отличается от слага CSV «${csvSlug ?? "—"}»`);

  const categories = [...new Set(imported.map((page) => page.category))];
  const allText = [xlsx?.task ?? "", ...sourceTexts.map((text) => `${text.title}\n${text.text}`)].join("\n");
  const labels = [...records.map((record) => `${record.kind ?? ""}\n${record.name}`), name];
  const objectTypeHint = xlsx?.type ?? objectTypeOf(labels);
  const yearHint = xlsx?.year ?? pageYear(records.map((record) => record.url));
  if (yearHint === undefined) notes.push("год неизвестен, уточнить");

  return {
    id: group.key,
    xlsxIndex: xlsx ? inputs.xlsx.indexOf(xlsx) : -1,
    slug,
    name,
    city,
    ...(yearHint !== undefined ? { yearHint } : {}),
    legacyUrls,
    categories,
    productHints: productHintsOf(categories, xlsx?.products, allText),
    ...(objectTypeHint ? { objectTypeHint } : {}),
    ...(xlsx ? { xlsx: xlsx.raw } : {}),
    sourceTexts,
    photos,
    featuredDefault: FEATURED.has(group.key),
    notes,
  };
}

/** Year of the earliest page date (the crawled inex.su pages usually carry none). */
function pageYear(urls: readonly string[]): number | undefined {
  const years = urls
    .map((url) => parsedPages.get(url)?.pageDate)
    .filter((date): date is string => !!date)
    .map((date) => new Date(date).getUTCFullYear());
  return years.length ? Math.min(...years) : undefined;
}

function draftFromFolder(inputs: Inputs, spec: UserOnlyObject, taken: Map<string, string>): Draft {
  const notes = [...(spec.notes ?? [])];
  const xlsx = spec.xlsxSlug ? inputs.xlsx.find((row) => row.slug === spec.xlsxSlug) : undefined;
  if (spec.xlsxSlug && !xlsx) throw new Error(`xlsx: нет строки со слагом ${spec.xlsxSlug}`);
  const photos = collectPhotos(folderPhotos(inputs, spec.folder), new Set(), taken, spec.folder, notes);
  const sourceTexts = folderTexts(spec.folder);
  const name = xlsx?.name ?? spec.name ?? spec.folder;
  const city = cityOf(xlsx?.city ?? spec.city, notes);
  const legacyUrls = spec.legacyUrls ?? [];
  const csvSlug = legacyUrls.map((url) => inputs.csvSlug.get(url)).find(Boolean) ?? null;
  const slug = xlsx?.slug ?? csvSlug ?? transliterate(name);
  if (legacyUrls.length && slug !== csvSlug) notes.push(`слаг «${slug}» отличается от слага CSV «${csvSlug ?? "—"}»`);
  if (!legacyUrls.length) notes.push("страниц на inex.su нет — только фото из папки res/Объекты");
  const allText = [xlsx?.task ?? "", ...sourceTexts.map((text) => `${text.title}\n${text.text}`)].join("\n");
  const objectTypeHint = xlsx?.type ?? objectTypeOf([name, ...sourceTexts.map((text) => text.title)]);
  return {
    id: spec.folder,
    xlsxIndex: xlsx ? inputs.xlsx.indexOf(xlsx) : -1,
    slug,
    name,
    city,
    ...(xlsx?.year !== undefined ? { yearHint: xlsx.year } : {}),
    legacyUrls,
    categories: [],
    productHints: productHintsOf([], xlsx?.products, allText),
    ...(objectTypeHint ? { objectTypeHint } : {}),
    ...(xlsx ? { xlsx: xlsx.raw } : {}),
    sourceTexts,
    photos,
    featuredDefault: FEATURED.has(spec.folder),
    notes,
  };
}

/**
 * Default cover: the first photo with a long side ≥ 900 px from the most representative page
 * (photos are already ordered atrium/facade first). Home-marquee objects prefer a portrait photo
 * (the marquee crops to 4:5). The cover is moved to `photos[0]`.
 */
function chooseCover(draft: Draft): ManifestPhoto[] {
  const photos = draft.photos;
  const large = (photo: ManifestPhoto) => Math.max(photo.width, photo.height) >= COVER_MIN_LONG_SIDE;
  const firstPage = photos[0]?.pageUrl;
  const fromFirstPage = photos.filter((photo) => photo.pageUrl === firstPage);
  const portrait = (photo: ManifestPhoto) => large(photo) && photo.height > photo.width;
  const cover =
    (draft.featuredDefault
      ? (fromFirstPage.find(portrait) ?? photos.find(portrait))
      : undefined) ??
    fromFirstPage.find(large) ??
    photos.find(large) ??
    photos[0];
  if (!cover) return photos;
  if (!large(cover)) draft.notes.push(`нет фото ≥ ${COVER_MIN_LONG_SIDE} px для обложки`);
  return [cover, ...photos.filter((photo) => photo !== cover)];
}

/** Two content batches with balanced total photo counts (greedy, deterministic, tie → «a»). */
function assignBatches(drafts: readonly Draft[]): Map<string, "a" | "b"> {
  const totals = { a: 0, b: 0 };
  const batches = new Map<string, "a" | "b">();
  const bySize = [...drafts].sort((x, y) => y.photos.length - x.photos.length || x.slug.localeCompare(y.slug));
  for (const draft of bySize) {
    const batch = totals.a <= totals.b ? "a" : "b";
    totals[batch] += draft.photos.length;
    batches.set(draft.slug, batch);
  }
  return batches;
}

function orderDrafts(drafts: readonly Draft[]): Draft[] {
  const xlsxObjects = drafts.filter((draft) => draft.xlsxIndex >= 0).sort((a, b) => a.xlsxIndex - b.xlsxIndex);
  const userOnly = drafts.filter((draft) => draft.xlsxIndex < 0 && USER_ONLY.some((spec) => spec.folder === draft.id));
  const rest = drafts
    .filter((draft) => draft.xlsxIndex < 0 && !userOnly.includes(draft))
    .sort((a, b) => b.photos.length - a.photos.length || a.slug.localeCompare(b.slug));
  return [...xlsxObjects, ...userOnly, ...rest];
}

/* ------------------------------------------------------------------------------------------ */
/* Build                                                                                      */
/* ------------------------------------------------------------------------------------------ */

/** Non-listed `L:` groups that the old heuristic would select (warning only). */
function heuristicWarnings(inputs: Inputs): string[] {
  const listed = new Set(GROUP_KEYS);
  const warnings: string[] = [];
  for (const group of inputs.groups.values()) {
    if (!group.key.startsWith("L:") || listed.has(group.key) || !group.city) continue;
    const glassPages = group.pages.filter((page) => page.glass.startsWith("yes"));
    const glassPhotos = glassPages.reduce((sum, page) => sum + page.photos, 0);
    if (glassPages.length && glassPhotos >= 3) {
      warnings.push(`группа ${group.key} («${group.groupName}», ${group.city}, ${glassPhotos} фото) не в списке`);
    }
  }
  return warnings;
}

export async function buildManifest(): Promise<{ objects: ManifestObject[]; warnings: string[] }> {
  const inputs = await loadInputs();
  const missing = GROUP_KEYS.filter((key) => !inputs.groups.has(key));
  if (missing.length) throw new Error(`objects-grouped.json: нет групп ${missing.join(", ")}`);
  for (const photo of inputs.ownPhotos) {
    if (!photo.isDir && photo.file.toLowerCase().endsWith(".txt")) {
      OWN_TEXTS.set(photo.dir, [...(OWN_TEXTS.get(photo.dir) ?? []), photo.file].sort());
    }
  }

  const taken = new Map<string, string>();
  const drafts: Draft[] = [];
  for (const key of GROUP_KEYS) {
    const group = inputs.groups.get(key);
    if (group) drafts.push(await draftFromGroup(inputs, group, taken));
  }
  for (const spec of USER_ONLY) drafts.push(draftFromFolder(inputs, spec, taken));

  const slugs = new Set<string>();
  for (const draft of drafts) {
    if (!draft.photos.length) throw new Error(`объект ${draft.slug}: нет фото`);
    let slug = draft.slug;
    for (let n = 2; slugs.has(slug); n++) slug = `${draft.slug}-${n}`;
    if (slug !== draft.slug) {
      draft.notes.push(`слаг «${draft.slug}» занят — взят «${slug}»`);
      draft.slug = slug;
    }
    slugs.add(slug);
  }

  const batches = assignBatches(drafts);
  const objects = orderDrafts(drafts).map((draft): ManifestObject => {
    const photos = chooseCover(draft);
    const { id: _id, xlsxIndex: _xlsxIndex, ...rest } = draft;
    return {
      slug: rest.slug,
      batch: batches.get(rest.slug) ?? "a",
      name: rest.name,
      city: rest.city,
      ...(rest.yearHint !== undefined ? { yearHint: rest.yearHint } : {}),
      legacyUrls: rest.legacyUrls,
      categories: rest.categories,
      productHints: rest.productHints,
      ...(rest.objectTypeHint ? { objectTypeHint: rest.objectTypeHint } : {}),
      ...(rest.xlsx ? { xlsx: rest.xlsx } : {}),
      sourceTexts: rest.sourceTexts,
      photos,
      coverKey: photos[0]?.key ?? "",
      featuredDefault: rest.featuredDefault,
      notes: rest.notes,
    };
  });
  return { objects, warnings: heuristicWarnings(inputs) };
}

/* ------------------------------------------------------------------------------------------ */
/* Contact sheets                                                                             */
/* ------------------------------------------------------------------------------------------ */

const SHEET_COLUMNS = 4;
const SHEET_ROWS = 3;
const THUMB = 320;
const CELL = THUMB + 12;
const SHEET_BACKGROUND = "#8a8f94";
const LABEL_HEIGHT = 28;
/** One composite layer (sharp exports its types only through the `export =` namespace). */
type SharpOverlay = Parameters<ReturnType<typeof sharp>["composite"]>[0][number];

/** Shortest sha1 prefix (≥ 8) that is unique within the object. */
function shortKeys(keys: readonly string[]): Map<string, string> {
  for (let length = 8; length <= 40; length++) {
    const prefixes = keys.map((key) => key.slice(0, length));
    if (new Set(prefixes).size === keys.length) return new Map(keys.map((key, i) => [key, prefixes[i] ?? key]));
  }
  return new Map(keys.map((key) => [key, key]));
}

function labelSvg(text: string): Buffer {
  const width = text.length * 11 + 16;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${LABEL_HEIGHT}">` +
      `<rect width="100%" height="100%" rx="4" fill="#1c1f22" fill-opacity="0.85"/>` +
      `<text x="8" y="20" font-family="Consolas, monospace" font-size="18" fill="#ffffff">${text}</text></svg>`
  );
}

async function writeSheets(objects: readonly ManifestObject[]): Promise<number> {
  await rm(SHEETS_DIR, { recursive: true, force: true });
  await mkdir(SHEETS_DIR, { recursive: true });
  const perSheet = SHEET_COLUMNS * SHEET_ROWS;
  let count = 0;
  for (const object of objects) {
    const prefixes = shortKeys(object.photos.map((photo) => photo.key));
    for (let start = 0, sheet = 1; start < object.photos.length; start += perSheet, sheet++) {
      const photos = object.photos.slice(start, start + perSheet);
      const rows = Math.ceil(photos.length / SHEET_COLUMNS);
      const layers: SharpOverlay[] = [];
      // Ordered array (an object keyed by prefix would be reordered by JS for all-digit prefixes).
      const sidecar: Record<string, unknown>[] = [];
      for (const [index, photo] of photos.entries()) {
        const left = (index % SHEET_COLUMNS) * CELL + 6;
        const top = Math.floor(index / SHEET_COLUMNS) * CELL + 6;
        const thumb = await sharp(path.join(ROOT, photo.file))
          .rotate()
          .resize(THUMB, THUMB, { fit: "inside" })
          .jpeg()
          .toBuffer({ resolveWithObject: true });
        const offsetX = Math.floor((THUMB - thumb.info.width) / 2);
        const offsetY = Math.floor((THUMB - thumb.info.height) / 2);
        layers.push({ input: thumb.data, left: left + offsetX, top: top + offsetY });
        const prefix = prefixes.get(photo.key) ?? photo.key;
        layers.push({ input: labelSvg(prefix), left: left + offsetX + 4, top: top + offsetY + 4 });
        sidecar.push({
          index: start + index + 1,
          label: prefix,
          key: photo.key,
          file: photo.file,
          width: photo.width,
          height: photo.height,
          origin: photo.origin,
          ...(photo.pageUrl ? { pageUrl: photo.pageUrl } : {}),
        });
      }
      const base = path.join(SHEETS_DIR, `${object.slug}-${String(sheet).padStart(2, "0")}`);
      await sharp({
        create: {
          width: SHEET_COLUMNS * CELL,
          height: rows * CELL,
          channels: 3,
          background: SHEET_BACKGROUND,
        },
      })
        .composite(layers)
        .jpeg({ quality: 80 })
        .toFile(`${base}.jpg`);
      await writeFile(`${base}.json`, `${JSON.stringify(sidecar, null, 2)}\n`);
      count++;
    }
  }
  return count;
}

/* ------------------------------------------------------------------------------------------ */
/* CLI                                                                                        */
/* ------------------------------------------------------------------------------------------ */

function serialize(manifest: Manifest): string {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

async function readCommitted(): Promise<Manifest | null> {
  if (!existsSync(MANIFEST_FILE)) return null;
  return readJsonFile<Manifest>(MANIFEST_FILE);
}

function printSummary(objects: readonly ManifestObject[]): void {
  const rows = objects.map((object) => {
    const cover = object.photos[0];
    return [
      object.slug,
      object.city,
      object.batch,
      String(object.legacyUrls.length),
      String(object.photos.length),
      cover ? `${cover.width}×${cover.height}` : "—",
    ];
  });
  const header = ["slug", "city", "batch", "pages", "photos", "cover"];
  const widths = header.map((title, i) => Math.max(title.length, ...rows.map((row) => row[i]?.length ?? 0)));
  const line = (cells: readonly string[]) => cells.map((cell, i) => cell.padEnd(widths[i] ?? 0)).join("  ");
  process.stdout.write(`${line(header)}\n`);
  for (const row of rows) process.stdout.write(`${line(row)}\n`);
  const total = (batch: "a" | "b") =>
    objects.filter((object) => object.batch === batch).reduce((sum, object) => sum + object.photos.length, 0);
  const a = total("a");
  const b = total("b");
  const diff = Math.abs(a - b) / Math.max(a, b, 1);
  process.stdout.write(
    `объектов: ${objects.length}; фото: ${a + b}; batch a: ${a} фото (${objects.filter((o) => o.batch === "a").length} объектов), ` +
      `batch b: ${b} фото (${objects.filter((o) => o.batch === "b").length} объектов), разница ${(diff * 100).toFixed(1)} %\n`
  );
}

async function cli(): Promise<void> {
  const { values } = parseArgs({ options: { check: { type: "boolean", default: false } } });
  const { objects, warnings } = await buildManifest();
  for (const [folder, reason] of Object.entries(SKIPPED_FOLDERS)) {
    process.stdout.write(`пропущена папка «${folder}»: ${reason}\n`);
  }
  for (const warning of warnings) process.stdout.write(`внимание: ${warning}\n`);

  const committed = await readCommitted();
  const unchanged = committed !== null && JSON.stringify(committed.objects) === JSON.stringify(objects);
  const manifest: Manifest = {
    generatedAt: unchanged && committed ? committed.generatedAt : new Date().toISOString(),
    objects,
  };

  if (values.check) {
    if (!unchanged) {
      process.stderr.write(`${path.relative(ROOT, MANIFEST_FILE)} устарел — перезапустите build-manifest.ts\n`);
      process.exitCode = 1;
      return;
    }
    process.stdout.write(`манифест актуален (${objects.length} объектов)\n`);
    return;
  }

  await mkdir(DATA_DIR, { recursive: true });
  if (!unchanged) await writeFile(MANIFEST_FILE, serialize(manifest));
  const sheets = await writeSheets(objects);
  printSummary(objects);
  process.stdout.write(
    `${unchanged ? "без изменений" : "записан"}: ${path.relative(ROOT, MANIFEST_FILE)}; контактных листов: ${sheets}\n`
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  await cli();
}
