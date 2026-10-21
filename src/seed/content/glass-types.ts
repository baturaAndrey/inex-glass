/**
 * Content of the eight `glass-types` documents (task 24), as plain data: the seed slice
 * (`src/seed/slices/glass-types.ts`) turns it into Payload data, the unit test
 * (`src/seed/slices/glass-types.test.ts`) checks it against the sources without booting Payload.
 *
 * Sources (copied verbatim, placeholders such as `{условия}` kept):
 * - res/inex-glass-handoff/teksty/08-vidy-stekla.md §1–§5 (матовое, тонированное, крашеное,
 *   осветлённое, для мебели), 16-riflenoe.md, 12-p2-konstrukcii-steklo.md §5 (гнутое), §6 (триплекс);
 * - H1 / Title / Description: docs/inex/17-meta.md (wins over the `#` headings of teksty);
 * - hub card texts: teksty/02-zakalennoe-steklo.md «Виды закалённого стекла» and «Для кого».
 *
 * Markup conventions:
 * - `md` strings are Markdown, converted to Lexical by the slice (`[text](/path/)`, `**bold**`,
 *   `- lists`). The «→ [Название]» cross-links of teksty become plain links (the arrow is the
 *   prototype's link styling, not copy).
 * - Table cells and footnotes are plain text fields; they may contain the same inline markup,
 *   which the template renders (`InlineText`).
 * - A column label of a single space is an empty header of teksty (`| |`): the schema requires
 *   a label, the template renders it as an empty corner cell.
 */

import type { QuizKindId, QuizTypeId } from "@/lib/domain";

export const GLASS_TYPE_SLUGS = [
  "matovoe",
  "tonirovannoe",
  "okrashennoe",
  "osvetlennoe",
  "dlya-mebeli",
  "riflenoe",
  "mollirovannoe",
  "tripleks",
] as const;

export type GlassTypeSlug = (typeof GLASS_TYPE_SLUGS)[number];

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

export interface SeedLink {
  label: string;
  url: string;
}

/** Markdown link of a cross-link. */
const link = (target: SeedLink): string => `[${target.label}](${target.url})`;

/** Where the copy of a document comes from (file in `res/inex-glass-handoff/teksty/`). */
export interface TekstySource {
  file: string;
  /** Start of the `# N. …` heading of the section; `null` — the whole file. */
  section: string | null;
}

export interface TableCellContent {
  value: string;
  positive?: boolean;
  href?: string;
}

export interface GlassTypeTableContent {
  heading: string;
  lead?: string;
  role: "parameters" | "comparison" | "schemes" | "other";
  mobileMode: "cards" | "pairs";
  columns: Array<{ label: string; align?: "left" | "center" | "right"; numeric?: boolean }>;
  rows: Array<Array<string | TableCellContent>>;
  footnote?: string;
}

export interface CalloutItemContent {
  lead?: string;
  /** Markdown. */
  text: string;
}

export type LayoutContent =
  | { kind: "richText"; heading?: string; md: string }
  | { kind: "callout"; tone: "warning" | "info"; title?: string; items: CalloutItemContent[] };

export interface VariantContent {
  key: string;
  name: string;
  description: string;
  application?: string;
  swatchKind: "color" | "image" | "pattern";
  swatchColor?: string;
  patternKey?: string;
}

export interface GlassTypeContent {
  slug: GlassTypeSlug;
  title: string;
  urlBase: "zakalennoe-steklo" | "root";
  /** Expected computed `path` (the collection hook derives it from `slug` + `urlBase`). */
  path: string;
  breadcrumbLabel: string;
  order: number;
  showInHub: boolean;
  card: { title: string; text?: string };
  source: TekstySource;
  seo: { h1: string; title: string; description: string };
  /** Markdown; ends with `{условия}`. */
  intro: string;
  /** Captions of the photo placeholders of the hero («[Фото: …]» notes of teksty). */
  heroPhotoCaptions?: string[];
  variantsHeading?: string;
  variants?: VariantContent[];
  /** Markdown. */
  variantsNote?: string;
  variantsCallout?: { title?: string; body: string };
  tables?: GlassTypeTableContent[];
  importantItems?: CalloutItemContent[];
  layout?: LayoutContent[];
  applications?: Array<{ text: string; link?: SeedLink }>;
  relatedLinks?: SeedLink[];
  showSamples: boolean;
  faq?: Array<{ question: string; answer: string }>;
  limits: {
    thickMin?: number;
    thickMax?: number;
    allowedThicknesses?: number[];
    sizeMinW?: number;
    sizeMinH?: number;
    sizeMaxW?: number;
    sizeMaxH?: number;
    radius?: Array<{ thicknessFrom: number; thicknessTo: number; minRadius: number }>;
    notes?: string;
  };
  quizPrefill: { type: QuizTypeId; kind?: QuizKindId };
}

/** Title of the shared «Что важно знать до заказа» callout (teksty/08). */
const IMPORTANT_TITLE = "Что важно знать до заказа";

/** SSoT §1/§2: tempered glass 4–19 mm, from 150 × 300 to 3000 × 2000 mm. */
const TEMPERED_LIMITS = {
  thickMin: 4,
  thickMax: 19,
  sizeMinW: 150,
  sizeMinH: 300,
  sizeMaxW: 3000,
  sizeMaxH: 2000,
} as const;

/* ------------------------------------------------------------------------------------------ */
/* 08 §1. Матовое                                                                             */
/* ------------------------------------------------------------------------------------------ */

const matovoe: GlassTypeContent = {
  slug: "matovoe",
  title: "Матовое",
  urlBase: "zakalennoe-steklo",
  path: "/zakalennoe-steklo/matovoe/",
  breadcrumbLabel: "Матовое",
  order: 2,
  showInHub: true,
  card: { title: "Матовое", text: "приватность без потери света" },
  source: { file: "08-vidy-stekla.md", section: "# 1. Матовое" },
  seo: {
    h1: "Матовое закалённое стекло",
    title: "Матовое закалённое стекло — сатин и пескоструй | Inex Glass",
    description:
      "Сатинированное и пескоструйное матовое стекло для перегородок, дверей и мебели. Согласуем образец до запуска. Заказы от 50 м².",
  },
  intro:
    "Матовое стекло пропускает свет, но скрывает то, что за ним. Его ставят там, где нужна приватность без глухой стены: перегородки переговорных, двери, душевые, мебельные фасады. Изготавливаем в закалке по вашим чертежам. {условия}",
  tables: [
    {
      heading: "Два способа сделать стекло матовым",
      role: "comparison",
      mobileMode: "cards",
      columns: [
        { label: " " },
        { label: "Сатинированное (химическое)" },
        { label: "Пескоструйное матирование" },
      ],
      rows: [
        [
          "Как делают",
          "Поверхность стекла обрабатывают составом на заводе стекла",
          "Поверхность обрабатывают абразивом под давлением",
        ],
        [
          "Что получается",
          "Равномерная бархатистая матовость по всему листу",
          "Матовость по всей площади или только в нужных зонах",
        ],
        ["Рисунки и логотипы", "Нет", "Да: полосы, рисунок, логотип, объёмный эффект"],
        [
          "Как заказывать",
          "Как вид стекла",
          `Как обработку прозрачного стекла → ${link(GLASS_TYPE_LINKS.matirovanie)}`,
        ],
      ],
    },
  ],
  layout: [
    {
      kind: "richText",
      md: `Сатинированное стекло бывает прозрачным и цветным. Пескоструйное матирование делаем на стекле любой толщины. Ещё один способ — матовая плёнка: её можно снять или заменить. ${link(GLASS_TYPE_LINKS.plenki)}`,
    },
    {
      kind: "callout",
      tone: "warning",
      title: IMPORTANT_TITLE,
      items: [
        {
          lead: "Сторона матовой поверхности.",
          text: "Матовая сторона собирает отпечатки и пятна сильнее гладкой. Решите заранее, куда она будет смотреть: в перегородке — обычно в сторону, где к стеклу реже прикасаются; в душевой — наружу, а не в зону воды. Отметьте сторону в чертеже.",
        },
        {
          lead: "Матовое стекло в одной партии.",
          text: "Если перегородки идут на несколько этажей, заказывайте их одной партией: так матовость будет одинаковой.",
        },
        {
          lead: "Рисунок или полоса приватности.",
          text: `Если матовой должна быть только часть стекла (полоса на уровне глаз, логотип), нужен пескоструй по прозрачному стеклу, а не сатин. Пришлите макет в векторе. ${link(GLASS_TYPE_LINKS.matirovanie)}`,
        },
      ],
    },
    {
      kind: "richText",
      heading: "Размеры",
      md: `Закалённое стекло — от 150 × 300 до 3000 × 2000 мм. Обработка кромки, отверстия и вырезы делаются до закалки. ${link(GLASS_TYPE_LINKS.obrabotka)}`,
    },
  ],
  applications: [
    { text: "Офисные перегородки и двери" },
    { text: "Душевые перегородки для гостиниц и спортивных объектов" },
    { text: "Мебельные фасады" },
    { text: "Ограждения, где нужна приватность" },
  ],
  relatedLinks: [GLASS_TYPE_LINKS.peregorodki, GLASS_TYPE_LINKS.dushevye, GLASS_TYPE_LINKS.mebel],
  showSamples: true,
  faq: [
    {
      question: "Матовое стекло можно закалить?",
      answer:
        "Да. Закаливают и сатинированное стекло, и стекло после пескоструя; матирование делают до закалки.",
    },
    {
      question: "Чем мыть матовое стекло?",
      answer:
        "Мягкой тканью и средством без абразива. Жирные следы с матовой поверхности удаляются труднее, поэтому важно, какой стороной стекло обращено к людям.",
    },
    {
      question: "Мателюкс и сатин — это одно и то же?",
      answer:
        "Это торговые названия матового стекла химической обработки. Подберём аналог под ваш проект.",
    },
  ],
  limits: { ...TEMPERED_LIMITS },
  quizPrefill: { type: "tempered", kind: "matte" },
};

/* ------------------------------------------------------------------------------------------ */
/* 08 §2. Тонированное                                                                        */
/* ------------------------------------------------------------------------------------------ */

const tonirovannoe: GlassTypeContent = {
  slug: "tonirovannoe",
  title: "Тонированное",
  urlBase: "zakalennoe-steklo",
  path: "/zakalennoe-steklo/tonirovannoe/",
  breadcrumbLabel: "Тонированное",
  order: 3,
  showInHub: true,
  card: { title: "Тонированное", text: "бронза, графит, серое" },
  source: { file: "08-vidy-stekla.md", section: "# 2. Тонированное" },
  seo: {
    h1: "Тонированное закалённое стекло",
    title: "Тонированное стекло — бронза, графит, серое в закалке | Inex Glass",
    description:
      "Бронза, графит и серое стекло 4–19 мм в закалке. Оттенок зависит от толщины — согласуем образец до запуска партии.",
  },
  intro:
    "Тонированное стекло окрашено в массе: цвет не нанесён сверху, а есть во всём объёме листа. Оно не стирается и не выгорает. Применяют его в перегородках, ограждениях, мебели и фасадах. {условия}",
  heroPhotoCaptions: ["Три образца на белом фоне и на просвет"],
  variantsHeading: "Цвета",
  // Approximate tints until photos of the samples replace them (spec, open question 4).
  variants: [
    {
      key: "bronze",
      name: "Бронза",
      description: "Тёплый коричневый оттенок",
      swatchKind: "color",
      swatchColor: "#9B7653",
    },
    {
      key: "graphite",
      name: "Графит",
      description: "Глубокий тёмно-серый",
      swatchKind: "color",
      swatchColor: "#4A4F54",
    },
    {
      key: "grey",
      name: "Серое",
      description: "Нейтральный серый",
      swatchKind: "color",
      swatchColor: "#8E959B",
    },
  ],
  importantItems: [
    {
      lead: "Оттенок зависит от толщины.",
      text: "Цвет окрашенного в массе стекла накапливается по толщине: чем толще лист, тем он темнее. Бронза 6 мм и бронза 10 мм рядом на одном объекте выглядят как два разных цвета. Поэтому на одном объекте лучше держать одну толщину, а если толщины разные — согласовать образцы обеих.",
    },
    {
      lead: "Одна партия на объект.",
      text: "Оттенок тонированного стекла может немного отличаться от партии к партии. Объект лучше заказывать целиком, а дозаказ сверять с образцом из первой партии.",
    },
  ],
  layout: [
    {
      kind: "richText",
      md: "Доступные толщины в бронзе, графите и сером — по запросу: подтвердим в КП.",
    },
  ],
  applications: [
    { text: "Перегородки и двери" },
    { text: "Ограждения лестниц и балконов" },
    { text: "Мебель и столешницы" },
    { text: "Фасадные и витринные стёкла" },
  ],
  showSamples: true,
  faq: [
    {
      question: "Тонированное стекло можно закалить?",
      answer: "Да, тонированное в массе стекло закаливается как прозрачное.",
    },
    {
      question: "Чем тонированное стекло отличается от плёнки?",
      answer: `Цвет в стекле не царапается, не отслаивается и одинаков по всей площади. Плёнку можно снять или поменять. ${link(GLASS_TYPE_LINKS.plenki)}`,
    },
  ],
  limits: { ...TEMPERED_LIMITS },
  quizPrefill: { type: "tempered", kind: "tinted" },
};

/* ------------------------------------------------------------------------------------------ */
/* 08 §3. Крашеное по RAL                                                                     */
/* ------------------------------------------------------------------------------------------ */

const okrashennoe: GlassTypeContent = {
  slug: "okrashennoe",
  title: "Крашеное по RAL",
  urlBase: "zakalennoe-steklo",
  path: "/zakalennoe-steklo/okrashennoe/",
  breadcrumbLabel: "Крашеное по RAL",
  order: 4,
  showInHub: true,
  card: { title: "Крашеное по RAL", text: "толщина 4–15 мм, размер до 3000 × 1600 мм" },
  source: { file: "08-vidy-stekla.md", section: "# 3. Крашеное" },
  seo: {
    h1: "Крашеное закалённое стекло по RAL",
    title: "Цветное закалённое стекло по RAL — эмалит 4–15 мм | Inex Glass",
    description:
      "Стекло, окрашенное керамической краской и закалённое: цвет по RAL, размеры до 3000 × 1600 мм. Чем отличается от лакобеля — на странице.",
  },
  intro:
    "Непрозрачное цветное стекло для мебели, облицовки стен и колонн, лифтовых холлов. Краска наносится на одну сторону и вжигается в стекло при закалке, поэтому цвет не отслаивается. {условия}",
  tables: [
    {
      heading: "Параметры",
      role: "parameters",
      mobileMode: "cards",
      columns: [{ label: "Параметр" }, { label: "Значение" }],
      rows: [
        ["Цвет", "По каталогу RAL"],
        ["Толщина", "4–15 мм"],
        ["Размер", "от 350 × 150 до 3000 × 1600 мм"],
        ["Краска", "Керамическая, вжигается при закалке"],
      ],
    },
    {
      heading: "Лакобель и эмалит: не путайте",
      role: "comparison",
      mobileMode: "cards",
      columns: [{ label: " " }, { label: "Лакобель" }, { label: "Закалённое крашеное (эмалит)" }],
      rows: [
        ["Краска", "Органическая, сохнет на стекле", "Керамическая, вплавляется при закалке"],
        [
          "Закалка",
          "Нельзя: при 650–700 °C покрытие сгорает",
          "Краска вжигается в стекло при закалке",
        ],
        ["Прочность", "Как у обычного стекла", "Как у закалённого стекла"],
        ["Обработка после окраски", "Можно резать на месте", "Только до закалки, по чертежу"],
      ],
      footnote:
        "Если стекло работает на удар или нагрев — мебель в общественных местах, облицовка на высоте или рядом с нагревом, — нужно закалённое крашеное стекло.",
    },
  ],
  layout: [
    {
      kind: "richText",
      heading: "Светлые цвета",
      md: `Обычное стекло имеет зеленоватый оттенок. Под белой или светлой краской он заметен, и цвет получается «грязнее» образца RAL. Для белых и светлых оттенков используют основу из осветлённого стекла. ${link(GLASS_TYPE_LINKS.osvetlennoe)}`,
    },
    {
      kind: "callout",
      tone: "warning",
      title: IMPORTANT_TITLE,
      items: [
        {
          lead: "Цвет согласуйте по образцу, а не по экрану.",
          text: "Один и тот же RAL на мониторе, в каталоге и на стекле выглядит по-разному.",
        },
        {
          lead: "Вырезы под розетки и отверстия",
          text: `— по правилам ГОСТ: не ближе двух толщин стекла к кромке. ${link(GLASS_TYPE_LINKS.otverstiya)}`,
        },
        {
          lead: "Монтаж на клей",
          text: "— используйте клей, совместимый с краской на стекле (уточните у производителя клея).",
        },
      ],
    },
  ],
  applications: [
    { text: "Мебельные фасады и столешницы", link: GLASS_TYPE_LINKS.mebel },
    { text: "Облицовка стен, колонн, лифтовых холлов" },
    { text: "Маркерные доски" },
  ],
  showSamples: true,
  limits: {
    thickMin: 4,
    thickMax: 15,
    sizeMinW: 350,
    sizeMinH: 150,
    sizeMaxW: 3000,
    sizeMaxH: 1600,
  },
  quizPrefill: { type: "tempered", kind: "painted" },
};

/* ------------------------------------------------------------------------------------------ */
/* 08 §4. Осветлённое                                                                         */
/* ------------------------------------------------------------------------------------------ */

const osvetlennoe: GlassTypeContent = {
  slug: "osvetlennoe",
  title: "Осветлённое",
  urlBase: "zakalennoe-steklo",
  path: "/zakalennoe-steklo/osvetlennoe/",
  breadcrumbLabel: "Осветлённое",
  order: 1,
  showInHub: true,
  card: { title: "Осветлённое", text: "без зеленоватого оттенка на торце" },
  source: { file: "08-vidy-stekla.md", section: "# 4. Осветлённое" },
  seo: {
    h1: "Осветлённое закалённое стекло",
    title: "Осветлённое стекло оптивайт в закалке | Inex Glass",
    description:
      "Оптивайт и аналоги в закалке 4–19 мм: прозрачный торец для перегородок, ограждений и витрин. Когда осветлённое стоит своих денег.",
  },
  intro:
    "В обычном стекле есть оксиды железа, которые дают зелёный оттенок. В листе 4 мм его почти не видно, но на торце и в толстом стекле — 10, 12, 15 мм — зелень заметна сразу. В осветлённом стекле железа меньше: оно почти бесцветное и на торце, и в толщине. Торговые названия — Optiwhite, Diamant и аналоги. {условия}",
  // Captions of Osvetl.dc.html for «[Фото: торцы обычного и осветлённого стекла 12 мм рядом]».
  heroPhotoCaptions: ["Торец обычного стекла, 12 мм", "Торец осветлённого стекла, 12 мм"],
  tables: [
    {
      heading: "Когда осветлённое стоит своих денег",
      role: "comparison",
      mobileMode: "pairs",
      columns: [{ label: "Ситуация" }, { label: "Обычное" }, { label: "Осветлённое" }],
      rows: [
        [
          "Торец стекла на виду (ограждения, цельностеклянные перегородки, столешницы)",
          "Видна зелёная полоса",
          { value: "Торец прозрачный", positive: true },
        ],
        [
          "Толстое стекло 10–19 мм",
          "Заметный зелёный оттенок",
          { value: "Почти бесцветное", positive: true },
        ],
        [
          "Витрины, где важен цвет товара",
          "Искажает цвет",
          { value: "Цвет как есть", positive: true },
        ],
        [
          "Белое и светлое крашеное стекло",
          "Цвет «зеленит»",
          { value: "Цвет совпадает с образцом", positive: true },
        ],
        [
          "Стекло в раме или профиле, торец закрыт, толщина 4–8 мм",
          "Подходит",
          "Обычно переплата без видимой разницы",
        ],
      ],
    },
  ],
  importantItems: [
    {
      lead: "Не смешивайте на одном объекте.",
      text: "Осветлённое и обычное стекло рядом выглядят по-разному: соседнее обычное покажется зелёным.",
    },
    {
      lead: "Осветлённое бывает в триплексе.",
      text: `Для ограждений и козырьков из триплекса с видимым торцом стоит заказывать осветлённые стёкла во всех слоях. ${link(GLASS_TYPE_LINKS.tripleks)}`,
    },
    {
      lead: "Закалка не меняет оптику:",
      text: "стекло после закалки остаётся таким же прозрачным, как исходное.",
    },
  ],
  layout: [
    {
      kind: "richText",
      heading: "Размеры и обработка",
      md: `Толщина 4–19 мм; размер — от 150 × 300 до 3000 × 2000 мм. Полированная кромка, отверстия и вырезы — до закалки. ${link(GLASS_TYPE_LINKS.kromka)}`,
    },
  ],
  showSamples: true,
  faq: [
    {
      question: "Оптивайт и осветлённое стекло — это одно и то же?",
      answer:
        "Optiwhite — торговое название осветлённого стекла одного производителя. Есть аналоги других заводов.",
    },
    {
      question: "Насколько дороже обычного?",
      answer:
        "Зависит от толщины и объёма — укажем в КП рядом с ценой обычного стекла, чтобы вы могли сравнить.",
    },
  ],
  limits: { ...TEMPERED_LIMITS },
  quizPrefill: { type: "tempered", kind: "low-iron" },
};

/* ------------------------------------------------------------------------------------------ */
/* 08 §5. Для мебели                                                                          */
/* ------------------------------------------------------------------------------------------ */

const dlyaMebeli: GlassTypeContent = {
  slug: "dlya-mebeli",
  title: "Для мебели",
  urlBase: "zakalennoe-steklo",
  path: "/zakalennoe-steklo/dlya-mebeli/",
  breadcrumbLabel: "Для мебели",
  order: 7,
  showInHub: true,
  // teksty/02, «Для кого»: «Производителям мебели — …».
  card: {
    title: "Для мебели",
    text: "фасады и столешницы серией, кромка и отверстия под фурнитуру, без клейма по запросу",
  },
  source: {
    file: "08-vidy-stekla.md",
    section: "# 5. Закалённое стекло для производителей мебели",
  },
  seo: {
    h1: "Закалённое стекло для производителей мебели",
    title: "Стекло для мебели — фасады и столешницы серией | Inex Glass",
    description:
      "Закалённое стекло для мебельных фасадов и столешниц: кромка, отверстия под петли, без клейма по запросу. Серии от 50 м².",
  },
  intro:
    "Для мебельных фабрик и цехов: стекло для фасадов, столешниц и дверей серией по вашим чертежам. Стекло приходит с обработанной кромкой и отверстиями под петли и ручки — остаётся собрать изделие. {условия}",
  tables: [
    {
      heading: "Что поставляем",
      role: "comparison",
      mobileMode: "cards",
      columns: [{ label: "Изделие" }, { label: "Что важно" }],
      rows: [
        [
          "Фасады в алюминиевой рамке",
          "Точный размер под рамку, матовое, тонированное, крашеное стекло",
        ],
        [
          "Цельностеклянные фасады и дверцы",
          "Отверстия под петли и ручки по ГОСТ, полированная кромка",
        ],
        ["Столешницы", "Полированная кромка, «еврокромка»; осветлённое стекло — прозрачный торец"],
      ],
    },
  ],
  layout: [
    {
      kind: "richText",
      heading: "Для серии",
      md: [
        "- **Без клейма.** Клеймо на видимом стекле можно не ставить — отметьте это в заказе.",
        "- **Повторяемость цвета.** Тонированное, матовое и крашеное стекло для серии — одной партией. Дозаказ сверяем с образцом.",
        "- **Повторный заказ.** Повторите заказ по тем же файлам — укажите номер прошлого заказа.",
      ].join("\n"),
    },
    {
      kind: "richText",
      heading: "Отверстия под фурнитуру",
      md: `Отверстия под петли и ручки делаются до закалки по правилам ГОСТ 30698-2014: от кромки стекла — не ближе двух толщин, от угла — не ближе шести. Для стекла 4 мм это 8 и 24 мм, для 6 мм — 12 и 36 мм. Если петля требует другого положения — обсудим до запуска. ${link(GLASS_TYPE_LINKS.otverstiya)}`,
    },
    {
      kind: "richText",
      heading: "Виды стекла для мебели",
      md: [
        "Прозрачное и осветлённое · Матовое · Тонированное (бронза, графит) · Крашеное по RAL · Рифлёное · Гнутое",
        "",
        link(GLASS_TYPE_LINKS.vidy),
      ].join("\n"),
    },
    {
      kind: "richText",
      heading: "Упаковка",
      md: `Стёкла с полированной кромкой приезжают в обрешётке; состав упаковки согласуем — например, с прокладками между стёклами, чтобы кромки не соприкасались. Фото упаковки — при отгрузке. ${link(GLASS_TYPE_LINKS.upakovka)}`,
    },
  ],
  showSamples: true,
  limits: {},
  quizPrefill: { type: "tempered" },
};

/* ------------------------------------------------------------------------------------------ */
/* 16. Рифлёное                                                                               */
/* ------------------------------------------------------------------------------------------ */

const riflenoe: GlassTypeContent = {
  slug: "riflenoe",
  title: "Рифлёное",
  urlBase: "zakalennoe-steklo",
  path: "/zakalennoe-steklo/riflenoe/",
  breadcrumbLabel: "Рифлёное",
  order: 5,
  showInHub: true,
  card: { title: "Рифлёное", text: "узорчатое стекло" },
  source: { file: "16-riflenoe.md", section: null },
  seo: {
    h1: "Рифлёное закалённое стекло",
    title: "Рифлёное стекло мору, флутс — закалённое по размерам | Inex Glass",
    description:
      "Узорчатое стекло мору, флутс и другие в закалке. Направление рифления укажите в чертеже — проверим до запуска. Заказы от 50 м².",
  },
  intro:
    "Стекло с рельефом на одной стороне: пропускает свет, но размывает силуэты за собой. Рифлёное стекло вернулось в интерьеры — перегородки, двери, душевые, мебельные фасады. Изготавливаем в закалке по вашим чертежам. {условия}",
  heroPhotoCaptions: ["Образцы узоров на просвет, одинаковый масштаб"],
  variantsHeading: "Узоры",
  variants: [
    {
      key: "moru",
      name: "Мору (Moru)",
      description: "Ровные параллельные рёбра — стекло «в полоску»",
      application: "Перегородки, двери, душевые, мебельные фасады — самый востребованный узор",
      swatchKind: "pattern",
      patternKey: "moru",
    },
    {
      key: "fluts",
      name: "Флутс (Fluted)",
      description: "Тоже линейные рёбра; разные заводы называют похожие узоры по-разному",
      application: "Перегородки, фасады мебели, декоративные панели",
      swatchKind: "pattern",
      patternKey: "fluts",
    },
    {
      key: "shinshilla",
      name: "Шиншилла",
      description: "Мягкий мелкий рельеф, похожий на мех или рябь",
      application: "Межкомнатные двери, санузлы",
      swatchKind: "pattern",
      patternKey: "shinshilla",
    },
    {
      key: "delta",
      name: "Дельта",
      description: "Хаотичный рисунок, похожий на кору или морозные узоры",
      application: "Двери, кухонные фасады",
      swatchKind: "pattern",
      patternKey: "delta",
    },
    {
      key: "krizet",
      name: "Кризет",
      description: "Мелкая рельефная клетка, как плотная ткань",
      application: "Офисные перегородки, двери санузлов",
      swatchKind: "pattern",
      patternKey: "krizet",
    },
  ],
  variantsNote:
    "Есть и другие узоры — например, гезелла, атлантик, эстриадо. Наличие конкретного узора проверим по вашему заказу.",
  variantsCallout: {
    body: "**Узор согласуем по образцу.** Названия у разных заводов не совпадают: один и тот же «мору» может отличаться шириной рёбер. Перед запуском партии пришлём образец — бесплатно, около недели.",
  },
  tables: [
    {
      heading: "Толщины и цвета",
      role: "parameters",
      mobileMode: "cards",
      columns: [{ label: " " }, { label: " " }],
      rows: [
        ["Толщина в закалке", "4, 6, 8 мм"],
        ["Цвет", "Бесцветное и тонированное: бронза, серое и другие оттенки — по наличию"],
        ["Размер", "До 3000 × 2000 мм; точнее — по узору и толщине"],
      ],
    },
  ],
  importantItems: [
    {
      lead: "Направление рифления.",
      text: "Для линейных узоров — мору, флутс — укажите в чертеже, как должны идти рёбра: вертикально или горизонтально. Повернуть стекло на объекте нельзя, если размер не квадратный.",
    },
    {
      lead: "Какой стороной ставить.",
      text: "Рельеф с одной стороны, вторая — гладкая. Гладкую сторону обычно обращают туда, где стекло чаще трогают или моют: в душевой — внутрь, к воде.",
    },
    {
      lead: "Плоскостность и оптика.",
      text: "ГОСТ 30698-2014 не нормирует плоскостность и оптические искажения узорчатого стекла: рельеф сам искажает картинку. Если для проекта это важно, обсудим до заказа.",
    },
    {
      lead: "Отверстия и кромка",
      text: `— как у обычного закалённого стекла: всё до закалки, по правилам ГОСТ. ${link(GLASS_TYPE_LINKS.otverstiya)}`,
    },
    {
      lead: "Одна партия на объект.",
      text: "Рисунок и оттенок у разных партий могут немного отличаться — заказывайте объект целиком.",
    },
  ],
  layout: [
    {
      kind: "richText",
      heading: "Рифлёное в триплексе",
      md: `Рифлёное стекло можно склеить в триплекс — для дверей, перегородок и душевых, где нужна повышенная безопасность. Стёкла склеивают гладкими сторонами к плёнке, рельеф остаётся снаружи. Возможность для вашего узора и толщины проверим по заказу. ${link(GLASS_TYPE_LINKS.tripleks)}`,
    },
  ],
  applications: [
    { text: "Офисные и межкомнатные перегородки", link: GLASS_TYPE_LINKS.peregorodki },
    { text: "Душевые перегородки для гостиниц", link: GLASS_TYPE_LINKS.dushevye },
    { text: "Мебельные фасады и витрины", link: GLASS_TYPE_LINKS.mebel },
  ],
  // The sample offer is part of the «Узор согласуем по образцу» callout.
  showSamples: false,
  faq: [
    {
      question: "Чем мору отличается от флутс?",
      answer:
        "Оба узора — линейные рёбра. Отличаются шириной и профилем рёбер, причём у разных заводов по-разному. Надёжнее выбирать по образцу, а не по названию.",
    },
    { question: "Рифлёное стекло можно закалить?", answer: "Да, в толщинах 4, 6 и 8 мм." },
    {
      question: "Бывает ли мору в бронзе или графите?",
      answer: "Тонированное рифлёное стекло бывает; конкретный цвет и узор проверим по наличию.",
    },
  ],
  limits: { allowedThicknesses: [4, 6, 8], sizeMaxW: 3000, sizeMaxH: 2000 },
  quizPrefill: { type: "tempered", kind: "ribbed" },
};

/* ------------------------------------------------------------------------------------------ */
/* 12 §5. Гнутое                                                                              */
/* ------------------------------------------------------------------------------------------ */

const mollirovannoe: GlassTypeContent = {
  slug: "mollirovannoe",
  title: "Гнутое",
  urlBase: "zakalennoe-steklo",
  path: "/zakalennoe-steklo/mollirovannoe/",
  breadcrumbLabel: "Гнутое",
  order: 6,
  showInHub: true,
  card: {
    title: "Гнутое",
    text: "до 1200 × 2000 мм; радиус от 1000 мм для 4–6 мм и от 1500 мм для 8–12 мм",
  },
  source: { file: "12-p2-konstrukcii-steklo.md", section: "# 5. Гнутое" },
  seo: {
    h1: "Гнутое закалённое стекло",
    title: "Гнутое закалённое стекло на заказ | Inex Glass",
    description:
      "Гнутое закалённое стекло до 1200 × 2000 мм с радиусом от 1000 мм. Что указать в чертеже радиусного стекла — на странице.",
  },
  intro:
    "Радиусное стекло для ограждений, перегородок, остекления и торгового оборудования — гнутое и закалённое за один цикл. {условия}",
  tables: [
    {
      heading: "Параметры",
      role: "parameters",
      mobileMode: "cards",
      columns: [{ label: "Параметр" }, { label: "Значение" }],
      rows: [
        ["Размер", "от 150 × 350 до 1200 × 2000 мм"],
        ["Радиус изгиба", "от 1000 мм — для стекла 4–6 мм; от 1500 мм — для 8–12 мм"],
        ["Стекло", "Закалённое"],
      ],
      footnote:
        "Поставляем только гнутое закалённое стекло. Художественное моллирование малых радиусов (незакалённое) не делаем.",
    },
  ],
  layout: [
    {
      kind: "richText",
      heading: "Как указать гнутое стекло в чертеже",
      md: [
        "Задайте геометрию одним из способов:",
        "",
        "- радиус и длина дуги (или центральный угол);",
        "- хорда и стрела прогиба.",
        "",
        "Плюс высота (прямая сторона), толщина, сторона, по которой задан радиус, — внутренняя или наружная, и отверстия с координатами по развёртке.",
      ].join("\n"),
    },
    {
      kind: "callout",
      tone: "warning",
      title: "Что важно знать",
      items: [
        { text: "Отверстия и вырезы делаются до гибки и закалки — как и у плоского стекла." },
        {
          text: "Оптические искажения гнутого стекла ГОСТ 30698-2014 не нормирует: если для проекта важна оптика, обсудим это до заказа.",
        },
        { text: "Несколько гнутых стёкол в одной конструкции заказывайте одной партией." },
      ],
    },
  ],
  showSamples: false,
  limits: {
    thickMin: 4,
    thickMax: 12,
    sizeMinW: 150,
    sizeMinH: 350,
    sizeMaxW: 1200,
    sizeMaxH: 2000,
    radius: [
      { thicknessFrom: 4, thicknessTo: 6, minRadius: 1000 },
      { thicknessFrom: 8, thicknessTo: 12, minRadius: 1500 },
    ],
  },
  quizPrefill: { type: "tempered", kind: "bent" },
};

/* ------------------------------------------------------------------------------------------ */
/* 12 §6. Триплекс                                                                            */
/* ------------------------------------------------------------------------------------------ */

const tripleks: GlassTypeContent = {
  slug: "tripleks",
  title: "Триплекс",
  urlBase: "root",
  path: "/tripleks/",
  breadcrumbLabel: "Триплекс",
  order: 8,
  showInHub: false,
  // No card text in teksty («Рядом: Триплекс» only): the card shows the title.
  card: { title: "Триплекс" },
  source: { file: "12-p2-konstrukcii-steklo.md", section: "# 6. Триплекс" },
  seo: {
    h1: "Триплекс на заказ",
    title: "Стекло триплекс на заказ — закалённый, плёнка EVA | Inex Glass",
    description:
      "Многослойное стекло по ГОСТ 30826-2014: закалённое до 3000 × 2000 мм, плёнка EVA, со вставками. Схему подберём под нагрузку.",
  },
  intro:
    "**Триплекс** — многослойное стекло: два стекла и больше, склеенных прочной плёнкой. При ударе стекло трескается, но осколки остаются на плёнке, а полотно — в проёме. Поэтому триплекс ставят там, где выпавшее стекло опасно: ограждения, козырьки, кровли, полы, витрины. Изготавливаем по ГОСТ 30826-2014. {условия}",
  tables: [
    {
      heading: "Схемы",
      lead: "Формула триплекса — толщины стёкол через «+»: 6+6 — два стекла по 6 мм.",
      role: "schemes",
      mobileMode: "cards",
      columns: [
        { label: "Схема" },
        { label: "Толщина с плёнкой" },
        { label: "Вес 1 м²" },
        { label: "Где применяют" },
      ],
      rows: [
        ["4+4", "≈ 8,4–8,8 мм", "≈ 20 кг", "Остекление, где нужна безопасность при разрушении"],
        ["5+5", "≈ 10,4–10,8 мм", "≈ 25 кг", "Перегородки, двери, витрины"],
        [
          "6+6",
          "≈ 12,4–13,5 мм",
          "≈ 30 кг",
          "Ограждения лестниц и балконов, панорамное остекление",
        ],
        ["8+8", "≈ 16,8–17,5 мм", "≈ 40 кг", "Ограждения без стоек, козырьки"],
        ["10+10", "≈ 21,1–21,5 мм", "≈ 50 кг", "Ступени, полы, фасады высотных зданий"],
        ["12+12", "≈ 25,5–26,3 мм", "≈ 60 кг", "Крупные несущие элементы"],
      ],
      footnote: `Бывают несимметричные схемы (например, 8+6 — лучше гасят звук) и многослойные (три стекла и больше). Таблица — ориентир: схему для вашей конструкции подбирает расчётом инженер. ${link(GLASS_TYPE_LINKS.proektirovanie)}`,
    },
    {
      heading: "Закалённый или из сырого стекла",
      role: "comparison",
      mobileMode: "cards",
      columns: [{ label: " " }, { label: "Из сырого стекла" }, { label: "Из закалённого стекла" }],
      rows: [
        ["Прочность на удар и изгиб", "Как у обычного стекла", "В несколько раз выше"],
        ["Размер", "до 3500 × 2500 мм", "до 3000 × 2000 мм"],
        [
          "Где нужен",
          "Остекление без нагрузки",
          "Ограждения, козырьки, полы, ступени — всё, что несёт нагрузку",
        ],
      ],
      footnote: "Козырьки и кровли делаем **только из закалённого триплекса**.",
    },
  ],
  layout: [
    {
      kind: "richText",
      heading: "Плёнка",
      md: [
        "Склеиваем плёнкой **EVA**: она влагостойкая, подходит для наружных конструкций и задерживает ультрафиолет. Плёнка весит около 0,36 кг на м² на слой 0,38 мм.",
        "",
        "Триплекс бывает со вставками — тканью, бумагой, декоративной сеткой.",
      ].join("\n"),
    },
    {
      kind: "richText",
      heading: "Ударостойкость",
      md: "Ударостойкость триплекса подтверждаем сертификатами на продукцию. Если в проекте указан класс защиты, пришлите требования — проверим, какой триплекс им соответствует.",
    },
    {
      kind: "callout",
      tone: "warning",
      title: "Что важно знать",
      items: [
        {
          lead: "Смещение слоёв по кромке",
          text: "— при склейке стёкла могут сместиться на доли миллиметра. Если торец на виду, укажите это в заказе — учтём в спецификации.",
        },
        { lead: "Цветная плёнка", text: "— оттенок согласуйте по образцу до запуска партии." },
        { lead: "Срок", text: "— от 14 рабочих дней с даты договора." },
      ],
    },
  ],
  showSamples: false,
  limits: {
    sizeMaxW: 3000,
    sizeMaxH: 2000,
    notes: "Закалённый — до 3000 × 2000 мм; из сырого стекла — до 3500 × 2500 мм.",
  },
  quizPrefill: { type: "triplex" },
};

/** The eight documents, in hub order of `order`. */
export const GLASS_TYPES_CONTENT: readonly GlassTypeContent[] = [
  osvetlennoe,
  matovoe,
  tonirovannoe,
  okrashennoe,
  riflenoe,
  mollirovannoe,
  dlyaMebeli,
  tripleks,
];

/* ------------------------------------------------------------------------------------------ */
/* Section rhythm of the template                                                             */
/* ------------------------------------------------------------------------------------------ */

export type SeedBackground = "bg" | "sf";

/**
 * Explicit backgrounds for the `layout` blocks, matching the bg ↔ sf rhythm of `GlassTypePage`:
 * the hero is `bg`; variants, every table and «Что важно знать» take one section each before
 * the layout. Seeded explicitly so the page keeps its rhythm if the template order is tuned.
 */
export function layoutBackgrounds(doc: GlassTypeContent): SeedBackground[] {
  const before =
    1 +
    ((doc.variants?.length ?? 0) > 0 ? 1 : 0) +
    (doc.tables?.length ?? 0) +
    ((doc.importantItems?.length ?? 0) > 0 ? 1 : 0);
  return (doc.layout ?? []).map((_, index) => ((before + index) % 2 === 0 ? "bg" : "sf"));
}
