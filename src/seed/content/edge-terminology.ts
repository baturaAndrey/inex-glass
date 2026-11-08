/**
 * Edge terminology adopted by the client on 2026-11-08 (after priorglass.ru): «еврокромка» is the
 * trapezoid profile (two chamfers at an angle), the rounded polished edge is «карандаш». teksty
 * (`res/inex-glass-handoff/teksty/`) list «трапеция» and «еврокромка» as two kinds and use
 * «еврокромка» for the rounded edge (teksty/07: «рекомендуем еврокромку: скруглённый торец»), so
 * the strings that name edge kinds were rewritten. The processing service pages
 * (`./processing/kromka.ts`, `./processing/facet.ts`) are the reference wording.
 *
 * These strings are in no teksty file. The verbatim checks of the seed slice tests skip them: a
 * content unit is exempt only when it is exactly one of these strings (after the test's own
 * normalisation). Stop-word checks still cover them, and every test checks that its strings
 * are still present in the content (a stale entry fails instead of silently exempting nothing).
 *
 * Keyed by seed slice; each value is the string exactly as written in that slice's content.
 */
export const EDGE_TERMINOLOGY_APPROVED_STRINGS = {
  "zak-hub": [
    "Шлифованная, полированная, «еврокромка» (трапеция), «карандаш» — укажите, какая нужна и где торец будет виден.",
    "шлифовка, полировка, «еврокромка» (трапеция), «карандаш»",
  ],
  constructions: [
    "**Кромка** — для видимого торца рекомендуем кромку «карандаш»; острые углы — скруглить. [Обработка кромки](/obrabotka-stekla/kromka/)",
  ],
  "glass-types": ["Полированная кромка, «карандаш»; осветлённое стекло — прозрачный торец"],
  "glazing-mirrors": ["Шлифованная, полированная, «карандаш»"],
  "how-to-order": [
    "Шлифованная, полированная, «еврокромка» (трапеция), «карандаш»; для зеркал — фацет и его ширина",
  ],
  "klientam-company": [
    "- **Кромка.** Полированная или «карандаш» — для видимых торцов столешниц и дверец.",
  ],
} as const satisfies Record<string, readonly string[]>;
