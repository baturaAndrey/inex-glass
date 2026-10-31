/**
 * Pure rules for the inex.su → Inex Glass redirect map (task 37).
 *
 * Input: `docs/inex/12-migration-inex-su.csv` (`old_url;new_url;action;note`). The original map
 * has systematic errors (stairs and interior finishing marked 301, portfolio category pages and
 * old pagination pointing at non-existent `/obekty/<category>/`, upper-case and Cyrillic letters
 * in slugs, colliding object slugs). `fixRows` applies the rules R0–R7 of the task spec, first
 * matching rule wins:
 *
 * - R0 `stay` rows stay as they are;
 * - R1 `/portfolio/lestnicy/*` → stay (stairs remain on inex.su, ТЗ §9);
 * - R2 `/portfolio/otdelka-interera/*` → stay, leaf objects are disputed;
 * - R3 portfolio category pages → `/obekty/`;
 * - R4 old pagination (`…/2`) → `/obekty/`;
 * - R5 portfolio object → `/obekty/<latin-slug>/`, collisions merged or suffixed;
 * - R6 `/produkciya/*`, `/materialy/steklo` → unchanged (targets checked by the CLI);
 * - R7 portfolio object whose page could not be imported → `/obekty/`, disputed.
 *
 * No I/O here: the scripts in `scripts/import-inex/` read files and pass the import results in
 * through `FixContext`. Lives in `src/lib` so Vitest picks up the tests.
 */
import { transliterate } from "@/payload/fields/transliterate";

export type Action = "301" | "stay";

export type Row = { old_url: string; new_url: string; action: Action; note: string };

export type RuleId = "R0" | "R1" | "R2" | "R3" | "R4" | "R5" | "R6" | "R7";

export type FixedRow = Row & { rule: RuleId; disputed: boolean };

export type UrlClass =
  "stairs" | "interior" | "category" | "pagination" | "object" | "produkciya" | "other";

/** Listing of the new site every non-object portfolio URL falls back to. */
export const OBJECTS_LISTING = "/obekty/";

const PORTFOLIO_ROOT = "portfolio";
const STAIRS_CATEGORY = "lestnicy";
const INTERIOR_CATEGORY = "otdelka-interera";
const SHOWERS_CATALOG_PREFIX = "/produkciya/dushevye";

/**
 * Second-level portfolio categories of inex.su (`/portfolio/<cat>/<sub>`): pages listing the
 * objects of a sub-category, not objects themselves.
 */
export const PORTFOLIO_SUBCATEGORIES: ReadonlySet<string> = new Set([
  "pryamye",
  "uglovye",
  "trepecevidnye",
  "celnosteklyannye",
  "v-aluminievom-profile",
  "lestnichnye",
  "atriumnye",
  "interernye",
  "balkonnye",
  "terrasnye",
  "osteklenie-verandy",
  "osteklenie-besedki",
  "osteklenie-terrasy",
]);

/** Object pages that are glass doors inside partitions (doors stay on inex.su — disputed). */
export const DOOR_OBJECT_SLUGS: ReadonlySet<string> = new Set([
  "dveri-08",
  "dveri-mayatnik-01",
  "linda-dver",
]);

export const NOTES = {
  stairs: "лестницы остаются на inex.su (ТЗ §9)",
  interior: "отделка интерьера остаётся на inex.su",
  category: "категория портфолио → листинг объектов",
  pagination: "старая пагинация → листинг",
  notImported: "страница не импортирована",
  merged: "тот же объект, что и",
  suffixed: "коллизия slug — добавлен суффикс категории",
  doors: "двери в цельностеклянной перегородке — нужно решение Inex",
} as const;

/** Path segments without the empty leading one: `/portfolio/a/b` → `['portfolio','a','b']`. */
export function pathSegments(url: string): string[] {
  return url.split("/").filter((segment) => segment !== "");
}

/** Portfolio category (`/portfolio/<cat>/…` → `<cat>`) or `null` outside the portfolio. */
export function portfolioCategory(url: string): string | null {
  const [root, category] = pathSegments(url);
  return root === PORTFOLIO_ROOT && category ? category : null;
}

/** Last path segment (`''` for `/`). */
export function lastSegment(url: string): string {
  const segments = pathSegments(url);
  return segments[segments.length - 1] ?? "";
}

/** Shower configuration page of the inex.su catalogue: `/produkciya/dushevye/<config>`. */
export function isShowerConfigUrl(url: string): boolean {
  const segments = pathSegments(url);
  return segments.length === 3 && segments[0] === "produkciya" && segments[1] === "dushevye";
}

/** The shower catalogue listing `/produkciya/dushevye` (its order defines the card order). */
export function isShowerListingUrl(url: string): boolean {
  return url.replace(/\/$/, "") === SHOWERS_CATALOG_PREFIX;
}

/**
 * Structural class of a CSV row by its old URL. Independent of `action`: a `stay` row under the
 * portfolio is still classified by its path (R0 decides what happens to it).
 */
export function classify(row: Pick<Row, "old_url">): UrlClass {
  const segments = pathSegments(row.old_url);
  const [root, category] = segments;
  if (root === "produkciya" || row.old_url === "/materialy/steklo") return "produkciya";
  if (root !== PORTFOLIO_ROOT || !category) return "other";
  if (category === STAIRS_CATEGORY) return "stairs";
  if (category === INTERIOR_CATEGORY) return "interior";
  const last = segments[segments.length - 1] ?? "";
  if (segments.length === 2) return "category";
  if (segments.length === 3 && PORTFOLIO_SUBCATEGORIES.has(last)) return "category";
  if (/^\d+$/.test(last)) return "pagination";
  return "object";
}

/**
 * Cyrillic letters that look exactly like Latin ones. inex.su has `kolоnna-08` with a Cyrillic
 * «о»: a homoglyph inside an otherwise Latin word must become the Latin letter it imitates, not
 * its transliteration (`с` → `c`, not `s`).
 */
const HOMOGLYPHS: Readonly<Record<string, string>> = {
  а: "a",
  е: "e",
  о: "o",
  р: "p",
  с: "c",
  у: "y",
  х: "x",
  к: "k",
  м: "m",
  т: "t",
  в: "b",
  н: "h",
};

const CYRILLIC = /[Ѐ-ӿ]/;
const LATIN = /[a-z]/i;

/**
 * Lower-case kebab-case Latin slug: homoglyphs inside Latin words → Latin, other Cyrillic →
 * transliteration (GOST 7.79 B simplified, same table as the CMS slug field), every other
 * character → `-`, hyphens collapsed and trimmed.
 *
 * `Steklyannyy-kozyrek` → `steklyannyy-kozyrek`; `kolоnna-08` (Cyrillic «о») → `kolonna-08`;
 * `Ресторан Стар` → `restoran-star`.
 */
export function toLatinSlug(input: string): string {
  const words = input.toLowerCase().split(/([^\p{L}\p{N}]+)/u);
  const latinized = words.map((word) => {
    // A word mixing Latin and Cyrillic letters is Latin with homoglyphs.
    if (CYRILLIC.test(word) && LATIN.test(word)) {
      return Array.from(word, (char) => HOMOGLYPHS[char] ?? char).join("");
    }
    return word;
  });
  return transliterate(latinized.join(""));
}

/** `true` when the old URL contains non-ASCII characters (needs a percent-encoded variant). */
export function hasNonAscii(url: string): boolean {
  return /[^\x00-\x7F]/.test(url);
}

/** `true` when the old URL contains upper-case letters. */
export function hasUpperCase(url: string): boolean {
  return /[A-Z]/.test(url);
}

/** Valid target of the new site: `/…/`, lower-case Latin, digits, hyphens, no `//`. */
export const NEW_URL_PATTERN = /^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*\/)*$/;

export function isValidNewUrl(url: string): boolean {
  return NEW_URL_PATTERN.test(url);
}

export function objectUrl(slug: string): string {
  return `${OBJECTS_LISTING}${slug}/`;
}

/** `/obekty/<slug>/` → `<slug>`; `null` for the listing or other sections. */
export function objectSlugFromUrl(url: string): string | null {
  const match = /^\/obekty\/([a-z0-9-]+)\/$/.exec(url);
  return match?.[1] ?? null;
}

/* ------------------------------------------------------------------------------------------ */
/* Fixing rows                                                                                */
/* ------------------------------------------------------------------------------------------ */

/** Outcome of the inex.su page import for an object URL (from the crawl/parse cache). */
export type ImportStatus = "imported" | "failed" | "unknown";

export interface FixContext {
  /**
   * Same object on two old URLs (R5 collision): same name, case-insensitive, and ≥ 50 % of the
   * photo file names in common. Without it collisions are always suffixed.
   */
  sameObject?: (oldUrlA: string, oldUrlB: string) => boolean;
  /** Parse status of an object page; `failed` triggers R7. Defaults to `unknown` (keep R5). */
  importStatus?: (oldUrl: string) => ImportStatus;
  /**
   * Slug actually written to Payload by `import.ts` (`scripts/.import-tmp/slugs.json`). Wins over
   * the computed one so the CSV and the CMS always agree.
   */
  importedSlug?: (oldUrl: string) => string | undefined;
}

const joinNote = (...parts: ReadonlyArray<string | undefined>): string =>
  parts.filter((part): part is string => !!part && part.trim() !== "").join("; ");

/** Percent-encoded spelling of an old URL with non-ASCII characters (for the inex.su admin). */
function encodedVariantNote(oldUrl: string): string | undefined {
  return hasNonAscii(oldUrl) ? `percent-encoded: ${encodeURI(oldUrl)}` : undefined;
}

/**
 * Rules R0–R4 and R6, which depend on the row alone. Returns `null` for portfolio objects —
 * their slug depends on the other rows (collisions), see `fixRows`.
 */
export function fixRow(row: Row): FixedRow | null {
  const kind = classify(row);
  if (row.action === "stay") return { ...row, rule: "R0", disputed: false };

  if (kind === "stairs") {
    return { ...row, new_url: "", action: "stay", note: NOTES.stairs, rule: "R1", disputed: false };
  }
  if (kind === "interior") {
    const leaf = pathSegments(row.old_url).length === 3 && !/^\d+$/.test(lastSegment(row.old_url));
    return {
      ...row,
      new_url: "",
      action: "stay",
      note: NOTES.interior,
      rule: "R2",
      disputed: leaf,
    };
  }
  if (kind === "category") {
    return {
      ...row,
      new_url: OBJECTS_LISTING,
      note: joinNote(row.note, NOTES.category),
      rule: "R3",
      disputed: false,
    };
  }
  if (kind === "pagination") {
    return {
      ...row,
      new_url: OBJECTS_LISTING,
      note: joinNote(row.note, NOTES.pagination),
      rule: "R4",
      disputed: false,
    };
  }
  if (kind === "object") return null;
  return { ...row, rule: "R6", disputed: false };
}

/** Base slug of a portfolio object URL (before collision handling). */
export function baseObjectSlug(oldUrl: string): string {
  return toLatinSlug(lastSegment(oldUrl));
}

/**
 * Applies R0–R7 to the whole CSV in source order. Collisions of object slugs (R5): the first row
 * keeps the slug; a later row is merged into it when `ctx.sameObject` says so, otherwise it gets
 * the suffix `-<portfolio category>` (and a numeric one if that is taken too).
 */
export function fixRows(rows: readonly Row[], ctx: FixContext = {}): FixedRow[] {
  /** slug → first old URL that claimed it. */
  const owners = new Map<string, string>();
  /**
   * Base slug → first old URL with it. Detects collisions the import already resolved: with
   * `importedSlug` the second row arrives with a suffixed slug and never hits `owners`.
   */
  const baseOwners = new Map<string, string>();

  return rows.map((row) => {
    const fixed = fixRow(row);
    if (fixed) return fixed;

    const status = ctx.importStatus?.(row.old_url) ?? "unknown";
    if (status === "failed") {
      return {
        ...row,
        new_url: OBJECTS_LISTING,
        note: joinNote(row.note, NOTES.notImported, encodedVariantNote(row.old_url)),
        rule: "R7",
        disputed: true,
      };
    }

    const baseSlug = baseObjectSlug(row.old_url);
    const isDoor = DOOR_OBJECT_SLUGS.has(baseSlug);
    const notes: Array<string | undefined> = [row.note];
    let slug = ctx.importedSlug?.(row.old_url) ?? baseSlug;
    const owner = owners.get(slug);
    const baseOwner = baseOwners.get(baseSlug);
    if (baseOwner === undefined) baseOwners.set(baseSlug, row.old_url);
    if (owner === undefined && baseOwner !== undefined && baseOwner !== row.old_url) {
      // The import already split the collision (its slug differs from the base one): still a
      // collision for the report, the suffixed slug comes from `slugs.json`.
      notes.push(`${NOTES.suffixed} (пара: ${baseOwner})`);
    } else if (owner !== undefined && owner !== row.old_url) {
      if (ctx.sameObject?.(owner, row.old_url)) {
        notes.push(`${NOTES.merged} ${owner}`);
      } else {
        const category = toLatinSlug(portfolioCategory(row.old_url) ?? "obekt");
        let candidate = `${slug}-${category}`;
        for (let n = 2; owners.has(candidate); n += 1) candidate = `${slug}-${category}-${n}`;
        slug = candidate;
        notes.push(`${NOTES.suffixed} (пара: ${owner})`);
      }
    }
    if (!owners.has(slug)) owners.set(slug, row.old_url);
    if (isDoor) notes.push(NOTES.doors);
    notes.push(encodedVariantNote(row.old_url));

    return {
      ...row,
      new_url: objectUrl(slug),
      note: joinNote(...notes),
      rule: "R5",
      disputed: isDoor,
    };
  });
}

/* ------------------------------------------------------------------------------------------ */
/* Summary and validation                                                                     */
/* ------------------------------------------------------------------------------------------ */

export interface FixSummary {
  total: number;
  redirect: number;
  stay: number;
  byRule: Record<RuleId, number>;
  /** Rows changed relative to the source, by rule. */
  changedByRule: Record<RuleId, number>;
  disputed: number;
  /** Object rows (R5) and their distinct targets. */
  objectRows: number;
  objectTargets: number;
}

const emptyRuleCounter = (): Record<RuleId, number> => ({
  R0: 0,
  R1: 0,
  R2: 0,
  R3: 0,
  R4: 0,
  R5: 0,
  R6: 0,
  R7: 0,
});

export function summarize(source: readonly Row[], fixed: readonly FixedRow[]): FixSummary {
  const byRule = emptyRuleCounter();
  const changedByRule = emptyRuleCounter();
  const targets = new Set<string>();
  fixed.forEach((row, index) => {
    byRule[row.rule] += 1;
    const original = source[index];
    if (original && (original.new_url !== row.new_url || original.action !== row.action)) {
      changedByRule[row.rule] += 1;
    }
    if (row.rule === "R5") targets.add(row.new_url);
  });
  return {
    total: fixed.length,
    redirect: fixed.filter((row) => row.action === "301").length,
    stay: fixed.filter((row) => row.action === "stay").length,
    byRule,
    changedByRule,
    disputed: fixed.filter((row) => row.disputed).length,
    objectRows: byRule.R5,
    objectTargets: targets.size,
  };
}

/**
 * Structural checks 1 and 4 of `fix-csv.ts --check` (the registry and DB checks need I/O and
 * live in the script). Returns human-readable problems; empty = valid.
 */
export function validateRows(rows: readonly FixedRow[]): string[] {
  const problems: string[] = [];
  const redirectedOld = new Set(
    rows.filter((row) => row.action === "301").map((row) => row.old_url.replace(/\/$/, ""))
  );
  for (const row of rows) {
    if (row.action === "301") {
      if (row.new_url === "") problems.push(`${row.old_url}: 301 без new_url`);
      else if (!isValidNewUrl(row.new_url)) {
        problems.push(`${row.old_url}: некорректный new_url «${row.new_url}»`);
      } else if (redirectedOld.has(row.new_url.replace(/\/$/, ""))) {
        // Same path redirected again on the old domain would make a chain.
        problems.push(`${row.old_url}: цепочка редиректов через ${row.new_url}`);
      }
    } else if (row.new_url !== "") {
      problems.push(`${row.old_url}: stay с непустым new_url «${row.new_url}»`);
    }
  }
  return problems;
}

/**
 * Registry of the new site's URLs from `docs/inex/17-meta.md`: first cells of the Markdown
 * tables, `{N}-mm` expanded to the thickness list, `/obekty/{slug}/` templates dropped.
 */
export const REGISTRY_THICKNESSES = [4, 5, 6, 8, 10, 12, 15, 19] as const;

export function parseUrlRegistry(markdown: string): Set<string> {
  const urls = new Set<string>();
  for (const line of markdown.split(/\r?\n/)) {
    const match = /^\|\s*(\/[^|\s]*)/.exec(line);
    const url = match?.[1];
    if (!url) continue;
    if (url.includes("{N}")) {
      for (const n of REGISTRY_THICKNESSES) urls.add(url.replace("{N}", String(n)));
    } else if (!url.includes("{")) {
      urls.add(url);
    }
  }
  return urls;
}
