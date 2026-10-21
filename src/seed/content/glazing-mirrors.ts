/**
 * Content of the 9 pages of «Остекление» and «Зеркала» (task 27), copied VERBATIM from
 * `res/inex-glass-handoff/teksty/13-p3-kozyrki-osteklenie.md` §2–§8 and
 * `teksty/12-p2-konstrukcii-steklo.md` §3–§4; H1 / Title / Description from
 * `docs/inex/17-meta.md` («Конструкции»). The H1 of teksty is not output when it differs from
 * 17-meta.
 *
 * Pure data (no Payload imports): the slice `src/seed/slices/glazing-mirrors.ts` turns it into
 * `constructions` documents and `glazing-mirrors.test.ts` checks every string against teksty.
 *
 * Text conventions:
 * - `markdown` fields go through the markdown → Lexical converter (`**bold**`, lists,
 *   `[text](/path/)`); `→ [Название]` of teksty becomes a link by the link map of the task;
 * - `{условия}` stays as is — the placeholder engine resolves it at render time;
 * - everything else is plain text.
 */

import type { QuizTypeId } from "@/lib/domain";

/** teksty file a page is copied from (inside `res/inex-glass-handoff/teksty/`). */
export type TekstySource = "13-p3-kozyrki-osteklenie.md" | "12-p2-konstrukcii-steklo.md";

/** Template slot of a layout block (`anchorId` prefix of the task-26 template). */
export type LayoutSlot = "objects" | "b";

export interface RichTextContent {
  type: "richText";
  heading?: string;
  markdown: string;
  slot?: LayoutSlot;
}

export interface TableCellContent {
  value: string;
  href?: string;
}

export interface TableContent {
  type: "table";
  heading?: string;
  columns: string[];
  /**
   * `true` when teksty has no header row (key/value tables) or an empty header cell: the schema
   * requires column labels, so `EMPTY_HEADER` (no-break space) labels are used; they are
   * excluded from the teksty check.
   */
  syntheticColumns?: boolean;
  rows: TableCellContent[][];
}

export interface CardsContent {
  type: "cards";
  heading: string;
  items: Array<{ title: string; text: string; href: string }>;
}

export interface CalloutContent {
  type: "callout";
  heading?: string;
  tone: "warning" | "info";
  title?: string;
  markdown?: string;
  items?: Array<{ lead: string; markdown: string }>;
}

export type LayoutContent = RichTextContent | TableContent | CardsContent | CalloutContent;

export interface SystemContent {
  name: string;
  subtitle?: string;
  whereFits?: string;
}

export interface GlazingMirrorsPageContent {
  /** Public path; must exist in `GLAZING_MIRRORS_ROUTES`. */
  path: string;
  source: { file: TekstySource; section: number };
  /** Document title (admin, fallbacks) — the H1 of 17-meta. */
  title: string;
  order: number;
  seo: { h1: string; title: string; description: string };
  /** Card in hubs / menus: `text` is copied from the hub table of teksty. */
  card?: { text: string };
  intro: string;
  quizType: QuizTypeId;
  /** Secondary hero / final button («Отправить проект» …), opens the `drawing` form. */
  secondaryLabel: string;
  systemsHeading?: string;
  systems?: SystemContent[];
  profileSystems?: string[];
  glassHeading?: string;
  glassBullets?: string[];
  inexSuBridge?: { title: string; buttonLabel: string; url: string };
  layout: LayoutContent[];
}

export const QUIZ_CTA_LABEL = "Рассчитать стоимость";
export const OBJECTS_HEADING = "Объекты";

const ALL_OBJECTS = "[Все объекты](/obekty/)";
const SOURCE_13 = "13-p3-kozyrki-osteklenie.md";
const SOURCE_12 = "12-p2-konstrukcii-steklo.md";
/**
 * Label of a header cell that is empty in teksty. The schema requires a column label, and no
 * text is invented: a no-break space keeps the header cell visually empty.
 */
const EMPTY_HEADER = " ";

/** Internal links of the task's link map. */
export const LINKS = {
  proektirovanie: "/proektirovanie/",
  osvetlennoe: "/zakalennoe-steklo/osvetlennoe/",
  okrashennoe: "/zakalennoe-steklo/okrashennoe/",
  tripleks: "/tripleks/",
  kozyrki: "/steklyannye-kozyrki/",
  ograzhdeniya: "/steklyannye-ograzhdeniya/",
  fasady: "/osteklenie/fasadov/",
  spajdernoe: "/osteklenie/spajdernoe/",
  vitriny: "/osteklenie/vitrin-i-magazinov/",
  lifty: "/osteklenie/liftovyh-shaht/",
  verandy: "/osteklenie/verand-terras-besedok/",
  otverstiya: "/obrabotka-stekla/otverstiya-i-vyrezy/",
  kromka: "/obrabotka-stekla/kromka/",
  facet: "/obrabotka-stekla/facet/",
  matirovanie: "/obrabotka-stekla/matirovanie/",
  kalkulyatorVesa: "/instrumenty/kalkulyator-vesa-stekla/",
  torgovyeVitriny: "/torgovye-vitriny/",
  zerkalaZaly: "/zerkala/dlya-zalov/",
  zerkalaSalony: "/zerkala/dlya-salonov/",
  obekty: "/obekty/",
  inexSu: "https://inex.su/",
} as const;

// ---------------------------------------------------------------------------------------------
// «Остекление» — teksty/13 §2–§7
// ---------------------------------------------------------------------------------------------

const osteklenie: GlazingMirrorsPageContent = {
  path: "/osteklenie/",
  source: { file: SOURCE_13, section: 2 },
  title: "Остекление зданий и помещений",
  order: 0,
  seo: {
    h1: "Остекление зданий и помещений",
    title: "Остекление зданий — фасады, витрины, шахты лифтов | Inex Glass",
    description:
      "Стеклянные фасады, спайдерное остекление, витрины, лифтовые шахты и веранды: стекло, профиль и узлы для подрядчика.",
  },
  intro:
    "Фасады, витрины и входные группы, лифтовые шахты, веранды и террасы. Комплектуем объект стеклом, профильными системами и креплениями по проекту; инженер рассчитывает стекло под нагрузку. {условия}",
  quizType: "other",
  secondaryLabel: "Отправить проект",
  layout: [
    {
      type: "cards",
      heading: "Что остекляем",
      items: [
        {
          title: "Стеклянные фасады и структурное остекление",
          text: "профили СИАЛ и Алютех, спандрель, маркировка по монтажной схеме",
          href: LINKS.fasady,
        },
        {
          title: "Спайдерное остекление",
          text: "стекло на точечных креплениях",
          href: LINKS.spajdernoe,
        },
        {
          title: "Витрины и входные группы магазинов",
          text: "осветлённое стекло, триплекс",
          href: LINKS.vitriny,
        },
        {
          title: "Лифтовые шахты",
          text: "триплекс по ГОСТ 33984.1-2016",
          href: LINKS.lifty,
        },
        {
          title: "Веранды и террасы",
          text: "раздвижные, гильотинные, складные системы, стеклянная крыша",
          href: LINKS.verandy,
        },
        {
          title: "Козырьки",
          text: "триплекс под снеговую нагрузку",
          href: LINKS.kozyrki,
        },
      ],
    },
    {
      type: "richText",
      heading: "Как работаем с объектом",
      markdown: [
        "1. Проект или спецификация → расчёт стекла и узлов инженером (проектирование — платно, по задаче).",
        "2. КП — в среднем за 2–3 рабочих дня.",
        "3. Стекло на весь объём закупаем сразу — один оттенок по всему объекту.",
        "4. Стёкла маркируем по монтажной схеме, отгружаем в обрешётке, документы едут с партией.",
      ].join("\n"),
    },
    {
      // Hub objects section: the template adds «Все объекты» to the section header itself.
      type: "richText",
      slot: "objects",
      markdown:
        "Главное управление «Сургутнефтегаз» · ТРЦ «Алмаз», Челябинск · Аэропорт Челябинск · «РМК-Арена», Челябинск",
    },
  ],
};

const fasadov: GlazingMirrorsPageContent = {
  path: "/osteklenie/fasadov/",
  source: { file: SOURCE_13, section: 3 },
  title: "Стеклянные фасады и структурное остекление",
  order: 1,
  seo: {
    h1: "Стеклянные фасады и структурное остекление",
    title: "Стеклянные фасады и структурное остекление | Inex Glass",
    description:
      "Стекло и профильные системы СИАЛ и Алютех для фасадов: закалённое стекло, триплекс, спандрель. Один оттенок на объект, маркировка по монтажной схеме.",
  },
  card: { text: "профили СИАЛ и Алютех, спандрель, маркировка по монтажной схеме" },
  intro:
    "Стекло и профильные системы для фасадов — комплексно или отдельными разделами. Для фасадных компаний и генподрядчиков. {условия}",
  quizType: "facade",
  secondaryLabel: "Отправить проект",
  systemsHeading: "Системы",
  systems: [
    {
      name: "Стоечно-ригельный",
      subtitle: "Каркас из стоек и ригелей, стекло в прижимной планке",
    },
    {
      name: "Структурный",
      subtitle:
        "Снаружи видно только стекло: оно крепится к каркасу на структурном герметике, без прижимных планок",
    },
    {
      name: "На зажимном профиле",
      subtitle: "Стекло зажато в профиле по контуру — для входных групп и витражей первых этажей",
    },
    // teksty links this row to the spider page; system cards have no link field (the hub links it).
    { name: "Спайдерный", subtitle: "Стекло на точечных креплениях" },
  ],
  profileSystems: ["СИАЛ", "Алютех"],
  glassHeading: "Стекло",
  glassBullets: [
    `**Закалённое и триплекс** — расчётом под ветровую нагрузку и размеры. [Проектирование](${LINKS.proektirovanie})`,
    `**Осветлённое** — без зелёной кромки на торцах. [Осветлённое стекло](${LINKS.osvetlennoe})`,
    `**Спандрель** — эмалированное непрозрачное стекло для зон перекрытий: снаружи фасад выглядит единым. [Крашеное стекло](${LINKS.okrashennoe})`,
  ],
  layout: [
    {
      type: "callout",
      heading: "Что важно для фасада",
      tone: "info",
      items: [
        {
          lead: "Один оттенок на весь фасад.",
          markdown: "Стекло закупаем на весь объём сразу: оттенок одинаковый во всех захватках.",
        },
        {
          lead: "Маркировка по монтажной схеме.",
          markdown: "Каждое стекло подписано по позиции — бригада не ищет нужное в ящиках.",
        },
        {
          lead: "Оптика.",
          markdown:
            "Закалённое стекло проверяем на оптические искажения по п. 5.1.7 ГОСТ 30698-2014. Если оптика для проекта критична, обсудим требования до заказа.",
        },
        {
          lead: "Большие форматы",
          markdown: "— максимальный размер зависит от завода; проверим по вашему проекту.",
        },
      ],
    },
    {
      type: "richText",
      slot: "objects",
      markdown: ["Фасады и витражи из портфолио Inex", "", ALL_OBJECTS].join("\n"),
    },
  ],
};

const spajdernoe: GlazingMirrorsPageContent = {
  path: "/osteklenie/spajdernoe/",
  source: { file: SOURCE_13, section: 4 },
  title: "Спайдерное остекление",
  order: 2,
  seo: {
    h1: "Спайдерное остекление",
    title: "Спайдерное остекление — стекло и спайдеры комплектом | Inex Glass",
    description:
      "Точечное крепление стекла на спайдерах: цилиндрические и конусные отверстия по ГОСТ, спайдеры и стекло одним заказом.",
  },
  card: { text: "стекло на точечных креплениях" },
  intro:
    "Стекло на точечных креплениях — без рамы, «невесомый» фасад, атриум или вход. Стекло и спайдеры — одним комплектом, отверстия точно под крепления. {условия}",
  quizType: "facade",
  secondaryLabel: "Отправить проект",
  layout: [
    {
      type: "richText",
      heading: "Как устроено",
      markdown:
        "**Спайдер** — металлическая «звезда» с одним–четырьмя лучами, закреплённая на несущей конструкции. На концах лучей — **рутели**: болты, которые проходят через отверстия в стекле. Рутели бывают шарнирные (стекло может немного поворачиваться под нагрузкой) и жёсткие.",
    },
    {
      type: "table",
      heading: "Отверстия — главный узел",
      // teksty: both header cells are empty.
      columns: [EMPTY_HEADER, EMPTY_HEADER],
      syntheticColumns: true,
      rows: [
        [
          { value: "Тип отверстий" },
          { value: "Цилиндрические и конусные — под потайную головку рутеля" },
        ],
        [{ value: "От кромки стекла" }, { value: "Не ближе двух толщин стекла (ГОСТ 30698-2014)" }],
        [{ value: "От угла" }, { value: "Не ближе шести толщин" }],
        [{ value: "Допуск диаметра" }, { value: "±1 мм для Ø 4–20 мм, ±2 мм для Ø 20–100 мм" }],
        [{ value: "Кромка отверстия" }, { value: "Обрабатывается; по запросу — изнутри" }],
      ],
    },
    {
      type: "richText",
      markdown: `Координаты каждого отверстия — в чертеже DWG или DXF. [Отверстия и вырезы](${LINKS.otverstiya})`,
    },
    {
      type: "richText",
      heading: "Стекло",
      markdown:
        "Закалённое или закалённый триплекс — по расчёту. На спайдерах стекло работает с нагрузкой вокруг отверстий, поэтому точность отверстий и обработка их кромки здесь важнее всего. Для фасадов и атриумов на высоте выбирают триплекс: при разрушении он остаётся на креплениях.",
    },
  ],
};

const vitrinIMagazinov: GlazingMirrorsPageContent = {
  path: "/osteklenie/vitrin-i-magazinov/",
  source: { file: SOURCE_13, section: 5 },
  title: "Витрины и остекление магазинов",
  order: 3,
  seo: {
    h1: "Витрины и остекление магазинов",
    title: "Витринное стекло и остекление магазинов | Inex Glass",
    description:
      "Закалённое и осветлённое стекло для витрин и входных групп магазинов, торговых центров и шоурумов.",
  },
  card: { text: "осветлённое стекло, триплекс" },
  intro: "Стекло для витрин и входных групп магазинов, торговых центров и шоурумов. {условия}",
  quizType: "shopfronts",
  secondaryLabel: "Отправить проект",
  inexSuBridge: {
    title: "Стеклянные двери изготавливает инжиниринговая компания Inex",
    buttonLabel: "inex.su",
    url: LINKS.inexSu,
  },
  layout: [
    {
      type: "table",
      heading: "Какое стекло выбрать",
      columns: ["Стекло", "Зачем"],
      rows: [
        [{ value: "Закалённое" }, { value: "Безопасность: при ударе — мелкие тупые осколки" }],
        [
          { value: "Осветлённое, 8 / 10 / 12 мм", href: LINKS.osvetlennoe },
          { value: "Товар за стеклом — в своём цвете, торцы не зеленят" },
        ],
        [
          { value: "Триплекс", href: LINKS.tripleks },
          { value: "Стекло выдерживает удар и остаётся в проёме — защита от разбития" },
        ],
      ],
    },
    {
      type: "richText",
      heading: "Большие форматы",
      markdown: `Витринные стёкла до 3500 мм по длинной стороне — по проекту. Для больших стёкол считаем толщину под размер и ветровую нагрузку, проверяем вес и подъём. [Калькулятор веса](${LINKS.kalkulyatorVesa})`,
    },
    {
      // The sentence about glass doors goes to the inex.su bridge (`inexSuBridge`).
      type: "richText",
      heading: "Входные группы и тамбуры",
      markdown: "Стекло неподвижных частей, фурнитура и профиль — у нас.",
    },
    {
      // Slot «b»: rendered after the inex.su bridge, as in teksty.
      type: "richText",
      heading: "Для торговых сетей",
      slot: "b",
      markdown: `Одинаковое остекление на все точки, повторный заказ по тем же чертежам, отгрузка партиями. Торговые витрины как оборудование [Торговые витрины на заказ](${LINKS.torgovyeVitriny})`,
    },
  ],
};

const liftovyhShaht: GlazingMirrorsPageContent = {
  path: "/osteklenie/liftovyh-shaht/",
  source: { file: SOURCE_13, section: 6 },
  title: "Остекление лифтовых шахт",
  order: 4,
  seo: {
    h1: "Остекление лифтовых шахт",
    title: "Остекление лифтовых шахт — триплекс по ГОСТ | Inex Glass",
    description:
      "Триплекс для шахт панорамных лифтов по ГОСТ 33984.1-2016: схема под нагрузку, крепление на спайдерах или в профильной системе.",
  },
  card: { text: "триплекс по ГОСТ 33984.1-2016" },
  intro:
    "Шахты панорамных лифтов в торговых центрах, бизнес-центрах и атриумах: большие стёкла на виду, рядом с движущейся кабиной. {условия}",
  quizType: "triplex",
  secondaryLabel: "Отправить проект",
  layout: [
    {
      type: "richText",
      heading: "Требования",
      markdown: `Ограждение шахты из стекла — **триплекс**, требования — ГОСТ 33984.1-2016. Схему триплекса — симметричную или несимметричную — рассчитываем под нагрузку и размер полотна. [Проектирование](${LINKS.proektirovanie})`,
    },
    {
      type: "richText",
      heading: "Без линз на больших стёклах",
      markdown:
        "На больших закалённых стёклах бывают оптические искажения — «линзы» и закалочная волна. На шахте лифта они особенно заметны. Мы выбираем завод под такие задачи и проверяем стекло по п. 5.1.7 ГОСТ 30698-2014. Если оптика критична, обсудим требования до заказа.",
    },
    {
      type: "richText",
      heading: "Крепление",
      markdown:
        "На спайдерах, коннекторах или в профильной системе — по проекту. Отверстия под крепления — по ГОСТ, с обработанной кромкой.",
    },
  ],
};

const verandTerrasBesedok: GlazingMirrorsPageContent = {
  path: "/osteklenie/verand-terras-besedok/",
  source: { file: SOURCE_13, section: 7 },
  title: "Остекление веранд, террас и беседок",
  order: 5,
  seo: {
    h1: "Остекление веранд, террас и беседок",
    title: "Безрамное остекление веранд и террас для подрядчика | Inex Glass",
    description:
      "Раздвижные безрамные, гильотинные и складные системы, стеклянная крыша из триплекса — стекло и системы одним комплектом для подрядчика.",
  },
  card: { text: "раздвижные, гильотинные, складные системы, стеклянная крыша" },
  intro:
    "Стекло и системы для веранд, террас, беседок и балконов — для подрядчиков загородного строительства, ресторанов и кафе с летними верандами. {условия}",
  quizType: "verandas",
  secondaryLabel: "Отправить проект",
  systemsHeading: "Системы",
  systems: [
    {
      name: "Раздвижная безрамная",
      subtitle: "Закалённые стёкла без рам сдвигаются по направляющей и складываются в пачку",
      whereFits: "Веранды, террасы, балконы и лоджии",
    },
    {
      name: "Гильотинная",
      subtitle: "Стёкла поднимаются и опускаются вертикально",
      whereFits: "Рестораны, кафе, террасы — где нужно открыть проём целиком",
    },
    {
      name: "Складная (гармошка)",
      subtitle: "Створки складываются к краю проёма",
      whereFits: "Широкие проёмы, зимние сады",
    },
    {
      name: "Стеклянная крыша",
      subtitle: "Кровля из закалённого триплекса",
      whereFits: "Навесы над террасами, зимние сады",
    },
  ],
  layout: [
    {
      type: "callout",
      tone: "warning",
      markdown: `Стеклянную крышу делаем **только из триплекса**: стекло над головой должно оставаться на месте даже при разрушении. Схему триплекса рассчитывает инженер под снеговую нагрузку. [Козырьки](${LINKS.kozyrki}) · [Триплекс](${LINKS.tripleks})`,
    },
    {
      type: "richText",
      heading: "Ограждения террас",
      markdown: `Стеклянные ограждения террас и балконов на зажимном профиле [Стеклянные ограждения](${LINKS.ograzhdeniya})`,
    },
    {
      type: "richText",
      slot: "objects",
      markdown: ["Веранды, беседки и террасы из портфолио Inex", "", ALL_OBJECTS].join("\n"),
    },
  ],
};

// ---------------------------------------------------------------------------------------------
// «Зеркала» — teksty/12 §3–§4, teksty/13 §8
// ---------------------------------------------------------------------------------------------

const zerkala: GlazingMirrorsPageContent = {
  path: "/zerkala/",
  source: { file: SOURCE_12, section: 3 },
  title: "Зеркала для проектов",
  order: 0,
  seo: {
    h1: "Зеркала для проектов",
    title: "Изготовление зеркал по размерам для объектов | Inex Glass",
    description:
      "Зеркала для гостиниц, офисов, салонов и залов: по размерам, с фацетом и обработкой кромки, партиями от 50 м².",
  },
  intro:
    "Зеркала для залов, салонов, гостиниц и офисов — партиями по вашим размерам, с обработкой кромки и креплением. {условия}",
  quizType: "mirrors",
  secondaryLabel: "Отправить размеры",
  layout: [
    {
      type: "table",
      heading: "Что делаем",
      // teksty: «Операция» + an empty second header cell.
      columns: ["Операция", EMPTY_HEADER],
      syntheticColumns: true,
      rows: [
        [
          { value: "Резка по размеру и фигурная форма" },
          { value: "Прямоугольные, круглые, арочные, по шаблону из файла" },
        ],
        [
          { value: "Обработка кромки", href: LINKS.kromka },
          { value: "Шлифованная, полированная, еврокромка" },
        ],
        // Facet of mirrors: only 30 or 50 mm (teksty, SSoT) — do not rephrase.
        [{ value: "Фацет", href: LINKS.facet }, { value: "Ширина 30 или 50 мм" }],
        [
          { value: "Матирование рисунка", href: LINKS.matirovanie },
          { value: "Пескоструем со стороны стекла или амальгамы" },
        ],
        [
          { value: "Противоосколочная плёнка" },
          { value: "На обороте зеркала — при разрушении осколки остаются на плёнке" },
        ],
        [{ value: "Подсветка" }, { value: "Зеркала с LED-подсветкой" }],
        [{ value: "Крепление" }, { value: "На клей, в профильной рамке или на подсистеме" }],
      ],
    },
    {
      type: "richText",
      heading: "Куда",
      markdown: [
        `- **Танцевальные и спортивные залы** — зеркальные стены с противоосколочной плёнкой [Зеркала для залов](${LINKS.zerkalaZaly})`,
        `- **Салоны красоты и барбершопы** — одинаковые зеркала на все рабочие места, с подсветкой [Зеркала для салонов](${LINKS.zerkalaSalony})`,
        "- **Гостиницы и офисы** — серии зеркал для номеров и санузлов",
      ].join("\n"),
    },
  ],
};

const zerkalaDlyaZalov: GlazingMirrorsPageContent = {
  path: "/zerkala/dlya-zalov/",
  source: { file: SOURCE_12, section: 4 },
  title: "Зеркала для танцевальных и спортивных залов",
  order: 1,
  seo: {
    h1: "Зеркала для танцевальных и спортивных залов",
    title: "Зеркала для танцевального и спортивного зала | Inex Glass",
    description:
      "Зеркальные стены для залов: безопасные зеркала, размеры под стену, кромка и крепление. Для фитнес-клубов и студий.",
  },
  card: { text: "зеркальные стены с противоосколочной плёнкой" },
  // No `{условия}` in teksty here: the conditions block of the page frame covers it.
  intro:
    "Зеркальная стена в зале — это большие полотна рядом с людьми в движении. Главное — чтобы при ударе зеркало не рассыпалось острыми осколками.",
  quizType: "mirrors",
  secondaryLabel: "Отправить размеры зала",
  layout: [
    {
      type: "callout",
      tone: "warning",
      title: "Безопасность — противоосколочная плёнка",
      markdown:
        "Зеркало нельзя закалить так, как обычное стекло: амальгама не выдерживает печь. Поэтому для залов на оборот зеркала наклеивают **противоосколочную плёнку**: при ударе зеркало трескается, но осколки остаются на плёнке и не падают.",
    },
    {
      type: "richText",
      heading: "Как собрать зеркальную стену",
      markdown: [
        "- **Крепление** — на клей к ровному основанию, в профильной рамке или на подсистеме. Выбор зависит от стены и размера полотен.",
        "- **Стыки** — полированная кромка, чтобы полотна вставали встык без зазоров и острых граней.",
        "- **Фацет** — по желанию, для декоративной кромки.",
        "- **Размер полотна** — до 2,8 м по длинной стороне. Полотна подбираем под высоту зала и возможности подъёма.",
      ].join("\n"),
    },
    {
      type: "richText",
      heading: "Что прислать",
      markdown:
        "Развёртку стены с размерами, высоту потолка, расположение розеток и выключателей (вырезы делаются заранее), способ крепления.",
    },
  ],
};

const zerkalaDlyaSalonov: GlazingMirrorsPageContent = {
  path: "/zerkala/dlya-salonov/",
  source: { file: SOURCE_13, section: 8 },
  title: "Зеркала для салонов красоты и парикмахерских",
  order: 2,
  seo: {
    h1: "Зеркала для салонов красоты и парикмахерских",
    title: "Зеркала для салонов красоты и парикмахерских | Inex Glass",
    description:
      "Зеркала для рабочих мест мастеров: размеры, фацет, обработка кромки — партией под сеть салонов.",
  },
  card: { text: "одинаковые зеркала на все рабочие места, с подсветкой" },
  intro:
    "Одинаковые зеркала на все рабочие места — для нового салона или сразу для сети. {условия}",
  quizType: "mirrors",
  secondaryLabel: "Отправить размеры",
  layout: [
    {
      type: "richText",
      heading: "Что делаем",
      markdown: [
        "- **Размер и форма** — прямоугольные, со скруглёнными углами, арочные, круглые.",
        "- **LED-подсветка** — зеркала с подсветкой для рабочих мест мастеров.",
        `- **Кромка и фацет** — полированная кромка, фацет 30 или 50 мм. [Фацет](${LINKS.facet})`,
        `- **Логотип или рисунок** — матирование пескоструем по зеркалу. [Матирование](${LINKS.matirovanie})`,
        "- **Противоосколочная плёнка** — на обороте: при ударе осколки остаются на плёнке.",
      ].join("\n"),
    },
    {
      type: "richText",
      heading: "Для сети салонов",
      markdown:
        "Один проект — на все точки: зеркала одного размера и вида, повторный заказ по тем же файлам, отгрузка в обрешётке.",
    },
  ],
};

/** All 9 pages, hubs before their children (the slice needs the hub ids for `parent`). */
export const GLAZING_MIRRORS_CONTENT: readonly GlazingMirrorsPageContent[] = [
  osteklenie,
  fasadov,
  spajdernoe,
  vitrinIMagazinov,
  liftovyhShaht,
  verandTerrasBesedok,
  zerkala,
  zerkalaDlyaZalov,
  zerkalaDlyaSalonov,
];
