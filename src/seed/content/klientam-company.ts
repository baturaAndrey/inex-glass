/**
 * Copy of the «Для кого», «О компании», «Команда» and «Контакты» pages (task 29).
 *
 * Sources (verbatim, checked by `src/seed/slices/klientam-company.test.ts`):
 * - H1 / Title / Description — `docs/inex/17-meta.md`;
 * - `/klientam/` — `res/inex-glass-handoff/teksty/17-matirovanie-markirovka-listingi.md` §3;
 * - segments — `teksty/09-konstrukcii-klientam.md` §2–5;
 * - company, contacts — `teksty/06-kompaniya-kontakty.md` §1–2.
 *
 * Markdown links `[label](/path/)` stand for the teksty link markers `[label]`; arrows «→» are
 * kept as written. Editorial notes of teksty (`*[Блок публикуется после ответа…]*`) are not
 * copied. Placeholders (`{условия}`, `{акция_текст}`) are resolved at render time.
 *
 * Pure data: no Payload imports, so the unit tests can read it without a database.
 */

export interface PageSeo {
  h1: string;
  title: string;
  /** Omitted where 17-meta has none. */
  description?: string;
}

export interface PageEntry {
  path: string;
  slug: string;
  /** Document name in the admin. */
  title: string;
  template: "segment" | "company" | "contacts";
  breadcrumbLabel: string;
  /** Path of the parent document (`/klientam/`, `/o-kompanii/`); none for first-level pages. */
  parentPath?: string;
  seo: PageSeo;
}

export interface TableContent {
  heading: string;
  columns: string[];
  rows: string[][];
}

/** Site paths linked from these pages (the link map of tasks 27/28). */
export const LINKS = {
  hub: "/klientam/",
  contractors: "/klientam/podryadchikam/",
  furniture: "/klientam/proizvoditelyam-mebeli/",
  developers: "/klientam/zastrojshchikam/",
  designers: "/klientam/dizajneram-i-arhitektoram/",
  company: "/o-kompanii/",
  team: "/o-kompanii/sotrudniki/",
  contacts: "/kontakty/",
  objects: "/obekty/",
  drawings: "/kak-zakazat/trebovaniya-k-chertezham/",
  design: "/proektirovanie/",
  documents: "/kak-zakazat/dokumenty/",
  painted: "/zakalennoe-steklo/okrashennoe/",
  matte: "/zakalennoe-steklo/matovoe/",
  tinted: "/zakalennoe-steklo/tonirovannoe/",
  frosting: "/obrabotka-stekla/matirovanie/",
  lowIron: "/zakalennoe-steklo/osvetlennoe/",
  bent: "/zakalennoe-steklo/mollirovannoe/",
  ribbed: "/zakalennoe-steklo/riflenoe/",
  print: "/obrabotka-stekla/pechat/",
  bevel: "/obrabotka-stekla/facet/",
  furnitureGlass: "/zakalennoe-steklo/dlya-mebeli/",
  inexSu: "https://inex.su/",
} as const;

/**
 * teksty line «{условия} · {акция_текст}» as two paragraphs (markdown): with no active promo the
 * second paragraph is empty after substitution and is not rendered, so no separator hangs.
 */
export const CONDITIONS_WITH_PROMO = "{условия}\n\n{акция_текст}";
export const CONDITIONS = "{условия}";

/* ------------------------------------------------------------------------------------------ */
/* /klientam/ — teksty/17 §3                                                                   */
/* ------------------------------------------------------------------------------------------ */

export interface HubRow {
  /** Bold segment title of the first column. */
  segment: string;
  /** Target of «Подробнее». */
  href: string;
  task: string;
  take: string;
}

export const HUB = {
  page: {
    path: LINKS.hub,
    slug: "klientam",
    title: "С кем мы работаем",
    template: "segment",
    breadcrumbLabel: "С кем мы работаем",
    seo: {
      h1: "С кем мы работаем",
      title: "Inex Glass для подрядчиков, застройщиков и производителей",
      description:
        "Как мы работаем с подрядчиками, производителями мебели, застройщиками и дизайнерами — и что берём на себя.",
    },
  },
  lead: "Inex Glass работает только с компаниями: комплектуем объекты стеклом и конструкциями от 50 м². У каждого клиента своя задача — и свои риски, которые мы берём на себя.",
  columns: ["Ваша задача", "Что берём на себя"],
  moreLabel: "Подробнее",
  rows: [
    {
      segment: "Подрядчикам и монтажникам",
      href: LINKS.contractors,
      task: "Получить стекло, которое встанет с первого раза",
      take: "Проверка чертежа и спецификация до запуска, отверстия по ГОСТ, обрешётка и фото при отгрузке",
    },
    {
      segment: "Производителям мебели",
      href: LINKS.furniture,
      task: "Выпускать серию фасадов и столешниц без брака",
      take: "Одинаковый оттенок в серии, кромка и отверстия под фурнитуру, без клейма",
    },
    {
      segment: "Застройщикам и генподрядчикам",
      href: LINKS.developers,
      task: "Сдать объект в срок и с документами",
      take: "Проектирование узлов, расчёт стекла под нагрузку, документы на каждую партию, цена в договоре фиксируется",
    },
    {
      segment: "Дизайнерам и архитекторам",
      href: LINKS.designers,
      task: "Реализовать нестандартное решение",
      take: "RAL, матирование, гнутое и рифлёное стекло, помощь с узлами, бесплатные образцы",
    },
  ] satisfies HubRow[],
  bridge: `Монтаж выполняет ваша бригада или подрядчик. Если нужен проект «под ключ» с монтажом — его выполняет инжиниринговая компания Inex → [inex.su](${LINKS.inexSu})`,
  /** «Отправить чертёж» of the hub: the lead comes with the source label `klientam`. */
  drawingSource: "klientam",
} as const;

/* ------------------------------------------------------------------------------------------ */
/* Segments — teksty/09 §2–5                                                                   */
/* ------------------------------------------------------------------------------------------ */

export const CONTRACTORS = {
  page: {
    path: LINKS.contractors,
    slug: "podryadchikam",
    title: "Подрядчикам и монтажникам",
    template: "segment",
    breadcrumbLabel: "Подрядчикам",
    parentPath: LINKS.hub,
    seo: {
      h1: "Подрядчикам и монтажникам",
      title: "Закалённое стекло для подрядчиков | Inex Glass",
      description:
        "Спецификация на согласование, отверстия по ГОСТ, обрешётка в дорогу и срок от даты договора. Монтаж — ваша бригада.",
    },
  },
  /** H1 of teksty (17-meta wins); kept for the report, not rendered. */
  tekstyH1: "Стекло, которое встаёт с первого раза",
  lead: "Для монтажных и отделочных компаний: перегородки, ограждения, лестницы, козырьки, душевые. Вы монтируете — мы отвечаем за то, чтобы стекло пришло по чертежу и целым.",
  problems: {
    heading: "Что обычно идёт не так — и что мы делаем",
    columns: ["Проблема на объекте", "Что делаем мы"],
    rows: [
      [
        "Стекло пришло не по чертежу: отверстие смещено, размер другой",
        "Проверяем чертёж до запуска и присылаем спецификацию на согласование. Любое отклонение — только с вашего согласия",
      ],
      [
        "Стекло побилось в дороге",
        "Обрешётка, состав упаковки по согласованию, фото упаковки при отгрузке",
      ],
      [
        "Отверстие под крепёж со сколом, стекло лопается при затяжке",
        "Отверстия по ГОСТ 30698-2014 с обработанной кромкой; по запросу — обработка отверстия изнутри",
      ],
      [
        "Сроки «плывут»",
        "Срок считается от даты договора; о готовности и изменениях менеджер сообщает звонком и по e-mail",
      ],
      [
        "Спор, кто виноват",
        "Правило заранее: ошибся завод — переделка за счёт завода; ошибка в согласованном чертеже — за счёт заказчика",
      ],
      ["Клеймо на видимом стекле", "Можно не ставить — отметьте в заказе"],
    ],
  } satisfies TableContent,
  start: {
    heading: "Как начать",
    markdown: [
      `1. Пришлите чертёж в DWG или DXF. → [Требования к чертежам](${LINKS.drawings})`,
      "2. Получите спецификацию и КП — в среднем за 2–3 рабочих дня.",
      "3. Подпишите договор: цена фиксируется.",
    ].join("\n"),
  },
  closing: CONDITIONS_WITH_PROMO,
  secondaryLabel: "Отправить чертёж",
} as const;

export const FURNITURE = {
  page: {
    path: LINKS.furniture,
    slug: "proizvoditelyam-mebeli",
    title: "Производителям мебели и изделий из стекла",
    template: "segment",
    breadcrumbLabel: "Производителям мебели",
    parentPath: LINKS.hub,
    seo: {
      h1: "Производителям мебели и изделий из стекла",
      title: "Стекло для производителей мебели — серии без брака | Inex Glass",
      description:
        "Фасады и столешницы серией: повторяемый оттенок, кромка и отверстия под фурнитуру, без клейма по запросу.",
    },
  },
  tekstyH1: "Стекло для мебельного производства — сериями",
  lead: "Фасады, дверцы, столешницы: стекло приходит с кромкой и отверстиями под петли и ручки. Вам остаётся собрать изделие.",
  series: {
    heading: "Что важно для серии — и как мы это решаем",
    markdown: [
      "- **Одинаковый оттенок во всей серии.** Тонированное, матовое и крашеное стекло — одной партией; дозаказ сверяем с образцом.",
      "- **Отверстия под фурнитуру.** По правилам ГОСТ, с обработанной кромкой; положение под вашу петлю проверяем до запуска.",
      "- **Кромка.** Полированная или «еврокромка» — для видимых торцов столешниц и дверец.",
      "- **Без клейма.** Клеймо на мебельном стекле можно не ставить.",
      "- **Повторный заказ.** По тем же файлам — укажите номер прошлого заказа.",
      "- **Упаковка.** Обрешётка, прокладки между стёклами по согласованию, чтобы полированные кромки не соприкасались.",
    ].join("\n"),
  },
  types: {
    heading: "Виды стекла",
    markdown: [
      `[Прозрачное и осветлённое](${LINKS.lowIron})`,
      `[Матовое](${LINKS.matte})`,
      `[Тонированное](${LINKS.tinted})`,
      `[Крашеное по RAL](${LINKS.painted})`,
      `[Рифлёное](${LINKS.ribbed})`,
      `[Гнутое](${LINKS.bent})`,
    ]
      .join(" · ")
      .concat(` → [Стекло для мебели](${LINKS.furnitureGlass})`),
  },
  closing: CONDITIONS,
  secondaryLabel: "Отправить чертёж",
  /** Quiz pre-fill: tempered glass (`QUIZ_TYPES` id). */
  quizType: "tempered",
} as const;

export const DEVELOPERS = {
  page: {
    path: LINKS.developers,
    slug: "zastrojshchikam",
    title: "Застройщикам и генподрядчикам",
    template: "segment",
    breadcrumbLabel: "Застройщикам",
    parentPath: LINKS.hub,
    seo: {
      h1: "Застройщикам и генподрядчикам",
      title: "Стекло для застройщиков — документы и проект узлов | Inex Glass",
      description:
        "Ограждения, перегородки и душевые для крупных объектов: паспорт, сертификат и протоколы на партию, проектирование узлов.",
    },
  },
  tekstyH1: "Стекло для объектов: в срок, с документами, без замечаний при сдаче",
  /** Contains `EXPERIENCE_PHRASE` verbatim. */
  lead: "Торговые центры, арены, бизнес-центры, жилые комплексы: ограждения, перегородки, душевые и санкабины, козырьки, фасадное стекло. За 21 год специалисты Inex выполнили более 1500 проектов по всей России.",
  benefits: {
    heading: "Что получаете",
    markdown: [
      `- **Проектирование узлов** и подбор стекла под нагрузку — толщина и схема триплекса. → [Проектирование](${LINKS.design})`,
      `- **Документы на партию:** паспорт, сертификат, протоколы; оригиналы едут с партией. Стекло по ГОСТ 30698-2014, триплекс — по ГОСТ 30826-2014. → [Документы](${LINKS.documents})`,
      "- **Цена фиксируется в договоре;** срок — от даты договора.",
      "- **Отгрузка партиями** — по согласованию; обрешётка и фото упаковки при отгрузке.",
    ].join("\n"),
  },
  objects: {
    heading: "Объекты",
    // Plain text: no published objects at launch, the line only links to the listing.
    markdown: `Главное управление «Сургутнефтегаз» · ТРЦ «Алмаз», Челябинск · Аэропорт Челябинск · «РМК-Арена», Челябинск → [Все объекты](${LINKS.objects})`,
  },
  closing: CONDITIONS,
  secondaryLabel: "Отправить проект",
} as const;

export const DESIGNERS = {
  page: {
    path: LINKS.designers,
    slug: "dizajneram-i-arhitektoram",
    title: "Дизайнерам и архитекторам",
    template: "segment",
    breadcrumbLabel: "Дизайнерам и архитекторам",
    parentPath: LINKS.hub,
    seo: {
      h1: "Дизайнерам и архитекторам",
      title: "Стекло для дизайнеров: RAL, матирование, гнутое | Inex Glass",
      description:
        "Цвета по RAL, матирование, печать, гнутое и осветлённое стекло. Поможем превратить эскиз в рабочие узлы.",
    },
  },
  tekstyH1: "Стекло для нестандартных решений",
  lead: "Поможем превратить эскиз в рабочие узлы и подобрать стекло, которое выглядит так, как задумано.",
  /**
   * «Задача | Решение» with links inside the cells: a rich-text table (Lexical table feature of
   * the editor) keeps the arrows and both links of a cell, which the `table` block cannot.
   */
  solutions: {
    heading: "Что можно сделать",
    columns: ["Задача", "Решение"],
    rows: [
      [
        "Цвет по проекту",
        `Крашеное стекло по RAL; светлые цвета — на осветлённой основе → [Крашеное стекло](${LINKS.painted})`,
      ],
      [
        "Приватность без глухой стены",
        `Матовое стекло, полосы и логотипы пескоструем → [Матовое стекло](${LINKS.matte}) · [Матирование](${LINKS.frosting})`,
      ],
      [
        "Прозрачный торец без зелени",
        `Осветлённое стекло → [Осветлённое стекло](${LINKS.lowIron})`,
      ],
      ["Изгиб", `Гнутое закалённое стекло → [Гнутое стекло](${LINKS.bent})`],
      ["Фактура", `Рифлёное стекло → [Рифлёное стекло](${LINKS.ribbed})`],
      ["Графика", `Печать на стекле → [Печать](${LINKS.print})`],
      ["Объёмный край зеркала", `Фацет 30 или 50 мм → [Фацет](${LINKS.bevel})`],
    ],
  } satisfies TableContent,
  process: {
    heading: "Как работаем с дизайнером",
    markdown: [
      "1. Присылаете эскиз или концепцию.",
      "2. Проектируем узлы и подбираем стекло; если что-то нельзя сделать технологически — предлагаем вариант до запуска.",
      "3. Согласовываете образец цвета или матовости. Образцы — бесплатно, изготовление около недели.",
      "4. Стекло изготавливается и отправляется на объект; монтаж выполняет подрядчик.",
    ].join("\n"),
  },
  closing: CONDITIONS,
  secondaryLabel: "Отправить эскиз",
} as const;

export const SEGMENTS = [CONTRACTORS, FURNITURE, DEVELOPERS, DESIGNERS] as const;

/* ------------------------------------------------------------------------------------------ */
/* /o-kompanii/ — teksty/06 §1                                                                 */
/* ------------------------------------------------------------------------------------------ */

export const COMPANY = {
  page: {
    path: LINKS.company,
    slug: "o-kompanii",
    title: "О компании",
    template: "company",
    breadcrumbLabel: "О компании",
    seo: {
      h1: "Inex Glass",
      title: "О компании Inex Glass — комплектация проектов стеклом",
      description:
        "Направление инжиниринговой компании Inex: 21 год, 1500+ проектов. Проектируем, проверяем чертежи, контролируем заводы-партнёры и упаковку.",
    },
  },
  lead: "Inex Glass — направление инжиниринговой компании Inex из Челябинска. Мы комплектуем объекты закалённым стеклом и стеклянными конструкциями: проектируем, проверяем чертежи, размещаем заказ на заводах-партнёрах в России и Китае, контролируем изготовление и упаковку и отправляем стекло на объект.",
  /** Second lead paragraph = `EXPERIENCE_PHRASE` + «по всей России.». */
  experience: "За 21 год специалисты Inex выполнили более 1500 проектов по всей России.",
  roles: {
    heading: "Что делаем мы, а что — заводы-партнёры",
    columns: ["Inex Glass", "Заводы-партнёры"],
    rows: [
      ["Проектирование узлов, проверка чертежей", "Резка, обработка, закалка, триплекс"],
      [
        "Спецификация на согласование, контроль отклонений от чертежа",
        "Изготовление по согласованной спецификации",
      ],
      ["Выбор завода под вид стекла, объём и срок", "—"],
      ["Комплектация: зажимной профиль, спайдеры, фурнитура", "—"],
      ["Контроль упаковки, фото при отгрузке, отправка", "—"],
      ["Претензии к заводу от имени заказчика", "Переделка своей ошибки за свой счёт"],
    ],
  } satisfies TableContent,
  about: [
    "## Как мы выбираем заводы",
    "",
    "Под каждый заказ подбираем завод по виду стекла, оборудованию, очереди и цене. Импортное стекло проходит входной контроль. Каждая партия изготавливается по ГОСТ: закалённое стекло — 30698-2014, триплекс — 30826-2014.",
    "",
    "## Где работаем",
    "",
    "Объекты Урала, Сибири, Поволжья и Севера. Офисы — в Челябинске и Екатеринбурге. Склад и самовывоз — в Челябинске.",
  ].join("\n"),
  clients: {
    heading: "С кем работаем",
    items: [
      { label: "Подрядчики и монтажники", href: LINKS.contractors },
      { label: "Производители мебели и изделий из стекла", href: LINKS.furniture },
      { label: "Генподрядчики крупных объектов", href: LINKS.developers },
      { label: "Застройщики", href: LINKS.developers },
      { label: "Дизайнеры и архитекторы", href: LINKS.designers },
    ],
  },
  /** Published per Inex's answer of 17.10 (№32): installation goes to inex.su. */
  inexSu: {
    heading: "Двери, лестницы и монтаж",
    text: "Стеклянные двери, лестницы, металлоконструкции и монтаж «под ключ» — направление inex.su.",
    linkLabel: "Перейти на inex.su",
    href: LINKS.inexSu,
  },
  objects: {
    heading: "Объекты",
    text: "ТРК «Родник» · ТРК «Урал» · «Трактор» арена · Концертный зал (Омск) · «Сургутнефтегаз» · Сбербанк (Ишим)",
    linkLabel: "Все объекты",
    href: LINKS.objects,
  },
} as const;

/* ------------------------------------------------------------------------------------------ */
/* /o-kompanii/sotrudniki/ — 17-meta + teksty/06 §1 «Команда»                                  */
/* ------------------------------------------------------------------------------------------ */

export const TEAM = {
  page: {
    path: LINKS.team,
    slug: "sotrudniki",
    title: "Команда",
    template: "company",
    breadcrumbLabel: "Команда",
    parentPath: LINKS.company,
    seo: {
      h1: "Команда",
      title: "Команда Inex Glass — конструкторы и менеджеры",
      description:
        "Кто ведёт ваш заказ: конструкторы, которые проверяют чертежи, и менеджеры, которые сообщают о статусе.",
    },
  },
  /** Derived from teksty/06 «Команда» (not in teksty as such — flagged for approval). */
  intro: "Конструкторы и менеджеры, которые ведут ваши заказы.",
} as const;

/* ------------------------------------------------------------------------------------------ */
/* /kontakty/ — teksty/06 §2                                                                   */
/* ------------------------------------------------------------------------------------------ */

export const CONTACTS = {
  page: {
    path: LINKS.contacts,
    slug: "kontakty",
    title: "Контакты",
    template: "contacts",
    breadcrumbLabel: "Контакты",
    seo: {
      h1: "Контакты",
      title: "Контакты Inex Glass — Челябинск и Екатеринбург",
      description:
        "Отправьте чертёж DWG или DXF — пришлём КП в среднем за 2–3 рабочих дня. Телефон, e-mail, адреса офисов и склада, реквизиты.",
    },
  },
  /** «Отправьте чертёж» — the `contacts` form block (task 21 renders the form). */
  form: {
    heading: "Отправьте чертёж",
    sub: "КП — в среднем за 2–3 рабочих дня. Работаем с заказами от 50 м².",
    submitLabel: "Отправить",
  },
} as const;

/** Every page of the slice, in seeding order (parents before children). */
export const KLIENTAM_COMPANY_PAGES: readonly PageEntry[] = [
  HUB.page,
  ...SEGMENTS.map((segment) => segment.page),
  COMPANY.page,
  TEAM.page,
  CONTACTS.page,
];
