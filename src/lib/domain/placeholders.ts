import { tryDateKey } from "./dates";
import { formatDateRu, formatNumber, formatPrice } from "./format";
import { getPrice, priceState } from "./prices";
import { promoActive } from "./promo";
import { REQUEST_ONLY_THICKNESSES, THICKNESSES } from "./types";
import { GLASS_KG_PER_M2_PER_MM } from "./weight";
import type { PricesInput } from "./prices";
import type { PromoInput } from "./promo";

/**
 * Placeholder engine for CMS texts: `{цена_10мм}`, `{N}`, `{акция_текст}`, … Works on a plain
 * string; the Lexical and meta wrappers live in tasks 15/16. Unknown placeholders (`{виды}`,
 * `{faq}`, `{блок «…»}`, `{площадь × цена}`, …) are left untouched for other renderers.
 */

export interface PlaceholderContext {
  prices: PricesInput;
  promo: PromoInput | null;
  now: Date;
  /** «Заказы от 50 м² · срок от 10 рабочих дней с даты договора · КП в среднем за 2–3 рабочих дня» */
  conditions: string;
  contacts: string;
  requisites: string;
  /** «+7 (351) 247-05-57» */
  phone: string;
  /** Thickness of the current page (for `{N}`, `{цена}`, `{вес}`, …). */
  thickness?: number;
}

const PLACEHOLDER = /\{([^{}]+)\}/g;
const PRICE_BY_THICKNESS = /^цена_(\d+)мм$/u;
/** `{N-}` / `{цена+}` / `{вес−}` (ASCII hyphen or U+2212 minus). */
const NEIGHBOUR = /^(N|цена|вес)([-−+])$/u;
const WEIGHT_X2 = /^вес\s*[×xх]\s*2$/u;

const NO_VALUE = "—";
const PRICE_BY_CALC = "по расчёту";
const PRICE_ON_REQUEST = "по запросу";
/** Weight of the reference glass 1000 × 2000 mm is 2 m². */
const REFERENCE_GLASS_AREA_M2 = 2;

/**
 * Marks the place of an empty substitution so the cleanup below touches only separators left
 * hanging by it, never the author's own punctuation. U+E000 is a private-use code point.
 */
const EMPTY = "";

function priceText(thickness: number, ctx: PlaceholderContext): string {
  if (priceState(thickness, ctx.prices, ctx.now) === "price") {
    const price = getPrice(thickness, ctx.prices);
    if (price !== null) return formatPrice(price);
  }
  return REQUEST_ONLY_THICKNESSES.includes(thickness) ? PRICE_ON_REQUEST : PRICE_BY_CALC;
}

const weightText = (thickness: number) => formatNumber(GLASS_KG_PER_M2_PER_MM * thickness);

function neighbourThickness(thickness: number, direction: "-" | "+"): number | null {
  const list: readonly number[] = THICKNESSES;
  const index = list.indexOf(thickness);
  if (index === -1) return null;
  return list[direction === "-" ? index - 1 : index + 1] ?? null;
}

/** Value of one placeholder name, or `undefined` to leave the placeholder as is. */
function resolve(name: string, ctx: PlaceholderContext): string | undefined {
  const byThickness = PRICE_BY_THICKNESS.exec(name);
  if (byThickness) return priceText(Number(byThickness[1]), ctx);

  switch (name) {
    case "дата_цен": {
      const key = tryDateKey(ctx.prices.priceDate);
      return key === null ? NO_VALUE : formatDateRu(key);
    }
    case "акция_текст":
      return promoActive(ctx.promo, ctx.now) && ctx.promo ? ctx.promo.text : "";
    case "условия":
      return ctx.conditions;
    case "контакты":
      return ctx.contacts;
    case "реквизиты":
      return ctx.requisites;
    case "телефон":
      return ctx.phone;
  }

  // Everything below depends on the page thickness.
  const t = ctx.thickness;
  if (t === undefined || !Number.isFinite(t)) return undefined;

  switch (name) {
    case "N":
      return String(t);
    case "2N":
      return String(2 * t);
    case "6N":
      return String(6 * t);
    case "цена":
      return priceText(t, ctx);
    case "вес":
      return weightText(t);
  }
  if (WEIGHT_X2.test(name)) {
    return formatNumber(GLASS_KG_PER_M2_PER_MM * t * REFERENCE_GLASS_AREA_M2);
  }

  const neighbour = NEIGHBOUR.exec(name);
  if (neighbour) {
    const [, kind, sign] = neighbour;
    const other = neighbourThickness(t, sign === "+" ? "+" : "-");
    if (other === null) return NO_VALUE;
    if (kind === "N") return String(other);
    if (kind === "цена") return priceText(other, ctx);
    return weightText(other);
  }
  return undefined;
}

/**
 * Removes the markers of empty substitutions together with the separator they leave hanging:
 * «{условия} · {акция_текст}» → «условия»; «Текст {акция_текст}.» → «Текст.».
 */
function cleanupEmpty(text: string): string {
  return text
    .replace(new RegExp(`[ \\t\\u00A0]*[·,;|][ \\t\\u00A0]*${EMPTY}`, "g"), EMPTY)
    .replace(new RegExp(`${EMPTY}[ \\t\\u00A0]*[·,;|][ \\t\\u00A0]*`, "g"), EMPTY)
    .replace(
      new RegExp(`([ \\t\\u00A0]*)${EMPTY}+([ \\t\\u00A0]*)`, "g"),
      (_, before: string, after: string) => (before && after ? " " : "")
    );
}

export function replacePlaceholders(input: string, ctx: PlaceholderContext): string {
  let hasEmpty = false;
  const replaced = input.replace(PLACEHOLDER, (match: string, name: string) => {
    const value = resolve(name.trim(), ctx);
    if (value === undefined) return match;
    if (value === "") {
      hasEmpty = true;
      return EMPTY;
    }
    return value;
  });
  return hasEmpty ? cleanupEmpty(replaced) : replaced;
}

/** Distinct placeholders of a text in order of appearance, with braces: `['{N}', '{виды}']`. */
export function listPlaceholders(input: string): string[] {
  return [...new Set(Array.from(input.matchAll(PLACEHOLDER), (m) => m[0]))];
}
