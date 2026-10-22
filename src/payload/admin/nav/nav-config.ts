/**
 * Static description of the admin sidebar (`res/admin-mockup/Main.dc.html`, `<aside class="sb">`):
 * groups, items, their icons, links, child entities and counters. Pure data, no JSX: icons are
 * string keys resolved by `nav-icons.tsx`, visibility is decided per user by `build-nav.ts`.
 *
 * Links keep the trailing slash (`trailingSlash: true` in `next.config.ts`).
 */

import { LEADS_KANBAN_PATH, LEADS_REPORT_PATH } from "../leads/constants";

export const ADMIN_ROOT_PATH = "/admin/";
export const ACCOUNT_PATH = "/admin/account/";
export const LOGOUT_PATH = "/admin/logout/";

export type NavIconKey =
  | "dashboard"
  | "leads"
  | "orders"
  | "reports"
  | "pages"
  | "articles"
  | "objects"
  | "media"
  | "team"
  | "catalog"
  | "prices"
  | "conditions"
  | "users"
  | "settings"
  | "service";

export type NavEntityKind = "collection" | "global";

export type NavEntityRef = {
  kind: NavEntityKind;
  slug: string;
  /** Overrides the label from the Payload config (e.g. «Все заявки» for the item's own list). */
  label?: string;
};

export type NavCounterKey = "newLeads" | "activeOrders";

export interface NavItemConfig {
  /** Stable key, rendered as `data-nav-item`. */
  id: string;
  label: string;
  icon: NavIconKey;
  /** Explicit link (dashboard, kanban, report); otherwise the link of the first visible entity. */
  href?: string;
  /** The item's own entity (visibility and highlighting). */
  entity?: NavEntityRef;
  children?: NavEntityRef[];
  counter?: NavCounterKey;
  /** Highlight only on the exact `href` (the dashboard), not on every path below it. */
  exact?: boolean;
  /** DOM id of the link (`nav-leads-report` is relied upon by e2e specs). */
  domId?: string;
  /** Receives every visible entity no other item shows («Служебное»). */
  catchAll?: boolean;
}

export interface NavGroupConfig {
  id: string;
  label: string;
  items: NavItemConfig[];
}

const collection = (slug: string, label?: string): NavEntityRef =>
  label === undefined ? { kind: "collection", slug } : { kind: "collection", slug, label };
const global = (slug: string): NavEntityRef => ({ kind: "global", slug });

export const NAV_GROUPS: readonly NavGroupConfig[] = [
  {
    id: "work",
    label: "Работа",
    items: [
      {
        id: "dashboard",
        label: "Дашборд",
        icon: "dashboard",
        href: ADMIN_ROOT_PATH,
        exact: true,
      },
      {
        id: "leads",
        label: "Заявки",
        icon: "leads",
        href: LEADS_KANBAN_PATH,
        entity: collection("leads"),
        children: [
          collection("leads", "Все заявки"),
          collection("lead-statuses"),
          collection("lead-files"),
          collection("consent-log"),
        ],
        counter: "newLeads",
      },
      {
        id: "orders",
        label: "Заказы",
        icon: "orders",
        entity: collection("orders"),
        children: [collection("orders", "Все заказы"), collection("order-files")],
        counter: "activeOrders",
      },
      {
        id: "reports",
        label: "Отчёты",
        icon: "reports",
        href: LEADS_REPORT_PATH,
        domId: "nav-leads-report",
      },
    ],
  },
  {
    id: "site",
    label: "Сайт",
    items: [
      { id: "pages", label: "Страницы", icon: "pages", entity: collection("pages") },
      { id: "articles", label: "Статьи", icon: "articles", entity: collection("articles") },
      { id: "objects", label: "Объекты", icon: "objects", entity: collection("objects") },
      { id: "media", label: "Медиатека", icon: "media", entity: collection("media") },
      // Not in the mockup, but the content collection must stay reachable.
      { id: "team", label: "Сотрудники", icon: "team", entity: collection("team") },
    ],
  },
  {
    id: "catalog",
    label: "Каталог и цены",
    items: [
      {
        id: "catalog",
        label: "Каталог",
        icon: "catalog",
        children: [
          collection("glass-types"),
          collection("thicknesses"),
          collection("thickness-groups"),
          collection("processing-services"),
          collection("constructions"),
          collection("shower-configs"),
          collection("products"),
          collection("object-types"),
          collection("cities"),
        ],
      },
      {
        id: "prices",
        label: "Цены и акция",
        icon: "prices",
        children: [global("prices"), global("promo")],
      },
      {
        id: "conditions",
        label: "Условия и контакты",
        icon: "conditions",
        children: [
          global("conditions"),
          global("contacts"),
          global("requisites"),
          global("tech-params"),
        ],
      },
    ],
  },
  {
    id: "system",
    label: "Система",
    items: [
      { id: "users", label: "Пользователи", icon: "users", entity: collection("users") },
      {
        id: "settings",
        label: "Настройки",
        icon: "settings",
        children: [global("site-settings"), global("navigation"), global("snippets")],
      },
      {
        id: "service",
        label: "Служебное",
        icon: "service",
        children: [
          collection("redirects"),
          collection("search"),
          // Payload's built-in jobs collection is labelled «Payload Jobs» (English) in the config.
          collection("payload-jobs", "Задания"),
        ],
        catchAll: true,
      },
    ],
  },
];
