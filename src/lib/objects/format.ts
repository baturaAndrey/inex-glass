/**
 * Display helpers of portfolio objects (pure): spec values, card chips, meta lines.
 * Shared by the card mapping (`@/lib/cms/objects`), the object page and the SEO fallbacks.
 */

/** Spec row as stored (`objects.spec[]`). */
export interface SpecRow {
  product?: string | null | undefined;
  thickness?: string | null | undefined;
  kind?: string | null | undefined;
  triplexFormula?: string | null | undefined;
  processing?: string | null | undefined;
}

/** Card chips: at most three (the schema limit of `chips[]`). */
export const MAX_CARD_CHIPS = 3;
/** Spec rows used for generated chips. */
const AUTO_CHIP_ROWS = 2;

const clean = (value: string | null | undefined): string =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";

/** «10» → «10 мм», «8+8» → «8+8 мм»; a value that already names the unit is kept. */
export function formatThickness(value: string | null | undefined): string {
  const text = clean(value);
  if (!text) return "";
  return /мм\.?$/i.test(text) ? text : `${text} мм`;
}

/**
 * Chips of a card: the editor's `chips[]`; when empty — generated from the first two spec rows:
 * «<вид> <толщина> мм» and «триплекс <формула>». Duplicates and empty values are dropped.
 */
export function cardChips(
  chips: ReadonlyArray<{ text?: string | null }> | null | undefined,
  spec: readonly SpecRow[] | null | undefined
): string[] {
  const manual = (chips ?? []).map((chip) => clean(chip.text)).filter(Boolean);
  const source =
    manual.length > 0
      ? manual
      : (spec ?? []).slice(0, AUTO_CHIP_ROWS).flatMap((row) => {
          const kindThickness = [clean(row.kind), formatThickness(row.thickness)]
            .filter(Boolean)
            .join(" ");
          const formula = clean(row.triplexFormula);
          return [kindThickness, formula ? `триплекс ${formula}` : ""].filter(Boolean);
        });
  return [...new Set(source)].slice(0, MAX_CARD_CHIPS);
}

/** «Город · Тип» / «Город · Тип · Год» — empty parts skipped. */
export function joinMeta(parts: ReadonlyArray<string | number | null | undefined>): string {
  return parts
    .map((part) => (typeof part === "number" ? String(part) : clean(part)))
    .filter(Boolean)
    .join(" · ");
}

/**
 * Site-relative URL of a Payload upload (Payload may return absolute URLs with `serverURL`).
 * File URLs already come without a trailing slash (media `afterRead` hook,
 * `src/payload/hooks/media-urls.ts`).
 */
export function mediaPath(url: string | null | undefined): string | null {
  if (typeof url !== "string" || url.trim() === "") return null;
  try {
    const parsed = new URL(url, "http://local");
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return null;
  }
}

/** Spec rows with at least one filled cell, values trimmed. */
export function specRows(spec: readonly SpecRow[] | null | undefined): Required<{
  [K in keyof SpecRow]: string;
}>[] {
  return (spec ?? [])
    .map((row) => ({
      product: clean(row.product),
      thickness: clean(row.thickness),
      kind: clean(row.kind),
      triplexFormula: clean(row.triplexFormula),
      processing: clean(row.processing),
    }))
    .filter((row) => Object.values(row).some(Boolean));
}
