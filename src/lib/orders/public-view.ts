import { fileTypeLabel, formatFileSize, isDisplayableImage, populatedFile } from "./files";
import {
  formatOrderDate,
  formatOrderDayMonth,
  isOrderStatus,
  latestStatus,
  ORDER_STATUS_IDS,
  ORDER_STATUS_META,
  statusIndex,
} from "./status";
import type { OrderFileDoc } from "./files";
import type { OrderStatus, StatusHistoryRow } from "./status";

/**
 * View model of the public order page `/zakaz/<token>/` (ТЗ §6.2).
 *
 * WHITE LIST: only the fields below ever reach the page — number, company, composition, stages,
 * the comment for the client, photo/document ids, shipment, and the Inex manager's work
 * contacts. The client's own contacts (`clientEmail`, `clientName`, `clientPhone`), the lead and
 * internal notes are never copied (`public-view.test.ts` serializes the result to prove it).
 * Pure: no Payload/Next imports.
 */

export type PublicStepState = "done" | "current" | "todo";

/** Same shape as `TimelineStep` of `@/components/ig/timeline`. */
export interface PublicStep {
  key: OrderStatus;
  title: string;
  date: string;
  state: PublicStepState;
}

export interface PublicPhoto {
  id: string;
  alt: string;
}

export interface PublicShipment {
  date: string | null;
  carrier: string | null;
  waybill: string | null;
  /** `http(s)` only; anything else (e.g. `javascript:`) is dropped. */
  trackingUrl: string | null;
}

export interface PublicDocument {
  id: string;
  title: string;
  /** «PDF · 1,2 МБ». */
  meta: string | null;
}

export interface PublicManager {
  name: string;
  position: string;
  phone: string | null;
  phoneHref: string | null;
  email: string | null;
  messengerUrl: string | null;
  photoUrl: string | null;
}

export interface PublicOrderView {
  /** `false` when the link is revoked or expired: the page answers 404. */
  active: boolean;
  number: string;
  /** «{company} · {composition}», empty parts skipped. */
  subtitle: string | null;
  currentStatus: OrderStatus | null;
  steps: PublicStep[];
  clientComment: string | null;
  photos: PublicPhoto[];
  /** «Фото при отгрузке, 15.11.2026» (shipping date, else packing date) or `null`. */
  photosCaption: string | null;
  /** `null` hides the «Отгрузка» card. */
  shipment: PublicShipment | null;
  documents: PublicDocument[];
  /** `null`: no manager assigned — the page shows the company contacts instead. */
  manager: PublicManager | null;
}

type Relation<T> = string | T | null | undefined;

interface ManagerSource {
  id: string;
  name?: string | null;
  position?: string | null;
  phone?: string | null;
  email?: string | null;
  messengerUrl?: string | null;
  photo?: Relation<{ id: string; url?: string | null }>;
}

/** The order fields the page may use (a subset of `Order` with populated relations). */
export interface PublicOrderSource {
  number?: string | null;
  company?: string | null;
  composition?: string | null;
  currentStatus?: string | null;
  statusHistory?: readonly Partial<StatusHistoryRow>[] | null;
  clientComment?: { text?: string | null } | null;
  packPhotos?: readonly { photo: Relation<OrderFileDoc>; caption?: string | null }[] | null;
  shipment?: {
    carrier?: string | null;
    waybill?: string | null;
    trackingUrl?: string | null;
  } | null;
  documents?: readonly { title: string; file: Relation<OrderFileDoc> }[] | null;
  manager?: Relation<ManagerSource>;
  revoked?: boolean | null;
  expiresAt?: string | null;
}

export interface PublicViewOptions {
  /** Stage labels from `site-settings.orderStatuses` (fallback: the built-in ones). */
  labels?: Partial<Record<OrderStatus, string>>;
}

export const DEFAULT_MANAGER_POSITION = "Менеджер по заказам";
const NO_DATE = "—";
const SUBTITLE_SEPARATOR = " · ";
const SHIPPED_STAGES: ReadonlySet<OrderStatus> = new Set(["shipped", "received"]);
const MESSENGER_PROTOCOLS: ReadonlySet<string> = new Set([
  "https:",
  "http:",
  "tg:",
  "whatsapp:",
  "viber:",
]);
const WEB_PROTOCOLS: ReadonlySet<string> = new Set(["https:", "http:"]);

const clean = (value: string | null | undefined): string | null => {
  const text = typeof value === "string" ? value.trim() : "";
  return text === "" ? null : text;
};

function safeUrl(value: string | null | undefined, protocols: ReadonlySet<string>): string | null {
  const text = clean(value);
  if (!text) return null;
  try {
    return protocols.has(new URL(text).protocol) ? text : null;
  } catch {
    return null;
  }
}

/** Link is usable: not revoked and `expiresAt` (if any) is still ahead of `now`. */
export function isOrderLinkActive(
  order: Pick<PublicOrderSource, "revoked" | "expiresAt">,
  now: Date
): boolean {
  if (order.revoked === true) return false;
  if (!order.expiresAt) return true;
  const expires = new Date(order.expiresAt).getTime();
  // An unparsable date must not keep a link alive forever, nor kill it: treat it as absent.
  return Number.isNaN(expires) || expires > now.getTime();
}

function currentOf(order: PublicOrderSource): OrderStatus | null {
  return isOrderStatus(order.currentStatus)
    ? order.currentStatus
    : latestStatus(order.statusHistory ?? []);
}

export function buildSteps(
  order: PublicOrderSource,
  options: PublicViewOptions = {}
): PublicStep[] {
  const history = order.statusHistory ?? [];
  const current = currentOf(order);
  const currentIndex = statusIndex(current);
  const rowOf = (status: OrderStatus) => history.find((row) => row.status === status);
  // The planned date of the next stage lives on the current stage's row.
  const plannedNext = current ? formatOrderDayMonth(rowOf(current)?.plannedDate) : null;
  const lastIndex = ORDER_STATUS_IDS.length - 1;

  return ORDER_STATUS_IDS.map((status, index) => {
    const title = clean(options.labels?.[status]) ?? ORDER_STATUS_META[status].label;
    let state: PublicStepState;
    if (index < currentIndex) state = "done";
    else if (index === currentIndex) state = index === lastIndex ? "done" : "current";
    else state = "todo";

    let date: string;
    if (index <= currentIndex) date = formatOrderDate(rowOf(status)?.date) ?? NO_DATE;
    else if (index === currentIndex + 1 && plannedNext) date = `план ${plannedNext}`;
    else date = NO_DATE;

    return { key: status, title, date, state };
  });
}

function buildPhotos(order: PublicOrderSource): PublicPhoto[] {
  const photos: PublicPhoto[] = [];
  for (const row of order.packPhotos ?? []) {
    const file = populatedFile(row.photo);
    if (!file || !isDisplayableImage(file.mimeType)) continue;
    photos.push({
      id: file.id,
      alt: clean(row.caption) ?? `Фото упаковки ${photos.length + 1}`,
    });
  }
  return photos;
}

function stageDate(order: PublicOrderSource, status: OrderStatus): string | null {
  return formatOrderDate(order.statusHistory?.find((row) => row.status === status)?.date);
}

function buildShipment(
  order: PublicOrderSource,
  current: OrderStatus | null
): PublicShipment | null {
  const carrier = clean(order.shipment?.carrier);
  const waybill = clean(order.shipment?.waybill);
  const shipped = current !== null && SHIPPED_STAGES.has(current);
  if (!shipped && !carrier && !waybill) return null;
  return {
    date: stageDate(order, "shipped"),
    carrier,
    waybill,
    trackingUrl: safeUrl(order.shipment?.trackingUrl, WEB_PROTOCOLS),
  };
}

function buildDocuments(order: PublicOrderSource): PublicDocument[] {
  return (order.documents ?? []).flatMap((row) => {
    const file = populatedFile(row.file);
    if (!file) return [];
    const meta = [fileTypeLabel(file.filename), formatFileSize(file.filesize)].filter(Boolean);
    return [
      {
        id: file.id,
        title: clean(row.title) ?? "Документ",
        meta: meta.length > 0 ? meta.join(SUBTITLE_SEPARATOR) : null,
      },
    ];
  });
}

/** `tel:` link from a display number: digits only, a leading «+» kept. */
export function phoneHref(phone: string | null | undefined): string | null {
  const text = clean(phone);
  if (!text) return null;
  const digits = text.replace(/\D/g, "");
  if (!digits) return null;
  return `tel:${text.startsWith("+") ? "+" : ""}${digits}`;
}

function buildManager(order: PublicOrderSource): PublicManager | null {
  const manager = order.manager;
  if (typeof manager !== "object" || manager === null) return null;
  const name = clean(manager.name);
  if (!name) return null;
  const photo = typeof manager.photo === "object" && manager.photo !== null ? manager.photo : null;
  const phone = clean(manager.phone);
  return {
    name,
    position: clean(manager.position) ?? DEFAULT_MANAGER_POSITION,
    phone,
    phoneHref: phoneHref(phone),
    email: clean(manager.email),
    messengerUrl: safeUrl(manager.messengerUrl, MESSENGER_PROTOCOLS),
    // Media URLs are site-relative (`/api/media/file/…`); never an arbitrary scheme.
    photoUrl: clean(photo?.url)?.startsWith("/") ? clean(photo?.url) : null,
  };
}

export function toPublicOrderView(
  order: PublicOrderSource,
  now: Date,
  options: PublicViewOptions = {}
): PublicOrderView {
  const current = currentOf(order);
  const subtitle = [clean(order.company), clean(order.composition)].filter(Boolean);
  const photos = buildPhotos(order);
  const photosCaptionDate = stageDate(order, "shipped") ?? stageDate(order, "packed");

  return {
    active: isOrderLinkActive(order, now),
    number: clean(order.number) ?? "",
    subtitle: subtitle.length > 0 ? subtitle.join(SUBTITLE_SEPARATOR) : null,
    currentStatus: current,
    steps: buildSteps(order, options),
    clientComment: clean(order.clientComment?.text),
    photos,
    photosCaption:
      photos.length > 0 && photosCaptionDate ? `Фото при отгрузке, ${photosCaptionDate}` : null,
    shipment: buildShipment(order, current),
    documents: buildDocuments(order),
    manager: buildManager(order),
  };
}
