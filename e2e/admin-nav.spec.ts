import { expect, test } from "@playwright/test";
import { skipOnMissingAdmin } from "./helpers/admin";
import { adminApi, deleteStaffApi, signInBrowser, staffApi } from "./helpers/admin-api";
import { VIEWPORTS } from "./helpers/viewports";
import type { AdminApi } from "./helpers/admin-api";
import type { APIRequestContext, Locator, Page, PlaywrightWorkerArgs } from "@playwright/test";

/**
 * Admin sidebar (admin redesign, task 03): groups, links, active item, counters, rights and the
 * mobile overlay. Tests 1–4 run at 1366 only, test 5 at 375 only. Nothing is mutated except a
 * throwaway manager (created and deleted here, 1366 only).
 */

const NAV = 'nav[aria-label="Главное меню"]';
const GROUP_LABELS = ["Работа", "Сайт", "Каталог и цены", "Система"];
/** A cached counter lives 60 s: enough time for a stale `0` to expire. */
const COUNTER_WAIT_MS = 75_000;

let apiContext: APIRequestContext | undefined;
let admin: AdminApi | undefined;
let manager: AdminApi | undefined;

async function ensureAdmin(
  playwright: PlaywrightWorkerArgs["playwright"],
  baseURL: string
): Promise<AdminApi> {
  if (admin) return admin;
  apiContext ??= await playwright.request.newContext({ baseURL });
  try {
    admin = await adminApi(apiContext);
  } catch (error) {
    skipOnMissingAdmin(error);
  }
  return admin!;
}

test.afterAll(async () => {
  if (admin && manager) await deleteStaffApi(admin, manager);
  manager = undefined;
  await apiContext?.dispose();
  apiContext = undefined;
  admin = undefined;
});

const itemLink = (nav: Locator, id: string) =>
  nav.locator(`[data-nav-item="${id}"] a.iga-nav__link`);

/** Expands every collapsed item and returns all hrefs of the menu. */
async function allMenuHrefs(page: Page): Promise<string[]> {
  const nav = page.locator(NAV);
  const collapsed = nav.locator('button.iga-nav__toggle[aria-expanded="false"]');
  while ((await collapsed.count()) > 0) {
    await collapsed.first().click();
  }
  return nav
    .locator("a[href]")
    .evaluateAll((links) => links.map((link) => link.getAttribute("href") ?? ""));
}

/** The status new leads get: the flagged default, else the first by `order` (as the menu). */
async function defaultLeadStatusId(api: AdminApi): Promise<string | null> {
  const { docs } = await api.json<{ docs: { id: string; order: number; isDefault?: boolean }[] }>(
    "/api/lead-statuses/?sort=order&limit=100&depth=0"
  );
  return (docs.find((status) => status.isDefault) ?? docs[0])?.id ?? null;
}

async function leadsWithStatus(api: AdminApi, statusId: string): Promise<number> {
  const body = await api.json<{ totalDocs: number }>(
    `/api/leads/?where[status][equals]=${statusId}&limit=1&depth=0`
  );
  return body.totalDocs;
}

test.describe("desktop 1366", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== VIEWPORTS.laptop.name, "Admin nav: 1366 only");
  });

  test("groups, links and the active item", async ({ page, context, playwright, baseURL }) => {
    const api = await ensureAdmin(playwright, baseURL!);
    await signInBrowser(context, api, baseURL!);

    await page.goto("/admin/");
    const nav = page.locator(NAV);
    await expect(nav).toBeVisible();
    for (const label of GROUP_LABELS) {
      await expect(nav.locator(".iga-nav__group-label", { hasText: label })).toHaveText(label);
    }

    await expect(itemLink(nav, "dashboard")).toHaveAttribute("aria-current", "page");
    await expect(itemLink(nav, "dashboard")).toHaveAttribute("href", "/admin/");
    await expect(itemLink(nav, "leads")).toHaveAttribute(
      "href",
      "/admin/collections/leads/kanban/"
    );
    await expect(itemLink(nav, "orders")).toHaveAttribute("href", "/admin/collections/orders/");
    await expect(nav.locator("#nav-leads-report")).toHaveAttribute("href", "/admin/leads-report/");
    await expect(nav.locator(".iga-nav__user a.iga-nav__logout")).toHaveAttribute(
      "href",
      "/admin/logout/"
    );

    await page.goto("/admin/collections/pages/");
    await expect(itemLink(page.locator(NAV), "pages")).toHaveAttribute("aria-current", "page");
    await expect(itemLink(page.locator(NAV), "dashboard")).not.toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  test("new leads counter matches the default status", async ({
    page,
    context,
    playwright,
    baseURL,
  }) => {
    test.setTimeout(COUNTER_WAIT_MS + 60_000);
    const api = await ensureAdmin(playwright, baseURL!);
    await signInBrowser(context, api, baseURL!);

    const statusId = await defaultLeadStatusId(api);
    test.skip(!statusId, "No lead statuses: the counter is never shown");
    const before = await leadsWithStatus(api, statusId!);

    await page.goto("/admin/");
    const badge = page.locator(`${NAV} [data-nav-item="leads"] .iga-nav__count`);
    if (before >= 1) {
      // Another render of this user may have cached an older value: wait out the 60 s TTL.
      await expect
        .poll(
          async () => {
            if ((await badge.count()) > 0) return true;
            await page.reload();
            return (await badge.count()) > 0;
          },
          { timeout: COUNTER_WAIT_MS, intervals: [5_000] }
        )
        .toBe(true);
    }
    if ((await badge.count()) === 0) return;

    const label = (await badge.getAttribute("aria-label")) ?? "";
    const match = /^новых: (\d+)$/.exec(label);
    expect(match, `aria-label "${label}"`).not.toBeNull();
    const shown = Number(match![1]);
    await expect(badge).toHaveText(String(shown));
    expect(shown).toBeGreaterThanOrEqual(1);
    // Other specs add leads in parallel and the counter is cached: an upper bound only.
    const after = await leadsWithStatus(api, statusId!);
    expect(shown).toBeLessThanOrEqual(Math.max(after, before));
  });

  test("manager sees site and catalog, not jobs or the search index", async ({
    page,
    context,
    playwright,
    baseURL,
  }) => {
    const api = await ensureAdmin(playwright, baseURL!);
    manager ??= await staffApi(api, "manager");
    await signInBrowser(context, manager, baseURL!);

    await page.goto("/admin/");
    const nav = page.locator(NAV);
    await expect(nav.locator(".iga-nav__group-label", { hasText: "Сайт" })).toBeVisible();
    await expect(nav.locator(".iga-nav__group-label", { hasText: "Каталог и цены" })).toBeVisible();
    await expect(nav.locator(".iga-nav__user-role")).toHaveText("Менеджер");

    const hrefs = await allMenuHrefs(page);
    expect(hrefs).not.toContain("/admin/collections/payload-jobs/");
    expect(hrefs).not.toContain("/admin/collections/search/");

    const pagesResponse = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/admin/collections/pages/" &&
        response.request().resourceType() === "document"
    );
    await itemLink(page.locator(NAV), "pages").click();
    expect((await pagesResponse).status()).toBeLessThan(400);
    await expect(page).toHaveURL(/\/admin\/collections\/pages\/$/);
    await expect(itemLink(page.locator(NAV), "pages")).toHaveAttribute("aria-current", "page");
  });

  test("every standard collection and global is reachable", async ({
    page,
    context,
    playwright,
    baseURL,
  }) => {
    const api = await ensureAdmin(playwright, baseURL!);
    await signInBrowser(context, api, baseURL!);

    await page.goto("/admin/");
    const hrefs = await allMenuHrefs(page);
    const collections = [
      "leads",
      "orders",
      "pages",
      "articles",
      "objects",
      "media",
      "team",
      "users",
      "glass-types",
      "thicknesses",
      "lead-statuses",
    ];
    for (const slug of collections) expect(hrefs).toContain(`/admin/collections/${slug}/`);
    for (const slug of ["prices", "promo", "site-settings"]) {
      expect(hrefs).toContain(`/admin/globals/${slug}/`);
    }
  });
});

test.describe("mobile 375", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== VIEWPORTS.mobile.name, "Mobile overlay: 375 only");
  });

  test("the overlay opens, its links are tappable and it closes", async ({
    page,
    context,
    playwright,
    baseURL,
  }) => {
    const api = await ensureAdmin(playwright, baseURL!);
    await signInBrowser(context, api, baseURL!);

    await page.goto("/admin/");
    const aside = page.locator("aside.nav");
    const pagesLink = itemLink(page.locator(NAV), "pages");
    await expect(aside).toHaveAttribute("inert", "");
    await expect(aside).not.toHaveClass(/nav--nav-open/);

    await page.locator(".app-header__mobile-nav-toggler").click();
    await expect(aside).toHaveClass(/nav--nav-open/);
    await expect(aside).not.toHaveAttribute("inert", "");
    await expect(pagesLink).toBeVisible();

    for (const id of ["dashboard", "leads", "pages", "users"]) {
      const box = await itemLink(page.locator(NAV), id).boundingBox();
      expect(box, id).not.toBeNull();
      expect(box!.height, id).toBeGreaterThanOrEqual(44);
    }
    const logoutBox = await page.locator(`${NAV} .iga-nav__logout`).boundingBox();
    expect(logoutBox?.height ?? 0).toBeGreaterThanOrEqual(44);

    // Payload's close button (NavHamburger) returns the content.
    await page.locator("aside.nav .nav__mobile-close").click();
    await expect(aside).not.toHaveClass(/nav--nav-open/);
    await expect(aside).toHaveAttribute("inert", "");

    // Open again and follow a link.
    await page.locator(".app-header__mobile-nav-toggler").click();
    await expect(aside).toHaveClass(/nav--nav-open/);
    await pagesLink.click();
    await expect(page).toHaveURL(/\/admin\/collections\/pages\/$/);
  });
});
