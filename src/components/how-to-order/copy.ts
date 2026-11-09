/**
 * Template wording of the «Как заказать» section that is not a CMS field: UI chrome of the
 * approved Paper mockups `2560_kak-zakazat` (hub) and `2560_kak-zakazat_trebovaniya` (subpage
 * template), 2026-11. Pure data. Page copy itself stays in the `pages` documents
 * (`src/seed/content/how-to-order.ts`); wording that differs from teksty is listed in
 * `HOW_TO_ORDER_MOCKUP_COPY` there and in `docs/inex/drafts/service-pages-paper-drafts.md`.
 */
export const HOW_TO_ORDER_TEMPLATE_COPY = {
  /** Label of the subpage table of contents (UI chrome, not a heading). */
  toc: "На странице",
  /** Accessible name of the hub's six steps (the mockup shows no heading above them). */
  steps: "Шаги заказа",
  /** Heading of the conditions panel when the `richText` block has none (teksty 04 §1). */
  terms: "Условия",
  /** Accessible name of the subpage link grid. */
  subpages: "Разделы «Как заказать»",
} as const;

/** The section hub: its `linkList` block lists the subpages shown on every subpage. */
export const HOW_TO_ORDER_HUB_PATH = "/kak-zakazat/";

/** `anchorId` of the hub's `linkList` block with the subpages. */
export const SUBPAGES_ANCHOR = "subpages";

/**
 * Anchor of the drawing-form panel on every subpage: the hero button «Загрузить чертёж» links to
 * `#dr-up` (the anchor of the former upload card, kept for existing links).
 */
export const UPLOAD_ANCHOR = "dr-up";
