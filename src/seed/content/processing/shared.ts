import type { LayoutSeed, TableSeed } from "./types";

/**
 * Constants shared by the hub and the service files of the «Обработка стекла» seed.
 */

export const HUB_PATH = "/obrabotka-stekla/";

/** Links of the «→ [Название]» arrows in teksty and the plaque buttons. */
export const LINKS = {
  drawings: "/kak-zakazat/trebovaniya-k-chertezham/",
  tolerances: "/kak-zakazat/dopuski-i-gost/",
  holes: "/obrabotka-stekla/otverstiya-i-vyrezy/",
  edge: "/obrabotka-stekla/kromka/",
  facet: "/obrabotka-stekla/facet/",
  matting: "/obrabotka-stekla/matirovanie/",
  films: "/obrabotka-stekla/plenki/",
  print: "/obrabotka-stekla/pechat/",
  matteGlass: "/zakalennoe-steklo/matovoe/",
  mirrorsGyms: "/zerkala/dlya-zalov/",
  mirrorsSalons: "/zerkala/dlya-salonov/",
  mirrors: "/zerkala/",
} as const;

/**
 * Header of an empty first column («| | Плёнка | …» in teksty). The schema requires a column
 * label; a no-break space renders as an empty header cell.
 */
export const EMPTY_HEADER = " ";

export const PRIMARY_CTA = "Рассчитать стоимость";

/**
 * A table as a `table` layout block: the `heading` and the `lead` become the section heading and
 * sub. Tables of a service page live in its layout; `tables[]` of the document holds the specs.
 */
export function tableBlock(table: TableSeed): LayoutSeed {
  const { heading, lead, ...rest } = table;
  return {
    blockType: "table",
    ...(heading ? { heading } : {}),
    ...(lead ? { sub: lead } : {}),
    table: rest,
  };
}
