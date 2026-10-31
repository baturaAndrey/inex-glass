import { normalizePhone } from "@/lib/domain/contact-fields";
import { promoActive } from "@/lib/domain/promo";
import type { Contact, Navigation, Promo } from "@/payload-types";
import {
  DEFAULT_CONTACTS,
  DEFAULT_FOOTER_NAV,
  DEFAULT_HEADER_NAV,
  DEFAULT_MEGA_MENUS,
  type ContactsData,
  type FooterColumn,
  type FooterNavData,
  type HeaderNavData,
  type MegaColumn,
  type MegaLink,
  type MegaMenuData,
  type NavLink,
  type PhoneData,
  type PromoBadgeData,
} from "./nav-defaults";

/*
 * Pure adapters: CMS globals (`@/payload-types`) → serialisable view models of the header and
 * footer. Every list falls back to `nav-defaults.ts` when the CMS has nothing usable, so a fresh
 * database without the seed still gets a full header.
 */

/** Shape of the shared `linkField()` group (`src/payload/fields/link.ts`). */
interface CmsLink {
  type?: "doc" | "custom" | null;
  doc?: { relationTo: string; value: unknown } | null;
  url?: string | null;
  label?: string | null;
  newTab?: boolean | null;
}

/** Public path of a populated document (`path` is computed by the collections, task-07). */
function docPath(doc: CmsLink["doc"]): string | null {
  const value = doc?.value;
  if (typeof value !== "object" || value === null) return null;
  const path = (value as { path?: unknown }).path;
  return typeof path === "string" && path.startsWith("/") ? path : null;
}

/**
 * CMS link → `NavLink`, or `null` when it cannot be resolved (no label, unpopulated document,
 * empty URL). Unresolvable entries are dropped instead of rendering dead links.
 */
export function resolveCmsLink(link: CmsLink | null | undefined): NavLink | null {
  if (!link) return null;
  const label = link.label?.trim();
  if (!label) return null;
  const href = link.type === "custom" ? link.url?.trim() || null : docPath(link.doc);
  if (!href) return null;
  return { label, href, newTab: Boolean(link.newTab) };
}

/** `[{ link }]` rows → resolved links. */
function resolveRows(rows: readonly { link: CmsLink }[] | null | undefined): NavLink[] {
  return (rows ?? []).flatMap((row) => resolveCmsLink(row.link) ?? []);
}

/** CMS list if it resolved to at least one item, otherwise the default. */
function orDefault<T>(items: T[], fallback: T[]): T[] {
  return items.length > 0 ? items : fallback;
}

/** Trimmed non-empty string or the fallback. */
function text(value: string | null | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

type CmsMegaMenu = NonNullable<Navigation["megaMenus"]>[number];

function toMegaColumns(columns: CmsMegaMenu["columns"]): MegaColumn[] {
  return (columns ?? []).flatMap((column): MegaColumn[] => {
    const links = (column.links ?? []).flatMap((row): MegaLink[] => {
      const resolved = resolveCmsLink(row.link);
      if (!resolved) return [];
      const subLinks = (row.subLinks ?? []).flatMap((sub): NavLink[] => {
        const label = sub.label.trim();
        const href = sub.url.trim();
        return label && href ? [{ label, href, newTab: false }] : [];
      });
      return [{ ...resolved, hint: row.hint?.trim() || null, subLinks }];
    });
    return links.length > 0 ? [{ title: column.title, links }] : [];
  });
}

function toMegaMenu(menu: CmsMegaMenu): MegaMenuData {
  const fallback = DEFAULT_MEGA_MENUS[menu.key];
  const card = menu.promoCard;
  return {
    key: menu.key,
    label: text(menu.label, fallback.label),
    columns: orDefault(toMegaColumns(menu.columns), fallback.columns),
    promoCard: card.enabled
      ? {
          title: card.title,
          text: card.text?.trim() || null,
          buttonLabel: card.buttonLabel,
          buttonKind: card.buttonKind,
          url: card.url?.trim() || null,
        }
      : null,
  };
}

/**
 * Mega-menus in the order of the main-row pills (`mainRow.pills`). A pill without CMS menu
 * content uses the default menu of its key, so a pill never opens an empty panel.
 */
function toMegaMenus(nav: Navigation): MegaMenuData[] {
  const menus = new Map((nav.megaMenus ?? []).map((menu) => [menu.key, toMegaMenu(menu)]));
  const pills = nav.mainRow.pills ?? [];
  if (pills.length === 0) return DEFAULT_HEADER_NAV.megaMenus;
  return pills.map((pill) => {
    const menu = menus.get(pill.key) ?? DEFAULT_MEGA_MENUS[pill.key];
    return { ...menu, label: text(pill.label, menu.label) };
  });
}

export function toHeaderNav(nav: Navigation | null | undefined): HeaderNavData {
  if (!nav) return DEFAULT_HEADER_NAV;
  const d = DEFAULT_HEADER_NAV;
  const { topBar, mainRow, sectionRow, actionsLink } = nav;
  const sections = orDefault(resolveRows(sectionRow.items), d.sections);
  return {
    companyLabel: text(topBar.companyLabel, d.companyLabel),
    companyItems: orDefault(resolveRows(topBar.companyItems), d.companyItems),
    contactLabel: text(topBar.contactLabel, d.contactLabel),
    showPhone: topBar.showPhone ?? true,
    showEmail: topBar.showEmail ?? true,
    showMessengers: topBar.showMessengers ?? true,
    callbackLabel: text(topBar.callbackLabel, d.callbackLabel),
    segments: orDefault(resolveRows(topBar.segments), d.segments),
    actionsLink: {
      label: text(actionsLink.label, d.actionsLink.label),
      href: text(actionsLink.url, d.actionsLink.href),
      newTab: false,
    },
    megaMenus: toMegaMenus(nav),
    links: orDefault(resolveRows(mainRow.links), d.links),
    searchLabel: text(mainRow.searchLabel, d.searchLabel),
    searchPlaceholder: text(mainRow.searchPlaceholder, d.searchPlaceholder),
    ctaLabel: text(mainRow.ctaLabel, d.ctaLabel),
    myCalcLabel: text(mainRow.myCalcLabel, d.myCalcLabel),
    myCalcUrl: text(mainRow.myCalcUrl, d.myCalcUrl),
    sections,
    laptopVisibleCount: Math.min(
      Math.max(1, Math.trunc(sectionRow.laptopVisibleCount || d.laptopVisibleCount)),
      sections.length
    ),
    moreLabel: text(sectionRow.moreLabel, d.moreLabel),
  };
}

export function toFooterNav(nav: Navigation | null | undefined): FooterNavData {
  const footer = nav?.footer;
  if (!footer) return DEFAULT_FOOTER_NAV;
  const columns = (footer.columns ?? []).flatMap((column): FooterColumn[] => {
    const links = resolveRows(column.links);
    return links.length > 0 ? [{ title: column.title, links }] : [];
  });
  return {
    columns: orDefault(columns, DEFAULT_FOOTER_NAV.columns),
    bottomLinks: orDefault(resolveRows(footer.bottomLinks), DEFAULT_FOOTER_NAV.bottomLinks),
    showContactsColumn: footer.showContactsColumn ?? true,
  };
}

/** `tel:` href from a displayed number; non-Russian formats keep their digits and `+`. */
export function telHref(display: string): string {
  const normalized = normalizePhone(display);
  return `tel:${normalized ?? display.replace(/[^\d+]/g, "")}`;
}

function toPhone(display: string): PhoneData {
  return { display, href: telHref(display) };
}

/** Row marked as primary, else the first one. */
function primary<T extends { isPrimary?: boolean | null }>(rows: readonly T[]): T | undefined {
  return rows.find((row) => row.isPrimary) ?? rows[0];
}

/** Digits-only key, so «+7 (351) 247-05-57» and «8 351 247 05 57» compare equal. */
const phoneKey = (number: string) => normalizePhone(number) ?? number.replace(/\D/g, "");

export function toContactsData(contacts: Contact | null | undefined): ContactsData {
  if (!contacts) return DEFAULT_CONTACTS;
  const d = DEFAULT_CONTACTS;
  const mainNumber = primary(contacts.phones ?? [])?.number?.trim();
  const phone = mainNumber ? toPhone(mainNumber) : d.phone;
  const mainKey = phoneKey(phone.display);

  const locations = (contacts.locations ?? []).map((location) => {
    // The main number is shown large above the list; a location shows its own extra number,
    // or its working hours when it has none (warehouse) — as in the prototype footer.
    const ownPhone = (location.phones ?? [])
      .map((row) => row.number.trim())
      .find((number) => number && phoneKey(number) !== mainKey);
    return {
      title: location.title,
      address: location.address,
      detail: ownPhone ?? (location.hours?.trim() || null),
    };
  });

  return {
    phone,
    email: text(primary(contacts.emails ?? [])?.address, d.email),
    workHoursShort: text(contacts.workHours?.short, d.workHoursShort),
    workHoursFull: text(contacts.workHours?.full, d.workHoursFull),
    callPrompt: text(contacts.callPrompt, d.callPrompt),
    locations: orDefault(locations, d.locations),
    messengers: (contacts.messengers ?? []).flatMap((m) =>
      m.name.trim() && m.url.trim()
        ? [{ name: m.name.trim(), url: m.url.trim(), icon: m.icon }]
        : []
    ),
    copyrightHolder: text(contacts.copyrightHolder, d.copyrightHolder),
    inexSuUrl: text(contacts.inexSuUrl, d.inexSuUrl),
    inexSuLabel: text(contacts.inexSuFooterLabel, d.inexSuLabel),
  };
}

/**
 * Promo strip data, or `null` when the promo is not active right now (`promoActive`, inclusive
 * dates in the company time zone). Evaluated at render time: the strip disappears after the end
 * date on the next revalidation.
 */
export function toPromoBadge(
  promo: Promo | null | undefined,
  now: Date = new Date()
): PromoBadgeData | null {
  if (!promo) return null;
  const promoText = promo.text?.trim() ?? "";
  const isActive = promoActive(
    {
      active: promo.active,
      text: promoText,
      startDate: promo.startDate ?? null,
      endDate: promo.endDate ?? null,
      thresholdArea: promo.thresholdArea,
    },
    now
  );
  const badgeText = promo.badgeText?.trim() || promoText;
  if (!isActive || !badgeText) return null;
  return { text: badgeText, href: text(promo.linkUrl, DEFAULT_HEADER_NAV.actionsLink.href) };
}
