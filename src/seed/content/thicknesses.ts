/**
 * Content of the thickness cards (`/zakalennoe-steklo/{N}-mm/`, task 23): the four thickness
 * groups (selection, processing, FAQ) and the per-thickness values. Verbatim from
 * `res/inex-glass-handoff/teksty/03-kartochki-tolshchin.md` («Значения по толщинам»,
 * «{текст_подбора} и {обработка} — по толщинам», «{faq} — по толщинам»); meta from
 * `docs/inex/17-meta.md` (it wins over teksty/03: no «, до 3000 × 2000» in the title).
 *
 * Placeholders (`{N}`, `{2N}`, `{вес}`, `{вес×2}`, `{цена}`) are stored as they are and filled per
 * card at render time. Weight and hole distances are NOT stored: the domain library computes
 * them. `indexable` is set by the base seed (false for 5, 15, 19) and never touched here.
 *
 * Pure data (no Payload imports): the slice (`../slices/thicknesses.ts`) builds the documents
 * and `../slices/zak-hub-thicknesses.test.ts` checks it against teksty.
 */

export interface ThicknessGroupContent {
  /** Natural key of the group. */
  label: string;
  slug: string;
  order: number;
  thicknesses: readonly number[];
  /** «{текст_подбора}» (the «Подбор:» lead-in of teksty dropped, first letter capitalized). */
  podbor: string;
  /** «{обработка}». */
  obrabotka: string;
  /** «{faq}»: question → answer. */
  faq: ReadonlyArray<readonly [string, string]>;
}

export const THICKNESS_GROUPS: readonly ThicknessGroupContent[] = [
  {
    label: "4–5 мм",
    slug: "4-5-mm",
    order: 10,
    thicknesses: [4, 5],
    podbor:
      "Подходит ли {N} мм, решают размер стекла, способ крепления и нагрузка. Если запаса прочности не хватает — предложим толщину больше или триплекс.",
    obrabotka:
      "Кромка, отверстия от 4 мм (диаметр меньше толщины — по согласованию), фацет, матирование, печать, крашение по RAL, гнутьё с радиусом от 1000 мм.",
    faq: [
      [
        "Подойдёт ли {N} мм для дверцы или полки?",
        "Для небольших мебельных деталей — как правило, да; для полки решает пролёт и нагрузка. Пришлите размеры — подберём.",
      ],
      [
        "Можно ли сделать отверстие под петлю?",
        "Да, от 4 мм в диаметре; не ближе {2N} мм к кромке.",
      ],
    ],
  },
  {
    label: "6–8 мм",
    slug: "6-8-mm",
    order: 20,
    thicknesses: [6, 8],
    podbor:
      "Подходит ли {N} мм, решают размер стекла, способ крепления и нагрузка. Подберём по вашей конструкции — одним стеклом или триплексом.",
    obrabotka:
      "Все виды кромки, отверстия и вырезы, матирование, печать, крашение по RAL; гнутьё — радиус от 1000 мм (6 мм) и от 1500 мм (8 мм).",
    faq: [
      [
        "Хватит ли {N} мм для двери или перегородки?",
        "Зависит от высоты, ширины и крепления. Опишите конструкцию — подберём толщину или триплекс.",
      ],
      ["Сколько весит одно стекло 1000 × 2000 мм?", "{вес} × 2 = {вес×2} кг."],
    ],
  },
  {
    label: "10–12 мм",
    slug: "10-12-mm",
    order: 30,
    thicknesses: [10, 12],
    podbor:
      "Толщину и схему подбираем под нагрузку. Для ограждений и козырьков, где важно удержать осколки, часто нужен триплекс — предложим вариант.",
    obrabotka:
      "Все виды кромки, отверстия и вырезы, матирование, печать, крашение по RAL; гнутьё — радиус от 1500 мм.",
    faq: [
      [
        "Нужен ли триплекс для ограждения?",
        "Для ограждений и козырьков триплекс часто обязателен — осколки удерживаются плёнкой. Подберём схему под нагрузку.",
      ],
      [
        "Сколько весит стекло 1000 × 2000 мм?",
        "{вес×2} кг — учитывайте при подъёме и выборе крепежа.",
      ],
    ],
  },
  {
    label: "15–19 мм",
    slug: "15-19-mm",
    order: 40,
    thicknesses: [15, 19],
    podbor:
      "Стекло для нагруженных конструкций. Закалка — по согласованию, цена — по запросу: пришлите чертёж и описание конструкции.",
    obrabotka:
      "Кромка, отверстия и вырезы; другие виды — по согласованию. Крашение — до 15 мм. Гнутьё — нет.",
    faq: [
      [
        "Почему цена по запросу?",
        "Закалка таких толщин согласуется с заводом под конкретный заказ — назовём цену после расчёта.",
      ],
      ["Какой максимальный размер?", "До 3000 × 2000 мм; точнее — после согласования с заводом."],
    ],
  },
];

/** SEO templates of every card (17-meta); `{N}`, `{цена}`, `{вес}` are filled per card. */
export const THICKNESS_SEO = {
  h1: "Закалённое стекло {N} мм",
  title: "Закалённое стекло {N} мм — от {цена} ₽/м² | Inex Glass",
  titleNoPrice: "Закалённое стекло {N} мм — под заказ | Inex Glass",
  description:
    "Закалённое стекло {N} мм: вес {вес} кг/м², размеры от 150 × 300 до 3000 × 2000 мм, срок от 10 рабочих дней. Расчёт по вашему чертежу.",
} as const;

/** Quiz button of the passport («Рассчитать стекло {N} мм»). */
export const THICKNESS_CTA_LABEL = "Рассчитать стекло {N} мм";

const KINDS_ALL = "все, включая крашеное и гнутое";
/**
 * Size of 15 and 19 mm (teksty/03, FAQ of the 15–19 group). For 15 mm the size is not stated
 * explicitly in the «Значения по толщинам» table — open question (1) of the task.
 */
const SIZE_HEAVY = "до 3000 × 2000 мм; точнее — после согласования с заводом";

export interface ThicknessContent {
  n: number;
  groupLabel: string;
  kindsText: string;
  /** Overrides the default size line (`tech-params.flat`); unset → default. */
  sizeText?: string;
}

/** «Значения по толщинам» of teksty/03. */
export const THICKNESS_VALUES: readonly ThicknessContent[] = [
  { n: 4, groupLabel: "4–5 мм", kindsText: KINDS_ALL },
  { n: 5, groupLabel: "4–5 мм", kindsText: KINDS_ALL },
  { n: 6, groupLabel: "6–8 мм", kindsText: KINDS_ALL },
  { n: 8, groupLabel: "6–8 мм", kindsText: KINDS_ALL },
  { n: 10, groupLabel: "10–12 мм", kindsText: KINDS_ALL },
  { n: 12, groupLabel: "10–12 мм", kindsText: KINDS_ALL },
  {
    n: 15,
    groupLabel: "15–19 мм",
    kindsText: "прозрачное и другие виды по запросу; крашеное — до 15 мм; гнутое — нет",
    sizeText: SIZE_HEAVY,
  },
  {
    n: 19,
    groupLabel: "15–19 мм",
    kindsText: "по запросу; крашеное и гнутое — нет",
    sizeText: SIZE_HEAVY,
  },
];

/** Thicknesses open for indexing (SSoT); the base seed sets `indexable` accordingly. */
export const INDEXABLE_THICKNESSES: readonly number[] = [4, 6, 8, 10, 12];
