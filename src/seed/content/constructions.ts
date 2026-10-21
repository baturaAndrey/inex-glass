/**
 * Content of the seven construction documents (task 26), as plain data: copy is taken verbatim
 * from `res/inex-glass-handoff/teksty/` (09 §1, 11 §1, 12 §1/§2/§9/§10, 13 §1), H1 / title /
 * description from `docs/inex/17-meta.md`. Rich text is Markdown (converted by the slice with
 * `markdownToLexical`); `→ [Название]` links of teksty become `[Название](/path/)`. Scheme SVGs
 * were extracted from `Partitions.dc.html` / `Canopies.dc.html` (inline styles and
 * `aria-hidden` removed, the stroke colour #1F6B60 replaced by `currentColor`).
 *
 * Pure module (no Payload imports): the seed slice writes it, `constructions.test.ts` checks it.
 */
import type { QuizTypeId } from "@/lib/domain";

/** Internal link targets of teksty `→ [Название]` (task-26 «Раскладка данных»). */
export const LINKS = {
  proektirovanie: "/proektirovanie/",
  dokumenty: "/kak-zakazat/dokumenty/",
  tolshchina: "/blog/kak-vybrat-tolshchinu-stekla/",
  razmery: "/blog/kak-snyat-razmery-dlya-stekla/",
  chertezhi: "/kak-zakazat/trebovaniya-k-chertezham/",
  osvetlennoe: "/zakalennoe-steklo/osvetlennoe/",
  matovoe: "/zakalennoe-steklo/matovoe/",
  matirovanie: "/obrabotka-stekla/matirovanie/",
  kromka: "/obrabotka-stekla/kromka/",
  otverstiya: "/obrabotka-stekla/otverstiya-i-vyrezy/",
  tripleks: "/tripleks/",
  tripleksIliZakalennoe: "/blog/tripleks-ili-zakalennoe-dlya-ograzhdenij/",
  furnitura: "/furnitura/",
  obekty: "/obekty/",
  vitrinyMagazinov: "/osteklenie/vitrin-i-magazinov/",
  peregorodki: "/steklyannye-peregorodki/",
  ograzhdeniya: "/steklyannye-ograzhdeniya/",
  kozyrki: "/steklyannye-kozyrki/",
  dushevye: "/dushevye-peregorodki/",
  vitriny: "/torgovye-vitriny/",
  zerkala: "/zerkala/",
  osteklenie: "/osteklenie/",
  inexSu: "https://inex.su/",
} as const;

/* ------------------------------------------------------------------------------------------ */
/* Types                                                                                       */
/* ------------------------------------------------------------------------------------------ */

export interface SystemSeed {
  name: string;
  subtitle?: string;
  whereFits?: string;
  important?: string;
  howHeld?: string;
  requiresInGlass?: string;
  schemeSvg?: string;
}

export interface TableSeed {
  columns: string[];
  rows: string[][];
  footnote?: string;
  caption?: string;
}

/** Layout block of the seed; `anchorId` with a `slot-` prefix places it in a template slot. */
export type LayoutSeed =
  | {
      type: "richText";
      heading?: string;
      anchorId?: string;
      /** Markdown. */
      md: string;
      width?: "narrow" | "normal" | "wide";
    }
  | { type: "table"; heading: string; sub?: string; anchorId?: string; table: TableSeed }
  | { type: "callout"; heading?: string; title?: string; tone: "warning" | "info"; md: string }
  | {
      type: "cards";
      heading: string;
      layout: "g3" | "g4" | "ctCards" | "p5Cards" | "seg";
      items: Array<{ title: string; text: string; url: string }>;
    };

export interface FaqSeed {
  question: string;
  /** Markdown. */
  answer: string;
}

export interface ConstructionSeed {
  slug: string;
  /** Public URL (= `path` computed by the collection hooks: root documents). */
  url: string;
  title: string;
  kind: "hub" | "construction";
  group: "constructions" | "glazing" | "mirrors" | "hardware";
  order: number;
  breadcrumbLabel: string;
  card: { title: string; text: string };
  seo: { h1: string; title: string; description: string };
  /** Markdown, `{условия}` substituted at render time. */
  intro: string;
  ctaPrimaryLabel: string;
  ctaSecondaryLabel?: string;
  secondaryFormKey: "drawing" | "load" | "none";
  quizType: QuizTypeId;
  /** `products` record to link as `productTag` (looked up by `quizType`, never created). */
  productQuizType?: QuizTypeId;
  systemsHeading?: string;
  systemsLayout?: "cards" | "table";
  systems?: SystemSeed[];
  profileSystems?: string[];
  glassHeading?: string;
  /** Markdown per bullet. */
  glassBullets?: string[];
  riskCallout?: { title: string; body: string };
  /** Markdown; its first node is the column heading. */
  documents?: string;
  objectsHeading?: string;
  whoDoesWhat?: { left: string[]; right: string[] };
  inexSuBridge?: { title: string; text: string; buttonLabel: string; url: string };
  snowCalcBlock?: { title: string; body: string; sideText: string; ctaLabel: string };
  showShowerConfigs?: boolean;
  faq?: FaqSeed[];
  layout: LayoutSeed[];
}

/* ------------------------------------------------------------------------------------------ */
/* Scheme SVGs                                                                                 */
/* ------------------------------------------------------------------------------------------ */

/** Partitions.dc.html `.p5-sys__pic`, in the order of the systems table. */
export const PARTITION_SCHEMES = [
  '<svg viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="20" y="12" width="80" height="10" rx="2" fill="#D9DCDE"/><rect x="20" y="98" width="80" height="10" rx="2" fill="#D9DCDE"/><rect x="54" y="22" width="12" height="76" fill="#B7D7D1" stroke="currentColor"/></svg>',
  '<svg viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="22" y="14" width="76" height="92" rx="3"/><rect x="30" y="22" width="60" height="76" fill="#B7D7D1"/><line x1="60" y1="22" x2="60" y2="98"/></svg>',
  '<svg viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="16" x2="108" y2="16" stroke-width="3"/><circle cx="34" cy="22" r="3"/><circle cx="74" cy="22" r="3"/><rect x="18" y="26" width="46" height="80" fill="#B7D7D1"/><rect x="58" y="30" width="46" height="76" fill="#DCEBE8"/><path d="M84 66h14m-4 -4 4 4 -4 4"/></svg>',
  '<svg viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="14" y="14" width="40" height="92" fill="#B7D7D1"/><rect x="58" y="14" width="44" height="92" fill="#DCEBE8"/><rect x="60" y="30" width="5" height="10" fill="currentColor"/><rect x="60" y="80" width="5" height="10" fill="currentColor"/><line x1="94" y1="56" x2="94" y2="68" stroke-width="3"/><path d="M102 106 A44 44 0 0 0 58 62" stroke-dasharray="4 4"/></svg>',
] as const;

/** Canopies.dc.html `<svg viewBox="0 0 240 140">`: wide schemes named by `aria-label`. */
export const CANOPY_SCHEMES = [
  '<svg viewBox="0 0 240 140" fill="none" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Схема козырька на тягах"><rect x="12" y="8" width="18" height="124" fill="#ECEEEC" stroke="#5B636B" stroke-width="2"/><rect x="30" y="78" width="10" height="14" fill="#5B636B"/><line x1="36" y1="84" x2="224" y2="90" stroke="#2B8C7E" stroke-width="7" opacity=".55"/><line x1="36" y1="84" x2="224" y2="90" stroke="currentColor" stroke-width="1.5"/><line x1="30" y1="22" x2="200" y2="86" stroke="#5B636B" stroke-width="2.5"/><circle cx="30" cy="22" r="4" fill="#5B636B"/><circle cx="200" cy="86" r="4" fill="#5B636B"/></svg>',
  '<svg viewBox="0 0 240 140" fill="none" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Схема консольного козырька на зажимном профиле"><rect x="12" y="8" width="18" height="124" fill="#ECEEEC" stroke="#5B636B" stroke-width="2"/><rect x="30" y="72" width="22" height="26" rx="2" fill="#D9DCDE" stroke="#5B636B" stroke-width="2"/><line x1="40" y1="84" x2="224" y2="90" stroke="#2B8C7E" stroke-width="7" opacity=".55"/><line x1="40" y1="84" x2="224" y2="90" stroke="currentColor" stroke-width="1.5"/></svg>',
  '<svg viewBox="0 0 240 140" fill="none" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Схема козырька на спайдерах"><rect x="12" y="8" width="18" height="124" fill="#ECEEEC" stroke="#5B636B" stroke-width="2"/><line x1="36" y1="84" x2="224" y2="90" stroke="#2B8C7E" stroke-width="7" opacity=".55"/><line x1="36" y1="84" x2="224" y2="90" stroke="currentColor" stroke-width="1.5"/><line x1="30" y1="112" x2="190" y2="112" stroke="#5B636B" stroke-width="3"/><line x1="80" y1="112" x2="80" y2="89" stroke="#5B636B" stroke-width="2"/><line x1="170" y1="112" x2="170" y2="92" stroke="#5B636B" stroke-width="2"/><circle cx="80" cy="86" r="5" fill="#fff" stroke="#5B636B" stroke-width="2"/><circle cx="170" cy="89" r="5" fill="#fff" stroke="#5B636B" stroke-width="2"/><path d="M66 100l14 -14 14 14 M156 103l14 -14 14 14" stroke="#5B636B" stroke-width="2"/></svg>',
] as const;

/* ------------------------------------------------------------------------------------------ */
/* Shared texts                                                                                */
/* ------------------------------------------------------------------------------------------ */

const TURNKEY_TITLE = "Нужен монтаж «под ключ»?";
const INEX_SU_LABEL = "inex.su";

/* ------------------------------------------------------------------------------------------ */
/* Documents                                                                                   */
/* ------------------------------------------------------------------------------------------ */

/** teksty/09 §1 — hub «Стеклянные конструкции». */
const HUB: ConstructionSeed = {
  slug: "steklyannye-konstrukcii",
  url: "/steklyannye-konstrukcii/",
  title: "Стеклянные конструкции",
  kind: "hub",
  group: "constructions",
  order: 0,
  breadcrumbLabel: "Стеклянные конструкции",
  card: {
    title: "Стеклянные конструкции",
    text: "Перегородки, ограждения, козырьки, душевые, фасады и витрины",
  },
  seo: {
    h1: "Стеклянные конструкции для объектов",
    title: "Стеклянные конструкции — проект и комплектация | Inex Glass",
    description:
      "Перегородки, ограждения, душевые, козырьки и фасады: проектируем узлы, комплектуем стекло, профиль и фурнитуру. Монтаж — ваша бригада.",
  },
  intro:
    "Перегородки, ограждения, козырьки, душевые, фасады и витрины. Мы проектируем узлы, комплектуем стекло, профиль и фурнитуру и отправляем комплект на объект. Монтаж выполняет ваша бригада. {условия}",
  ctaPrimaryLabel: "Рассчитать стоимость",
  ctaSecondaryLabel: "Отправить проект",
  secondaryFormKey: "drawing",
  quizType: "other",
  objectsHeading: "Объекты",
  whoDoesWhat: {
    left: [
      "Проверяем чертёж или проектируем узлы",
      "Подбираем стекло под нагрузку: толщину и схему триплекса",
      "Комплектуем стекло, профиль и фурнитуру одним заказом",
      "Контролируем изготовление и упаковку, отправляем на объект",
    ],
    right: ["Снимает размеры по месту", "Принимает партию на объекте", "Монтирует"],
  },
  inexSuBridge: {
    title: TURNKEY_TITLE,
    text: "Проект с монтажом выполняет инжиниринговая компания Inex",
    buttonLabel: INEX_SU_LABEL,
    url: LINKS.inexSu,
  },
  layout: [
    {
      type: "cards",
      heading: "Конструкции",
      layout: "p5Cards",
      items: [
        {
          title: "Стеклянные перегородки",
          text: "офисы, ТЦ, банки, медцентры",
          url: LINKS.peregorodki,
        },
        {
          title: "Ограждения и перила",
          text: "лестницы, атриумы, балконы",
          url: LINKS.ograzhdeniya,
        },
        {
          title: "Козырьки",
          text: "над входом, из триплекса под снеговую нагрузку",
          url: LINKS.kozyrki,
        },
        {
          title: "Душевые перегородки для проектов",
          text: "гостиницы, спортивные объекты",
          url: LINKS.dushevye,
        },
        { title: "Торговые витрины", text: "для магазинов и сетей, на заказ", url: LINKS.vitriny },
        { title: "Зеркала", text: "для залов и салонов", url: LINKS.zerkala },
        {
          title: "Остекление зданий",
          text: "фасады, витрины, лифтовые шахты, веранды",
          url: LINKS.osteklenie,
        },
      ],
    },
    {
      type: "richText",
      heading: "Почему комплект, а не стекло отдельно",
      anchorId: "slot-b-why",
      md: "Стекло изготавливается под конкретный профиль и фурнитуру: отверстия, зазоры и кромка рассчитаны под них. Когда стекло, профиль и фурнитура приходят из разных мест, несовпадение обнаруживается на объекте — а закалённое стекло там уже не подогнать.",
    },
  ],
};

/** teksty/11 §1 — «Стеклянные перегородки». */
const PARTITIONS: ConstructionSeed = {
  slug: "steklyannye-peregorodki",
  url: "/steklyannye-peregorodki/",
  title: "Стеклянные перегородки",
  kind: "construction",
  group: "constructions",
  order: 1,
  breadcrumbLabel: "Стеклянные перегородки",
  card: { title: "Стеклянные перегородки", text: "офисы, ТЦ, банки, медцентры" },
  seo: {
    h1: "Стеклянные перегородки для офисов и коммерческих объектов",
    title: "Стеклянные перегородки для офисов — комплект с узлами | Inex Glass",
    description:
      "Цельностеклянные и в алюминиевом профиле: стекло, профиль и фурнитура одним заказом, проверка узлов до запуска. Объекты от 50 м².",
  },
  intro:
    "Офисы, торговые центры, банки, медицинские центры: стекло, профиль и фурнитура одним комплектом. Проверяем узлы до запуска производства, чтобы перегородка собралась на объекте без доработок. Монтаж выполняет ваша бригада. {условия}",
  ctaPrimaryLabel: "Рассчитать комплект",
  ctaSecondaryLabel: "Отправить планировку",
  secondaryFormKey: "drawing",
  quizType: "partitions",
  productQuizType: "partitions",
  systemsHeading: "Какую систему выбрать",
  systemsLayout: "cards",
  systems: [
    {
      name: "Цельностеклянная",
      subtitle: "стекло в зажимном профиле по полу и потолку",
      whereFits:
        "Переговорные, кабинеты руководителей, шоурумы — где нужен максимум света и минимум металла",
      important: "Стекло работает без каркаса, поэтому толщину подбирают под высоту и нагрузку",
      schemeSvg: PARTITION_SCHEMES[0],
    },
    {
      name: "В алюминиевом профиле",
      subtitle: "каркасная",
      whereFits:
        "Офисы open space, банки, медцентры — где нужны двери, звукоизоляция, частые перепланировки",
      important: "Каркас держит стекло по контуру, можно встроить двери и жалюзи",
      schemeSvg: PARTITION_SCHEMES[1],
    },
    {
      name: "Раздвижная",
      whereFits: "Зонирование, которое иногда нужно открыть: переговорные, залы",
      important: "Подвесная или напольная направляющая; стекло — с отверстиями под ролики",
      schemeSvg: PARTITION_SCHEMES[2],
    },
    {
      name: "С дверью",
      subtitle: "распашной или маятниковой",
      whereFits: "Любая из систем выше",
      important:
        "Отверстия и вырезы под петли и замок делаются до закалки — модель фурнитуры нужна до заказа",
      schemeSvg: PARTITION_SCHEMES[3],
    },
  ],
  profileSystems: ["Алютех", "СИАЛ", "Татпроф", "Доксал", "Loft-Gratec", "Фристайл"],
  glassHeading: "Стекло для перегородки",
  glassBullets: [
    `**Толщина и схема триплекса — расчётом.** Перегородка высотой 2,7 м и 3,5 м, с каркасом и без него требует разного стекла. Подбираем толщину или триплекс под вашу высоту и способ крепления. [Как выбрать толщину стекла](${LINKS.tolshchina})`,
    `**Осветлённое стекло** — если торец на виду: в обычном толстом стекле он зеленит. [Осветлённое стекло](${LINKS.osvetlennoe})`,
    `**Матовое, полосы приватности, логотип** — для переговорных и кабинетов. [Матовое стекло](${LINKS.matovoe}) · [Матирование](${LINKS.matirovanie})`,
    `**Кромка** — для видимого торца рекомендуем еврокромку; острые углы — скруглить. [Обработка кромки](${LINKS.kromka})`,
  ],
  riskCallout: {
    title: "Главный риск — проём",
    body: [
      "Перегородку изготавливают по размерам, а закалённое стекло на объекте не подрезать. Поэтому:",
      "",
      "1. **Размеры снимают после чистовой отделки** — пола, потолка и стен. На больших объектах — после контрольных замеров по готовым поверхностям.",
      "2. **Перепад пола и потолка закладывают в чертёж.** Профиль компенсирует несколько миллиметров; больше — нужно учесть в размерах стёкол.",
      "3. **Монтажные зазоры** — по документации выбранной системы.",
      "",
      `[Как снять размеры проёма](${LINKS.razmery}) · [Требования к чертежам](${LINKS.chertezhi})`,
    ].join("\n"),
  },
  documents: [
    "## Документы для сдачи объекта",
    "",
    `Паспорт и сертификаты на стекло — по ГОСТ 30698-2014, на триплекс — по ГОСТ 30826-2014. Оригиналы едут вместе с партией. [Документы](${LINKS.dokumenty})`,
  ].join("\n"),
  objectsHeading: "Объекты",
  inexSuBridge: {
    title: TURNKEY_TITLE,
    text: "Inex Glass комплектует перегородки для подрядчиков. Если вам нужен проект с монтажом, его выполняет инжиниринговая компания Inex",
    buttonLabel: INEX_SU_LABEL,
    url: LINKS.inexSu,
  },
  faq: [
    {
      question: "Какой высоты может быть цельностеклянная перегородка?",
      answer:
        "Зависит от толщины стекла, триплекса и крепления. Пришлите высоты — подберём стекло расчётом.",
    },
    {
      question: "Можно ли встроить дверь?",
      answer:
        "Да, в любую систему. Модель петель и замка нужна до заказа: отверстия под них делают до закалки.",
    },
    {
      question: "От какого объёма работаете?",
      answer: "От 50 м² стекла. При высоте 2,7 м это около 19 погонных метров перегородки.",
    },
    {
      question: "Сколько изготавливается?",
      answer: "От 10 рабочих дней с даты договора, триплекс — от 14.",
    },
    {
      question: "Что входит в комплект?",
      answer:
        "Стекло с обработкой, профиль выбранной системы и фурнитура — одним заказом, по согласованной спецификации.",
    },
  ],
  layout: [
    {
      type: "richText",
      anchorId: "slot-profile-intro",
      md: "Поставляем перегородочные системы Алютех, СИАЛ, Татпроф, Доксал, Loft-Gratec и Фристайл. Систему подбираем под проект: высоту, нужную звукоизоляцию, двери и бюджет.",
    },
    {
      type: "richText",
      anchorId: "slot-objects-text",
      md: `Перегородки для банков, торговых центров и офисов — в том числе для Главного управления «Сургутнефтегаз». [Все объекты](${LINKS.obekty})`,
    },
  ],
};

/** teksty/12 §1 — «Стеклянные ограждения и перила». */
const RAILINGS: ConstructionSeed = {
  slug: "steklyannye-ograzhdeniya",
  url: "/steklyannye-ograzhdeniya/",
  title: "Стеклянные ограждения и перила",
  kind: "construction",
  group: "constructions",
  order: 2,
  breadcrumbLabel: "Ограждения и перила",
  card: { title: "Ограждения и перила", text: "лестницы, атриумы, балконы" },
  seo: {
    h1: "Стеклянные ограждения и перила",
    title: "Стеклянные ограждения и перила — стекло с профилем | Inex Glass",
    description:
      "Ограждения для лестниц, атриумов и балконов: закалённое стекло или триплекс под нагрузку, профиль и фурнитура одним заказом.",
  },
  intro:
    "Стекло и профиль одним комплектом, рассчитанные под нагрузку вашего объекта. Монтаж выполняет ваша бригада. {условия}",
  ctaPrimaryLabel: "Рассчитать комплект",
  ctaSecondaryLabel: "Отправить проект",
  secondaryFormKey: "drawing",
  quizType: "railings",
  productQuizType: "railings",
  systemsHeading: "Типы систем",
  systemsLayout: "table",
  systems: [
    {
      name: "На зажимном профиле",
      howHeld: "Стекло зажато в алюминиевом профиле по полу или по торцу плиты",
      whereFits: "Атриумы, балконы, лестницы — сплошное стеклянное полотно без стоек",
    },
    {
      name: "На точечных креплениях",
      howHeld: "Стекло держится на спайдерах или стеклодержателях через отверстия",
      whereFits: "Лестницы, торцы перекрытий, фасадные ограждения",
    },
    {
      name: "С поручнем",
      howHeld: "Поверх стекла — поручень по проекту",
      whereFits: "Общественные здания, где поручень требуется по нормам",
    },
  ],
  layout: [
    {
      type: "richText",
      anchorId: "slot-systems-profiles",
      md: [
        `Профили и крепления — в комплекте со стеклом или отдельно. [Зажимной профиль и спайдеры](${LINKS.furnitura})`,
        "",
        "Зажимной профиль — под стекло и триплекс толщиной 10, 12, 16 и 20 мм.",
      ].join("\n"),
    },
    {
      type: "table",
      heading: "Нагрузка и нормы",
      sub: "Горизонтальную нагрузку на поручень задаёт СП 20.13330.2016 «Нагрузки и воздействия»:",
      table: {
        caption: "Нагрузка на поручень по типу здания",
        columns: ["Здание", "Нагрузка на поручень"],
        rows: [
          ["Жилые дома, детские сады, больницы", "0,3 кН/м (≈ 30 кгс на метр)"],
          ["Офисы и общественные здания", "0,8 кН/м (≈ 80 кгс на метр)"],
          ["Трибуны, спортзалы, места скопления людей", "1,5 кН/м (≈ 150 кгс на метр)"],
        ],
        footnote:
          "Требования к ограждениям — ГОСТ 25772-2021, к многослойному стеклу — ГОСТ 30826-2014. На ограждающие системы есть протоколы испытаний.",
      },
    },
    {
      type: "richText",
      heading: "Стекло",
      md: [
        `- **Закалённый триплекс** — если стекло ограждает перепад высот: при разрушении осколки остаются на плёнке, а полотно — в профиле. [Триплекс](${LINKS.tripleks})`,
        "- **Однослойное закалённое** — там, где разрушение не создаёт риска падения.",
        `- **Толщину и схему триплекса рассчитывает инженер Inex Glass** под нагрузку, высоту и крепление. [Проектирование](${LINKS.proektirovanie}) · [Триплекс или закалённое для ограждения](${LINKS.tripleksIliZakalennoe})`,
        `- **Осветлённое стекло** — торец ограждения на виду, а в толстом обычном стекле он зеленит. [Осветлённое стекло](${LINKS.osvetlennoe})`,
      ].join("\n"),
    },
    {
      type: "richText",
      heading: "Что учитываем в узлах",
      md: [
        "- **Углы скругляем** — об острый угол закалённого стекла легко порезаться и его легко сколоть при монтаже.",
        `- **Кромки отверстий обрабатываем** — по ГОСТ 30698-2014 они притупляются; под нагруженный крепёж — обработка изнутри. [Отверстия и вырезы](${LINKS.otverstiya})`,
        "- **Клеймо на видимом стекле** можно не ставить.",
        "- **Допуски стекла и регулировка профиля** — закладываем в спецификацию, чтобы полотна встали в одну линию.",
      ].join("\n"),
    },
    {
      type: "richText",
      heading: "Объекты",
      anchorId: "slot-b-objects",
      md: `Атриумы торговых центров, лестницы, спортивные объекты. [Все объекты](${LINKS.obekty})`,
    },
  ],
};

/** teksty/13 §1 — «Стеклянные козырьки». */
const CANOPIES: ConstructionSeed = {
  slug: "steklyannye-kozyrki",
  url: "/steklyannye-kozyrki/",
  title: "Стеклянные козырьки",
  kind: "construction",
  group: "constructions",
  order: 3,
  breadcrumbLabel: "Стеклянные козырьки",
  card: { title: "Козырьки", text: "над входом, из триплекса под снеговую нагрузку" },
  seo: {
    h1: "Стеклянные козырьки",
    title: "Стеклянный козырёк — триплекс под нагрузку | Inex Glass",
    description:
      "Козырьки над входом на тягах и спайдерах: подберём триплекс под снеговую нагрузку, стекло и крепления одним заказом.",
  },
  intro:
    "Козырёк — это стекло над головой людей. Поэтому делаем его только из закалённого триплекса и рассчитываем под снеговую нагрузку вашего района. Стекло и крепления — одним комплектом. {условия}",
  ctaPrimaryLabel: "Рассчитать козырёк",
  ctaSecondaryLabel: "Отправить проект",
  secondaryFormKey: "drawing",
  quizType: "canopies",
  productQuizType: "canopies",
  systemsHeading: "Схемы крепления",
  systemsLayout: "cards",
  systems: [
    {
      name: "На тягах (подвесах, вантах)",
      howHeld: "Стекло опирается на кронштейны у стены, вынос держат тяги",
      requiresInGlass: "Отверстия под кронштейны и узлы тяг",
      schemeSvg: CANOPY_SCHEMES[0],
    },
    {
      name: "Консольный на зажимном профиле",
      howHeld: "Стекло зажато в профиле на стене, без тяг",
      requiresInGlass: "Без отверстий; толщина триплекса больше",
      schemeSvg: CANOPY_SCHEMES[1],
    },
    {
      name: "На спайдерах",
      howHeld: "Стекло крепится точечно через отверстия",
      requiresInGlass: "Цилиндрические или конусные отверстия по ГОСТ",
      schemeSvg: CANOPY_SCHEMES[2],
    },
  ],
  snowCalcBlock: {
    title: "Расчёт под снег",
    body: `Схему триплекса, шаг креплений и вынос рассчитывает **инженер Inex Glass**: под снеговой район, размеры и схему крепления. По расчёту выдаём проектную документацию. [Проектирование](${LINKS.proektirovanie})`,
    sideText: "Пришлите: размеры козырька, город, схему крепления (если выбрана) и материал стены.",
    ctaLabel: "Отправить проект на расчёт",
  },
  faq: [
    {
      question: "Какой толщины стекло на козырёк?",
      answer:
        "Зависит от выноса, снегового района и крепления — считаем для каждого козырька. Например, триплекс 6+6, 8+8 или 10+10 из закалённых стёкол.",
    },
    {
      question: "Можно ли без тяг?",
      answer: "Да, консольный козырёк на зажимном профиле. Триплекс для него, как правило, толще.",
    },
    { question: "Делаете ли монтаж?", answer: "Нет — комплект для вашей бригады." },
  ],
  layout: [
    {
      type: "richText",
      anchorId: "slot-systems-components",
      md: `Делаем все три схемы. Комплектующие — тяги, кронштейны, профиль, спайдеры — продаём и отдельно от стекла. [Зажимной профиль и спайдеры](${LINKS.furnitura})`,
    },
    {
      type: "richText",
      heading: "Только триплекс из закалённого стекла",
      md: "Однослойное закалённое стекло при разрушении рассыпается и падает вниз. Триплекс трескается, но остаётся на плёнке. Для козырьков используем только триплекс из закалённых стёкол.",
    },
    {
      type: "richText",
      heading: "Что ещё учитываем",
      anchorId: "slot-b-details",
      md: [
        `- **Отверстия** — по ГОСТ 30698-2014: от кромки не ближе двух толщин стекла, от угла — шести; кромка отверстий обрабатывается. [Отверстия и вырезы](${LINKS.otverstiya})`,
        "- **Уклон** — чтобы вода и снег сходили, а не стояли на стекле.",
        "- **Большие размеры** — максимальный размер зависит от схемы триплекса и завода; проверим по вашему проекту.",
      ].join("\n"),
    },
  ],
};

/** teksty/12 §2 — «Душевые перегородки для проектов». */
const SHOWERS: ConstructionSeed = {
  slug: "dushevye-peregorodki",
  url: "/dushevye-peregorodki/",
  title: "Душевые перегородки для проектов",
  kind: "construction",
  group: "constructions",
  order: 4,
  breadcrumbLabel: "Душевые перегородки",
  card: { title: "Душевые перегородки для проектов", text: "гостиницы, спортивные объекты" },
  seo: {
    h1: "Душевые перегородки для проектов",
    title: "Душевые перегородки для гостиниц и спортобъектов | Inex Glass",
    description:
      "Душевые перегородки партиями для гостиниц, фитнес-клубов и арен: одинаковые конфигурации, фурнитура одной партии.",
  },
  intro:
    "Десятки одинаковых перегородок на объект: стекло 8 или 10 мм, фурнитура в наличии под любой объём. Для гостиниц, фитнес-клубов, спортивных комплексов и общежитий. {условия}",
  ctaPrimaryLabel: "Рассчитать партию",
  ctaSecondaryLabel: "Отправить проект",
  secondaryFormKey: "drawing",
  quizType: "shower",
  productQuizType: "shower",
  showShowerConfigs: true,
  layout: [
    {
      type: "richText",
      heading: "Для объекта, а не для одной ванной",
      md: [
        "- **Серийность.** Одна конфигурация на десятки номеров — изготавливаем партией по одному чертежу, стёкла маркируем по номерам.",
        "- **Фурнитура в наличии под любой объём** — петли, ручки, профили ведущих производителей. Комплектуем объект целиком, без досылки.",
        "- **Стекло:** 8 или 10 мм, закалённое; прозрачное, матовое, тонированное; матирование и плёнка — по согласованию.",
        "- **Цветопроба** — для тонированного стекла и стекла с плёнкой согласуем образец до запуска партии. Образцы бесплатно, около недели.",
      ].join("\n"),
    },
    {
      type: "callout",
      heading: "Что важно знать",
      tone: "warning",
      md: [
        "- Монтаж не выполняем — комплект для вашей бригады.",
        "- Отверстия под петли и вырезы под ручки делаются до закалки: модель фурнитуры нужна до заказа.",
        "- Розничные заказы (одна кабина, шторка, поддон) не принимаем.",
      ].join("\n"),
    },
  ],
};

/** teksty/12 §10 — «Торговые витрины на заказ». */
const SHOPFRONTS: ConstructionSeed = {
  slug: "torgovye-vitriny",
  url: "/torgovye-vitriny/",
  title: "Торговые витрины",
  kind: "construction",
  group: "constructions",
  order: 5,
  breadcrumbLabel: "Торговые витрины",
  card: { title: "Торговые витрины", text: "для магазинов и сетей, на заказ" },
  seo: {
    h1: "Торговые витрины на заказ",
    title: "Торговые витрины из стекла на заказ | Inex Glass",
    description:
      "Стеклянные витрины для магазинов, ювелирных салонов и торговых центров — на заказ по вашему проекту, партией на все точки сети.",
  },
  intro:
    "По вашему дизайн-проекту — для магазинов, ювелирных салонов, бутиков, музеев и торговых центров. Одинаковые витрины на все точки сети. {условия}",
  ctaPrimaryLabel: "Рассчитать стоимость",
  ctaSecondaryLabel: "Отправить проект",
  secondaryFormKey: "drawing",
  quizType: "shopfronts",
  productQuizType: "shopfronts",
  layout: [
    {
      type: "richText",
      heading: "Только по вашему проекту",
      md: "Серийных моделей и каталога у нас нет: каждую витрину изготавливаем индивидуально — под размеры, планировку и дизайн-проект вашего магазина. Пришлите эскиз или проект — подготовим спецификацию и КП.",
    },
    {
      type: "richText",
      heading: "Стекло для витрины",
      md: [
        "- **Закалённое** — безопасное: при ударе рассыпается на мелкие тупые осколки.",
        `- **Осветлённое** — товар выглядит в своём цвете, торцы стекла не зеленят; 8, 10, 12 мм. [Осветлённое стекло](${LINKS.osvetlennoe})`,
        `- **Триплекс** — для ювелирных и музейных витрин, где стекло должно выдерживать удар и оставаться в проёме. [Триплекс](${LINKS.tripleks})`,
      ].join("\n"),
    },
    {
      type: "richText",
      heading: "Для торговых сетей",
      md: [
        "- одинаковые витрины на все точки — по одному проекту;",
        "- повторный заказ по тем же чертежам — укажите номер прошлого заказа;",
        "- отгрузка партиями под график открытий, обрешётка и фото упаковки.",
      ].join("\n"),
    },
    {
      type: "richText",
      heading: "Как заказать",
      md: [
        "1. Пришлите дизайн-проект или эскиз с размерами.",
        `2. Проработаем узлы и спецификацию (проектирование — платно, по задаче). [Проектирование](${LINKS.proektirovanie})`,
        "3. Получите КП — в среднем за 2–3 рабочих дня.",
        "",
        `Остекление фасада магазина и входной группы — на странице [Витрины и остекление магазинов](${LINKS.vitrinyMagazinov}).`,
      ].join("\n"),
    },
  ],
};

/** teksty/12 §9 — «Зажимной профиль и спайдеры». */
const HARDWARE: ConstructionSeed = {
  slug: "furnitura",
  url: "/furnitura/",
  title: "Зажимной профиль и спайдеры",
  kind: "construction",
  group: "hardware",
  order: 6,
  breadcrumbLabel: "Зажимной профиль и спайдеры",
  card: {
    title: "Зажимной профиль и спайдеры",
    text: "Профиль и крепления — отдельно или одним комплектом со стеклом",
  },
  seo: {
    h1: "Зажимной профиль и спайдерная фурнитура",
    title: "Зажимной профиль для стекла и спайдеры | Inex Glass",
    description:
      "Профиль и точечные крепления для ограждений, козырьков и фасадов — в одном заказе со стеклом, изготовленным под этот профиль.",
  },
  intro:
    "Профиль и крепления — отдельно или одним комплектом со стеклом. В комплекте стекло изготавливается под конкретный профиль и крепления: отверстия, зазоры и толщина совпадают без подбора на объекте.",
  ctaPrimaryLabel: "Рассчитать комплект",
  secondaryFormKey: "none",
  quizType: "other",
  layout: [
    {
      type: "table",
      heading: "Что поставляем",
      table: {
        caption: "Что поставляем",
        columns: ["Изделие", "Для чего"],
        rows: [
          [
            "Зажимной профиль",
            "Ограждения, цельностеклянные перегородки, козырьки — стекло зажимается без отверстий",
          ],
          [
            "Спайдеры и рутели",
            "Спайдерное остекление, ограждения, козырьки на точечных креплениях",
          ],
          [
            "Комплектующие для козырьков",
            "Тяги, консоли, крепления — продаём и отдельно от стекла",
          ],
        ],
      },
    },
    {
      type: "richText",
      md: "Зажимной профиль — под стекло и триплекс толщиной **10, 12, 16 и 20 мм**.",
    },
    {
      type: "richText",
      heading: "Отверстия под спайдеры",
      md: `Делаем цилиндрические и конусные (под потайную головку) отверстия. Расстояния от кромки и угла — по ГОСТ 30698-2014: от кромки не ближе двух толщин стекла, от угла — шести. [Отверстия и вырезы](${LINKS.otverstiya})`,
    },
  ],
};

/** All documents of the slice, in `order`. */
export const CONSTRUCTIONS: readonly ConstructionSeed[] = [
  HUB,
  PARTITIONS,
  RAILINGS,
  CANOPIES,
  SHOWERS,
  SHOPFRONTS,
  HARDWARE,
];
