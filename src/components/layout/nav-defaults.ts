/*
 * Fallback data of the site header and footer + the URL table of the menus.
 *
 * The real values live in the CMS globals `navigation`, `contacts` and `promo`
 * (normalised by `nav-data.ts`). These defaults are used when a global (or one of its lists)
 * is empty — e.g. a fresh database without the seed — so the header never renders empty.
 * Sources: specs task-14 «Таблица URL», res/inex-glass-handoff/zadaniya/02-shapka-podval.md,
 * teksty/01-glavnaya.md («Подвал (ссылка-мост)»).
 */

/* ------------------------------------------------------------------------------------------ */
/* Serialisable view models (server → client props)                                           */
/* ------------------------------------------------------------------------------------------ */

export interface NavLink {
  label: string;
  href: string;
  newTab: boolean;
}

export interface MegaLink extends NavLink {
  /** Short grey hint under the link. */
  hint: string | null;
  /** Chips under the link, e.g. thicknesses «4 мм · 6 мм …». */
  subLinks: NavLink[];
}

export interface MegaColumn {
  title: string;
  links: MegaLink[];
}

export type MegaMenuKey = "catalog" | "services";

export interface MegaPromoCard {
  title: string;
  text: string | null;
  buttonLabel: string;
  /** `quiz` opens the quiz (`/raschet-stoimosti/?src=…`), `link` goes to `url`. */
  buttonKind: "quiz" | "link";
  url: string | null;
}

export interface MegaMenuData {
  key: MegaMenuKey;
  label: string;
  columns: MegaColumn[];
  promoCard: MegaPromoCard | null;
}

export interface HeaderNavData {
  companyLabel: string;
  companyItems: NavLink[];
  contactLabel: string;
  showPhone: boolean;
  showEmail: boolean;
  showMessengers: boolean;
  callbackLabel: string;
  segments: NavLink[];
  actionsLink: NavLink;
  /** Mega-menu triggers in display order. */
  megaMenus: MegaMenuData[];
  links: NavLink[];
  searchLabel: string;
  searchPlaceholder: string;
  ctaLabel: string;
  myCalcLabel: string;
  myCalcUrl: string;
  sections: NavLink[];
  /** Section links visible at 1101–1365 px; the rest go under «Ещё ▾». */
  laptopVisibleCount: number;
  moreLabel: string;
}

export interface FooterColumn {
  title: string;
  links: NavLink[];
}

export interface FooterNavData {
  columns: FooterColumn[];
  bottomLinks: NavLink[];
  showContactsColumn: boolean;
}

export interface PhoneData {
  /** As displayed: «+7 (351) 247-05-57». */
  display: string;
  /** `tel:+73512470557`. */
  href: string;
}

export type MessengerIcon = "telegram" | "whatsapp" | "max" | "viber" | "vk" | "other";

export interface MessengerData {
  name: string;
  url: string;
  icon: MessengerIcon;
}

export interface LocationData {
  title: string;
  address: string;
  /** Second line detail: the location's own phone (if it differs from the main one) or hours. */
  detail: string | null;
}

export interface ContactsData {
  phone: PhoneData;
  email: string;
  workHoursShort: string;
  workHoursFull: string;
  callPrompt: string;
  locations: LocationData[];
  messengers: MessengerData[];
  copyrightHolder: string;
  inexSuUrl: string;
  inexSuLabel: string;
}

/** Promo strip of the header; present only while the promo is active. */
export interface PromoBadgeData {
  text: string;
  href: string;
}

/* ------------------------------------------------------------------------------------------ */
/* URL table                                                                                   */
/* ------------------------------------------------------------------------------------------ */

export const QUIZ_PATH = "/raschet-stoimosti/";
export const MY_CALC_URL = "/raschet-stoimosti/?resume=1";
export const SEARCH_PATH = "/poisk/";
export const ORDER_PATH_PREFIX = "/zakaz/";

export const URLS = {
  home: "/",
  tempered: "/zakalennoe-steklo/",
  temperedThickness: (mm: number) => `/zakalennoe-steklo/${mm}-mm/`,
  matte: "/zakalennoe-steklo/matovoe/",
  tinted: "/zakalennoe-steklo/tonirovannoe/",
  painted: "/zakalennoe-steklo/okrashennoe/",
  lowIron: "/zakalennoe-steklo/osvetlennoe/",
  patterned: "/zakalennoe-steklo/riflenoe/",
  bent: "/zakalennoe-steklo/mollirovannoe/",
  furnitureGlass: "/zakalennoe-steklo/dlya-mebeli/",
  promo: "/zakalennoe-steklo/#ceny",
  triplex: "/tripleks/",
  processing: "/obrabotka-stekla/",
  processingEdge: "/obrabotka-stekla/kromka/",
  processingHoles: "/obrabotka-stekla/otverstiya-i-vyrezy/",
  processingFacet: "/obrabotka-stekla/facet/",
  processingMatting: "/obrabotka-stekla/matirovanie/",
  processingPrint: "/obrabotka-stekla/pechat/",
  processingFilms: "/obrabotka-stekla/plenki/",
  partitions: "/steklyannye-peregorodki/",
  railings: "/steklyannye-ograzhdeniya/",
  canopies: "/steklyannye-kozyrki/",
  showers: "/dushevye-peregorodki/",
  showcases: "/torgovye-vitriny/",
  mirrors: "/zerkala/",
  mirrorsGyms: "/zerkala/dlya-zalov/",
  mirrorsSalons: "/zerkala/dlya-salonov/",
  hardware: "/furnitura/",
  glazing: "/osteklenie/",
  glazingFacades: "/osteklenie/fasadov/",
  glazingSpider: "/osteklenie/spajdernoe/",
  glazingShops: "/osteklenie/vitrin-i-magazinov/",
  glazingLifts: "/osteklenie/liftovyh-shaht/",
  glazingVerandas: "/osteklenie/verand-terras-besedok/",
  design: "/proektirovanie/",
  howToOrder: "/kak-zakazat/",
  howToOrderDrawings: "/kak-zakazat/trebovaniya-k-chertezham/",
  howToOrderGost: "/kak-zakazat/dopuski-i-gost/",
  howToOrderTerms: "/kak-zakazat/sroki/",
  howToOrderDelivery: "/kak-zakazat/upakovka-i-dostavka/",
  howToOrderDocs: "/kak-zakazat/dokumenty/",
  howToOrderAcceptance: "/kak-zakazat/priemka/",
  howToOrderPayment: "/kak-zakazat/oplata/",
  weightCalculator: "/instrumenty/kalkulyator-vesa-stekla/",
  segmentDevelopers: "/klientam/zastrojshchikam/",
  segmentContractors: "/klientam/podryadchikam/",
  segmentDesigners: "/klientam/dizajneram-i-arhitektoram/",
  segmentFurniture: "/klientam/proizvoditelyam-mebeli/",
  about: "/o-kompanii/",
  objects: "/obekty/",
  contacts: "/kontakty/",
  requisites: "/kontakty/#rekvizity",
  blog: "/blog/",
  privacy: "/politika-konfidencialnosti/",
  consent: "/soglasie-na-obrabotku-personalnyh-dannyh/",
} as const;

/**
 * Hrefs that must bypass the Next router (same rule as `ig/text-link`): protocol links
 * (`https:`, `tel:`, `mailto:`), protocol-relative `//`, the Payload admin (separate root
 * layout — never `next/link`) and `/api/*` route handlers.
 */
const NON_ROUTER_HREF = /^(?:[a-z][a-z\d+.-]*:|\/\/|\/(?:admin|api)(?:[/?#]|$))/i;

export function isRouterHref(href: string): boolean {
  return !NON_ROUTER_HREF.test(href);
}

/* ------------------------------------------------------------------------------------------ */
/* Defaults                                                                                    */
/* ------------------------------------------------------------------------------------------ */

const link = (label: string, href: string): NavLink => ({ label, href, newTab: false });

const megaLink = (label: string, href: string, subLinks: NavLink[] = []): MegaLink => ({
  ...link(label, href),
  hint: null,
  subLinks,
});

const TEMPERED_THICKNESSES = [4, 6, 8, 10, 12] as const;

const CATALOG_MENU: MegaMenuData = {
  key: "catalog",
  label: "Каталог",
  columns: [
    {
      title: "Стекло",
      links: [
        megaLink(
          "Закалённое стекло",
          URLS.tempered,
          TEMPERED_THICKNESSES.map((mm) => link(`${mm} мм`, URLS.temperedThickness(mm)))
        ),
        megaLink("Матовое", URLS.matte),
        megaLink("Тонированное", URLS.tinted),
        megaLink("Крашеное по RAL", URLS.painted),
        megaLink("Осветлённое", URLS.lowIron),
        megaLink("Рифлёное", URLS.patterned),
        megaLink("Гнутое", URLS.bent),
        megaLink("Триплекс", URLS.triplex),
        megaLink("Для мебели", URLS.furnitureGlass),
      ],
    },
    {
      title: "Конструкции",
      links: [
        megaLink("Стеклянные перегородки", URLS.partitions),
        megaLink("Ограждения и перила", URLS.railings),
        megaLink("Козырьки", URLS.canopies),
        megaLink("Душевые перегородки для проектов", URLS.showers),
        megaLink("Торговые витрины", URLS.showcases),
        megaLink("Зеркала", URLS.mirrors, [
          link("для залов", URLS.mirrorsGyms),
          link("для салонов", URLS.mirrorsSalons),
        ]),
        megaLink("Зажимной профиль и спайдеры", URLS.hardware),
      ],
    },
    {
      title: "Остекление зданий",
      links: [
        megaLink("Стеклянные фасады", URLS.glazingFacades),
        megaLink("Спайдерное остекление", URLS.glazingSpider),
        megaLink("Витрины и магазины", URLS.glazingShops),
        megaLink("Лифтовые шахты", URLS.glazingLifts),
        megaLink("Веранды и террасы", URLS.glazingVerandas),
      ],
    },
  ],
  promoCard: {
    title: "Рассчитать стоимость по чертежу",
    text: null,
    buttonLabel: "Рассчитать стоимость",
    buttonKind: "quiz",
    url: null,
  },
};

const SERVICES_MENU: MegaMenuData = {
  key: "services",
  label: "Услуги",
  columns: [
    {
      title: "Обработка стекла",
      links: [
        megaLink("Обработка стекла", URLS.processing, [
          link("кромка", URLS.processingEdge),
          link("отверстия и вырезы", URLS.processingHoles),
          link("фацет на зеркалах", URLS.processingFacet),
          link("матирование", URLS.processingMatting),
          link("печать", URLS.processingPrint),
          link("плёнки", URLS.processingFilms),
        ]),
      ],
    },
    {
      title: "Проектирование",
      links: [
        megaLink("Проектирование узлов", URLS.design),
        megaLink("Калькулятор веса стекла", URLS.weightCalculator),
      ],
    },
    {
      title: "Как заказать",
      links: [
        megaLink("Как заказать", URLS.howToOrder, [
          link("требования к чертежам", URLS.howToOrderDrawings),
          link("допуски по ГОСТ", URLS.howToOrderGost),
          link("сроки", URLS.howToOrderTerms),
          link("упаковка и доставка", URLS.howToOrderDelivery),
          link("документы", URLS.howToOrderDocs),
          link("оплата", URLS.howToOrderPayment),
          link("приёмка", URLS.howToOrderAcceptance),
        ]),
      ],
    },
  ],
  promoCard: null,
};

/** Default mega-menus, keyed for merging with partially filled CMS data. */
export const DEFAULT_MEGA_MENUS: Record<MegaMenuKey, MegaMenuData> = {
  catalog: CATALOG_MENU,
  services: SERVICES_MENU,
};

export const DEFAULT_HEADER_NAV: HeaderNavData = {
  companyLabel: "Компания",
  companyItems: [
    link("О компании", URLS.about),
    link("Объекты", URLS.objects),
    link("Контакты", URLS.contacts),
    link("Реквизиты", URLS.requisites),
  ],
  contactLabel: "Связаться с нами",
  showPhone: true,
  showEmail: true,
  showMessengers: true,
  callbackLabel: "Заказать звонок",
  segments: [
    link("Застройщикам", URLS.segmentDevelopers),
    link("Подрядчикам", URLS.segmentContractors),
    link("Дизайнерам и архитекторам", URLS.segmentDesigners),
    link("Производителям мебели", URLS.segmentFurniture),
  ],
  actionsLink: link("Акции", URLS.promo),
  // Order of the prototype: «Услуги», then «Каталог».
  megaMenus: [SERVICES_MENU, CATALOG_MENU],
  links: [link("Блог", URLS.blog)],
  searchLabel: "Поиск по сайту",
  searchPlaceholder: "Введите запрос",
  ctaLabel: "Рассчитать стоимость",
  myCalcLabel: "Мой расчёт",
  myCalcUrl: MY_CALC_URL,
  sections: [
    link("Закалённое стекло", URLS.tempered),
    link("Триплекс", URLS.triplex),
    link("Обработка стекла", URLS.processing),
    link("Стеклянные перегородки", URLS.partitions),
    link("Ограждения", URLS.railings),
    link("Козырьки", URLS.canopies),
    link("Остекление зданий", URLS.glazing),
    link("Стекло для мебели", URLS.furnitureGlass),
    link("Зеркала", URLS.mirrors),
  ],
  laptopVisibleCount: 5,
  moreLabel: "Ещё",
};

export const DEFAULT_FOOTER_NAV: FooterNavData = {
  columns: [
    {
      title: "Каталог",
      links: [
        link("Закалённое стекло", URLS.tempered),
        link("Триплекс", URLS.triplex),
        link("Стеклянные перегородки", URLS.partitions),
        link("Ограждения и перила", URLS.railings),
        link("Козырьки", URLS.canopies),
        link("Остекление зданий", URLS.glazing),
        link("Зеркала", URLS.mirrors),
      ],
    },
    {
      title: "Услуги",
      links: [
        link("Обработка стекла", URLS.processing),
        link("Проектирование", URLS.design),
        link("Как заказать", URLS.howToOrder),
        link("Требования к чертежам", URLS.howToOrderDrawings),
        link("Допуски и ГОСТ", URLS.howToOrderGost),
        link("Сроки", URLS.howToOrderTerms),
        link("Упаковка и доставка", URLS.howToOrderDelivery),
        link("Документы", URLS.howToOrderDocs),
        link("Оплата", URLS.howToOrderPayment),
        link("Приёмка", URLS.howToOrderAcceptance),
        link("Калькулятор веса стекла", URLS.weightCalculator),
      ],
    },
    {
      title: "Компания",
      links: [
        link("О компании", URLS.about),
        link("Объекты", URLS.objects),
        link("Контакты", URLS.contacts),
        link("Реквизиты", URLS.requisites),
      ],
    },
  ],
  bottomLinks: [
    link("Политика обработки персональных данных", URLS.privacy),
    link("Согласие на обработку персональных данных", URLS.consent),
  ],
  showContactsColumn: true,
};

export const DEFAULT_CONTACTS: ContactsData = {
  phone: { display: "+7 (351) 247-05-57", href: "tel:+73512470557" },
  email: "sale@inex.su",
  workHoursShort: "Пн–Пт 9–18",
  workHoursFull: "Пн–пт, 9:00–18:00",
  callPrompt: "Звоните Пн–Пт 9–18",
  locations: [
    {
      title: "Челябинск — офис",
      address: "ул. Артиллерийская, 124А",
      detail: "+7 951 489-04-09",
    },
    {
      title: "Челябинск — склад и самовывоз",
      address: "Свердловский тракт, 7В",
      detail: "пн–пт, 9:00–18:00",
    },
    {
      title: "Екатеринбург — офис",
      address: "ул. Данилы Зверева, 17б",
      detail: "+7 982 329-11-08",
    },
  ],
  messengers: [],
  copyrightHolder: "ИП Копылов А. М.",
  inexSuUrl: "https://inex.su/",
  inexSuLabel: "Двери, лестницы и другие конструкции Inex — на inex.su",
};
