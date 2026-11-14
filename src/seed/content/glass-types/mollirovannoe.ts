import { GLASS_TYPE_LINKS } from "./shared";
import type { GlassTypeContent } from "./types";

/**
 * «Гнутое» (моллированное) — moved to the new page design of the reference «Матовое»
 * (`./matovoe.ts`, README «Секция макета → поле записи»). There is no Paper mockup
 * `2560_glass_mollirovannoe` yet: the section set is the reference's, filled with the Inex facts of
 * teksty/12 §5, SSoT §3 and teksty/03, 04 (thicknesses, flatness, lead time).
 *
 * Every teksty statement is kept: the «Параметры» table became the spec tiles, its footnote — a
 * FAQ answer, the «Что важно знать» callout — `importantItems`. Statements that are not Inex
 * content (wording of the new sections, bending technology paraphrased from priorglass.ru) are in
 * `copy.pendingApproval` and in `docs/inex/drafts/service-pages-paper-drafts.md`.
 */

/** Statements awaiting the client's approval, verbatim (each must occur in the copy below). */
const PENDING_APPROVAL = [
  "Гнутьё и закалка — за один цикл",
  "Лист нагревают в печи, придают ему радиус и сразу закаливают, поэтому геометрию задают в чертеже до запуска.",
  "Гнутое стекло ставят там, где конструкция идёт по дуге.",
  "Радиусные ограждения лестниц, балконов и террас",
  "Полукруглые перегородки в офисах, холлах и переговорных",
  "Эркеры, витражи и радиусные элементы фасадов",
  "Витрины, прилавки и стойки с гнутым стеклом",
  "Гнут прозрачное, осветлённое, тонированное и матовое стекло толщиной 4–12 мм. Возможность гибки конкретного вида проверим по чертежу.",
  "Чтобы посчитать гнутое стекло, нужна геометрия изгиба.",
  "Пришлите чертёж — проверим радиус и размеры по ограничениям гибки до запуска.",
  "Гнутое стекло считается за м² листа; обработка кромки и отверстия — отдельно.",
  "Радиус и размер изгиба",
] as const;

export const MOLLIROVANNOE: GlassTypeContent = {
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
  // No mockup yet; the id follows the `2560_glass_<slug>` convention the test expects.
  copy: { source: "paper", mockup: "2560_glass_mollirovannoe", pendingApproval: PENDING_APPROVAL },
  seo: {
    h1: "Гнутое закалённое стекло",
    title: "Гнутое закалённое стекло на заказ | Inex Glass",
    description:
      "Гнутое закалённое стекло до 1200 × 2000 мм с радиусом от 1000 мм. Что указать в чертеже радиусного стекла — на странице.",
  },

  // 1. hero (teksty lead without `{условия}`: the terms are the hero ticks); own 16:9 photo
  // (client request 2026-11-10).
  heroImage: {
    file: "hero/mollirovannoe.webp",
    alt: "Гнутое закалённое стекло — ограждение галереи, изогнутое по всей плоскости",
  },
  intro:
    "Радиусное стекло для ограждений, перегородок, остекления и торгового оборудования — гнутое и закалённое за один цикл.",

  // 2. specs: the rows of the old «Параметры» table (SSoT §3; 15 and 19 mm are not bent —
  // teksty/03).
  specs: [
    {
      label: "Радиус изгиба",
      value: "от 1000 мм",
      text: "Для стекла 4–6 мм; для 8–12 мм — от 1500 мм",
    },
    {
      label: "Толщина",
      value: "4–12 мм",
      text: "Стекло 15 и 19 мм не гнут",
    },
    {
      label: "Размер",
      value: "1200 × 2000",
      text: "Максимальный размер, мм. Минимальный — 150 × 350 мм",
    },
    {
      label: "Стекло",
      value: "Закалённое",
      text: "Гнутьё и закалка — за один цикл",
      accent: true,
    },
  ],

  layout: [
    // 3. about: the teksty drawing guide + geometry diagram on the right
    {
      kind: "richText",
      heading: "Как указать гнутое стекло в чертеже",
      md: [
        "Лист нагревают в печи, придают ему радиус и сразу закаливают, поэтому геометрию задают в чертеже до запуска.",
        "",
        "Задайте геометрию одним из способов:",
        "",
        "- радиус и длина дуги (или центральный угол);",
        "- хорда и стрела прогиба.",
        "",
        "Плюс высота (прямая сторона), толщина, сторона, по которой задан радиус, — внутренняя или наружная, и отверстия с координатами по развёртке.",
      ].join("\n"),
      figure: {
        image: {
          file: "diagrams/mollirovannoe.webp",
          kind: "scheme",
          alt: "Схема геометрии гнутого стекла, вид сверху: изогнутый по дуге лист, длина дуги, хорда, стрела прогиба, радиус R и центральный угол. Радиус указывают по внутренней или наружной стороне стекла, высота листа — прямая сторона.",
        },
        caption: "Геометрия гнутого стекла",
      },
    },

    // 4. use-cases: the four uses of the teksty lead, linked to their site sections
    {
      kind: "cards",
      heading: "Где применяют",
      sub: "Гнутое стекло ставят там, где конструкция идёт по дуге.",
      columns: 4,
      items: [
        {
          title: "Ограждения",
          image: {
            file: "cards/mollirovannoe-1.webp",
            alt: "Изогнутое ограждение из гнутого стекла",
          },
          text: "Радиусные ограждения лестниц, балконов и террас",
          href: "/steklyannye-ograzhdeniya/",
        },
        {
          title: "Перегородки",
          image: { file: "cards/mollirovannoe-2.webp", alt: "Перегородка из гнутого стекла" },
          text: "Полукруглые перегородки в офисах, холлах и переговорных",
          href: GLASS_TYPE_LINKS.peregorodki.url,
        },
        {
          title: "Остекление",
          image: { file: "cards/mollirovannoe-3.webp", alt: "Остекление из гнутого стекла" },
          text: "Эркеры, витражи и радиусные элементы фасадов",
          href: "/osteklenie/",
        },
        {
          title: "Торговое оборудование",
          image: {
            file: "cards/mollirovannoe-4.webp",
            alt: "Торговое оборудование с гнутым стеклом",
          },
          text: "Витрины, прилавки и стойки с гнутым стеклом",
          href: "/torgovye-vitriny/",
        },
      ],
    },

    // 9. how-to-order: two panels
    {
      kind: "twoColumns",
      left: {
        heading: "Как заказать",
        md: [
          "Чтобы посчитать гнутое стекло, нужна геометрия изгиба.",
          "",
          "### Укажите в заявке:",
          "",
          "1. Радиус и длину дуги — или хорду и стрелу прогиба",
          "2. Высоту, толщину и сторону радиуса: внутреннюю или наружную",
          "3. Отверстия и вырезы — с координатами по развёртке",
          "",
          "> Пришлите чертёж — проверим радиус и размеры по ограничениям гибки до запуска.",
        ].join("\n"),
      },
      right: {
        heading: "Как считается цена",
        md: [
          "Гнутое стекло считается за м² листа; обработка кромки и отверстия — отдельно.",
          "",
          "### На цену влияют:",
          "",
          "- Толщина и площадь",
          "- Радиус и размер изгиба",
          "- Обработка: кромка, отверстия, вырезы",
          "",
          "> Точная стоимость — в КП после проверки чертежа, в среднем за 2–3 рабочих дня.",
        ].join("\n"),
      },
    },
  ],

  // 5. callout «Что важно знать до заказа» (the teksty «Что важно знать» list, lead + text)
  importantItems: [
    {
      lead: "Отверстия и вырезы.",
      text: "Делаются до гибки и закалки — как и у плоского стекла.",
    },
    {
      lead: "Оптика.",
      text: "Оптические искажения гнутого стекла ГОСТ 30698-2014 не нормирует: если для проекта важна оптика, обсудим это до заказа.",
    },
    {
      lead: "Одна партия.",
      text: "Несколько гнутых стёкол в одной конструкции заказывайте одной партией.",
    },
  ],
  importantButton: GLASS_TYPE_LINKS.otverstiya,

  // 6. samples: no bent samples (teksty) — the section stays off.
  showSamples: false,

  // 7. FAQ. Answers 1, 2, 4 are Inex facts (SSoT §3, teksty/03, teksty/12 footnote, teksty/02
  // lead times); answer 3 is pending.
  faq: [
    {
      question: "Какой минимальный радиус изгиба?",
      answer:
        "От 1000 мм для стекла 4–6 мм и от 1500 мм для стекла 8–12 мм. Стекло 15 и 19 мм не гнут.",
    },
    {
      question: "Делаете художественное моллирование?",
      answer:
        "Нет. Поставляем только гнутое закалённое стекло. Художественное моллирование малых радиусов (незакалённое) не делаем.",
    },
    {
      question: "Какое стекло можно согнуть?",
      answer:
        "Гнут прозрачное, осветлённое, тонированное и матовое стекло толщиной 4–12 мм. Возможность гибки конкретного вида проверим по чертежу.",
    },
    {
      question: "Гнутое стекло делают дольше плоского?",
      answer:
        "Да, гнутьё увеличивает срок изготовления. Ориентировочную дату готовности укажем в КП.",
    },
  ],

  // 8. «Другие виды стекла»: the types that can be bent (FAQ 3)
  related: ["osvetlennoe", "tonirovannoe", "matovoe"],

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
