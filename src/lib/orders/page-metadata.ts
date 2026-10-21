import { TITLE_BRAND_SUFFIX } from "@/lib/seo/metadata";
import type { Metadata } from "next";

/**
 * Metadata shared by the order page and its «link no longer works» state (ТЗ §6.2): never
 * indexed, followed, archived or cached by search engines, and NO Referer — the URL contains
 * the client's token, which must not leak to carrier sites or messengers.
 */
export const ORDER_PAGE_METADATA: Metadata = {
  title: { absolute: `Ссылка больше не действует${TITLE_BRAND_SUFFIX}` },
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nocache: true,
    googleBot: { index: false, follow: false, noarchive: true },
  },
  referrer: "no-referrer",
  alternates: { canonical: null },
};
