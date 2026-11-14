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

/** A photo shipped with the seed (`src/seed/media/constructions/<file>`, see `../seed-media.ts`). */
export interface ImageSeed {
  file: string;
  /** Russian alt text describing the picture. */
  alt: string;
}

export interface SystemSeed {
  name: string;
  subtitle?: string;
  whereFits?: string;
  important?: string;
  howHeld?: string;
  requiresInGlass?: string;
  schemeSvg?: string;
  /** Photo of the system (Paper mockup `2560_steklyannye-peregorodki`); shown instead of the scheme. */
  image?: ImageSeed;
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
      items: Array<{ title: string; text: string; url: string; image?: ImageSeed }>;
    }
  | {
      /** `cta` block; the hub renders a `primaryDark` one as the dark «Монтаж» panel. */
      type: "cta";
      title: string;
      /** Markdown. */
      md: string;
      tone: "light" | "primaryDark";
      /** One button opening the drawing form. */
      formButton: { label: string };
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
  /** Hero photo (`heroImage`). */
  heroImage?: ImageSeed;
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

/**
 * Montage wording approved by the client on 2026-11-09 (the home row «Монтаж»,
 * `src/seed/content/home.ts`): a partner crew or chef-montage instead of «ваша бригада».
 */
const MONTAGE_LEAD =
  "Подберём проверенную монтажную бригаду или проведём шеф-монтаж с вашими специалистами.";
const MONTAGE_TEXT = `${MONTAGE_LEAD} Консультируем на всех этапах, от подготовки проёмов до сдачи объекта.`;

/** Hub card descriptions: teksty/09 §1, capitalised as in the approved Paper mockup. */
const HUB_CARDS: ReadonlyArray<{ title: string; text: string; url: string; image: ImageSeed }> = [
  {
    title: "Стеклянные перегородки",
    text: "Офисы, ТЦ, банки, медцентры",
    url: LINKS.peregorodki,
    image: { file: "peregorodki.webp", alt: "Цельностеклянная перегородка в светлом офисе" },
  },
  {
    title: "Ограждения и перила",
    text: "Лестницы, атриумы, балконы",
    url: LINKS.ograzhdeniya,
    image: { file: "ograzhdeniya.webp", alt: "Стеклянное ограждение галереи в атриуме" },
  },
  {
    title: "Козырьки",
    text: "Над входом, из триплекса под снеговую нагрузку",
    url: LINKS.kozyrki,
    image: { file: "kozyrki.webp", alt: "Стеклянный козырёк на тягах над входом в здание" },
  },
  {
    title: "Душевые перегородки для проектов",
    text: "Гостиницы, спортивные объекты",
    url: LINKS.dushevye,
    image: { file: "dushevye.webp", alt: "Стеклянные душевые перегородки в ряд" },
  },
  {
    title: "Торговые витрины",
    text: "Для магазинов и сетей, на заказ",
    url: LINKS.vitriny,
    image: { file: "vitriny.webp", alt: "Стеклянная торговая витрина с подсветкой в магазине" },
  },
  {
    title: "Зеркала",
    text: "Для залов и салонов",
    url: LINKS.zerkala,
    image: { file: "zerkala.webp", alt: "Зеркальная стена в светлом зале" },
  },
  {
    title: "Остекление зданий",
    text: "Фасады, витрины, лифтовые шахты, веранды",
    url: LINKS.osteklenie,
    image: { file: "osteklenie.webp", alt: "Стеклянный фасад на точечных креплениях" },
  },
];

/** «Кто что делает», right column «Монтаж» (approved wording of 2026-11-09). */
const HUB_MONTAGE_ITEMS = [
  "Проверенная бригада-партнёр",
  "Или шеф-монтаж с вашими специалистами",
  "Консультации от подготовки проёмов до сдачи объекта",
];

/**
 * teksty/09 §1 — hub «Стеклянные конструкции», laid out by the approved Paper mockup
 * `2560_steklyannye-konstrukcii` (2026-11): hero, 7 photo cards + the dark «Монтаж» panel
 * (`cta` block), cream block with «Кто что делает» and «Почему комплект» (its second sentence
 * quoted: the warning note), objects. Wording outside teksty: `HUB_MOCKUP_COPY`.
 */
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
      "Перегородки, ограждения, душевые, козырьки и фасады: проектируем узлы, комплектуем стекло, профиль и фурнитуру. Монтаж — бригада-партнёр или шеф-монтаж.",
  },
  // The conditions are the checklist of the hero (from the `conditions` global): no `{условия}`.
  intro: `Перегородки, ограждения, козырьки, душевые, фасады и витрины. Мы проектируем узлы, комплектуем стекло, профиль и фурнитуру и отправляем комплект на объект. ${MONTAGE_LEAD}`,
  heroImage: {
    file: "hub-hero.webp",
    alt: "Монтажники несут стеклянную панель вдоль стеклянного ограждения в атриуме",
  },
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
    right: HUB_MONTAGE_ITEMS,
  },
  layout: [
    {
      type: "cards",
      heading: "Конструкции",
      layout: "p5Cards",
      items: [...HUB_CARDS],
    },
    {
      type: "cta",
      title: "Монтаж",
      md: MONTAGE_TEXT,
      tone: "primaryDark",
      formButton: { label: "Отправить проект" },
    },
    {
      type: "richText",
      heading: "Почему комплект, а не стекло отдельно",
      anchorId: "slot-b-why",
      md: [
        "Стекло изготавливается под конкретный профиль и фурнитуру: отверстия, зазоры и кромка рассчитаны под них.",
        "",
        "> Когда стекло, профиль и фурнитура приходят из разных мест, несовпадение обнаруживается на объекте — а закалённое стекло там уже не подогнать.",
      ].join("\n"),
    },
  ],
};

/**
 * Hub copy that is not verbatim in teksty/09 §1: the montage wording approved on 2026-11-09
 * (ТЗ §11, note of 08.11.2026) and the card descriptions capitalised by the Paper mockup.
 * Everything else on the hub is teksty.
 */
export const HUB_MOCKUP_COPY: readonly string[] = [
  HUB.intro,
  "Монтаж",
  MONTAGE_TEXT,
  ...HUB_MONTAGE_ITEMS,
  ...HUB_CARDS.map((item) => item.text),
];

/**
 * Site-wide installation wording decided by the client on 2026-11-09, in place of teksty's
 * «Монтаж не выполняем — комплект для вашей бригады» (showers callout), «Нет — комплект для
 * вашей бригады» (canopies FAQ) and «Монтаж выполняет ваша бригада» (partitions and railings
 * intros, which use `MONTAGE_LEAD`).
 */
const MONTAGE_CALLOUT_ITEM = "- Монтаж — бригада-партнёр или шеф-монтаж с вашими специалистами.";
const MONTAGE_FAQ_ANSWER = `Да — ${MONTAGE_LEAD.charAt(0).toLowerCase()}${MONTAGE_LEAD.slice(1)}`;

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
  intro: `Офисы, торговые центры, банки, медицинские центры: стекло, профиль и фурнитура одним комплектом. Проверяем узлы до запуска производства, чтобы перегородка собралась на объекте без доработок. ${MONTAGE_LEAD} {условия}`,
  ctaPrimaryLabel: "Рассчитать комплект",
  ctaSecondaryLabel: "Отправить планировку",
  secondaryFormKey: "drawing",
  quizType: "partitions",
  heroImage: {
    file: "hero/peregorodki.webp",
    alt: "Стеклянная перегородка с дверью и ручкой в светлом офисе",
  },
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
      image: {
        file: "systems/peregorodki-1.webp",
        alt: "Цельностеклянная перегородка в зажимном профиле в офисе",
      },
    },
    {
      name: "В алюминиевом профиле",
      subtitle: "каркасная",
      whereFits:
        "Офисы open space, банки, медцентры — где нужны двери, звукоизоляция, частые перепланировки",
      important: "Каркас держит стекло по контуру, можно встроить двери и жалюзи",
      schemeSvg: PARTITION_SCHEMES[1],
      image: {
        file: "systems/peregorodki-2.webp",
        alt: "Перегородка в алюминиевом профиле с дверью в офисе open space",
      },
    },
    {
      name: "Раздвижная",
      whereFits: "Зонирование, которое иногда нужно открыть: переговорные, залы",
      important: "Подвесная или напольная направляющая; стекло — с отверстиями под ролики",
      schemeSvg: PARTITION_SCHEMES[2],
      image: {
        file: "systems/peregorodki-3.webp",
        alt: "Раздвижная стеклянная перегородка на подвесной направляющей с роликами",
      },
    },
    {
      name: "С дверью",
      subtitle: "распашной или маятниковой",
      whereFits: "Любая из систем выше",
      important:
        "Отверстия и вырезы под петли и замок делаются до закалки — модель фурнитуры нужна до заказа",
      schemeSvg: PARTITION_SCHEMES[3],
      image: { file: "systems/peregorodki-4.webp", alt: "Стеклянная дверь с замком в перегородке" },
    },
  ],
  profileSystems: ["Алютех", "СИАЛ", "Татпроф", "Доксал", "Loft-Gratec", "Фристайл"],
  glassHeading: "Стекло для перегородки",
  glassBullets: [
    `**Толщина и схема триплекса — расчётом.** Перегородка высотой 2,7 м и 3,5 м, с каркасом и без него требует разного стекла. Подбираем толщину или триплекс под вашу высоту и способ крепления. [Как выбрать толщину стекла](${LINKS.tolshchina})`,
    `**Осветлённое стекло** — если торец на виду: в обычном толстом стекле он зеленит. [Осветлённое стекло](${LINKS.osvetlennoe})`,
    `**Матовое, полосы приватности, логотип** — для переговорных и кабинетов. [Матовое стекло](${LINKS.matovoe}) · [Матирование](${LINKS.matirovanie})`,
    `**Кромка** — для видимого торца рекомендуем кромку «карандаш»; острые углы — скруглить. [Обработка кромки](${LINKS.kromka})`,
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
  intro: `Стекло и профиль одним комплектом, рассчитанные под нагрузку вашего объекта. ${MONTAGE_LEAD} {условия}`,
  ctaPrimaryLabel: "Рассчитать комплект",
  ctaSecondaryLabel: "Отправить проект",
  secondaryFormKey: "drawing",
  quizType: "railings",
  heroImage: {
    file: "hero/ograzhdeniya.webp",
    alt: "Стеклянное ограждение с поручнем на галерее торгового центра",
  },
  productQuizType: "railings",
  systemsHeading: "Типы систем",
  systemsLayout: "table",
  systems: [
    {
      name: "На зажимном профиле",
      howHeld: "Стекло зажато в алюминиевом профиле по полу или по торцу плиты",
      whereFits: "Атриумы, балконы, лестницы — сплошное стеклянное полотно без стоек",
      image: {
        file: "systems/ograzhdeniya-1.webp",
        alt: "Стеклянное ограждение в зажимном профиле на полу",
      },
    },
    {
      name: "На точечных креплениях",
      howHeld: "Стекло держится на спайдерах или стеклодержателях через отверстия",
      whereFits: "Лестницы, торцы перекрытий, фасадные ограждения",
      image: {
        file: "systems/ograzhdeniya-2.webp",
        alt: "Стеклянное ограждение на точечных креплениях у торца перекрытия",
      },
    },
    {
      name: "С поручнем",
      howHeld: "Поверх стекла — поручень по проекту",
      whereFits: "Общественные здания, где поручень требуется по нормам",
      image: {
        file: "systems/ograzhdeniya-3.webp",
        alt: "Стеклянное ограждение с поручнем на кронштейне",
      },
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
  heroImage: {
    file: "hero/kozyrki.webp",
    alt: "Стеклянный козырёк на тягах над входом в здание на городской улице",
  },
  productQuizType: "canopies",
  systemsHeading: "Схемы крепления",
  systemsLayout: "cards",
  systems: [
    {
      name: "На тягах (подвесах, вантах)",
      howHeld: "Стекло опирается на кронштейны у стены, вынос держат тяги",
      requiresInGlass: "Отверстия под кронштейны и узлы тяг",
      schemeSvg: CANOPY_SCHEMES[0],
      image: {
        file: "systems/kozyrki-1.webp",
        alt: "Козырёк из триплекса на тяге с кронштейном у стены",
      },
    },
    {
      name: "Консольный на зажимном профиле",
      howHeld: "Стекло зажато в профиле на стене, без тяг",
      requiresInGlass: "Без отверстий; толщина триплекса больше",
      schemeSvg: CANOPY_SCHEMES[1],
      image: {
        file: "systems/kozyrki-2.webp",
        alt: "Консольный стеклянный козырёк в зажимном профиле на стене",
      },
    },
    {
      name: "На спайдерах",
      howHeld: "Стекло крепится точечно через отверстия",
      requiresInGlass: "Цилиндрические или конусные отверстия по ГОСТ",
      schemeSvg: CANOPY_SCHEMES[2],
      image: { file: "systems/kozyrki-3.webp", alt: "Стеклянный козырёк на спайдерном креплении" },
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
    { question: "Делаете ли монтаж?", answer: MONTAGE_FAQ_ANSWER },
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

export interface ShowerConfigSeed {
  /** `shower-configs.slug`: the seed finds its documents by it. */
  slug: string;
  /** Name, verbatim from teksty/12 §2 (the card capitalises the first letter). */
  name: string;
  configType: "straight-door" | "corner" | "trapezoid" | "walk-in" | "sliding";
  /** Photo in `src/seed/media/constructions/showers/` (4:3). */
  image: ImageSeed;
}

/**
 * «Конфигурации» of `/dushevye-peregorodki/`: the five configurations of teksty/12 §2
 * («Прямая с распашной дверью · угловая · трапециевидная · на штанге (walk-in) · с раздвижной
 * дверью») as published `shower-configs` with photos (client request 2026-11-10). The imported
 * inex.su catalog (task 37) stays in drafts.
 */
export const SHOWER_CONFIGS: readonly ShowerConfigSeed[] = [
  {
    slug: "pryamaya-raspashnaya",
    name: "Прямая с распашной дверью",
    configType: "straight-door",
    image: {
      file: "showers/pryamaya-raspashnaya.webp",
      alt: "Прямая душевая перегородка из стекла с распашной дверью",
    },
  },
  {
    slug: "uglovaya",
    name: "угловая",
    configType: "corner",
    image: { file: "showers/uglovaya.webp", alt: "Угловая душевая перегородка из стекла" },
  },
  {
    slug: "trapecievidnaya",
    name: "трапециевидная",
    configType: "trapezoid",
    image: {
      file: "showers/trapecievidnaya.webp",
      alt: "Трапециевидная душевая перегородка из стекла",
    },
  },
  {
    slug: "walk-in",
    name: "на штанге (walk-in)",
    configType: "walk-in",
    image: {
      file: "showers/walk-in.webp",
      alt: "Душевая перегородка walk-in без двери на стабилизирующей штанге",
    },
  },
  {
    slug: "razdvizhnaya",
    name: "с раздвижной дверью",
    configType: "sliding",
    image: {
      file: "showers/razdvizhnaya.webp",
      alt: "Душевая перегородка из стекла с раздвижной дверью",
    },
  },
];

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
  heroImage: {
    file: "hero/dushevye.webp",
    alt: "Стеклянная душевая перегородка с дверью на петлях",
  },
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
        MONTAGE_CALLOUT_ITEM,
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
  heroImage: {
    file: "hero/vitriny.webp",
    alt: "Стеклянное полотно на петлях на фоне торгового зала",
  },
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

/**
 * Thickness plates of «Зажимной профиль» (Paper mockup `2560_furnitura`, approved 2026-11-10):
 * the values of the teksty sentence «…толщиной 10, 12, 16 и 20 мм», one per plate.
 */
const HARDWARE_THICKNESS_PLATES = ["10 мм", "12 мм", "16 мм", "20 мм"] as const;

/** Wording of the «Зажимной профиль» page outside teksty (the thickness plates of the mockup). */
export const HARDWARE_MOCKUP_COPY: readonly string[] = [...HARDWARE_THICKNESS_PLATES];

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
  heroImage: {
    file: "hardware/hero.webp",
    alt: "Стекло в зажимном профиле и спайдер с двумя стёклами",
  },
  ctaPrimaryLabel: "Рассчитать комплект",
  secondaryFormKey: "none",
  quizType: "other",
  // The teksty table «Что поставляем» (Изделие / Для чего) as the photo cards of the Paper mockup
  // `2560_furnitura`: «Изделие» → name, «Для чего» → the one labelled fact (`whereFits`).
  systemsHeading: "Что поставляем",
  systems: [
    {
      name: "Зажимной профиль",
      whereFits:
        "Ограждения, цельностеклянные перегородки, козырьки — стекло зажимается без отверстий",
      image: {
        file: "hardware/zazhimnoj-profil.webp",
        alt: "Стеклянное ограждение в алюминиевом зажимном профиле",
      },
    },
    {
      name: "Спайдеры и рутели",
      whereFits: "Спайдерное остекление, ограждения, козырьки на точечных креплениях",
      image: {
        file: "hardware/spajdery-ruteli.webp",
        alt: "Спайдер с рутелями на стыке двух стёкол",
      },
    },
    {
      name: "Комплектующие для козырьков",
      whereFits: "Тяги, консоли, крепления — продаём и отдельно от стекла",
      image: {
        file: "hardware/kozyrki-komplektuyushchie.webp",
        alt: "Тяги, кронштейны и зажимы для стеклянного козырька",
      },
    },
  ],
  // Thickness plates of the «Зажимной профиль» panel (mockup wording, `HARDWARE_MOCKUP_COPY`).
  profileSystems: [...HARDWARE_THICKNESS_PLATES],
  layout: [
    {
      // Slot `profile`: its heading titles the panel with the thickness plates.
      type: "richText",
      heading: "Зажимной профиль",
      anchorId: "slot-profile-thickness",
      md: "Зажимной профиль — под стекло и триплекс толщиной 10, 12, 16 и 20 мм.",
    },
    {
      type: "richText",
      heading: "Отверстия под спайдеры",
      md: `Делаем цилиндрические и конусные (под потайную головку) отверстия. Расстояния от кромки и угла — по ГОСТ 30698-2014: от кромки не ближе двух толщин стекла, от угла — шести. [Отверстия и вырезы](${LINKS.otverstiya})`,
    },
  ],
};

/**
 * Non-teksty montage copy of the inner construction pages (decision of 2026-11-09), whole as the
 * verbatim test compares it: the partitions and railings intros, the showers callout item and the
 * canopies FAQ answer.
 */
export const MONTAGE_DECISION_COPY: readonly string[] = [
  PARTITIONS.intro,
  RAILINGS.intro,
  MONTAGE_CALLOUT_ITEM,
  MONTAGE_FAQ_ANSWER,
];

/** Every seed photo of a document (hero, card images, system photos), in document order. */
export function seedImagesOf(item: ConstructionSeed): ImageSeed[] {
  const cards = item.layout.flatMap((block) =>
    block.type === "cards" ? block.items.flatMap((card) => (card.image ? [card.image] : [])) : []
  );
  const systems = (item.systems ?? []).flatMap((system) => (system.image ? [system.image] : []));
  return [...(item.heroImage ? [item.heroImage] : []), ...cards, ...systems];
}

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
