import type { SeedLink } from "./types";

/**
 * Constants shared by the files of the glass-type seed (`./<slug>.ts`).
 */

/** Cross-links of teksty («→ [Название]») and their site paths (task-24 spec). */
export const GLASS_TYPE_LINKS = {
  matirovanie: { label: "Матирование", url: "/obrabotka-stekla/matirovanie/" },
  plenki: { label: "Наклейка плёнки", url: "/obrabotka-stekla/plenki/" },
  obrabotka: { label: "Обработка стекла", url: "/obrabotka-stekla/" },
  kromka: { label: "Обработка кромки", url: "/obrabotka-stekla/kromka/" },
  otverstiya: { label: "Отверстия и вырезы", url: "/obrabotka-stekla/otverstiya-i-vyrezy/" },
  osvetlennoe: { label: "Осветлённое стекло", url: "/zakalennoe-steklo/osvetlennoe/" },
  tripleks: { label: "Триплекс", url: "/tripleks/" },
  peregorodki: { label: "Стеклянные перегородки", url: "/steklyannye-peregorodki/" },
  dushevye: { label: "Душевые перегородки", url: "/dushevye-peregorodki/" },
  mebel: { label: "Стекло для мебели", url: "/zakalennoe-steklo/dlya-mebeli/" },
  vidy: { label: "Виды закалённого стекла", url: "/zakalennoe-steklo/#vidy" },
  upakovka: { label: "Упаковка и доставка", url: "/kak-zakazat/upakovka-i-dostavka/" },
  proektirovanie: { label: "Проектирование", url: "/proektirovanie/" },
} as const satisfies Record<string, SeedLink>;

/** Markdown link of a cross-link. */
export const link = (target: SeedLink): string => `[${target.label}](${target.url})`;

/** Title of the shared «Что важно знать до заказа» callout (teksty/08). */
export const IMPORTANT_TITLE = "Что важно знать до заказа";

/** SSoT §1/§2: tempered glass 4–19 mm, from 150 × 300 to 3000 × 2000 mm. */
export const TEMPERED_LIMITS = {
  thickMin: 4,
  thickMax: 19,
  sizeMinW: 150,
  sizeMinH: 300,
  sizeMaxW: 3000,
  sizeMaxH: 2000,
} as const;

/**
 * Header of an empty first column (the corner above the row labels of a comparison table).
 * The schema requires a column label; a single space renders as an empty header cell.
 */
export const EMPTY_HEADER = " ";
