import { expect, test } from "@playwright/test";
import { skipOnMissingAdmin } from "./helpers/admin";
import { adminApi, deleteStaffApi, signInBrowser, staffApi } from "./helpers/admin-api";
import { VIEWPORTS } from "./helpers/viewports";
import type { AdminApi } from "./helpers/admin-api";
import type { APIRequestContext } from "@playwright/test";

/**
 * Draft preview of `pages` (task 11, admin redesign): `/api/preview/?path=…` checks the staff
 * session and the path, enables Next Draft Mode and redirects; the page then shows its latest
 * draft under the «Режим превью» banner; «Выйти» (POST `/api/preview/exit/`) returns to the
 * published version.
 *
 * Runs at 1366 only, serially: one published page (unique slug `preview-e2e-<tag>`) with a draft
 * on top is created through REST under the e2e admin and deleted in `afterAll`, as is the
 * throwaway manager.
 */

test.describe.configure({ mode: "serial" });

const TAG = Date.now().toString(36);
const SLUG = `preview-e2e-${TAG}`;
const PUBLISHED_TITLE = `Превью e2e ${TAG}`;
const DRAFT_TITLE = `Черновик e2e ${TAG}`;
const PREVIEW_COOKIE = "__prerender_bypass";

let apiContext: APIRequestContext | undefined;
let admin: AdminApi;
let manager: AdminApi | undefined;
let pageId: string | undefined;
let pagePath: string;

const previewUrl = (path: string) => `/api/preview/?path=${encodeURIComponent(path)}`;

test.beforeAll(async ({ playwright, baseURL }, testInfo) => {
  test.skip(testInfo.project.name !== VIEWPORTS.laptop.name, "Mutates shared data: 1366 only");
  // A context of our own: the hook's `request` fixture is disposed when the hook ends.
  apiContext = await playwright.request.newContext({ baseURL: baseURL! });
  try {
    admin = await adminApi(apiContext);
  } catch (error) {
    skipOnMissingAdmin(error);
  }

  const created = await admin.post("/api/pages/", {
    title: PUBLISHED_TITLE,
    slug: SLUG,
    template: "generic",
    _status: "published",
  });
  expect(created.status(), `create page: ${await created.text()}`).toBe(201);
  const doc = ((await created.json()) as { doc: { id: string; path: string } }).doc;
  pageId = doc.id;
  pagePath = doc.path;
  expect(pagePath).toBe(`/${SLUG}/`);

  const draft = await admin.patch(`/api/pages/${pageId}/?draft=true`, {
    title: DRAFT_TITLE,
    _status: "draft",
  });
  expect(draft.status(), `save draft: ${await draft.text()}`).toBe(200);
});

test.afterAll(async () => {
  if (admin && pageId) await admin.delete(`/api/pages/${pageId}/`).catch(() => undefined);
  if (admin && manager) await deleteStaffApi(admin, manager).catch(() => undefined);
  await apiContext?.dispose();
});

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== VIEWPORTS.laptop.name, "Mutates shared data: 1366 only");
});

test("anonymous → 401; a manager may enter the preview (307)", async ({ request }) => {
  // The per-test `request` context, not the shared `apiContext`: the 307 stores the Draft Mode
  // cookie in the context it answers, and later tests need a context outside the preview.
  const anonymous = await request.get(previewUrl("/"), { maxRedirects: 0 });
  expect(anonymous.status()).toBe(401);
  expect(anonymous.headers()["set-cookie"] ?? "").not.toContain(PREVIEW_COOKIE);

  manager = await staffApi(admin, "manager");
  const response = await request.get(previewUrl("/"), {
    headers: manager.headers(),
    maxRedirects: 0,
  });
  expect(response.status()).toBe(307);
  expect(response.headers()["set-cookie"] ?? "").toContain(PREVIEW_COOKIE);
});

test("unsafe or missing path → 400", async () => {
  for (const query of [
    "?path=%2F%2Fevil.com",
    "?path=https%3A%2F%2Fevil.com",
    "?path=%2Fadmin%2F",
    "?path=%2Fapi%2Fpreview%2F",
    "?path=%2F%0D%0ASet-Cookie%3Ax",
    "",
  ]) {
    const response = await apiContext!.get(`/api/preview/${query}`, {
      headers: admin.headers(),
      maxRedirects: 0,
    });
    expect(response.status(), query || "(no path)").toBe(400);
    expect(response.headers()["set-cookie"] ?? "", query).not.toContain(PREVIEW_COOKIE);
  }
});

test("without the preview the site shows the published version only", async () => {
  const response = await apiContext!.get(pagePath);
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain(PUBLISHED_TITLE);
  expect(html).not.toContain(DRAFT_TITLE);
  expect(html).not.toContain("Режим превью");
});

test("the preview shows the draft under the banner; «Выйти» returns to the published page", async ({
  page,
  baseURL,
}) => {
  await signInBrowser(page.context(), admin, baseURL!);

  const response = await page.goto(previewUrl(pagePath));
  expect(new URL(page.url()).pathname).toBe(pagePath);
  expect(response?.headers()["cache-control"] ?? "").toContain("no-store");
  const banner = page.getByRole("status").filter({ hasText: "Режим превью" });
  await expect(banner).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(DRAFT_TITLE);

  await banner.getByRole("button", { name: "Выйти" }).click();
  await page.waitForURL((url) => url.pathname === pagePath && !url.search);
  await expect(page.getByRole("status").filter({ hasText: "Режим превью" })).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(PUBLISHED_TITLE);
  const cookies = await page.context().cookies();
  expect(cookies.map((cookie) => cookie.name)).not.toContain(PREVIEW_COOKIE);

  // The draft never reached a shared cache: an anonymous visitor still sees the published page.
  const anonymous = await apiContext!.get(pagePath);
  expect(await anonymous.text()).not.toContain(DRAFT_TITLE);
});

test("the exit route accepts POST only and expires the Draft Mode cookie", async () => {
  const get = await apiContext!.get("/api/preview/exit/", { maxRedirects: 0 });
  expect(get.status()).toBe(405);

  const post = await apiContext!.post("/api/preview/exit/", {
    headers: { Referer: `https://evil.invalid${pagePath}` },
    maxRedirects: 0,
  });
  expect(post.status()).toBe(303);
  // A foreign Referer is not trusted: back to the home page.
  expect(post.headers()["location"]).toBe("/");
  const setCookie = post.headers()["set-cookie"] ?? "";
  expect(setCookie).toContain(`${PREVIEW_COOKIE}=;`);
  expect(setCookie).toMatch(/Expires=Thu, 01 Jan 1970/i);
});
