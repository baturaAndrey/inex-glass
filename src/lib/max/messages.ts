import { formatDateRu, formatNumber, formatRub } from "@/lib/domain/format";
import { NBSP } from "@/lib/domain/types";
import { formatDateTime } from "@/lib/leads-admin/export-rows";
import { formTypeLabel } from "@/payload/admin/leads/constants";
import { LEAD_FLAGS, LEAD_PRODUCT_TYPES } from "@/payload/collections/crm/constants";
import type { Lead, Order } from "@/payload-types";
import { escapeHtml, truncateMaxText } from "./html";
import type { MaxButton } from "./client";

/**
 * Texts of MAX notifications (task 10). Pure: no Payload, no env — the caller passes `siteUrl`.
 *
 * - HTML subset of MAX (`<b>`, `<a>`, …); EVERY interpolated value goes through `escapeHtml`,
 *   every result through `truncateMaxText` (≤ 4000).
 * - Lines are joined with `\n`; empty lines are dropped.
 * - The «open in admin» link is a button only for an `https://` site (MAX rejects other link
 *   buttons); otherwise it becomes the last line of the text.
 * - The source prefix («Inex Glass» / «[ТЕСТ] Inex Glass») is NOT added here: the sender adds it
 *   with `decorateMaxText` right before sending.
 * - Messages carry the client's phone (managers call from the messenger), so their ids are kept
 *   in `notification-log` and deleted on personal-data erasure.
 */

export type MaxMessage = { text: string; buttons?: MaxButton[][] };

export interface MessageContext {
  /** `SITE_URL` of the running site. */
  siteUrl: string;
}

/** Flat lead fields the templates need (built by `toLeadForMessage`). */
export interface LeadForMessage {
  id: string;
  formType: string | null;
  company: string | null;
  name: string | null;
  phone: string | null;
  city: string | null;
  productType: string | null;
  area: number | null;
  estimateFrom: number | null;
  estimatePriceDate: string | null;
  flags: readonly string[];
  isDuplicate: boolean;
  comment: string | null;
  kpAmount: number | null;
  createdAt: string | null;
}

export interface OrderForMessage {
  id: string;
  number: string | null;
  company: string | null;
  /** Company of the source lead: fallback when the order has none. */
  leadCompany: string | null;
}

/** Characters of the client's comment shown in the «new lead» message. */
export const COMMENT_PREVIEW_LENGTH = 300;

const SEPARATOR = " · ";
const ELLIPSIS = "…";

const PRODUCT_TYPE_LABELS: ReadonlyMap<string, string> = new Map(
  LEAD_PRODUCT_TYPES.map((option) => [option.value, option.label])
);
const FLAG_LABELS: ReadonlyMap<string, string> = new Map(
  LEAD_FLAGS.map((option) => [option.value, option.label])
);

// ---------------------------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------------------------

function origin(siteUrl: string): string {
  try {
    return new URL(siteUrl).origin;
  } catch {
    return siteUrl.replace(/\/+$/, "");
  }
}

/** Lead card («Сводка»), with the trailing slash (`trailingSlash: true`). */
export function leadAdminUrl(siteUrl: string, leadId: string): string {
  return `${origin(siteUrl)}/admin/collections/leads/${encodeURIComponent(leadId)}/summary/`;
}

/** Order edit view, with the trailing slash. */
export function orderAdminUrl(siteUrl: string, orderId: string): string {
  return `${origin(siteUrl)}/admin/collections/orders/${encodeURIComponent(orderId)}/`;
}

// ---------------------------------------------------------------------------------------------
// Value helpers
// ---------------------------------------------------------------------------------------------

const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() !== "" ? value.trim() : null;

const finiteNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

/** Escaped, or `null` for an empty value. */
const esc = (value: string | null): string | null => (value === null ? null : escapeHtml(value));

/** First `limit` code points (never half of a surrogate pair) with «…» when cut. */
function preview(value: string, limit: number): string {
  const chars = Array.from(value);
  return chars.length <= limit ? value : `${chars.slice(0, limit).join("")}${ELLIPSIS}`;
}

/** `formatDateRu`, or `null` for a missing or invalid date (stale data must not throw). */
function safeDateRu(value: string | null): string | null {
  if (!value) return null;
  try {
    return formatDateRu(value);
  } catch {
    return null;
  }
}

function joinNonEmpty(parts: readonly (string | null)[], separator: string): string | null {
  const present = parts.filter((part): part is string => part !== null && part !== "");
  return present.length > 0 ? present.join(separator) : null;
}

/** «ООО Ромашка · Иван» (escaped). */
function whoLine(lead: LeadForMessage): string | null {
  return joinNonEmpty([esc(lead.company), esc(lead.name)], SEPARATOR);
}

function phoneLine(lead: LeadForMessage): string | null {
  return lead.phone ? `Телефон: ${escapeHtml(lead.phone)}` : null;
}

/** «Изделие: Триплекс, 12,5 м²»; only the parts that are known. */
function productLine(lead: LeadForMessage): string | null {
  const product = lead.productType
    ? (PRODUCT_TYPE_LABELS.get(lead.productType) ?? lead.productType)
    : null;
  const area = lead.area !== null ? `${formatNumber(lead.area)}${NBSP}м²` : null;
  const value = joinNonEmpty([esc(product), area], ", ");
  return value ? `Изделие: ${value}` : null;
}

/** «Ориентир: от 168 000 ₽ на 15.10.2026». */
function estimateLine(lead: LeadForMessage): string | null {
  if (lead.estimateFrom === null) return null;
  const date = safeDateRu(lead.estimatePriceDate);
  return `Ориентир: от ${formatRub(lead.estimateFrom)}${date ? ` на ${date}` : ""}`;
}

function flagsLine(lead: LeadForMessage): string | null {
  const labels = lead.flags.map((flag) => FLAG_LABELS.get(flag) ?? flag);
  return labels.length > 0 ? `Флаги: ${escapeHtml(labels.join(", "))}` : null;
}

/** Joins lines, adds the link (button or text line) and enforces the length limit. */
function build(lines: readonly (string | null)[], link: { text: string; url: string }): MaxMessage {
  const body = lines.filter((line): line is string => line !== null && line !== "");
  if (link.url.startsWith("https://")) {
    return {
      text: truncateMaxText(body.join("\n")),
      buttons: [[{ text: link.text, url: link.url }]],
    };
  }
  body.push(`${escapeHtml(link.text)}: ${escapeHtml(link.url)}`);
  return { text: truncateMaxText(body.join("\n")) };
}

const leadLink = (lead: LeadForMessage, ctx: MessageContext) => ({
  text: "Открыть заявку",
  url: leadAdminUrl(ctx.siteUrl, lead.id),
});

// ---------------------------------------------------------------------------------------------
// Mapping from documents
// ---------------------------------------------------------------------------------------------

/** Flat view of a lead document (depth 0 is enough). */
export function toLeadForMessage(lead: Lead): LeadForMessage {
  return {
    id: lead.id,
    formType: text(lead.formType),
    company: text(lead.company),
    name: text(lead.name),
    phone: text(lead.phone),
    city: text(lead.city),
    productType: text(lead.productType),
    area: finiteNumber(lead.area),
    estimateFrom: finiteNumber(lead.estimate?.from),
    estimatePriceDate: text(lead.estimate?.priceDate),
    flags: Array.isArray(lead.flags) ? lead.flags.filter((flag) => typeof flag === "string") : [],
    isDuplicate: lead.isDuplicate === true,
    comment: text(lead.comment),
    kpAmount: finiteNumber(lead.kpAmount),
    createdAt: text(lead.createdAt),
  };
}

export function toOrderForMessage(
  order: Pick<Order, "id" | "number" | "company">,
  leadCompany: string | null
): OrderForMessage {
  return {
    id: order.id,
    number: text(order.number),
    company: text(order.company),
    leadCompany: text(leadCompany),
  };
}

// ---------------------------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------------------------

export function newLeadMessage(lead: LeadForMessage, ctx: MessageContext): MaxMessage {
  return build(
    [
      `<b>Новая заявка${SEPARATOR}${escapeHtml(formTypeLabel(lead.formType))}</b>`,
      whoLine(lead),
      phoneLine(lead),
      lead.city ? `Город: ${escapeHtml(lead.city)}` : null,
      productLine(lead),
      estimateLine(lead),
      flagsLine(lead),
      lead.isDuplicate ? "Повторное обращение" : null,
      lead.comment
        ? `Комментарий: ${escapeHtml(preview(lead.comment, COMMENT_PREVIEW_LENGTH))}`
        : null,
    ],
    leadLink(lead, ctx)
  );
}

export function assignedMessage(
  lead: LeadForMessage,
  p: { assignedBy: string },
  ctx: MessageContext
): MaxMessage {
  return build(
    [
      "<b>Вам назначена заявка</b>",
      whoLine(lead),
      phoneLine(lead),
      productLine(lead),
      `Назначил: ${escapeHtml(p.assignedBy)}`,
    ],
    leadLink(lead, ctx)
  );
}

export function statusChangeMessage(
  lead: LeadForMessage,
  p: {
    from: string | null;
    to: string;
    reason: string | null;
    changedBy: string;
    isContract: boolean;
  },
  ctx: MessageContext
): MaxMessage {
  const to = `«${escapeHtml(p.to)}»`;
  const title = p.from ? `«${escapeHtml(p.from)}» → ${to}` : to;
  return build(
    [
      `<b>Статус заявки: ${title}</b>`,
      whoLine(lead),
      phoneLine(lead),
      p.reason ? `Причина: ${escapeHtml(p.reason)}` : null,
      p.isContract && lead.kpAmount !== null ? `Сумма КП: ${formatRub(lead.kpAmount)}` : null,
      `Изменил: ${escapeHtml(p.changedBy)}`,
    ],
    leadLink(lead, ctx)
  );
}

export function unassignedReminderMessage(
  lead: LeadForMessage,
  p: { hours: number },
  ctx: MessageContext
): MaxMessage {
  const created = lead.createdAt ? formatDateTime(lead.createdAt) : "";
  return build(
    [
      `<b>Заявка без ответственного больше ${p.hours} ч</b>`,
      whoLine(lead),
      phoneLine(lead),
      created ? `Создана: ${created}` : null,
    ],
    leadLink(lead, ctx)
  );
}

export function orderEventMessage(
  order: OrderForMessage,
  p: { isNew: boolean; statusLabel: string },
  ctx: MessageContext
): MaxMessage {
  const number = escapeHtml(order.number ?? "без номера");
  const company = order.company ?? order.leadCompany;
  return build(
    [
      p.isNew
        ? `<b>Создан заказ №${NBSP}${number}</b>`
        : `<b>Заказ №${NBSP}${number}: ${escapeHtml(p.statusLabel)}</b>`,
      company ? `Компания: ${escapeHtml(company)}` : null,
      // The client's phone is deliberately left out of order messages.
    ],
    { text: "Открыть заказ", url: orderAdminUrl(ctx.siteUrl, order.id) }
  );
}
