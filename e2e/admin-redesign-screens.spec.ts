import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { expect, test } from "@playwright/test";
import { skipOnMissingAdmin } from "./helpers/admin";
import {
  adminApi,
  createLead,
  deleteDocs,
  signInBrowser,
  uniquePhone,
  uploadLeadPdf,
} from "./helpers/admin-api";
import type { AdminApi } from "./helpers/admin-api";
import type { Lead } from "../src/payload-types";
import type { APIRequestContext, Locator, Page } from "@playwright/test";

/**
 * Documentation screenshots of the admin redesign (task 13 acceptance, section 3): four admin
 * screens next to the approved mockup (`res/admin-mockup/*.dc.html`) at 375 / 1366 / 1920. The
 * PNGs land in `docs/reports/admin-redesign/<screen>-<width>-<app|mockup>.png` and are compared by
 * a reviewer — this spec asserts only that every screen rendered.
 *
 * Opt-in: `ADMIN_REDESIGN_SCREENSHOTS=1 pnpm test:e2e -- e2e/admin-redesign-screens.spec.ts`.
 *
 * Every project creates its own lead fixture (marker with the project name in `company`), so the
 * three projects never race over shared documents; the fixtures are deleted in `afterAll`.
 */

test.describe.configure({ mode: "serial" });

const ENABLED = process.env.ADMIN_REDESIGN_SCREENSHOTS === "1";
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(REPO_ROOT, "docs", "reports", "admin-redesign");
const MOCKUP_DIR = path.join(REPO_ROOT, "res", "admin-mockup");
/** Full-page captures of long admin screens can take a while on Windows. */
const SCREENSHOT_TIMEOUT_MS = 60_000;

type Screen = "dashboard" | "kanban" | "lead" | "page-edit";

/** Mockup file of each screen (one static state per file, no scroll containers to unfold). */
const MOCKUPS: Record<Screen, string> = {
  dashboard: "Main.dc.html",
  kanban: "Leads.dc.html",
  lead: "Lead.dc.html",
  "page-edit": "PageEdit.dc.html",
};

let apiContext: APIRequestContext | undefined;
let admin: AdminApi;
let lead: Lead;
let homePageId: string;
const leadIds = new Set<string>();
const fileIds = new Set<string>();

test.beforeAll(async ({ playwright, baseURL }, testInfo) => {
  test.skip(!ENABLED, "Documentation screenshots: set ADMIN_REDESIGN_SCREENSHOTS=1");
  mkdirSync(OUT_DIR, { recursive: true });
  // A context of our own: the hook's `request` fixture is disposed when the hook ends.
  apiContext = await playwright.request.newContext({ baseURL: baseURL! });
  try {
    admin = await adminApi(apiContext);
  } catch (error) {
    skipOnMissingAdmin(error);
  }

  const run = `e2e-screens-${testInfo.project.name}-${Date.now().toString(36)}`;
  const fileId = await uploadLeadPdf(admin, "chertezh-fasad.pdf");
  fileIds.add(fileId);
  lead = await createLead(admin, {
    formType: "quiz",
    sourceLabel: "Квиз: Рассчитать стоимость",
    entryPage: "/zakalennoe-steklo/",
    company: `ООО «${run}»`,
    name: "Анна Смирнова",
    phone: uniquePhone(),
    email: `${run}@example.com`,
    city: "Екатеринбург",
    area: 86,
    productType: "tempered",
    comment: "Нужна фасадная остеклёнка, чертёж приложен.",
    answers: {
      type: "tempered",
      area: 86,
      positions: 24,
      maxW: 3000,
      maxH: 2000,
      city: "Екатеринбург",
      needDocs: true,
    },
    estimate: { from: 120400, priceDate: new Date().toISOString(), shown: true },
    flags: ["urgent", "needs_docs"],
    files: [fileId],
    assignee: admin.user.id,
  });
  leadIds.add(lead.id);

  const commented = await admin.patch(`/api/leads/${lead.id}/`, {
    internalComments: [{ text: "Позвонила клиенту, жду уточнения по кромке." }],
  });
  expect(commented.status(), `add comment: ${await commented.text()}`).toBe(200);

  const { docs } = await admin.json<{ docs: { id: string }[] }>(
    "/api/pages/?where[template][equals]=home&limit=1&depth=0"
  );
  const home = docs[0]?.id;
  if (!home) throw new Error("Home page is missing: run the seed");
  homePageId = home;
});

test.afterAll(async () => {
  if (admin) {
    await deleteDocs(admin, "leads", leadIds);
    await deleteDocs(admin, "lead-files", fileIds);
  }
  await apiContext?.dispose();
});

test.beforeEach(() => {
  test.skip(!ENABLED, "Documentation screenshots: set ADMIN_REDESIGN_SCREENSHOTS=1");
});

/** `375` / `1366` / `1920` from the project viewport. */
function widthOf(page: Page): number {
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("The project has no viewport");
  return viewport.width;
}

/** Waits for fonts and idle network (best effort: the admin may keep polling). */
async function settle(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
}

async function shoot(page: Page, screen: Screen, kind: "app" | "mockup"): Promise<void> {
  await settle(page);
  await page.screenshot({
    path: path.join(OUT_DIR, `${screen}-${widthOf(page)}-${kind}.png`),
    fullPage: true,
    animations: "disabled",
    caret: "hide",
    scale: "css",
    timeout: SCREENSHOT_TIMEOUT_MS,
  });
}

/** Opens an admin route as the e2e admin and waits for the screen's own markup. */
async function openAdmin(
  page: Page,
  baseURL: string,
  url: string,
  ready: (page: Page) => Locator
): Promise<void> {
  await signInBrowser(page.context(), admin, baseURL);
  const response = await page.goto(url);
  expect(response?.status(), `GET ${url}`).toBeLessThan(400);
  await expect(ready(page).first()).toBeVisible({ timeout: 30_000 });
  // Payload fills the document meta («Последнее изменение», «Создано») on the client; give it a
  // moment, but keep shooting if it never resolves — that is a finding for the report.
  await expect(page.locator(".doc-controls__meta"))
    .not.toContainText("Загрузка", { timeout: 10_000 })
    .catch(() => undefined);
}

const APP_SCREENS: Record<Screen, { url: () => string; ready: (page: Page) => Locator }> = {
  dashboard: {
    url: () => "/admin/",
    ready: (page) => page.locator('section[aria-labelledby="iga-dash-att-h"]'),
  },
  kanban: {
    url: () => "/admin/collections/leads/kanban/",
    ready: (page) => page.locator(".iga-kanban__col"),
  },
  lead: {
    url: () => `/admin/collections/leads/${lead.id}/summary/`,
    ready: (page) => page.locator(".iga-lead-comments"),
  },
  "page-edit": {
    url: () => `/admin/collections/pages/${homePageId}/`,
    ready: (page) => page.locator("#field-title"),
  },
};

for (const screen of Object.keys(APP_SCREENS) as Screen[]) {
  test(`${screen}: app`, async ({ page, baseURL }) => {
    const { url, ready } = APP_SCREENS[screen];
    await openAdmin(page, baseURL!, url(), ready);
    await shoot(page, screen, "app");
  });

  test(`${screen}: mockup`, async ({ page }) => {
    // The mockup is a static `.dc.html` export: its `support.js` is not in the repo, so the
    // markup renders as is (Rubik comes from Google Fonts — only in this documentation test).
    const file = pathToFileURL(path.join(MOCKUP_DIR, MOCKUPS[screen])).href;
    await page.goto(file);
    await expect(page.locator("body")).toBeVisible();
    await shoot(page, screen, "mockup");
  });
}
