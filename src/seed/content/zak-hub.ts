/**
 * Content of the hub «Закалённое стекло» (`/zakalennoe-steklo/`, task 23). H1 / Title /
 * Description from `docs/inex/17-meta.md`; every other string verbatim from
 * `res/inex-glass-handoff/teksty/02-zakalennoe-steklo.md` (link targets from the task spec).
 * The Heat Soak / glazing-unit blocks of the page structure are intentionally absent (ТЗ §11).
 *
 * Pure data (no Payload imports): the slice (`../slices/zak-hub.ts`) builds the document from
 * it and `../slices/zak-hub-thicknesses.test.ts` checks it against teksty.
 * CMS placeholders (`{дата_цен}`, `{акция_текст}`) are stored as they are.
 */

export const HUB_PATH = "/zakalennoe-steklo/";
/** Lead source label of the hub buttons and form. */
export const HUB_SOURCE = "zakalennoe-steklo";
/**
 * Caption of the hub's bottom form in the CRM (`leads.sourceLabel`, not shown on the site): the
 * page name + the form name, so the manager reads where the lead came from.
 */
export const HUB_FORM_SOURCE_LABEL = "Закалённое стекло — форма «Отправить чертёж»";

export interface HubCard {
  title: string;
  text: string;
  /** Page of the card; a card without a page is a plain card. */
  url?: string;
}

export interface HubLink {
  label: string;
  url: string;
}

export const ZAK_HUB = {
  title: "Закалённое стекло",
  slug: "zakalennoe-steklo",
  seo: {
    h1: "Закалённое (калёное) стекло на заказ по размерам",
    title: "Закалённое стекло на заказ 4–19 мм по чертежу | Inex Glass",
    description:
      "Проверим чертёж и согласуем спецификацию до закалки, упакуем в обрешётку с фото при отгрузке. Заказы от 50 м².",
  },

  hero: {
    facts:
      "По вашему чертежу DWG или DXF · толщина 4–19 мм · заказы от 50 м² · от 10 рабочих дней с даты договора · доставка по Уралу, Сибири и Поволжью",
    strong: "Проверяем чертёж до закалки — после неё стекло уже не изменить.",
    quizLabel: "Рассчитать стоимость",
    drawingLabel: "Загрузить чертёж DWG / DXF",
  },

  prices: {
    heading: "Цены на закалённое стекло",
    caption:
      "Ориентировочные цены на {дата_цен}. Точная стоимость — в КП после расчёта; цена в договоре фиксируется. {акция_текст}",
  },

  checklist: {
    heading: "Что проверить до заказа",
    sub: "Закалённое стекло нельзя подрезать, досверлить или подогнать на объекте: при любой попытке оно рассыпается. Всё, что нужно стеклу, закладывается в чертёж заранее.",
    items: [
      {
        title: "Размеры с зазорами под монтаж.",
        text: "Допуск по ГОСТ — ±2 мм для сторон до 2000 мм (толщина до 12 мм). Профиль и фурнитура должны этот допуск компенсировать.",
      },
      {
        title: "Отверстия и вырезы.",
        text: "Отверстие — не ближе двух толщин стекла к кромке и к соседнему отверстию, не ближе шести толщин к углу. Для стекла 10 мм это 20, 20 и 60 мм.",
      },
      {
        title: "Диаметры отверстий",
        text: "— от 4 до 130 мм. Диаметр меньше толщины стекла — только по согласованию.",
      },
      {
        title: "Кромка.",
        text: "Шлифованная, полированная, «трапеция», «еврокромка» — укажите, какая нужна и где торец будет виден.",
      },
      {
        title: "Обработка отверстий изнутри.",
        text: "Если отверстие под металлический крепёж, отметьте — кромку отверстия притупим и обработаем.",
      },
      {
        title: "Клеймо.",
        text: "Можно оставить стандартное место, указать другое или отказаться — важно для ограждений и видимых стёкол.",
      },
      {
        title: "Маркировка позиций",
        text: "— как на объекте, чтобы монтажник не искал, какое стекло куда.",
      },
    ],
    links: [
      { label: "Требования к чертежам", url: "/kak-zakazat/trebovaniya-k-chertezham/" },
      { label: "Допуски по ГОСТ 30698-2014", url: "/kak-zakazat/dopuski-i-gost/" },
      {
        label: "Можно ли резать закалённое стекло",
        url: "/blog/mozhno-li-rezat-zakalennoe-steklo/",
      },
    ] satisfies HubLink[],
  },

  risk: {
    heading: "Как мы снижаем риск ошибки",
    items: [
      {
        title: "Спецификация на согласование.",
        text: "Проверяем размеры, отверстия и ограничения и присылаем спецификацию. В производство она уходит только после вашего подтверждения.",
      },
      {
        title: "Отклонения — только с вашего согласия.",
        text: "Если завод не может сделать отверстие нужного диаметра или выдержать размер, сначала звоним вам, а не меняем молча.",
      },
      {
        title: "Кто за что отвечает.",
        text: "Ошибся завод — стекло переделывают за его счёт. Ошибка в согласованном чертеже — переделка за счёт заказчика. Доставку повторной партии оплачивает заказчик.",
      },
      {
        title: "Упаковка под дорогу.",
        text: "Обрешётка, фото упаковки при отгрузке. Состав упаковки — плёнка, картон, усиление ящика — согласуем под ваш маршрут и разгрузку.",
      },
      {
        title: "Документы на партию.",
        text: "Паспорт качества, сертификат соответствия, протоколы испытаний. Закалённое стекло — по ГОСТ 30698-2014.",
      },
    ] satisfies HubCard[],
  },

  weights: {
    heading: "Как выбрать толщину",
    sub: "Толщину подбираем под нагрузку: размер стекла, способ крепления, назначение. Если одного стекла недостаточно — предложим схему триплекса.",
    /** Column labels only: the weights come from `WEIGHT_TABLE` of the domain library. */
    columns: ["Толщина", "Вес, кг/м²"],
    footnote:
      "Вес стекла — 2,5 кг на 1 м² на каждый миллиметр толщины. Посчитать вес вашей партии — в калькуляторе.",
    loadLabel: "Подобрать толщину под нагрузку",
    calculator: { label: "Калькулятор веса стекла", url: "/instrumenty/kalkulyator-vesa-stekla/" },
  },

  kinds: {
    heading: "Виды закалённого стекла",
    items: [
      { title: "Прозрачное", text: "базовое стекло для перегородок, дверей, ограждений" },
      {
        title: "Осветлённое",
        text: "без зеленоватого оттенка на торце",
        url: "/zakalennoe-steklo/osvetlennoe/",
      },
      {
        title: "Матовое",
        text: "приватность без потери света",
        url: "/zakalennoe-steklo/matovoe/",
      },
      {
        title: "Тонированное",
        text: "бронза, графит, серое",
        url: "/zakalennoe-steklo/tonirovannoe/",
      },
      {
        title: "Крашеное по RAL",
        text: "толщина 4–15 мм, размер до 3000 × 1600 мм",
        url: "/zakalennoe-steklo/okrashennoe/",
      },
      { title: "Рифлёное", text: "узорчатое стекло", url: "/zakalennoe-steklo/riflenoe/" },
      {
        title: "Гнутое",
        text: "до 1200 × 2000 мм; радиус от 1000 мм для 4–6 мм и от 1500 мм для 8–12 мм",
        url: "/zakalennoe-steklo/mollirovannoe/",
      },
    ] satisfies HubCard[],
    /** «Рядом: **Триплекс** · **Обработка стекла** · **Стеклянные конструкции**» with links. */
    bridge:
      "Рядом: [Триплекс](/tripleks/) · [Обработка стекла](/obrabotka-stekla/) · [Стеклянные конструкции](/steklyannye-konstrukcii/)",
  },

  processing: {
    heading: "Обработка до закалки",
    items: [
      {
        title: "Кромка",
        text: "шлифовка, полировка, «трапеция», «еврокромка»",
        url: "/obrabotka-stekla/kromka/",
      },
      {
        title: "Отверстия и вырезы",
        text: "Ø 4–130 мм, фрезерованные вырезы",
        url: "/obrabotka-stekla/otverstiya-i-vyrezy/",
      },
      {
        title: "Фацет",
        text: "на зеркалах, ширина 30 или 50 мм",
        url: "/obrabotka-stekla/facet/",
      },
      {
        title: "Матирование",
        text: "пескоструйное, в том числе рисунок и логотип",
        url: "/obrabotka-stekla/matirovanie/",
      },
      {
        title: "Печать на стекле",
        text: "шелкография до 1100 × 700 мм",
        url: "/obrabotka-stekla/pechat/",
      },
      { title: "Плёнки", text: "по согласованию", url: "/obrabotka-stekla/plenki/" },
    ] satisfies HubCard[],
  },

  timing: {
    heading: "Сроки и доставка",
    markdown: [
      "Срок изготовления считается от даты договора: **от 10 рабочих дней**, для триплекса — **от 14**. Срок увеличивают сложная обработка, гнутое и крашеное стекло, крупные партии. Ориентировочная дата готовности — в КП.",
      "",
      "Отправляем по Уралу, Сибири и Поволжью транспортной компанией; стоимость и срок доставки зависят от партии и считаются в КП. Самовывоз — в Челябинске.",
    ].join("\n"),
    links: [
      { label: "Сроки изготовления", url: "/kak-zakazat/sroki/" },
      { label: "Упаковка и доставка", url: "/kak-zakazat/upakovka-i-dostavka/" },
    ] satisfies HubLink[],
  },

  audiences: {
    heading: "Для кого",
    items: [
      {
        title: "Подрядчикам",
        text: "стекло для ограждений, перегородок и козырьков, которое встаёт с первого раза.",
        url: "/klientam/podryadchikam/",
      },
      {
        title: "Производителям мебели",
        text: "фасады и столешницы серией, кромка и отверстия под фурнитуру, без клейма по запросу.",
        url: "/klientam/proizvoditelyam-mebeli/",
      },
      {
        title: "Крупным объектам",
        text: "торговые центры, арены, офисы: документы на партию и проектирование узлов.",
        url: "/klientam/zastrojshchikam/",
      },
    ] satisfies HubCard[],
  },

  faq: {
    heading: "Частые вопросы",
    /** Answers are markdown (links). */
    items: [
      [
        "Можно ли подрезать или досверлить закалённое стекло на объекте?",
        "Нет. После закалки стекло нельзя резать и сверлить — оно разрушится. Если размер не подошёл, изготавливается новое стекло. Поэтому мы проверяем чертёж до запуска.",
      ],
      [
        "Что будет, если в чертеже ошибка?",
        "Мы присылаем спецификацию на согласование до производства — это последний момент, когда ошибку можно исправить бесплатно. Если ошибся завод, стекло переделывают за его счёт. Если ошибка была в согласованном чертеже, переделка — за счёт заказчика. Доставку повторной партии оплачивает заказчик.",
      ],
      ["Какой минимальный заказ?", "От 50 м²; для части заказов — от 100 м², уточнит менеджер."],
      [
        "Почему закалённое стекло иногда лопается само?",
        "Редко, но бывает: причина — микроскопические включения в стекле, которые со временем могут разрушить закалённый лист. Поэтому там, где выпавшее стекло опасно, — над головой, на ограждениях перепадов высот — ставят триплекс: даже при разрушении он остаётся в проёме. → [Триплекс](/tripleks/)",
      ],
      [
        "Какие документы вы даёте?",
        "Паспорт качества, сертификат соответствия и протоколы испытаний. Оригиналы едут вместе с партией.",
      ],
      [
        "Видны ли на закалённом стекле искажения — и брак ли это?",
        "По ГОСТ 30698-2014 не допускаются искажения, заметные в проходящем свете под углом до 30° при проверке на экране «кирпичная стена». Искажения в отражённом свете стандарт не нормирует.",
      ],
      ["Сколько ждать КП?", "В среднем 2–3 рабочих дня, для больших объёмов — дольше."],
    ] as ReadonlyArray<readonly [string, string]>,
  },
} as const;

/**
 * Anchors (`anchorId`) of the hub sections: `HubPage` picks its section components by them;
 * `*-cta` / `*-bridge` are companion blocks read by the section they follow.
 */
export const HUB_ANCHORS = {
  prices: "ceny",
  checklist: "checklist",
  risk: "risk",
  weights: "weights",
  weightsCta: "weights-cta",
  kinds: "vidy",
  kindsBridge: "vidy-bridge",
  processing: "obrabotka",
  timing: "sroki",
  timingCta: "sroki-cta",
  audiences: "forwhom",
  objects: "objects",
  faq: "faq",
  form: "form",
} as const;
