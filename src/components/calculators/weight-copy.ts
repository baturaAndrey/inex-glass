/**
 * Copy of the glass weight page under the calculator — verbatim from
 * `res/inex-glass-handoff/teksty/10-blog-kalkulyator.md` §1 (checked by the blog seed test).
 *
 * These texts explain the calculator's own formula (2.5 kg/m² per mm, EVA film), so they live
 * with the calculator rather than in a CMS block; the `weightCalculator` block switches them on
 * with `showTable` / `showFormula`. Bold runs of the source (`**…**`) are `{ text, bold: true }`.
 */

export interface CopySegment {
  text: string;
  bold?: boolean;
}

/** A paragraph as text segments (bold runs separated). */
export type CopyParagraph = readonly CopySegment[];

export const WEIGHT_PAGE_COPY = {
  table: {
    heading: "Сколько весит 1 м² стекла",
    columns: { thickness: "Толщина", weight: "Вес 1 м²" },
    note: "Закалка вес не меняет: закалённое стекло весит столько же, сколько обычное той же толщины.",
  },
  manual: {
    heading: "Как посчитать вручную",
    intro: [
      { text: "Плотность листового стекла — около 2500 кг/м³. Значит, " },
      { text: "1 м² стекла толщиной 1 мм весит 2,5 кг", bold: true },
      { text: "." },
    ],
    formula: "Вес = ширина, м × высота, м × толщина, мм × 2,5.",
    examples: [
      [
        { text: "Пример.", bold: true },
        { text: " Стекло для перегородки 1000 × 2000 мм, 10 мм: 1 × 2 × 10 × 2,5 = " },
        { text: "50 кг", bold: true },
        { text: "." },
      ],
      [
        { text: "Триплекс 8+8 с плёнкой 0,76 мм:", bold: true },
        { text: " 1 м² — 20 + 20 + 0,72 ≈ 40,7 кг." },
      ],
    ],
  },
  why: {
    heading: "Зачем знать вес",
    items: [
      "выбрать профиль и фурнитуру по допустимой нагрузке;",
      "спланировать подъём на этаж и число монтажников: стекло тяжелее 40 кг переносят только вдвоём с присосками, тяжелее 80 кг — бригадой или техникой;",
      "посчитать нагрузку на перекрытие и машину при доставке.",
    ],
  },
  links: {
    tempered: { label: "Закалённое стекло", href: "/zakalennoe-steklo/" },
    /** Goes to the quiz (href built at render time with the page `src`). */
    quiz: { label: "Рассчитать стоимость" },
  },
} as const satisfies {
  table: { heading: string; columns: Record<string, string>; note: string };
  manual: {
    heading: string;
    intro: CopyParagraph;
    formula: string;
    examples: readonly CopyParagraph[];
  };
  why: { heading: string; items: readonly string[] };
  links: Record<string, { label: string; href?: string }>;
};

/** Plain text of a paragraph (bold markers dropped). */
export function paragraphText(paragraph: CopyParagraph): string {
  return paragraph.map((segment) => segment.text).join("");
}

/** The paragraph as the teksty markdown line (`**bold**` runs), for verbatim checks. */
export function paragraphMarkdown(paragraph: CopyParagraph): string {
  return paragraph.map((segment) => (segment.bold ? `**${segment.text}**` : segment.text)).join("");
}
