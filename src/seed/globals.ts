import {
  DEFAULT_DELIVERY_CITIES,
  EXPERIENCE_PHRASE,
  FACET_EDGE_IDS,
  FACET_TYPE,
  QUIZ_DECOR,
  QUIZ_EDGES,
  QUIZ_KINDS,
  QUIZ_PACKING,
  QUIZ_ROLES,
  QUIZ_STAMP,
  QUIZ_TYPES,
  RU_HOLIDAYS_2026_2027,
  RU_WORKDAYS_2026_2027,
  SEED_PRICES_2026_10_15,
  TINT_COLORS,
} from "@/lib/domain";
import type { Navigation } from "@/payload-types";
import { seedDate, upsertGlobal } from "./context";
import { markdown } from "./lexical";
import type { SeedContext } from "./context";

/*
 * Values of all 9 globals. Sources: ТЗ docs/inex/16-tz-razrabotka.md §4.1–4.5, SSoT
 * docs/inex/15-ssot-tehnologiya.md, res/inex-glass-handoff/teksty/*, zadaniya/02-shapka-podval.md.
 * Data Inex has not provided yet (bank details, messengers, partner factory names, promo end
 * date confirmation) is left empty or marked as a placeholder — never invented.
 */

const PRIMARY_PHONE = "+7 (351) 247-05-57";
const PRIMARY_EMAIL = "sale@inex.su";
const WORK_HOURS_FULL = "пн–пт 9:00–18:00";
const PRICE_DATE = "2026-10-15";

/* ------------------------------------------------------------------------------------------ */
/* Prices, promo, conditions                                                                  */
/* ------------------------------------------------------------------------------------------ */

async function seedPrices(ctx: SeedContext): Promise<void> {
  await upsertGlobal(ctx, "prices", {
    rows: SEED_PRICES_2026_10_15.items.map(({ thickness, price }) => ({
      thickness,
      priceFrom: price,
      onRequest: price === null,
    })),
    priceDate: seedDate(PRICE_DATE),
    staleAfterDays: SEED_PRICES_2026_10_15.staleAfterDays,
    caption:
      "Ориентировочная цена на {дата_цен}. Точная стоимость — в КП; цена в договоре фиксируется",
    onRequestLabel: "по запросу",
    staleLabel: "Цена по расчёту",
    included: [
      { text: "Листовое стекло выбранной толщины" },
      { text: "Термическая закалка" },
      { text: "Проверка параметров заказа" },
    ],
    // SSoT §16 (решение 1): фацет — только на зеркалах, поэтому в «Считается отдельно» для
    // закалённого стекла его нет (так же в схеме task-06).
    extra: [
      { text: "Фигурная резка и сложная форма" },
      { text: "Шлифовка, полировка кромки" },
      { text: "Отверстия, вырезы, печать, матирование" },
    ],
  });
}

async function seedPromo(ctx: SeedContext): Promise<void> {
  await upsertGlobal(ctx, "promo", {
    active: true,
    // U+2212 MINUS SIGN, as in the ТЗ.
    text: "−5% на закалённое стекло при заказе от 100 м²",
    thresholdArea: 100,
    discountPercent: 5,
    startDate: seedDate(PRICE_DATE),
    // Placeholder: the real end date is still to be confirmed by Inex.
    endDate: seedDate("2026-12-31"),
    linkUrl: "/zakalennoe-steklo/#ceny",
  });
}

async function seedConditions(ctx: SeedContext): Promise<void> {
  const termsBar = [
    "Заказы от 50 м²",
    "Срок от 10 рабочих дней с даты договора",
    "КП в среднем за 2–3 рабочих дня",
    "Цена в договоре фиксируется",
  ];
  await upsertGlobal(ctx, "conditions", {
    minOrderM2: 50,
    minOrderText: "Заказы от 50 м²",
    minOrderFaqText: "50–100 м²",
    leadTimeDays: 10,
    triplexLeadTimeDays: 14,
    leadTimeText: "Срок от 10 рабочих дней с даты договора",
    triplexLeadTimeText: "Срок для триплекса — от 14 рабочих дней с даты договора",
    kpDaysMin: 2,
    kpDaysMax: 3,
    kpText: "КП в среднем за 2–3 рабочих дня",
    priceFixedText: "Цена в договоре фиксируется",
    noUrgentText: "Срочного изготовления нет",
    noInstallText: "Монтаж не выполняем",
    inlineText:
      "Заказы от 50 м², срок от 10 рабочих дней с даты договора, КП в среднем за 2–3 рабочих дня.",
    termsBar: termsBar.map((text) => ({ text, icon: "check" })),
    termsBarShort: termsBar.slice(0, 3).map((text) => ({ text })),
  });
}

/* ------------------------------------------------------------------------------------------ */
/* Contacts, requisites                                                                       */
/* ------------------------------------------------------------------------------------------ */

async function seedContacts(ctx: SeedContext): Promise<void> {
  await upsertGlobal(ctx, "contacts", {
    brandName: "Inex Glass",
    copyrightHolder: "ИП Копылов А. М.",
    phones: [
      { number: PRIMARY_PHONE, isPrimary: true },
      { number: "+7 951 489-04-09", isPrimary: false },
      { number: "+7 982 329-11-08", label: "Екатеринбург", isPrimary: false },
    ],
    emails: [{ address: PRIMARY_EMAIL, isPrimary: true }],
    workHours: { full: WORK_HOURS_FULL, short: "Пн–Пт 9–18" },
    callPrompt: "Звоните Пн–Пт 9–18",
    locations: [
      {
        key: "chelyabinsk-office",
        type: "office",
        title: "Челябинск — офис",
        city: "Челябинск",
        address: "ул. Артиллерийская, 124А",
        phones: [{ number: PRIMARY_PHONE }, { number: "+7 951 489-04-09" }],
        email: PRIMARY_EMAIL,
        hours: WORK_HOURS_FULL,
        localBusiness: true,
      },
      {
        key: "chelyabinsk-warehouse",
        type: "warehouse",
        title: "Челябинск — склад и самовывоз",
        city: "Челябинск",
        address: "Свердловский тракт, 7В",
        phones: [],
        hours: WORK_HOURS_FULL,
        localBusiness: false,
      },
      {
        key: "ekaterinburg-office",
        type: "office",
        title: "Екатеринбург — офис",
        city: "Екатеринбург",
        address: "ул. Данилы Зверева, 17б",
        phones: [{ number: "+7 982 329-11-08" }],
        email: PRIMARY_EMAIL,
        hours: WORK_HOURS_FULL,
        localBusiness: true,
      },
    ],
    // Inex has not provided messenger links yet.
    messengers: [],
    sameAs: [],
    inlineText: `${PRIMARY_PHONE}, ${PRIMARY_EMAIL}, ${WORK_HOURS_FULL}`,
    inexSuUrl: "https://inex.su/",
    inexSuFooterLabel: "Двери, лестницы и другие конструкции Inex — на inex.su",
    inexSuBridgeLabel: "Двери, лестницы и другие конструкции Inex — на inex.su",
  });
}

async function seedRequisites(ctx: SeedContext): Promise<void> {
  // Personal-data operator, teksty/15-politika-pdn.md §1.2. Bank details and the company card
  // PDF are awaited from Inex — empty on purpose.
  await upsertGlobal(ctx, "requisites", {
    legalName: "Индивидуальный предприниматель Копылов Александр Михайлович",
    shortName: "ИП Копылов А. М.",
    inn: "744700156319",
    ogrnip: "323745600102871",
    actualAddress: "г. Челябинск, Свердловский тракт, 7В",
    publishLegalAddress: false,
    bank: { name: null, bik: null, account: null, corrAccount: null },
    cardPdf: null,
    cardLabel: "Скачать карточку предприятия",
    inlineText: "ИП Копылов Александр Михайлович, ИНН 744700156319, ОГРНИП 323745600102871",
  });
}

/* ------------------------------------------------------------------------------------------ */
/* Tech params                                                                                */
/* ------------------------------------------------------------------------------------------ */

/** Lucide icons of the quiz product-type tiles (schema defaults, task 06). */
const PRODUCT_TYPE_ICONS: Readonly<Record<string, string>> = {
  tempered: "square",
  triplex: "layers",
  partitions: "columns-2",
  railings: "fence",
  shower: "shower-head",
  canopies: "umbrella",
  facade: "building-2",
  shopfronts: "store",
  verandas: "trees",
  mirrors: "flip-horizontal",
  other: "ellipsis",
};

const OTHER_CITY = "Другой";
const PICKUP_CITY = "Самовывоз (Челябинск)";

const deliveryCityKind = (name: string): "city" | "other" | "pickup" => {
  if (name === OTHER_CITY) return "other";
  if (name === PICKUP_CITY) return "pickup";
  return "city";
};

/** `{ id, label }` domain options → `{ key, label }` rows of `tech-params.quizOptions`. */
const keyLabel = (list: ReadonlyArray<{ id: string; label: string }>) =>
  list.map(({ id, label }) => ({ key: id, label }));

async function seedTechParams(ctx: SeedContext): Promise<void> {
  await upsertGlobal(ctx, "tech-params", {
    thicknesses: [4, 5, 6, 8, 10, 12, 15, 19],
    flat: { minW: 150, minH: 300, maxW: 3000, maxH: 2000 },
    painted: { thickMin: 4, thickMax: 15, minW: 350, minH: 150, maxW: 3000, maxH: 1600 },
    bent: {
      thickMin: 4,
      thickMax: 12,
      minW: 150,
      minH: 350,
      maxW: 1200,
      maxH: 2000,
      radius: [
        { thicknessFrom: 4, thicknessTo: 6, minRadius: 1000 },
        { thicknessFrom: 8, thicknessTo: 12, minRadius: 1500 },
      ],
    },
    print: { thickMin: 4, thickMax: 15, maxW: 1100, maxH: 700 },
    tintColors: TINT_COLORS.map(({ id, label }) => ({ key: id, name: label })),
    ribbed: { thicknesses: [4, 6, 8] },
    facet: { mirrorsOnly: true, widths: [30, 50], minGlassThickness: 4 },
    holes: {
      diameterMin: 4,
      diameterMax: 130,
      diameterMaxOneSide: 220,
      glassMinW: 250,
      glassMinH: 100,
      glassMaxW: 3000,
      glassMaxH: 1600,
      edgeFactor: 2,
      betweenFactor: 2,
      cornerFactor: 6,
      minDiameterFactor: 1,
      cutoutInnerRadiusMin: 10,
      glassThicknessMin: 4,
      glassThicknessMaxTwoSides: 25,
      glassThicknessMaxOneSide: 50,
      toleranceRanges: [
        { from: 4, to: 20, tolerance: 1 },
        { from: 20, to: 100, tolerance: 2 },
        { from: 100, to: null, tolerance: null, label: "по согласованию" },
      ],
    },
    weight: {
      kgPerM2PerMm: 2.5,
      filmUnitThickness: 0.38,
      filmUnitWeight: 0.36,
      filmLayers: [0.38, 0.76, 1.14, 1.52],
    },
    gost: {
      tempered: "ГОСТ 30698-2014",
      triplex: "ГОСТ 30826-2014",
      sizeTolerance: [
        { sizeRange: "до 2000 мм", upTo12: "±2,0", over12: "±3,0" },
        { sizeRange: "2000–3000 мм", upTo12: "±3,0", over12: "±4,0" },
        { sizeRange: "свыше 3000 мм", upTo12: "±4,0", over12: "±5,0" },
      ],
      flatness: [
        { thicknessRange: "3–5 мм", general: "3 / 4", local: "0,5" },
        { thicknessRange: "6–25 мм", general: "2 / 3", local: "0,4" },
      ],
    },
    deliveryCities: DEFAULT_DELIVERY_CITIES.map((name) => ({ name, kind: deliveryCityKind(name) })),
    // Labels verbatim from teksty/05-kviz.md (the domain dictionaries carry the same strings).
    quizOptions: {
      productTypes: QUIZ_TYPES.map(({ id, label }) => ({
        key: id,
        label,
        icon: PRODUCT_TYPE_ICONS[id] ?? null,
      })),
      kinds: keyLabel(QUIZ_KINDS),
      edges: QUIZ_EDGES.map(({ id, label }) => ({
        key: id,
        label,
        onlyForTypes: FACET_EDGE_IDS.includes(id) ? [FACET_TYPE] : null,
      })),
      decor: keyLabel(QUIZ_DECOR),
      stamp: keyLabel(QUIZ_STAMP),
      packaging: keyLabel(QUIZ_PACKING),
      roles: keyLabel(QUIZ_ROLES),
    },
  });
}

/* ------------------------------------------------------------------------------------------ */
/* Site settings                                                                              */
/* ------------------------------------------------------------------------------------------ */

/** Stop-words of ТЗ §11 for the content audit. Partner factory names are awaited from Inex. */
const STOP_WORDS: ReadonlyArray<{ word: string; kind: "stem" | "phrase" }> = [
  { word: "Heat Soak", kind: "phrase" },
  { word: "HST", kind: "stem" },
  { word: "стеклопакет", kind: "stem" },
  { word: "собственное производство", kind: "phrase" },
  { word: "закаливаем сами", kind: "phrase" },
  { word: "монтаж под ключ", kind: "phrase" },
  { word: "бронированн", kind: "stem" },
  { word: "смарт-стекл", kind: "stem" },
  { word: "антиблик", kind: "stem" },
  { word: "шпион", kind: "stem" },
];

async function seedSiteSettings(ctx: SeedContext): Promise<void> {
  await upsertGlobal(ctx, "site-settings", {
    experienceText: EXPERIENCE_PHRASE,
    experienceYears: 21,
    orderLinkTtlDays: 90,
    holidays: [
      ...RU_HOLIDAYS_2026_2027.map((day) => ({ date: seedDate(day), isWorkday: false })),
      ...RU_WORKDAYS_2026_2027.map((day) => ({ date: seedDate(day), isWorkday: true })),
    ],
    stopWords: STOP_WORDS.map(({ word, kind }) => ({ word, kind })),
    analytics: {
      metrikaId: null,
      webvisor: true,
      yandexVerification: null,
      googleVerification: null,
    },
    indexNow: { enabled: false },
    notifications: {
      leadNotifyEmails: [{ email: PRIMARY_EMAIL }],
      fromName: "Inex Glass",
      ccAssignee: false,
    },
    cookieBanner: {
      // teksty/15-politika-pdn.md §3; `{…}` marks the link to the policy.
      text: "Мы используем файлы cookie и Яндекс.Метрику, чтобы сайт работал удобнее, а мы понимали, какие разделы полезны. Подробнее — в {политике обработки персональных данных}.",
    },
    consent: {
      errorText: "Чтобы отправить заявку, отметьте согласие на обработку персональных данных",
    },
  });
}

/* ------------------------------------------------------------------------------------------ */
/* Navigation                                                                                 */
/* ------------------------------------------------------------------------------------------ */

type LinkRow = { link: { type: "custom"; url: string; label: string; newTab: boolean } };
type MegaMenu = NonNullable<Navigation["megaMenus"]>[number];
type MegaLink = NonNullable<NonNullable<MegaMenu["columns"]>[number]["links"]>[number];

const link = (label: string, url: string): LinkRow => ({
  link: { type: "custom", url, label, newTab: false },
});

const megaLink = (
  label: string,
  url: string,
  subLinks: ReadonlyArray<readonly [string, string]> = []
): MegaLink => ({
  ...link(label, url),
  subLinks: subLinks.map(([subLabel, subUrl]) => ({ label: subLabel, url: subUrl })),
});

const PROMO_CARD: MegaMenu["promoCard"] = {
  enabled: true,
  title: "Рассчитать стоимость по чертежу",
  buttonLabel: "Рассчитать стоимость",
  buttonKind: "quiz",
};

const Z = "/zakalennoe-steklo/";

/** «Каталог»: zadaniya/02-shapka-podval.md, «Мега-меню». */
const CATALOG_MENU: MegaMenu = {
  key: "catalog",
  label: "Каталог",
  columns: [
    {
      title: "Стекло",
      links: [
        megaLink(
          "Закалённое стекло",
          Z,
          [4, 6, 8, 10, 12].map((n) => [`${n} мм`, `${Z}${n}-mm/`] as const)
        ),
        megaLink("Матовое", `${Z}matovoe/`),
        megaLink("Тонированное", `${Z}tonirovannoe/`),
        megaLink("Крашеное по RAL", `${Z}okrashennoe/`),
        megaLink("Осветлённое", `${Z}osvetlennoe/`),
        megaLink("Рифлёное", `${Z}riflenoe/`),
        megaLink("Гнутое", `${Z}mollirovannoe/`),
        megaLink("Триплекс", "/tripleks/"),
        megaLink("Для мебели", `${Z}dlya-mebeli/`),
      ],
    },
    {
      title: "Конструкции",
      links: [
        megaLink("Стеклянные перегородки", "/steklyannye-peregorodki/"),
        megaLink("Ограждения и перила", "/steklyannye-ograzhdeniya/"),
        megaLink("Козырьки", "/steklyannye-kozyrki/"),
        megaLink("Душевые перегородки для проектов", "/dushevye-peregorodki/"),
        megaLink("Торговые витрины", "/torgovye-vitriny/"),
        megaLink("Зеркала", "/zerkala/", [
          ["для залов", "/zerkala/dlya-zalov/"],
          ["для салонов", "/zerkala/dlya-salonov/"],
        ]),
        megaLink("Зажимной профиль и спайдеры", "/furnitura/"),
      ],
    },
    {
      title: "Остекление зданий",
      links: [
        megaLink("Стеклянные фасады", "/osteklenie/fasadov/"),
        megaLink("Спайдерное остекление", "/osteklenie/spajdernoe/"),
        megaLink("Витрины и магазины", "/osteklenie/vitrin-i-magazinov/"),
        megaLink("Лифтовые шахты", "/osteklenie/liftovyh-shaht/"),
        megaLink("Веранды и террасы", "/osteklenie/verand-terras-besedok/"),
      ],
    },
  ],
  promoCard: PROMO_CARD,
};

const O = "/obrabotka-stekla/";
const K = "/kak-zakazat/";

/** «Услуги»: zadaniya/02-shapka-podval.md, «Мега-меню». */
const SERVICES_MENU: MegaMenu = {
  key: "services",
  label: "Услуги",
  columns: [
    {
      title: "Обработка стекла",
      links: [
        megaLink("Обработка стекла", O),
        megaLink("Кромка", `${O}kromka/`),
        megaLink("Отверстия и вырезы", `${O}otverstiya-i-vyrezy/`),
        megaLink("Фацет на зеркалах", `${O}facet/`),
        megaLink("Матирование", `${O}matirovanie/`),
        megaLink("Печать", `${O}pechat/`),
        megaLink("Плёнки", `${O}plenki/`),
      ],
    },
    {
      title: "Как заказать",
      links: [
        megaLink("Как заказать", K),
        megaLink("Требования к чертежам", `${K}trebovaniya-k-chertezham/`),
        megaLink("Допуски по ГОСТ", `${K}dopuski-i-gost/`),
        megaLink("Сроки", `${K}sroki/`),
        megaLink("Упаковка и доставка", `${K}upakovka-i-dostavka/`),
        megaLink("Документы", `${K}dokumenty/`),
        megaLink("Оплата", `${K}oplata/`),
        megaLink("Приёмка", `${K}priemka/`),
      ],
    },
    {
      title: "Проектирование и инструменты",
      links: [
        megaLink("Проектирование узлов", "/proektirovanie/"),
        megaLink("Калькулятор веса стекла", "/instrumenty/kalkulyator-vesa-stekla/"),
      ],
    },
  ],
  promoCard: PROMO_CARD,
};

const COMPANY_LINKS = [
  link("О компании", "/o-kompanii/"),
  link("Объекты", "/obekty/"),
  link("Контакты", "/kontakty/"),
  link("Реквизиты", "/kontakty/#rekvizity"),
];

async function seedNavigation(ctx: SeedContext): Promise<void> {
  await upsertGlobal(ctx, "navigation", {
    topBar: {
      companyLabel: "Компания",
      companyItems: COMPANY_LINKS,
      contactLabel: "Связаться с нами",
      showPhone: true,
      showEmail: true,
      showMessengers: true,
      callbackLabel: "Заказать звонок",
      segments: [
        link("Застройщикам", "/klientam/zastrojshchikam/"),
        link("Подрядчикам", "/klientam/podryadchikam/"),
        link("Дизайнерам и архитекторам", "/klientam/dizajneram-i-arhitektoram/"),
        link("Производителям мебели", "/klientam/proizvoditelyam-mebeli/"),
      ],
    },
    actionsLink: { label: "Акции", url: "/zakalennoe-steklo/#ceny" },
    mainRow: {
      pills: [
        { key: "services", label: "Услуги" },
        { key: "catalog", label: "Каталог" },
      ],
      links: [link("Блог", "/blog/")],
      searchLabel: "Поиск по сайту",
      searchPlaceholder: "Введите запрос",
      ctaLabel: "Рассчитать стоимость",
      callbackLabel: "Заказать звонок",
      myCalcLabel: "Мой расчёт",
      myCalcUrl: "/raschet-stoimosti/?resume=1",
    },
    sectionRow: {
      items: [
        link("Закалённое стекло", Z),
        link("Триплекс", "/tripleks/"),
        link("Обработка стекла", O),
        link("Стеклянные перегородки", "/steklyannye-peregorodki/"),
        link("Ограждения", "/steklyannye-ograzhdeniya/"),
        link("Козырьки", "/steklyannye-kozyrki/"),
        link("Остекление зданий", "/osteklenie/"),
        link("Стекло для мебели", `${Z}dlya-mebeli/`),
        link("Зеркала", "/zerkala/"),
      ],
      laptopVisibleCount: 5,
      moreLabel: "Ещё",
    },
    megaMenus: [CATALOG_MENU, SERVICES_MENU],
    footer: {
      columns: [
        {
          title: "Каталог",
          links: [
            link("Закалённое стекло", Z),
            link("Триплекс", "/tripleks/"),
            link("Стеклянные перегородки", "/steklyannye-peregorodki/"),
            link("Ограждения", "/steklyannye-ograzhdeniya/"),
            link("Козырьки", "/steklyannye-kozyrki/"),
            link("Остекление зданий", "/osteklenie/"),
            link("Стекло для мебели", `${Z}dlya-mebeli/`),
            link("Зеркала", "/zerkala/"),
          ],
        },
        {
          title: "Услуги и «Как заказать»",
          links: [
            link("Обработка стекла", O),
            link("Проектирование", "/proektirovanie/"),
            link("Как заказать", K),
            link("Требования к чертежам", `${K}trebovaniya-k-chertezham/`),
            link("Сроки", `${K}sroki/`),
            link("Упаковка и доставка", `${K}upakovka-i-dostavka/`),
            link("Калькулятор веса стекла", "/instrumenty/kalkulyator-vesa-stekla/"),
          ],
        },
        { title: "Компания", links: COMPANY_LINKS },
      ],
      bottomLinks: [
        link("Политика обработки персональных данных", "/politika-konfidencialnosti/"),
        link(
          "Согласие на обработку персональных данных",
          "/soglasie-na-obrabotku-personalnyh-dannyh/"
        ),
      ],
      showContactsColumn: true,
    },
  });
}

/* ------------------------------------------------------------------------------------------ */
/* Snippets                                                                                   */
/* ------------------------------------------------------------------------------------------ */

async function seedSnippets(ctx: SeedContext): Promise<void> {
  await upsertGlobal(ctx, "snippets", {
    items: [
      {
        // Key referenced by `glass-types.samplesSnippetKey` (default `samples`).
        key: "samples",
        title: "Образцы и цветопроба",
        // teksty/08-vidy-stekla.md, header «Общий блок „Образцы и цветопроба“».
        content: await markdown(
          ctx,
          "Оттенок, матовость и цвет лучше согласовать до запуска партии. Пришлём образец или фото эталона под вашим освещением. Образцы — **бесплатно**, изготовление — **около недели**."
        ),
        ctaLabel: "Заказать образец",
        ctaFormKey: "sample",
        usageNote:
          "Страницы видов стекла: матовое, тонированное, крашеное, осветлённое, для мебели.",
      },
    ],
  });
}

/* ------------------------------------------------------------------------------------------ */

/** All 9 globals. Existing globals are skipped unless `--force`. */
export async function seedGlobals(ctx: SeedContext): Promise<void> {
  await seedPrices(ctx);
  await seedPromo(ctx);
  await seedConditions(ctx);
  await seedContacts(ctx);
  await seedRequisites(ctx);
  await seedTechParams(ctx);
  await seedSiteSettings(ctx);
  await seedNavigation(ctx);
  await seedSnippets(ctx);
}
