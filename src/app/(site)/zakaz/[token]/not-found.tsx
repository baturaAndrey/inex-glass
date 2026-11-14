import { InvalidLink } from "@/components/order/invalid-link";
import { loadOrderPageTexts } from "@/components/order/page-texts";
import { ORDER_PAGE_METADATA } from "@/lib/orders/page-metadata";
import type { Metadata } from "next";

/**
 * «Ссылка больше не действует — свяжитесь с менеджером»: the 404 of `/zakaz/<token>/` for an
 * unknown, malformed, revoked or expired link (one identical answer, ТЗ §6.2). Contacts and the
 * title come from the CMS (`contacts`, `site-settings.orderPage.expiredTitle`).
 */
export const metadata: Metadata = ORDER_PAGE_METADATA;

export default async function OrderLinkNotFound() {
  const texts = await loadOrderPageTexts();
  return <InvalidLink title={texts.expiredTitle} contacts={texts.contacts} />;
}
