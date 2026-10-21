import {
  DEFAULT_TECH_LIMITS,
  formatDateRu,
  formatNumber,
  formatPrice,
  holeRules,
  PRICE_BY_CALC_LABEL,
  priceCaption,
  priceState,
  promoActive,
  replacePlaceholders,
  resolvePrice,
  THICKNESSES,
  tryDateKey,
  weightPerM2Single,
} from "@/lib/domain";
import type {
  PlaceholderContext,
  PricesInput,
  PriceState,
  PromoInput,
  TechLimits,
} from "@/lib/domain";

/**
 * Page model of a thickness card (`/zakalennoe-steklo/{N}-mm/`) and the price presentation
 * helpers shared with the hub price table. Pure: no Payload / React / Next — the template
 * loads the documents and globals and passes them in, together with `now` (the 45-day rule).
 *
 * Every number comes from the domain library (`resolvePrice`, `holeRules`, `weightPerM2Single`),
 * never from constants in components.
 */

/** Template copy of teksty/03 (not CMS fields: the thickness template owns these sentences). */
const PRICE_NOTE_CALC = "пришлите чертёж — назовём цену в КП";
const PRICE_NOTE_PREFIX = "ориентир на";
const LEAD_TIME_SUFFIX = "рабочих дней с даты договора";

/** URL of a thickness card. Mirrors `thicknessPath` of the collection (kept pure here). */
export const thicknessHref = (n: number) => `/zakalennoe-steklo/${n}-mm/`;

/** «10 мм». */
export const thicknessLabel = (n: number) => `${n} мм`;

/** Weight of 1 m² as shown on the site: «12,5». */
export const weightValue = (n: number) => formatNumber(weightPerM2Single(n));

/**
 * Price cell of a table whose header already says «₽/м²»: «от 1 400» (NBSP), «по запросу»
 * (15, 19 mm) or «Цена по расчёту» (stale price list).
 */
export function tablePriceLabel(
  n: number,
  prices: PricesInput,
  now: Date
): { state: PriceState; label: string } {
  const resolved = resolvePrice(n, prices, now);
  if (resolved.state === "price" && resolved.price !== null) {
    return { state: "price", label: `от ${formatPrice(resolved.price)}` };
  }
  return { state: "calc", label: resolved.label };
}

/**
 * Whether the price list itself is fresh: at least one thickness shows its price. `false` when
 * the price date is older than `staleAfterDays`, missing, or no thickness has a price.
 */
export function isPriceListFresh(prices: PricesInput, now: Date): boolean {
  return THICKNESSES.some((n) => priceState(n, prices, now) === "price");
}

/** Placeholder context for price captions (only prices / promo / thickness are needed). */
function priceContext(
  prices: PricesInput,
  promo: PromoInput | null,
  now: Date,
  thickness?: number
): PlaceholderContext {
  return {
    prices,
    promo,
    now,
    conditions: "",
    contacts: "",
    requisites: "",
    phone: "",
    ...(thickness !== undefined ? { thickness } : {}),
  };
}

const PROMO_PLACEHOLDER = /\{\s*акция_текст\s*\}/gu;

/** Ends a sentence with a period unless it already ends with terminal punctuation. */
function withPeriod(text: string): string {
  const trimmed = text.trim();
  return trimmed === "" || /[.!?…]$/u.test(trimmed) ? trimmed : `${trimmed}.`;
}

/**
 * Drops the first sentence of a caption («Ориентировочные цены на {дата_цен}.») and puts the
 * stale label in its place: «Цена по расчёту. Точная стоимость — в КП …». A caption of one
 * sentence becomes just the label.
 */
function staleCaption(template: string, staleLabel: string): string {
  const match = /^[^.]*\.\s+/u.exec(template.trim());
  const rest = match ? template.trim().slice(match[0].length) : "";
  return rest ? `${withPeriod(staleLabel)} ${rest}` : withPeriod(staleLabel);
}

export interface PricesCaptionInput {
  /**
   * Caption with placeholders: the block's own text (hub: «Ориентировочные цены на {дата_цен}.
   * Точная стоимость — в КП после расчёта; цена в договоре фиксируется. {акция_текст}») or the
   * `prices.caption` global. Empty → `priceCaption()` of the domain library.
   */
  template?: string | null | undefined;
  prices: PricesInput;
  promo: PromoInput | null;
  now: Date;
  /** Append / substitute the promo text while the promo is active. */
  showPromo: boolean;
  /** `prices.staleLabel` («Цена по расчёту»). */
  staleLabel?: string | null | undefined;
}

/**
 * Caption above a price table. Fresh list: the template with the price date; stale list: the
 * date sentence is replaced by «Цена по расчёту.» — an outdated date is never shown. The promo
 * text (`{акция_текст}` or appended after the caption) appears only while the promo is active.
 */
export function buildPricesCaption(input: PricesCaptionInput): string {
  const { prices, promo, now, showPromo } = input;
  const staleLabel = input.staleLabel?.trim() || PRICE_BY_CALC_LABEL;
  const raw = input.template?.trim() || priceCaption(prices);
  const hasPromoPlaceholder = raw.search(PROMO_PLACEHOLDER) !== -1;

  let template = isPriceListFresh(prices, now) ? raw : staleCaption(raw, staleLabel);
  if (!showPromo) template = template.replace(PROMO_PLACEHOLDER, "");

  const ctx = priceContext(prices, showPromo ? promo : null, now);
  let caption = replacePlaceholders(template, ctx).trim();
  if (showPromo && !hasPromoPlaceholder && promo && promoActive(promo, now) && promo.text.trim()) {
    caption = `${withPeriod(caption)} ${promo.text.trim()}`;
  }
  return caption.replace(/\s{2,}/g, " ").trim();
}

// ---------------------------------------------------------------------------------------------
// Thickness card
// ---------------------------------------------------------------------------------------------

export interface ThicknessDocInput {
  kindsText?: string | null | undefined;
  sizeText?: string | null | undefined;
  leadTimeText?: string | null | undefined;
}

export interface ThicknessViewInput {
  n: number;
  doc: ThicknessDocInput;
  prices: PricesInput;
  promo: PromoInput | null;
  /** `conditions` global (only `leadTimeDays` is read). */
  conditions: { leadTimeDays?: number | null | undefined } | null;
  now: Date;
  /** `prices.caption` with `{дата_цен}`; empty → `priceCaption()`. */
  captionTemplate?: string | null | undefined;
  /** Size limits from `tech-params` (`getTechLimits()`); defaults to `DEFAULT_TECH_LIMITS`. */
  limits?: TechLimits | undefined;
}

export interface NeighborLink {
  n: number;
  href: string;
  label: string;
}

export interface NeighborColumn extends NeighborLink {
  current: boolean;
  priceState: PriceState;
  /** «от 1 300» / «по запросу» / «Цена по расчёту». */
  priceLabel: string;
  /** «20». */
  weight: string;
}

export interface ThicknessView {
  n: number;
  priceState: PriceState;
  /** Passport price: «от 1 400 ₽/м²» or «Цена по расчёту» (also for 15 and 19 mm). */
  priceLabel: string;
  /** Price «from» in the `price` state (Product JSON-LD `lowPrice`), otherwise `null`. */
  price: number | null;
  /** «ориентир на 15.10.2026» / «пришлите чертёж — назовём цену в КП». */
  priceNote: string;
  /** Full caption under the passport button — only while a price is shown. */
  caption: string | null;
  /** Promo text while the promo is active. */
  promoText: string | null;
  weight: { value: string; label: string };
  sizeText: string;
  kindsText: string;
  leadTimeText: string;
  holeRules: ReturnType<typeof holeRules>;
  neighbors: { prev: NeighborLink | null; next: NeighborLink | null };
  /** Previous, current and next thickness (2 columns for 4 and 19 mm). */
  neighborsTable: NeighborColumn[];
  /** Which SEO field holds the title: `seo.title` (with price) or `seo.titleNoPrice`. */
  metaTitleKey: "title" | "titleNoPrice";
  showProductJsonLd: boolean;
}

/** «от 150 × 300 до 3000 × 2000 мм» from the flat-glass limits. */
export function defaultSizeText(limits: TechLimits = DEFAULT_TECH_LIMITS): string {
  const { shortMin, longMin, longMax, shortMax } = limits.flat;
  return `от ${shortMin} × ${longMin} до ${longMax} × ${shortMax} мм`;
}

/** «от 10 рабочих дней с даты договора». */
export function defaultLeadTimeText(days: number | null | undefined): string {
  return Number.isFinite(days) && (days as number) > 0
    ? `от ${days as number} ${LEAD_TIME_SUFFIX}`
    : "";
}

function neighborOf(n: number, offset: -1 | 1): NeighborLink | null {
  const list: readonly number[] = THICKNESSES;
  const index = list.indexOf(n);
  if (index === -1) return null;
  const other = list[index + offset];
  return other === undefined
    ? null
    : { n: other, href: thicknessHref(other), label: thicknessLabel(other) };
}

function column(n: number, current: boolean, prices: PricesInput, now: Date): NeighborColumn {
  const price = tablePriceLabel(n, prices, now);
  return {
    n,
    href: thicknessHref(n),
    label: thicknessLabel(n),
    current,
    priceState: price.state,
    priceLabel: price.label,
    weight: weightValue(n),
  };
}

const text = (value: string | null | undefined) => value?.trim() ?? "";

export function buildThicknessView(input: ThicknessViewInput): ThicknessView {
  const { n, doc, prices, promo, conditions, now } = input;
  const resolved = resolvePrice(n, prices, now);
  const isPrice = resolved.state === "price" && resolved.price !== null;
  const priceKey = tryDateKey(prices.priceDate);

  const prev = neighborOf(n, -1);
  const next = neighborOf(n, 1);
  const neighborsTable = [
    ...(prev ? [column(prev.n, false, prices, now)] : []),
    column(n, true, prices, now),
    ...(next ? [column(next.n, false, prices, now)] : []),
  ];

  const ctx = priceContext(prices, promo, now, n);
  const captionTemplate = text(input.captionTemplate) || priceCaption(prices);
  const weight = weightValue(n);

  return {
    n,
    priceState: isPrice ? "price" : "calc",
    priceLabel: isPrice ? resolved.label : PRICE_BY_CALC_LABEL,
    price: isPrice ? resolved.price : null,
    priceNote:
      isPrice && priceKey !== null
        ? `${PRICE_NOTE_PREFIX} ${formatDateRu(priceKey)}`
        : PRICE_NOTE_CALC,
    caption: isPrice ? replacePlaceholders(captionTemplate, ctx).trim() : null,
    promoText: promo && promoActive(promo, now) && promo.text.trim() ? promo.text.trim() : null,
    weight: { value: weight, label: `${weight} кг/м²` },
    sizeText: text(doc.sizeText) || defaultSizeText(input.limits),
    kindsText: text(doc.kindsText),
    leadTimeText: text(doc.leadTimeText) || defaultLeadTimeText(conditions?.leadTimeDays),
    holeRules: holeRules(n),
    neighbors: { prev, next },
    neighborsTable,
    metaTitleKey: isPrice ? "title" : "titleNoPrice",
    showProductJsonLd: isPrice,
  };
}
