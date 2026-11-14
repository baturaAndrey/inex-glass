import { EMPTY_HEADER, GLASS_TYPE_LINKS, TEMPERED_LIMITS, link } from "./shared";
import type { GlassTypeContent } from "./types";

/**
 * «Тонированное» — moved to the new page design of the reference «Матовое» (`./matovoe.ts`).
 * There is no own mockup yet: the sections are those of `2560_glass_matovoe`, filled with the
 * teksty facts of this type (teksty/08 §2, every one kept) and paraphrased technical notes
 * (priorglass.ru, by agreement). Every statement that is not Inex copy is listed in
 * `copy.pendingApproval` and in `docs/inex/drafts/service-pages-paper-drafts.md`.
 */

/** Statements not taken from Inex copy, verbatim as below (each must occur in the copy). */
const PENDING_APPROVAL = [
  "Красители добавляют в стекломассу при варке на заводе стекла, поэтому цвет одинаков по всей площади листа и на кромке.",
  "Приглушает яркий солнечный свет и снижает нагрев помещения за стеклом",
  "Режут, обрабатывают кромку и сверлят до закалки — как прозрачное стекло",
  "На солнце тонированное стекло нагревается сильнее прозрачного; закалённое лучше переносит перепад температур",
  "Слой на поверхности стекла",
  "Плёнку можно поцарапать, по краям она может отслоиться",
  "Нет: цвет — часть стекла",
  "Тонированное стекло приглушает свет и добавляет интерьеру цвета.",
  "Офисные перегородки и цельностеклянные двери: зонирование без глухой стены",
  "Лестницы, балконы и террасы: цвет стекла в тон отделке",
  "Фасады шкафов, витрины и столешницы в бронзе или графите",
  "Приглушают солнце и нагрев в помещении, скрывают интерьер от взгляда с улицы днём",
  "На торце тонированное стекло выглядит темнее, чем на плоскости: свет проходит через всю ширину листа. Учитывайте это для открытых кромок мебели и ограждений.",
  "Да, но темнее прозрачного: чем темнее оттенок и толще лист, тем меньше света проходит и тем хуже видно, что за стеклом. Если нужна полная приватность, подойдёт матовое стекло — сатин тоже бывает в бронзе и сером.",
  "Тонированное стекло считается за м² листа; обработка кромки и отверстия — отдельно.",
] as const;

export const TONIROVANNOE: GlassTypeContent = {
  slug: "tonirovannoe",
  title: "Тонированное",
  urlBase: "zakalennoe-steklo",
  path: "/zakalennoe-steklo/tonirovannoe/",
  breadcrumbLabel: "Тонированное",
  order: 3,
  showInHub: true,
  card: { title: "Тонированное", text: "бронза, графит, серое" },
  source: { file: "08-vidy-stekla.md", section: "# 2. Тонированное" },
  // No own artboard yet: the mockup id follows the convention (the slice test requires it).
  copy: { source: "paper", mockup: "2560_glass_tonirovannoe", pendingApproval: PENDING_APPROVAL },
  seo: {
    h1: "Тонированное закалённое стекло",
    title: "Тонированное стекло — бронза, графит, серое в закалке | Inex Glass",
    description:
      "Бронза, графит и серое стекло 4–19 мм в закалке. Оттенок зависит от толщины — согласуем образец до запуска партии.",
  },

  // 1. hero: the teksty lead without `{условия}` (the terms are the hero ticks); own 16:9 photo
  // (client request 2026-11-10).
  heroImage: {
    file: "hero/tonirovannoe.webp",
    alt: "Тонированное стекло серого и бронзового оттенка в перегородке и ограждении",
  },
  intro:
    "Тонированное стекло окрашено в массе: цвет не нанесён сверху, а есть во всём объёме листа. Оно не стирается и не выгорает. Применяют его в перегородках, ограждениях, мебели и фасадах.",
  // The teksty note «[Фото: три образца на белом фоне и на просвет]» was a lone placeholder under
  // the hero (`heroPhotos`); dropped in the new design — the samples photo goes to the hero
  // via the admin when it arrives (drafts doc, «Тонированное»).

  // 2. specs: Inex facts only (17-meta, teksty, SSoT limits)
  specs: [
    {
      label: "Размер в закалке",
      value: "3000 × 2000",
      text: "Максимальный размер листа, мм. Минимальный — 150 × 300 мм",
    },
    {
      label: "Толщина",
      value: "4–19 мм",
      text: "Чем толще лист, тем он темнее",
    },
    {
      label: "Цвета",
      value: "3",
      text: "Бронза, графит и серое",
    },
    {
      label: "Окраска",
      value: "В массе",
      text: "Цвет не стирается и не выгорает",
      accent: true,
    },
  ],

  // Colours: rendered right after the about section (template rule).
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
  // teksty line (was a plain text block of the old layout).
  variantsNote: "Доступные толщины в бронзе, графите и сером — по запросу: подтвердим в КП.",

  layout: [
    // 3. about: text + comparison with the tinting film (facts of the teksty FAQ)
    {
      kind: "richText",
      heading: "Как окрашено тонированное стекло",
      md: [
        "Красители добавляют в стекломассу при варке на заводе стекла, поэтому цвет одинаков по всей площади листа и на кромке.",
        "",
        "Цвет окрашенного в массе стекла накапливается по толщине: чем толще лист, тем он темнее.",
        "",
        "- Приглушает яркий солнечный свет и снижает нагрев помещения за стеклом",
        "- Режут, обрабатывают кромку и сверлят до закалки — как прозрачное стекло",
        "- На солнце тонированное стекло нагревается сильнее прозрачного; закалённое лучше переносит перепад температур",
      ].join("\n"),
      table: {
        caption: "Тонированное стекло и тонирующая плёнка",
        columns: [EMPTY_HEADER, "В массе", "Плёнка"],
        highlightColumn: 2,
        rows: [
          ["Где цвет", "Во всём объёме листа", "Слой на поверхности стекла"],
          [
            "Износ",
            "Цвет в стекле не царапается и не отслаивается",
            "Плёнку можно поцарапать, по краям она может отслоиться",
          ],
          ["Замена", "Нет: цвет — часть стекла", "Плёнку можно снять или поменять"],
          [
            "Как заказывать",
            "Как вид стекла",
            `Как обработку стекла → ${link(GLASS_TYPE_LINKS.plenki)}`,
          ],
        ],
      },
    },

    // 4. use-cases: the four teksty «Где применяют» items as cards (titles verbatim).
    {
      kind: "cards",
      heading: "Где применяют",
      sub: "Тонированное стекло приглушает свет и добавляет интерьеру цвета.",
      columns: 4,
      items: [
        {
          title: "Перегородки и двери",
          image: {
            file: "cards/tonirovannoe-1.webp",
            alt: "Перегородка и дверь из тонированного стекла",
          },
          text: "Офисные перегородки и цельностеклянные двери: зонирование без глухой стены",
          href: GLASS_TYPE_LINKS.peregorodki.url,
        },
        {
          title: "Ограждения лестниц и балконов",
          image: {
            file: "cards/tonirovannoe-2.webp",
            alt: "Ограждение лестницы из тонированного стекла",
          },
          text: "Лестницы, балконы и террасы: цвет стекла в тон отделке",
        },
        {
          title: "Мебель и столешницы",
          image: {
            file: "cards/tonirovannoe-3.webp",
            alt: "Столешница и мебель из тонированного стекла",
          },
          text: "Фасады шкафов, витрины и столешницы в бронзе или графите",
          href: GLASS_TYPE_LINKS.mebel.url,
        },
        {
          title: "Фасадные и витринные стёкла",
          image: {
            file: "cards/tonirovannoe-4.webp",
            alt: "Фасадное и витринное остекление тонированным стеклом",
          },
          text: "Приглушают солнце и нагрев в помещении, скрывают интерьер от взгляда с улицы днём",
        },
      ],
    },

    // 9. how-to-order: two panels
    {
      kind: "twoColumns",
      left: {
        heading: "Как заказать",
        md: [
          "Чтобы посчитать тонированное стекло, хватит трёх параметров.",
          "",
          "### Укажите в заявке:",
          "",
          "1. Размеры и толщину стекла",
          "2. Цвет: бронза, графит или серое",
          "3. Обработку: кромку, отверстия, вырезы",
          "",
          "> Нужен точный оттенок? Согласуем образец до запуска партии.",
        ].join("\n"),
      },
      right: {
        heading: "Как считается цена",
        md: [
          "Тонированное стекло считается за м² листа; обработка кромки и отверстия — отдельно.",
          "",
          "### На цену влияют:",
          "",
          "- Цвет и толщина",
          "- Площадь и количество листов",
          "- Обработка: кромка, отверстия, вырезы",
          "",
          "> Точная стоимость — в КП после проверки чертежа, в среднем за 2–3 рабочих дня.",
        ].join("\n"),
      },
    },
  ],

  // 5. callout «Что важно знать до заказа»: the two teksty items + the edge note
  importantItems: [
    {
      lead: "Оттенок зависит от толщины.",
      text: "Цвет окрашенного в массе стекла накапливается по толщине: чем толще лист, тем он темнее. Бронза 6 мм и бронза 10 мм рядом на одном объекте выглядят как два разных цвета. Поэтому на одном объекте лучше держать одну толщину, а если толщины разные — согласовать образцы обеих.",
    },
    {
      lead: "Одна партия на объект.",
      text: "Оттенок тонированного стекла может немного отличаться от партии к партии. Объект лучше заказывать целиком, а дозаказ сверять с образцом из первой партии.",
    },
    {
      lead: "Цвет на кромке.",
      text: "На торце тонированное стекло выглядит темнее, чем на плоскости: свет проходит через всю ширину листа. Учитывайте это для открытых кромок мебели и ограждений.",
    },
  ],
  importantButton: GLASS_TYPE_LINKS.kromka,

  // 6. samples
  showSamples: true,

  // 7. FAQ: the two teksty questions + one on transparency
  faq: [
    {
      question: "Тонированное стекло можно закалить?",
      answer: "Да, тонированное в массе стекло закаливается как прозрачное.",
    },
    {
      question: "Чем тонированное стекло отличается от плёнки?",
      answer: `Цвет в стекле не царапается, не отслаивается и одинаков по всей площади. Плёнку можно снять или поменять. ${link(GLASS_TYPE_LINKS.plenki)}`,
    },
    {
      question: "Через тонированное стекло видно?",
      answer:
        "Да, но темнее прозрачного: чем темнее оттенок и толще лист, тем меньше света проходит и тем хуже видно, что за стеклом. Если нужна полная приватность, подойдёт матовое стекло — сатин тоже бывает в бронзе и сером.",
    },
  ],

  // 8. «Другие виды стекла»: the other ways to get a coloured or private glass
  related: ["matovoe", "okrashennoe", "riflenoe"],

  limits: { ...TEMPERED_LIMITS },
  quizPrefill: { type: "tempered", kind: "tinted" },
};
