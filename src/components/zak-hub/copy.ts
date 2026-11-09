/**
 * Template wording of the tempered-glass hub and the thickness cards that is not a CMS field:
 * it comes from the approved Paper mockups `2560_zakalennoe-steklo` /
 * `2560_zak_tolshchina_10mm` (2026-11), not from teksty. Pure data: the seed content lists it in
 * `ZAK_MOCKUP_COPY` (`src/seed/content/zak-hub.ts`) and
 * `docs/inex/drafts/service-pages-paper-drafts.md` («Закалённое стекло — тексты на
 * согласовании»). The numbers next to these words come from the CMS globals.
 */
export const ZAK_TEMPLATE_COPY = {
  /** Captions of the lead-time tiles in «Сроки и доставка» (values: `conditions` global). */
  timingTempered: "Закалённое стекло",
  timingTriplex: "Триплекс",
  /** Link next to the «Обработка …» headings (hub and thickness cards). */
  processingLink: "Обработка стекла",
  /** Badge of the current thickness in «Соседние толщины». */
  currentPage: "Эта страница",
} as const;

/** Section hub of the processing services (target of `processingLink`). */
export const PROCESSING_HUB_PATH = "/obrabotka-stekla/";
