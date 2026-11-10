/**
 * Template wording of the «Клиентам» section that is not a CMS field: UI chrome of the Paper
 * mockups `2560_klientam` (hub) and `2560_klientam_podryadchikam` (segment template), 2026-11.
 * Pure data. Page copy stays in the `pages` documents (`src/seed/content/klientam-company.ts`).
 */
export const CLIENTS_TEMPLATE_COPY = {
  /** Accessible name of the hub's segment cards (the mockup shows no heading above them). */
  segments: "Клиенты Inex Glass",
  /** Accessible name of the segment tiles at the bottom of every segment page. */
  segmentLinks: "Разделы «С кем мы работаем»",
  /** Visible label of the card link (also the teksty «→ Подробнее» of the hub table). */
  more: "Подробнее",
} as const;

/** The section hub: its first `table` block lists the segments (cards, sibling tiles). */
export const CLIENTS_HUB_PATH = "/klientam/";

/** Anchor of the segment tiles on the segment pages. */
export const SEGMENT_LINKS_ANCHOR = "segments";

/** Anchor of the drawing-form panel (the same as on the «Как заказать» subpages). */
export { UPLOAD_ANCHOR as CLIENTS_FORM_ANCHOR } from "@/components/how-to-order/copy";
