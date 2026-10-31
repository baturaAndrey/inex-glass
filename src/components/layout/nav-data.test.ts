import { describe, expect, it } from "vitest";
import type { Contact, Navigation, Promo } from "@/payload-types";
import {
  resolveCmsLink,
  telHref,
  toContactsData,
  toFooterNav,
  toHeaderNav,
  toPromoBadge,
} from "./nav-data";
import {
  DEFAULT_CONTACTS,
  DEFAULT_FOOTER_NAV,
  DEFAULT_HEADER_NAV,
  isRouterHref,
} from "./nav-defaults";

const custom = (label: string, url: string) => ({
  link: { type: "custom" as const, url, label, newTab: false },
});

/** Minimal `navigation` global with empty lists (as on a database without the seed). */
function emptyNavigation(overrides: Partial<Navigation> = {}): Navigation {
  return {
    id: "nav",
    topBar: {
      companyLabel: "Компания",
      companyItems: [],
      contactLabel: "Связаться с нами",
      callbackLabel: "Заказать звонок",
      segments: [],
    },
    actionsLink: { label: "Акции", url: "/zakalennoe-steklo/#ceny" },
    mainRow: {
      pills: [],
      links: [],
      searchLabel: "Поиск по сайту",
      searchPlaceholder: "Введите запрос",
      ctaLabel: "Рассчитать стоимость",
      callbackLabel: "Заказать звонок",
      myCalcLabel: "Мой расчёт",
      myCalcUrl: "/raschet-stoimosti/?resume=1",
    },
    sectionRow: { items: [], laptopVisibleCount: 5, moreLabel: "Ещё" },
    megaMenus: [],
    footer: { columns: [], bottomLinks: [] },
    ...overrides,
  };
}

const promo = (overrides: Partial<Promo> = {}): Promo => ({
  id: "promo",
  active: true,
  text: "−5% на закалённое стекло при заказе от 100 м²",
  startDate: "2026-10-01T00:00:00.000Z",
  endDate: "2026-10-31T00:00:00.000Z",
  thresholdArea: 100,
  linkUrl: "/zakalennoe-steklo/#ceny",
  ...overrides,
});

describe("resolveCmsLink", () => {
  it("uses the URL of a custom link", () => {
    expect(resolveCmsLink(custom("Блог", "/blog/").link)).toEqual({
      label: "Блог",
      href: "/blog/",
      newTab: false,
    });
  });

  it("uses the path of a populated document and drops unpopulated ones", () => {
    const populated = {
      type: "doc" as const,
      doc: { relationTo: "pages", value: { id: "1", path: "/o-kompanii/" } },
      label: "О компании",
    };
    expect(resolveCmsLink(populated)?.href).toBe("/o-kompanii/");
    expect(resolveCmsLink({ ...populated, doc: { relationTo: "pages", value: "1" } })).toBeNull();
  });

  it("drops links without a label or URL", () => {
    expect(resolveCmsLink({ type: "custom", url: "/blog/", label: " " })).toBeNull();
    expect(resolveCmsLink({ type: "custom", url: "", label: "Блог" })).toBeNull();
  });
});

describe("toHeaderNav", () => {
  it("falls back to the defaults without a global", () => {
    expect(toHeaderNav(null)).toBe(DEFAULT_HEADER_NAV);
  });

  it("fills empty CMS lists with the defaults (fresh database)", () => {
    const nav = toHeaderNav(emptyNavigation());
    expect(nav.sections).toHaveLength(9);
    expect(nav.companyItems.map((item) => item.href)).toContain("/kontakty/#rekvizity");
    expect(nav.megaMenus.map((menu) => menu.key)).toEqual(["services", "catalog"]);
    expect(nav.megaMenus[1]?.columns.map((column) => column.title)).toEqual([
      "Стекло",
      "Конструкции",
      "Остекление зданий",
    ]);
  });

  it("keeps CMS data and clamps the laptop section count", () => {
    const nav = toHeaderNav(
      emptyNavigation({
        sectionRow: {
          items: [custom("Триплекс", "/tripleks/"), custom("Зеркала", "/zerkala/")],
          laptopVisibleCount: 5,
          moreLabel: "Ещё",
        },
        mainRow: {
          ...emptyNavigation().mainRow,
          pills: [{ key: "catalog", label: "Каталог стекла" }],
        },
      })
    );
    expect(nav.sections.map((section) => section.label)).toEqual(["Триплекс", "Зеркала"]);
    expect(nav.laptopVisibleCount).toBe(2);
    // A pill without CMS menu content gets the default panel of its key.
    expect(nav.megaMenus).toHaveLength(1);
    expect(nav.megaMenus[0]?.label).toBe("Каталог стекла");
    expect(nav.megaMenus[0]?.columns).toHaveLength(3);
  });
});

describe("toFooterNav", () => {
  it("falls back to the default columns and legal links", () => {
    expect(toFooterNav(emptyNavigation())).toEqual({
      ...DEFAULT_FOOTER_NAV,
      showContactsColumn: true,
    });
  });
});

describe("toContactsData", () => {
  const contacts: Contact = {
    id: "contacts",
    brandName: "Inex Glass",
    copyrightHolder: "ИП Копылов А. М.",
    phones: [
      { number: "+7 951 489-04-09", isPrimary: false },
      { number: "+7 (351) 247-05-57", isPrimary: true },
    ],
    emails: [{ address: "sale@inex.su", isPrimary: true }],
    workHours: { full: "Пн–пт, 9:00–18:00", short: "Пн–Пт 9–18" },
    callPrompt: "Звоните Пн–Пт 9–18",
    locations: [
      {
        key: "chelyabinsk-office",
        type: "office",
        title: "Челябинск — офис",
        city: "Челябинск",
        address: "ул. Артиллерийская, 124А",
        phones: [{ number: "+7 (351) 247-05-57" }, { number: "+7 951 489-04-09" }],
        hours: "Пн–пт, 9:00–18:00",
      },
      {
        key: "chelyabinsk-warehouse",
        type: "warehouse",
        title: "Челябинск — склад и самовывоз",
        city: "Челябинск",
        address: "Свердловский тракт, 7В",
        phones: [],
        hours: "Пн–пт, 9:00–18:00",
      },
    ],
    messengers: [{ name: "Telegram", url: "https://t.me/inex", icon: "telegram" }],
    inlineText: "",
    inexSuUrl: "https://inex.su",
    inexSuFooterLabel: "Двери, лестницы и другие конструкции Inex — на inex.su",
    inexSuBridgeLabel: "",
  };

  it("takes the primary phone and builds a tel: link", () => {
    expect(toContactsData(contacts).phone).toEqual({
      display: "+7 (351) 247-05-57",
      href: "tel:+73512470557",
    });
  });

  it("shows a location's own extra phone, or its hours", () => {
    expect(toContactsData(contacts).locations.map((location) => location.detail)).toEqual([
      "+7 951 489-04-09",
      "Пн–пт, 9:00–18:00",
    ]);
  });

  it("falls back to the defaults without a global", () => {
    expect(toContactsData(null)).toBe(DEFAULT_CONTACTS);
  });
});

describe("toPromoBadge", () => {
  const inside = new Date("2026-10-20T12:00:00+05:00");

  it("returns the strip while the promo is active", () => {
    expect(toPromoBadge(promo(), inside)).toEqual({
      text: "−5% на закалённое стекло при заказе от 100 м²",
      href: "/zakalennoe-steklo/#ceny",
    });
    expect(toPromoBadge(promo({ badgeText: "−5% от 100 м²" }), inside)?.text).toBe("−5% от 100 м²");
  });

  it("returns null when switched off, outside the dates or without a global", () => {
    expect(toPromoBadge(promo({ active: false }), inside)).toBeNull();
    expect(toPromoBadge(promo(), new Date("2026-11-02T12:00:00+05:00"))).toBeNull();
    expect(toPromoBadge(promo(), new Date("2026-09-20T12:00:00+05:00"))).toBeNull();
    expect(toPromoBadge(null, inside)).toBeNull();
  });
});

describe("helpers", () => {
  it("telHref normalises Russian numbers", () => {
    expect(telHref("8 (351) 247-05-57")).toBe("tel:+73512470557");
    expect(telHref("+7 982 329-11-08")).toBe("tel:+79823291108");
  });

  it("isRouterHref keeps the admin, API and external links out of next/link", () => {
    expect(isRouterHref("/kontakty/")).toBe(true);
    expect(isRouterHref("/admin")).toBe(false);
    expect(isRouterHref("/admin/collections/leads")).toBe(false);
    expect(isRouterHref("/api/files/1")).toBe(false);
    expect(isRouterHref("tel:+73512470557")).toBe(false);
    expect(isRouterHref("https://inex.su/")).toBe(false);
  });
});
