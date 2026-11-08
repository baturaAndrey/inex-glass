import { EMPTY_HEADER, GLASS_TYPE_LINKS, link } from "./shared";
import type { GlassTypeContent } from "./types";

/**
 * «Рифлёное» — moved to the new page design of the reference «Матовое» (there is no own mockup
 * `2560_glass_riflenoe` yet: the section set is the reference's). Section → field mapping:
 * `./README.md`. Every fact of teksty/16 is kept (re-arranged into the new sections); the
 * statements that are not Inex's — technical background paraphrased from open sources and new
 * wording of the order panels — are in `copy.pendingApproval` and in
 * `docs/inex/drafts/service-pages-paper-drafts.md`.
 *
 * Inex facts win over any other source: tempered thicknesses 4, 6, 8 mm, size up to
 * 3000 × 2000 mm, colours by availability, patterns as general reference (availability per order).
 */

/** Statements awaiting the client's approval, verbatim (each must occur in the copy below). */
const PENDING_APPROVAL = [
  "У бесцветного узорчатого стекла; у тонированного и плотных узоров — меньше",
  "Рифлёное стекло получают прокатом: горячее стекло проходит между валами, на одном из них — рельеф. Узор отпечатывается на одной стороне листа, вторая остаётся гладкой.",
  "Рисунок без выраженного направления: стекло проще раскроить",
  "Мягкой тканью и средством для стекла без абразива: абразив повреждает рельеф.",
  "Чтобы посчитать рифлёное стекло, хватит четырёх параметров.",
  "Нет чертежа? Пришлите размеры и эскиз от руки — менеджер уточнит остальное.",
  "Рифлёное стекло считается за м² листа; обработка кромки и отверстия — отдельно.",
] as const;

export const RIFLENOE: GlassTypeContent = {
  slug: "riflenoe",
  title: "Рифлёное",
  urlBase: "zakalennoe-steklo",
  path: "/zakalennoe-steklo/riflenoe/",
  breadcrumbLabel: "Рифлёное",
  order: 5,
  showInHub: true,
  card: { title: "Рифлёное", text: "узорчатое стекло" },
  source: { file: "16-riflenoe.md", section: null },
  copy: { source: "paper", mockup: "2560_glass_riflenoe", pendingApproval: PENDING_APPROVAL },
  seo: {
    h1: "Рифлёное закалённое стекло",
    title: "Рифлёное стекло мору, флутс — закалённое по размерам | Inex Glass",
    description:
      "Узорчатое стекло мору, флутс и другие в закалке. Направление рифления укажите в чертеже — проверим до запуска. Заказы от 50 м².",
  },

  // 1. hero (no photo yet: the hero shows the «фото готовится» placeholder until one is
  // uploaded in the admin). Without `{условия}`: the terms are the hero ticks.
  intro:
    "Стекло с рельефом на одной стороне: пропускает свет, но размывает силуэты за собой. Рифлёное стекло вернулось в интерьеры — перегородки, двери, душевые, мебельные фасады. Изготавливаем в закалке по вашим чертежам.",

  // 2. specs: the old «Толщины и цвета» table moved into the tiles (all three rows, verbatim).
  specs: [
    {
      label: "Размер в закалке",
      value: "3000 × 2000",
      text: "До 3000 × 2000 мм; точнее — по узору и толщине",
    },
    {
      label: "Толщина в закалке",
      value: "4, 6, 8 мм",
      text: "Рифлёное стекло закаливают в толщинах 4, 6 и 8 мм",
    },
    {
      label: "Светопропускание",
      value: "65–75 %",
      text: "У бесцветного узорчатого стекла; у тонированного и плотных узоров — меньше",
    },
    {
      label: "Цвет",
      value: "Бронза, серое",
      text: "Бесцветное и тонированное: бронза, серое и другие оттенки — по наличию",
      accent: true,
    },
  ],

  layout: [
    // 3. about: how it is made + comparison of linear and relief patterns. The old
    // «Рифлёное в триплексе» section is the last paragraph (verbatim, with its link).
    {
      kind: "richText",
      heading: "Что такое рифлёное стекло",
      md: [
        "Рифлёное стекло получают прокатом: горячее стекло проходит между валами, на одном из них — рельеф. Узор отпечатывается на одной стороне листа, вторая остаётся гладкой.",
        "",
        "- Пропускает свет, но размывает силуэты за собой",
        "- Рельеф с одной стороны, вторая — гладкая",
        "- Отверстия и кромка — как у обычного закалённого стекла: всё до закалки, по правилам ГОСТ",
        "- ГОСТ 30698-2014 не нормирует плоскостность и оптические искажения узорчатого стекла: рельеф сам искажает картинку",
        "",
        `Рифлёное стекло можно склеить в триплекс — для дверей, перегородок и душевых, где нужна повышенная безопасность. Стёкла склеивают гладкими сторонами к плёнке, рельеф остаётся снаружи. Возможность для вашего узора и толщины проверим по заказу. ${link(GLASS_TYPE_LINKS.tripleks)}`,
      ].join("\n"),
      table: {
        caption: "Линейные и рельефные узоры",
        columns: [EMPTY_HEADER, "Линейные", "Рельефные"],
        highlightColumn: 2,
        rows: [
          ["Узоры", "Мору, флутс", "Шиншилла, дельта, кризет"],
          [
            "Как выглядит",
            "Ровные параллельные рёбра — стекло «в полоску»",
            "Рельеф без рёбер: рябь, кора, клетка",
          ],
          [
            "Направление",
            "**Укажите в чертеже:** рёбра вертикально или горизонтально",
            "Рисунок без выраженного направления: стекло проще раскроить",
          ],
          [
            "Где чаще применяют",
            "Перегородки, двери, душевые, мебельные фасады",
            "Межкомнатные двери, санузлы, кухонные фасады",
          ],
        ],
      },
    },

    // 4. use-cases: 4 cards. The links of the old «Где применяют» row moved onto the cards.
    {
      kind: "cards",
      heading: "Где применяют",
      sub: "Рифлёное стекло вернулось в интерьеры — перегородки, двери, душевые, мебельные фасады.",
      columns: 4,
      items: [
        {
          title: "Офисные и межкомнатные перегородки",
          text: "Мору и кризет: свет проходит, силуэты за стеклом размыты",
          href: GLASS_TYPE_LINKS.peregorodki.url,
        },
        {
          title: "Душевые перегородки для гостиниц",
          text: "Гладкую сторону обращают внутрь, к воде",
          href: GLASS_TYPE_LINKS.dushevye.url,
        },
        {
          title: "Мебельные фасады и витрины",
          text: "Мору, флутс и дельта — для фасадов мебели и декоративных панелей",
          href: GLASS_TYPE_LINKS.mebel.url,
        },
        {
          title: "Межкомнатные двери",
          text: "Шиншилла, дельта и кризет — для дверей и санузлов",
        },
      ],
    },

    // 9. how-to-order: two panels
    {
      kind: "twoColumns",
      left: {
        heading: "Как заказать",
        md: [
          "Чтобы посчитать рифлёное стекло, хватит четырёх параметров.",
          "",
          "### Укажите в заявке:",
          "",
          "1. Размеры и толщину стекла: 4, 6 или 8 мм",
          "2. Узор и цвет",
          "3. Направление рёбер для мору и флутс — в чертеже",
          "4. Сторону рельефа",
          "",
          "> Нет чертежа? Пришлите размеры и эскиз от руки — менеджер уточнит остальное.",
        ].join("\n"),
      },
      right: {
        heading: "Как считается цена",
        md: [
          "Рифлёное стекло считается за м² листа; обработка кромки и отверстия — отдельно.",
          "",
          "### На цену влияют:",
          "",
          "- Узор и цвет",
          "- Толщина и площадь",
          "- Обработка: кромка, отверстия, вырезы",
          "",
          "> Точная стоимость — в КП после проверки чертежа, в среднем за 2–3 рабочих дня.",
        ].join("\n"),
      },
    },
  ],

  // Patterns: rendered right after the about section (keys are checked by the slice test).
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

  // 5. callout «Что важно знать до заказа» (teksty items + care)
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
      lead: "Одна партия на объект.",
      text: "Рисунок и оттенок у разных партий могут немного отличаться — заказывайте объект целиком.",
    },
    {
      lead: "Уход.",
      text: "Мягкой тканью и средством для стекла без абразива: абразив повреждает рельеф.",
    },
  ],
  // The old «Отверстия и кромка → Отверстия и вырезы» line: its fact is in the about list,
  // its link is the plaque button.
  importantButton: GLASS_TYPE_LINKS.otverstiya,

  // 6. samples: the sample offer is part of the «Узор согласуем по образцу» plaque.
  showSamples: false,

  // 7. FAQ (teksty, verbatim)
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

  // 8. «Другие виды стекла»: privacy alternative, tinted (tinted ribbed glass), triplex.
  related: ["matovoe", "tonirovannoe", "tripleks"],

  limits: { allowedThicknesses: [4, 6, 8], sizeMaxW: 3000, sizeMaxH: 2000 },
  quizPrefill: { type: "tempered", kind: "ribbed" },
};
