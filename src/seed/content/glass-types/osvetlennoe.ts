import { EMPTY_HEADER, GLASS_TYPE_LINKS, TEMPERED_LIMITS, link } from "./shared";
import type { GlassTypeContent } from "./types";

/**
 * «Осветлённое» — moved to the new glass-type design (reference: «Матовое», `./matovoe.ts`;
 * there is no `2560_glass_osvetlennoe` artboard, the page reuses the reference section set).
 * Section → field mapping: `./README.md`.
 *
 * Every teksty/08 §4 fact is kept: the edge photo pair (`heroPhotoCaptions`) and the comparison
 * table «Когда осветлённое стоит своих денег» with its four `positive` cells stay where the unit
 * and e2e tests look for them (`tables[]`). Facts from other Inex texts (teksty 08 «Крашеное» and
 * «Для мебели», 11, 12, 13; SSoT §44) are used as approved. Statements that are not Inex content
 * (paraphrased industry data) are listed in `copy.pendingApproval` and in
 * `docs/inex/drafts/service-pages-paper-drafts.md`.
 */

/** Statements awaiting the client's approval, verbatim (each must occur in the copy below). */
const PENDING_APPROVAL = [
  "У обычного стекла меньше, и разница растёт с толщиной",
  "Пропускает до 91 % видимого света и передаёт цвета без искажений",
  "Ниже, падает с толщиной",
  "Осветлённое стекло выбирают там, где видны торец и толщина стекла или важен цвет за ним.",
  "Аквариумы, кухонные фартуки, печать на стекле",
  "Нет чертежа? Пришлите размеры и эскиз от руки — менеджер уточнит остальное.",
  "Осветлённое стекло считается за м² листа; обработка кромки и отверстия — отдельно.",
] as const;

export const OSVETLENNOE: GlassTypeContent = {
  slug: "osvetlennoe",
  title: "Осветлённое",
  urlBase: "zakalennoe-steklo",
  path: "/zakalennoe-steklo/osvetlennoe/",
  breadcrumbLabel: "Осветлённое",
  order: 1,
  showInHub: true,
  card: { title: "Осветлённое", text: "без зеленоватого оттенка на торце" },
  source: { file: "08-vidy-stekla.md", section: "# 4. Осветлённое" },
  copy: {
    source: "paper",
    mockup: "2560_glass_osvetlennoe",
    pendingApproval: PENDING_APPROVAL,
  },
  seo: {
    h1: "Осветлённое закалённое стекло",
    title: "Осветлённое стекло оптивайт в закалке | Inex Glass",
    description:
      "Оптивайт и аналоги в закалке 4–19 мм: прозрачный торец для перегородок, ограждений и витрин. Когда осветлённое стоит своих денег.",
  },

  // 1. hero: a short lead (the full explanation of teksty moved to «about»), no `{условия}` —
  // the terms are the hero ticks. No `heroImage` yet: the hero shows the «фото готовится» plate.
  intro:
    "В осветлённом стекле меньше железа, чем в обычном: оно почти бесцветное и на торце, и в толщине. Его выбирают для цельностеклянных перегородок, ограждений, витрин и светлого крашеного стекла. Поставляем в закалке по вашим чертежам.",
  // Captions of Osvetl.dc.html for «[Фото: торцы обычного и осветлённого стекла 12 мм рядом]»
  // (rendered as `heroPhotos` under the hero; checked by e2e).
  heroPhotoCaptions: ["Торец обычного стекла, 12 мм", "Торец осветлённого стекла, 12 мм"],

  // 2. specs
  specs: [
    {
      label: "Размер в закалке",
      value: "3000 × 2000",
      text: "Максимальный размер листа, мм. Минимальный — 150 × 300 мм",
    },
    {
      label: "Толщина",
      value: "4–19 мм",
      text: "Для витрин обычно берут 8, 10 и 12 мм",
    },
    {
      label: "Светопропускание",
      value: "до 91 %",
      text: "У обычного стекла меньше, и разница растёт с толщиной",
    },
    {
      label: "Торец",
      value: "Прозрачный",
      text: "Без зелёной полосы, которая видна на торце обычного стекла",
      accent: true,
    },
  ],

  // Legacy site table (teksty/08 §4), kept in `tables[]`: the unit test counts its four
  // `positive` rows and e2e its `td[data-positive]` cells / five `.ig-pair` on phones. The about
  // panel's table has no `positive` cells, so the table cannot move there without a test change.
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

  layout: [
    // 3. about: the teksty explanation (former hero lead) + the old «Размеры и обработка» block,
    // with a compact «обычное vs осветлённое» panel on the right.
    {
      kind: "richText",
      heading: "Чем осветлённое отличается от обычного",
      md: [
        "В обычном стекле есть оксиды железа, которые дают зелёный оттенок. В листе 4 мм его почти не видно, но на торце и в толстом стекле — 10, 12, 15 мм — зелень заметна сразу. В осветлённом стекле железа меньше: оно почти бесцветное и на торце, и в толщине.",
        "",
        "Торговые названия — Optiwhite, Diamant и аналоги.",
        "",
        "- Толщина 4–19 мм; размер — от 150 × 300 до 3000 × 2000 мм",
        `- Полированная кромка, отверстия и вырезы — до закалки → ${link(GLASS_TYPE_LINKS.kromka)}`,
        "- Закалка не меняет оптику: стекло после закалки остаётся таким же прозрачным, как исходное",
        "- Пропускает до 91 % видимого света и передаёт цвета без искажений",
      ].join("\n"),
      table: {
        caption: "Обычное и осветлённое стекло",
        columns: [EMPTY_HEADER, "Обычное", "Осветлённое"],
        highlightColumn: 3,
        rows: [
          ["Оттенок", "Зеленоватый", "Почти бесцветное"],
          ["Торец", "Видна зелёная полоса", "Торец прозрачный"],
          ["Светопропускание", "Ниже, падает с толщиной", "До 91 %"],
          ["Обработка", "Закалка, триплекс, кромка", "То же; закалка не меняет оптику"],
        ],
      },
    },

    // 4. use-cases: 6 cards, 3 per row; links point to the pages where teksty recommend it.
    {
      kind: "cards",
      heading: "Где применяют",
      sub: "Осветлённое стекло выбирают там, где видны торец и толщина стекла или важен цвет за ним.",
      columns: 3,
      items: [
        {
          title: "Цельностеклянные перегородки",
          text: "Торец на виду: в обычном толстом стекле он зеленит",
          href: GLASS_TYPE_LINKS.peregorodki.url,
        },
        {
          title: "Ограждения",
          text: "Торец ограждения на виду, а в толстом обычном стекле он зеленит",
          href: "/steklyannye-ograzhdeniya/",
        },
        {
          title: "Витрины и магазины",
          text: "Товар за стеклом — в своём цвете, торцы не зеленят; 8, 10, 12 мм",
          href: "/osteklenie/vitrin-i-magazinov/",
        },
        {
          title: "Столешницы и мебель",
          text: "Полированная кромка и прозрачный торец",
          href: GLASS_TYPE_LINKS.mebel.url,
        },
        {
          title: "Светлое крашеное стекло",
          text: "Белые и светлые цвета RAL — на осветлённой основе, цвет совпадает с образцом",
          href: "/zakalennoe-steklo/okrashennoe/",
        },
        {
          title: "Интерьер и декор",
          text: "Аквариумы, кухонные фартуки, печать на стекле",
          href: "/obrabotka-stekla/pechat/",
        },
      ],
    },

    // 9. how-to-order: two panels
    {
      kind: "twoColumns",
      left: {
        heading: "Как заказать",
        md: [
          "Чтобы посчитать осветлённое стекло, хватит трёх параметров.",
          "",
          "### Укажите в заявке:",
          "",
          "1. Размеры и толщину стекла",
          "2. Вид стекла: осветлённое — для всех стёкол объекта, которые стоят рядом",
          "3. Обработку кромки, отверстия и вырезы — в чертеже",
          "",
          "> Нет чертежа? Пришлите размеры и эскиз от руки — менеджер уточнит остальное.",
        ].join("\n"),
      },
      right: {
        heading: "Как считается цена",
        md: [
          "Осветлённое стекло считается за м² листа; обработка кромки и отверстия — отдельно.",
          "",
          "### На цену влияют:",
          "",
          "- Толщина и площадь",
          "- Объём заказа",
          "- Обработка: кромка, отверстия, вырезы",
          "",
          "> Точная стоимость — в КП после проверки чертежа, в среднем за 2–3 рабочих дня.",
        ].join("\n"),
      },
    },
  ],

  // 5. callout «Что важно знать до заказа» (the teksty line «Закалка не меняет оптику» moved
  // into the about list; «Одна партия» — teksty/11, purchase for the whole object).
  importantItems: [
    {
      lead: "Не смешивайте на одном объекте.",
      text: "Осветлённое и обычное стекло рядом выглядят по-разному: соседнее обычное покажется зелёным.",
    },
    {
      lead: "Одна партия.",
      text: "Стекло для объекта закупаем на весь объём сразу — так осветлённое стекло во всей партии одного оттенка.",
    },
    {
      lead: "Осветлённое бывает в триплексе.",
      text: `Для ограждений и козырьков из триплекса с видимым торцом стоит заказывать осветлённые стёкла во всех слоях. ${link(GLASS_TYPE_LINKS.tripleks)}`,
    },
  ],
  importantButton: GLASS_TYPE_LINKS.kromka,

  // 6. samples
  showSamples: true,

  // 7. FAQ (teksty/08 §4 + one answer from the teksty facts on tempering and triplex)
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
    {
      question: "Осветлённое стекло можно закалить и собрать в триплекс?",
      answer:
        "Да. Закалка не меняет оптику: стекло остаётся таким же прозрачным. В триплексе с видимым торцом осветлёнными делают все слои.",
    },
  ],

  // 8. «Другие виды стекла»: the types the page itself refers to (светлое крашеное, триплекс,
  // столешницы).
  related: ["okrashennoe", "tripleks", "dlya-mebeli"],

  limits: { ...TEMPERED_LIMITS },
  quizPrefill: { type: "tempered", kind: "low-iron" },
};
