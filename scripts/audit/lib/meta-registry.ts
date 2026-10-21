/**
 * `docs/inex/17-meta.md` → registry of expected H1 / title / description / main query per URL
 * (task 40, §1). Pure module: no Payload, no network — the caller passes the prices.
 *
 * Parsing rules (see the task spec):
 * - table rows start with `| /`; columns: URL | H1 | Title | Description | Главный запрос;
 * - a row with SIX cells carries a second description (facet, oplata, proektirovanie): the
 *   first one wins, the second is kept in `secondDescription` for the report;
 * - `\|` inside a cell (brand separator «\| Inex Glass») is a literal `|`;
 * - `/zakalennoe-steklo/{N}-mm/` expands to the 8 thicknesses; the «(без цены)» row is the title
 *   variant for 15/19 mm and for stale prices (`priceState !== 'price'`).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { formatNumber, formatPrice } from "@/lib/domain/format";
import { getPrice, priceState } from "@/lib/domain/prices";
import type { PricesInput } from "@/lib/domain/prices";

export const META_FILE = path.join("docs", "inex", "17-meta.md");

/** Thicknesses of the `{N}` template (ТЗ §3.1). */
export const TEMPLATE_THICKNESSES = [4, 5, 6, 8, 10, 12, 15, 19] as const;

const THICKNESS_TEMPLATE_URL = "/zakalennoe-steklo/{N}-mm/";
const NO_PRICE_MARKER = "(без цены)";
const KG_PER_M2_PER_MM = 2.5;

/** Main query of a page with the frequencies recorded in 17-meta (Wordkeeper, 15.10.2026). */
export interface MetaQuery {
  text: string;
  /** Exact monthly frequency, Russia. */
  freqRu: number | null;
  /** Exact monthly frequency, three federal districts (Урал, Сибирь, Поволжье). */
  freq3: number | null;
  /** `true` when the query was derived by the script, not written in 17-meta. */
  derived?: boolean;
}

/** One raw table row of 17-meta. */
export interface MetaRow {
  line: number;
  url: string;
  h1: string;
  title: string;
  description: string;
  secondDescription: string | null;
  queryCell: string;
  noPriceVariant: boolean;
}

/** One expected URL after template expansion. */
export interface RegistryEntry {
  url: string;
  h1: string;
  title: string;
  description: string;
  secondDescription: string | null;
  query: MetaQuery | null;
  /** Line in 17-meta the entry comes from. */
  line: number;
  /** Thickness pages: which title variant applies and why. */
  thickness?: { n: number; priceState: "price" | "calc"; price: number | null };
}

export interface MetaRegistry {
  rows: MetaRow[];
  entries: RegistryEntry[];
}

/** Splits a Markdown table row on unescaped pipes; `\|` becomes `|`. */
export function splitTableRow(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === "\\" && line[i + 1] === "|") {
      current += "|";
      i += 1;
    } else if (ch === "|") {
      cells.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current);
  // Leading and trailing pipes produce empty edge cells.
  return cells.slice(1, -1).map((cell) => cell.trim());
}

export function parseMetaRows(markdown: string): MetaRow[] {
  const rows: MetaRow[] = [];
  markdown.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim();
    if (!line.startsWith("| /")) return;
    const cells = splitTableRow(line);
    if (cells.length < 5) {
      throw new Error(
        `17-meta, строка ${index + 1}: ожидалось ≥ 5 столбцов, найдено ${cells.length}`
      );
    }
    const [urlCell = "", h1 = "", title = "", description = ""] = cells;
    const hasSecond = cells.length >= 6;
    const noPriceVariant = urlCell.includes(NO_PRICE_MARKER);
    rows.push({
      line: index + 1,
      url: urlCell.replace(NO_PRICE_MARKER, "").trim(),
      h1,
      title,
      description,
      secondDescription: hasSecond ? (cells[4] ?? null) : null,
      queryCell: (hasSecond ? cells[5] : cells[4]) ?? "",
      noPriceVariant,
    });
  });
  return rows;
}

/**
 * «закаленное стекло 1374/416», «"закаленное стекло 10 мм цена за м2" 47/20», «гнутое стекло»,
 * «— (бренд)» → query or `null` (no main query).
 */
export function parseQueryCell(cell: string): MetaQuery | null {
  const value = cell.trim();
  if (!value || value.startsWith("—") || value.startsWith("-")) return null;
  const freq = /\s(\d+)\s*\/\s*(\d+)\s*$/.exec(value);
  const text = (freq ? value.slice(0, freq.index) : value).replace(/[«»"]/g, "").trim();
  if (!text) return null;
  return {
    text,
    freqRu: freq ? Number(freq[1]) : null,
    freq3: freq ? Number(freq[2]) : null,
  };
}

/** «{вес}»: 2,5 kg/m² per mm, comma decimals, no trailing zeros (10 → «25», 5 → «12,5»). */
export function formatWeightPerM2(n: number): string {
  return formatNumber(n * KG_PER_M2_PER_MM);
}

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{([^{}]+)\}/g, (whole, key: string) => values[key] ?? whole);
}

/** Expands the thickness template rows; other rows map 1:1. */
export function expandRegistry(rows: readonly MetaRow[], prices: PricesInput, now = new Date()) {
  const entries: RegistryEntry[] = [];
  const priceRow = rows.find((r) => r.url === THICKNESS_TEMPLATE_URL && !r.noPriceVariant);
  const noPriceRow = rows.find((r) => r.url === THICKNESS_TEMPLATE_URL && r.noPriceVariant);

  for (const row of rows) {
    if (row.url !== THICKNESS_TEMPLATE_URL) {
      entries.push({
        url: row.url,
        h1: row.h1,
        title: row.title,
        description: row.description,
        secondDescription: row.secondDescription,
        query: parseQueryCell(row.queryCell),
        line: row.line,
      });
      continue;
    }
    // Both template rows are handled once, on the priced one.
    if (row.noPriceVariant || !priceRow || !noPriceRow) continue;
    const templateQuery = parseQueryCell(priceRow.queryCell);
    for (const n of TEMPLATE_THICKNESSES) {
      const state = priceState(n, prices, now);
      const price = getPrice(n, prices);
      const source = state === "price" ? priceRow : noPriceRow;
      const values: Record<string, string> = {
        N: String(n),
        вес: formatWeightPerM2(n),
        цена: price !== null ? formatPrice(price) : "{цена}",
      };
      // 17-meta records the query (with frequencies) for 10 mm only; others are derived.
      const query: MetaQuery | null =
        n === 10 && templateQuery
          ? templateQuery
          : { text: `закаленное стекло ${n} мм`, freqRu: null, freq3: null, derived: true };
      entries.push({
        url: fill(THICKNESS_TEMPLATE_URL, values),
        h1: fill(source.h1, values),
        title: fill(source.title, values),
        description: fill(source.description, values),
        secondDescription: null,
        query,
        line: source.line,
        thickness: { n, priceState: state, price: state === "price" ? price : null },
      });
    }
  }
  return entries;
}

export function loadMetaRegistry(prices: PricesInput, now = new Date(), file = META_FILE) {
  const rows = parseMetaRows(readFileSync(file, "utf8"));
  return { rows, entries: expandRegistry(rows, prices, now) } satisfies MetaRegistry;
}

/**
 * Comparison normalisation (task spec §1): NBSP → space, collapsed whitespace, trim. «ё» is NOT
 * folded, typographic quotes and dashes are compared as is.
 */
export function normalizeMetaText(value: string | null | undefined): string {
  return (value ?? "").replace(/[   ]/g, " ").replace(/\s+/g, " ").trim();
}
