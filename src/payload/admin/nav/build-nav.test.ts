import { describe, expect, it } from "vitest";
import { buildNav, entityHref } from "./build-nav";
import { NAV_GROUPS } from "./nav-config";
import type { NavGroup, NavInput, NavItem } from "./build-nav";
import type { NavEntityRef } from "./nav-config";

/** Every visible collection / global of the project (as `visibleEntities` lists them). */
const COLLECTIONS = [
  "users",
  "pages",
  "articles",
  "objects",
  "media",
  "team",
  "glass-types",
  "thicknesses",
  "thickness-groups",
  "processing-services",
  "constructions",
  "shower-configs",
  "products",
  "object-types",
  "cities",
  "leads",
  "lead-statuses",
  "lead-files",
  "consent-log",
  "orders",
  "order-files",
  "redirects",
  "search",
  "payload-jobs",
];
const GLOBALS = [
  "prices",
  "promo",
  "conditions",
  "contacts",
  "requisites",
  "tech-params",
  "site-settings",
  "navigation",
  "snippets",
];

const LABELS: NavInput["labels"] = {
  collections: {
    users: "Пользователи",
    pages: "Страницы",
    "glass-types": "Виды стекла",
    thicknesses: "Толщины",
    "lead-statuses": "Статусы заявок",
    redirects: "Редиректы",
    search: "Поисковый индекс",
    "payload-jobs": "Задания",
    foo: "Ящик",
    bar: "Архив",
  },
  globals: { prices: "Цены от", promo: "Акция" },
};

function input(overrides: Partial<NavInput> = {}): NavInput {
  return {
    groups: NAV_GROUPS,
    visibleEntities: { collections: COLLECTIONS, globals: GLOBALS },
    canRead: () => true,
    labels: LABELS,
    isStaff: true,
    ...overrides,
  };
}

const managerInput = () =>
  input({
    visibleEntities: {
      collections: COLLECTIONS.filter((slug) => slug !== "payload-jobs" && slug !== "search"),
      globals: GLOBALS,
    },
  });

function findItem(groups: NavGroup[], id: string): NavItem | undefined {
  return groups.flatMap((group) => group.items).find((item) => item.id === id);
}

function item(groups: NavGroup[], id: string): NavItem {
  const found = findItem(groups, id);
  if (!found) throw new Error(`nav item "${id}" is missing`);
  return found;
}

const childHrefs = (navItem: NavItem) => navItem.children.map((child) => child.href);
const collectionHref = (slug: string) => entityHref({ kind: "collection", slug });
const globalHref = (slug: string) => entityHref({ kind: "global", slug });

/** Every href of the menu: items and their children. */
const allHrefs = (groups: NavGroup[]) =>
  new Set(
    groups.flatMap((group) =>
      group.items.flatMap((navItem) => [navItem.href, ...childHrefs(navItem)])
    )
  );

describe("buildNav", () => {
  it("admin: four groups in mockup order with the configured items and children", () => {
    const groups = buildNav(input());

    expect(groups.map((group) => group.label)).toEqual([
      "Работа",
      "Сайт",
      "Каталог и цены",
      "Система",
    ]);
    expect(groups.map((group) => group.items.map((navItem) => navItem.id))).toEqual([
      ["dashboard", "leads", "orders", "reports"],
      ["pages", "articles", "objects", "media", "team"],
      ["catalog", "prices", "conditions"],
      ["users", "settings", "service"],
    ]);

    const leads = item(groups, "leads");
    expect(leads.href).toBe("/admin/collections/leads/kanban/");
    expect(leads.counter).toBe("newLeads");
    expect(leads.children.map((child) => child.label)).toEqual([
      "Все заявки",
      "Статусы заявок",
      "lead-files",
      "consent-log",
    ]);
    expect(childHrefs(leads)[0]).toBe("/admin/collections/leads/");

    const orders = item(groups, "orders");
    expect(orders.href).toBe("/admin/collections/orders/");
    expect(orders.counter).toBe("activeOrders");
    expect(childHrefs(orders)).toEqual([
      "/admin/collections/orders/",
      "/admin/collections/order-files/",
    ]);

    const reports = item(groups, "reports");
    expect(reports.domId).toBe("nav-leads-report");
    expect(reports.href).toBe("/admin/leads-report/");
    expect(reports.activePrefixes).toEqual(["/admin/leads-report/"]);

    expect(item(groups, "pages").href).toBe("/admin/collections/pages/");
    expect(item(groups, "catalog").children).toHaveLength(9);
    expect(item(groups, "catalog").href).toBe("/admin/collections/glass-types/");
    expect(item(groups, "prices").href).toBe("/admin/globals/prices/");
    expect(childHrefs(item(groups, "conditions"))).toEqual([
      "/admin/globals/conditions/",
      "/admin/globals/contacts/",
      "/admin/globals/requisites/",
      "/admin/globals/tech-params/",
    ]);
    expect(item(groups, "settings").href).toBe("/admin/globals/site-settings/");
    expect(item(groups, "service").children.map((child) => child.label)).toEqual([
      "Редиректы",
      "Поисковый индекс",
      "Задания",
    ]);
  });

  it("manager: sees «Сайт» and «Каталог и цены»; «Служебное» holds only redirects", () => {
    const groups = buildNav(managerInput());

    expect(groups.map((group) => group.label)).toContain("Сайт");
    expect(groups.map((group) => group.label)).toContain("Каталог и цены");
    expect(childHrefs(item(groups, "service"))).toEqual(["/admin/collections/redirects/"]);
    expect(allHrefs(groups)).not.toContain(collectionHref("payload-jobs"));
    expect(allHrefs(groups)).not.toContain(collectionHref("search"));
  });

  it("hides «Заказы» when orders cannot be read; readable order files move to «Служебное»", () => {
    const groups = buildNav(
      input({
        canRead: (ref: NavEntityRef) => !(ref.kind === "collection" && ref.slug === "orders"),
        labels: {
          ...LABELS,
          collections: { ...LABELS.collections, "order-files": "Файлы заказов" },
        },
      })
    );

    expect(findItem(groups, "orders")).toBeUndefined();
    expect(allHrefs(groups)).not.toContain(collectionHref("orders"));
    const service = item(groups, "service");
    expect(childHrefs(service)).toContain(collectionHref("order-files"));
    expect(service.children.map((child) => child.label)).toContain("Файлы заказов");
  });

  it("hides «Заказы» and its files when neither can be read", () => {
    const groups = buildNav(
      input({
        canRead: (ref: NavEntityRef) =>
          !(ref.kind === "collection" && (ref.slug === "orders" || ref.slug === "order-files")),
      })
    );

    expect(findItem(groups, "orders")).toBeUndefined();
    const hrefs = allHrefs(groups);
    expect(hrefs).not.toContain(collectionHref("orders"));
    expect(hrefs).not.toContain(collectionHref("order-files"));
  });

  it("links «Каталог» to the next visible child when the first one is hidden", () => {
    const groups = buildNav(
      input({
        visibleEntities: {
          collections: COLLECTIONS.filter((slug) => slug !== "glass-types"),
          globals: GLOBALS,
        },
      })
    );

    const catalog = item(groups, "catalog");
    expect(catalog.href).toBe("/admin/collections/thicknesses/");
    expect(childHrefs(catalog)).not.toContain(collectionHref("glass-types"));
  });

  it("puts unknown visible entities into «Служебное», each entity exactly once", () => {
    const collections = [...COLLECTIONS, "foo", "bar"];
    const globals = [...GLOBALS, "baz"];
    const groups = buildNav(input({ visibleEntities: { collections, globals } }));

    const service = item(groups, "service");
    // Configured children first, then the extras sorted by label (`baz` has none → its slug).
    const extras = ["Ящик", "Архив", "baz"].sort((a, b) => a.localeCompare(b, "ru"));
    expect(service.children.map((child) => child.label)).toEqual([
      "Редиректы",
      "Поисковый индекс",
      "Задания",
      ...extras,
    ]);
    expect(extras.indexOf("Архив")).toBeLessThan(extras.indexOf("Ящик"));
    expect(childHrefs(service)).toContain(collectionHref("foo"));
    expect(childHrefs(service)).toContain(globalHref("baz"));

    // Union of all links covers every visible entity.
    const hrefs = allHrefs(groups);
    for (const slug of collections) expect(hrefs).toContain(collectionHref(slug));
    for (const slug of globals) expect(hrefs).toContain(globalHref(slug));

    // Each entity is placed by exactly one item (an item may link its own list twice:
    // «Заказы» and its child «Все заказы").
    const owners = new Map<string, Set<string>>();
    for (const navItem of groups.flatMap((group) => group.items)) {
      const links = new Set([...childHrefs(navItem), ...(navItem.exact ? [] : [navItem.href])]);
      for (const href of links) {
        if (!href.startsWith("/admin/collections/") && !href.startsWith("/admin/globals/"))
          continue;
        if (href === "/admin/collections/leads/kanban/") continue;
        owners.set(href, (owners.get(href) ?? new Set()).add(navItem.id));
      }
    }
    for (const [href, ids] of owners) expect([href, ids.size]).toEqual([href, 1]);
  });

  it("activePrefixes: «Заявки» covers the whole leads section, «Дашборд» is exact", () => {
    const groups = buildNav(input());

    const leads = item(groups, "leads");
    expect(leads.activePrefixes).toContain("/admin/collections/leads/");
    expect(leads.activePrefixes).toContain("/admin/collections/lead-statuses/");
    expect(leads.exact).toBe(false);

    const dashboard = item(groups, "dashboard");
    expect(dashboard.exact).toBe(true);
    expect(dashboard.href).toBe("/admin/");
    expect(dashboard.activePrefixes).toEqual(["/admin/"]);
  });

  it("non-staff users get no dashboard or report links", () => {
    const groups = buildNav(input({ isStaff: false }));

    expect(findItem(groups, "dashboard")).toBeUndefined();
    expect(findItem(groups, "reports")).toBeUndefined();
    expect(findItem(groups, "pages")).toBeDefined();
  });

  it("drops empty groups", () => {
    const groups = buildNav(
      input({ visibleEntities: { collections: ["leads"], globals: [] }, isStaff: false })
    );

    expect(groups.map((group) => group.id)).toEqual(["work"]);
    expect(groups[0]?.items.map((navItem) => navItem.id)).toEqual(["leads"]);
  });
});
