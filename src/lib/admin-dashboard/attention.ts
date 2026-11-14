import { daysBetween, todayKey, tryDateKey } from "@/lib/domain/dates";
import { formatAge } from "./format";

/**
 * «Требует внимания»: five cards of things waiting for action right now. The loader passes raw
 * counts and lists; this module decides the tone, the caption and the filtered admin link of
 * every card. Thresholds come from `attentionThresholds(now)`, so the counts and the links of
 * one render use the same instants.
 */

export type AttentionTone = "danger" | "warning" | "info" | "neutral";

export type AttentionKey = "unassigned" | "stale-new" | "no-photos" | "expiring-links" | "prices";

export interface AttentionCard {
  key: AttentionKey;
  label: string;
  /** `null`: no data (shown as «—»). */
  value: number | null;
  tone: AttentionTone;
  sub: string;
  href: string;
}

/** A new lead waiting longer than this needs an answer. */
export const STALE_NEW_LEAD_MS = 2 * 3_600_000;
/** Client links expiring within this many days are announced. */
export const EXPIRING_LINK_DAYS = 3;
/** Prices that turn stale within this many days are a warning. */
export const PRICE_WARNING_DAYS = 7;
/** `prices.staleAfterDays` / `staleLabel` defaults (global `prices`). */
export const DEFAULT_STALE_AFTER_DAYS = 45;
export const DEFAULT_STALE_LABEL = "Цена по расчёту";
/** Orders numbers named in the «Упаковано, нет фото» caption. */
const NAMED_ORDERS = 2;

const MS_PER_DAY = 86_400_000;

const LEADS_LIST = "/admin/collections/leads/";
const ORDERS_LIST = "/admin/collections/orders/";
const PRICES_GLOBAL = "/admin/globals/prices/";

export interface AttentionThresholds {
  /** Leads created before this instant are «дольше 2 часов». */
  staleNewBefore: string;
  /** Client links expiring in `(expiringFrom, expiringTo]` are announced. */
  expiringFrom: string;
  expiringTo: string;
}

export function attentionThresholds(now: Date): AttentionThresholds {
  return {
    staleNewBefore: new Date(now.getTime() - STALE_NEW_LEAD_MS).toISOString(),
    expiringFrom: now.toISOString(),
    expiringTo: new Date(now.getTime() + EXPIRING_LINK_DAYS * MS_PER_DAY).toISOString(),
  };
}

export interface AttentionLeadsInput {
  /** Id of the default lead status; `null` when no statuses are configured. */
  defaultStatusId: string | null;
  unassignedCount: number;
  /** `createdAt` of the oldest new lead without an assignee. */
  oldestUnassignedAt: string | null;
  staleNewCount: number;
}

export interface AttentionOrdersInput {
  /** Packed / shipped orders without pack photos. */
  noPhotos: readonly { id: string; number: string | null }[];
  expiringCount: number;
}

export interface AttentionPricesInput {
  priceDate: string | null | undefined;
  staleAfterDays: number | null | undefined;
  staleLabel: string | null | undefined;
}

export interface AttentionInput {
  leads: AttentionLeadsInput;
  /** `null`: the user cannot read orders — cards 3 and 4 are not rendered. */
  orders: AttentionOrdersInput | null;
  /** `null`: the user cannot read the prices global — card 5 is not rendered. */
  prices: AttentionPricesInput | null;
}

const q = (value: string) => encodeURIComponent(value);

/** Tone of a card with a count: its own tone, or neutral with «всё в порядке» at zero. */
function counted(
  card: Omit<AttentionCard, "tone" | "sub">,
  tone: AttentionTone,
  sub: string
): AttentionCard {
  return card.value === 0
    ? { ...card, tone: "neutral", sub: "всё в порядке" }
    : { ...card, tone, sub };
}

function leadCards(input: AttentionLeadsInput, now: Date): AttentionCard[] {
  const { staleNewBefore } = attentionThresholds(now);
  const statusId = input.defaultStatusId;
  if (statusId === null) {
    const sub = "статусы не настроены";
    return [
      {
        key: "unassigned",
        label: "Новые без ответственного",
        value: null,
        tone: "neutral",
        sub,
        href: LEADS_LIST,
      },
      {
        key: "stale-new",
        label: "Новые дольше 2 часов",
        value: null,
        tone: "neutral",
        sub,
        href: LEADS_LIST,
      },
    ];
  }
  const byStatus = `where[and][0][status][equals]=${q(statusId)}`;
  const oldest = input.oldestUnassignedAt ? new Date(input.oldestUnassignedAt) : null;
  const age =
    oldest && !Number.isNaN(oldest.getTime())
      ? `самая давняя — ${formatAge(now.getTime() - oldest.getTime())}`
      : "ждут назначения";
  return [
    counted(
      {
        key: "unassigned",
        label: "Новые без ответственного",
        value: input.unassignedCount,
        href: `${LEADS_LIST}?${byStatus}&where[and][1][assignee][exists]=false`,
      },
      "danger",
      age
    ),
    counted(
      {
        key: "stale-new",
        label: "Новые дольше 2 часов",
        value: input.staleNewCount,
        href: `${LEADS_LIST}?${byStatus}&where[and][1][createdAt][less_than]=${q(staleNewBefore)}`,
      },
      "warning",
      "клиент ждёт ответа"
    ),
  ];
}

function orderCards(input: AttentionOrdersInput, now: Date): AttentionCard[] {
  const { expiringFrom, expiringTo } = attentionThresholds(now);
  const numbers = input.noPhotos.map((order) => order.number?.trim() || "без номера");
  const single = input.noPhotos.length === 1 ? input.noPhotos[0] : undefined;
  const photosSub = single
    ? `заказ ${numbers[0]}`
    : `заказы ${numbers.slice(0, NAMED_ORDERS).join(", ")}${numbers.length > NAMED_ORDERS ? "…" : ""}`;
  return [
    counted(
      {
        key: "no-photos",
        label: "Упаковано, нет фото",
        value: input.noPhotos.length,
        href: single
          ? `${ORDERS_LIST}${q(single.id)}/manage/`
          : `${ORDERS_LIST}?where[currentStatus][in]=packed,shipped`,
      },
      "warning",
      photosSub
    ),
    counted(
      {
        key: "expiring-links",
        label: "Ссылки клиентов истекают",
        value: input.expiringCount,
        href:
          `${ORDERS_LIST}?where[and][0][expiresAt][greater_than]=${q(expiringFrom)}` +
          `&where[and][1][expiresAt][less_than_equal]=${q(expiringTo)}`,
      },
      "info",
      `в ближайшие ${EXPIRING_LINK_DAYS} дня`
    ),
  ];
}

/** Card 5: age of the price list by the rule of `priceState()` (fresh while age ≤ threshold). */
export function priceCard(input: AttentionPricesInput, now: Date): AttentionCard {
  const base = { key: "prices", label: "Цены не обновлялись, дней", href: PRICES_GLOBAL } as const;
  const priceKey = tryDateKey(input.priceDate ?? null);
  if (priceKey === null) {
    return { ...base, value: null, tone: "danger", sub: "дата цен не задана" };
  }
  const threshold =
    typeof input.staleAfterDays === "number" && Number.isFinite(input.staleAfterDays)
      ? input.staleAfterDays
      : DEFAULT_STALE_AFTER_DAYS;
  const age = Math.max(0, daysBetween(priceKey, todayKey(now)));
  if (age > threshold) {
    const label = input.staleLabel?.trim() || DEFAULT_STALE_LABEL;
    return { ...base, value: age, tone: "danger", sub: `на сайте — «${label}»` };
  }
  const left = threshold - age;
  if (left <= PRICE_WARNING_DAYS) {
    return { ...base, value: age, tone: "warning", sub: `устареют через ${left} дн.` };
  }
  return { ...base, value: age, tone: "neutral", sub: `порог — ${threshold} дн.` };
}

export function buildAttention(input: AttentionInput, now: Date): AttentionCard[] {
  return [
    ...leadCards(input.leads, now),
    ...(input.orders ? orderCards(input.orders, now) : []),
    ...(input.prices ? [priceCard(input.prices, now)] : []),
  ];
}
