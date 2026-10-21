import { loadOrNull } from "@/components/layout/load-global";
import { toContactsData } from "@/components/layout/nav-data";
import { getContacts, getSiteSettings } from "@/lib/cms/globals";
import { isOrderStatus } from "@/lib/orders/status";
import type { OrderStatus } from "@/lib/orders/status";
import { INVALID_LINK_TITLE } from "./invalid-link";
import type { OrderFallbackContacts } from "./manager-card";

/**
 * CMS texts of the order page (`site-settings.orderStatuses` / `orderPage`, `contacts`) with
 * the built-in defaults (ТЗ §6.2, prototype `Order.dc.html`). Cached global loaders; a failing
 * CMS falls back to the defaults, like the site header.
 */

export interface OrderPageTexts {
  labels: Partial<Record<OrderStatus, string>>;
  expiredTitle: string;
  emptyPhotosText: string;
  copyLabel: string;
  copiedLabel: string;
  contacts: OrderFallbackContacts;
}

const DEFAULTS = {
  emptyPhotosText: "Фото появятся при отгрузке",
  copyLabel: "Скопировать",
  copiedLabel: "Скопировано",
} as const;

const text = (value: string | null | undefined, fallback: string): string =>
  value?.trim() || fallback;

export async function loadOrderPageTexts(): Promise<OrderPageTexts> {
  const [settings, contactsGlobal] = await Promise.all([
    loadOrNull("site-settings", getSiteSettings),
    loadOrNull("contacts", getContacts),
  ]);
  const contacts = toContactsData(contactsGlobal);
  const labels: Partial<Record<OrderStatus, string>> = {};
  for (const row of settings?.orderStatuses ?? []) {
    if (isOrderStatus(row.key) && row.label?.trim()) labels[row.key] = row.label.trim();
  }
  const page = settings?.orderPage;
  return {
    labels,
    expiredTitle: text(page?.expiredTitle, INVALID_LINK_TITLE),
    emptyPhotosText: text(page?.emptyPhotosText, DEFAULTS.emptyPhotosText),
    copyLabel: text(page?.copyLabel, DEFAULTS.copyLabel),
    copiedLabel: text(page?.copiedLabel, DEFAULTS.copiedLabel),
    contacts: {
      phone: contacts.phone,
      email: contacts.email,
      workHours: contacts.workHoursFull,
    },
  };
}
