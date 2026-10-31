import { formatOrderDate, isOrderStatus, statusLabel } from "@/lib/orders/status";
import type { OrderStatus } from "@/lib/orders/status";

/**
 * Warnings of the «Управление» tab of an order (task 33): what keeps the client from getting
 * the e-mails or a complete order page. Pure; unit-tested in `order-warnings.test.ts`.
 */

export type OrderWarningKey =
  | "no-email"
  | "notifications-off"
  | "no-manager"
  | "no-photos"
  | "no-shipment"
  | "revoked"
  | "expired";

export interface OrderWarning {
  key: OrderWarningKey;
  /** `danger`: the client cannot open the page at all. */
  tone: "warning" | "danger";
  text: string;
}

export interface OrderWarningSource {
  clientEmail?: string | null;
  notifyClient?: boolean | null;
  manager?: unknown;
  currentStatus?: string | null;
  packPhotos?: readonly unknown[] | null;
  shipment?: { carrier?: string | null; waybill?: string | null } | null;
  revoked?: boolean | null;
  expiresAt?: string | null;
}

const PHOTO_STAGES: ReadonlySet<OrderStatus> = new Set(["packed", "shipped"]);

const filled = (value: unknown): boolean => typeof value === "string" && value.trim() !== "";

export function orderWarnings(order: OrderWarningSource, now: Date = new Date()): OrderWarning[] {
  const warnings: OrderWarning[] = [];
  const status = isOrderStatus(order.currentStatus) ? order.currentStatus : null;

  if (order.revoked === true) {
    warnings.push({
      key: "revoked",
      tone: "danger",
      text: "Ссылка отозвана: клиент видит «Ссылка больше не действует». Верните доступ или перевыпустите ссылку.",
    });
  }
  const expires = order.expiresAt ? new Date(order.expiresAt) : null;
  if (expires && !Number.isNaN(expires.getTime()) && expires.getTime() <= now.getTime()) {
    warnings.push({
      key: "expired",
      tone: "danger",
      text: `Срок ссылки истёк ${formatOrderDate(order.expiresAt) ?? ""} (отсчитывается от даты «Получено»).`,
    });
  }
  if (!filled(order.clientEmail)) {
    warnings.push({
      key: "no-email",
      tone: "warning",
      text: "Нет e-mail клиента — письма о смене статуса не уйдут.",
    });
  } else if (order.notifyClient === false) {
    warnings.push({
      key: "notifications-off",
      tone: "warning",
      text: "Уведомления клиенту выключены — письма о смене статуса не уйдут.",
    });
  }
  if (!order.manager) {
    warnings.push({
      key: "no-manager",
      tone: "warning",
      text: "Менеджер не назначен — на странице заказа показываются общие контакты компании.",
    });
  }
  if (status && PHOTO_STAGES.has(status) && (order.packPhotos ?? []).length === 0) {
    warnings.push({
      key: "no-photos",
      tone: "warning",
      text: `Статус «${statusLabel(status)}», но фото упаковки не загружены.`,
    });
  }
  if (
    status === "shipped" &&
    (!filled(order.shipment?.carrier) || !filled(order.shipment?.waybill))
  ) {
    warnings.push({
      key: "no-shipment",
      tone: "warning",
      text: "Статус «Отгружено», но не указаны транспортная компания или номер накладной.",
    });
  }
  return warnings;
}
