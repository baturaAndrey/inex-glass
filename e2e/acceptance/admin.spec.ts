import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, test } from "@playwright/test";
import sharp from "sharp";
import {
  createTestLead,
  eraseLead,
  eraseLeads,
  lexicalDoc,
  okJson,
  shortTag,
  staffContext,
} from "../helpers/acceptance-admin";
import { onlyProject } from "../helpers/acceptance-env";
import { loginAdmin, skipOnMissingAdmin } from "../helpers/admin";
import { dateKey, PDF_BYTES } from "../helpers/orders-fixtures";
import type { APIRequestContext, TestInfo } from "@playwright/test";

/**
 * Acceptance scenario 11 (task 42): the admin.
 *
 * - An article: draft (not public) → publish (date required) → `/blog/<slug>/` → delete → 404.
 * - An object: publish of an empty draft is refused with the required-on-publish messages (REST
 *   and in the admin UI); filled in (city, type, products, year, task, spec, photo with alt) it
 *   publishes → `/obekty/<slug>/`.
 * - Preview: pages answer `X-Frame-Options: SAMEORIGIN` and can be framed by the site itself;
 *   the page form offers «Предпросмотр» → `/api/preview/?path=…` (Draft Mode, admin redesign
 *   task 11; the full flow is in `e2e/preview.spec.ts`). Payload live preview
 *   (`admin.livePreview`, the in-admin iframe) is still not configured: out of scope.
 * - A 52 MiB PDF uploads in the admin (`media`, `order-files`); a bigger one is refused.
 * - Lead erase (152-ФЗ): the lead, its versions and its file (record + file on disk) are gone.
 *
 * Mutates shared data (TEST documents, cleaned up): desktop-1366 only; tests are independent.
 * Disk checks need the server's uploads dir: `ACCEPTANCE_UPLOADS_DIR`, or the local stand's
 * `.data/w8/lead-files` when testing localhost; otherwise they are `[ЧЕЛОВЕК]`.
 */

const MIB = 1024 * 1024;
const ADMIN_MAX_FILE = 52 * MIB;
const DELETE_ATTEMPTS = 3;
const OBJECT_PUBLISH_MESSAGES = [
  "Для публикации опишите задачу объекта",
  "Для публикации добавьте хотя бы одно фото",
] as const;

test.describe.configure({ timeout: 600_000 });

let api: APIRequestContext;
let token: string;
let siteURL: string;
const created: { collection: string; id: string }[] = [];
const leads = new Set<string>();
let tmpDir: string | null = null;

test.beforeAll(async ({ request, baseURL }) => {
  siteURL = baseURL ?? "";
  try {
    token = (await loginAdmin(request)).token;
  } catch (error) {
    skipOnMissingAdmin(error);
  }
  api = await staffContext(siteURL, token);
});

test.afterAll(async () => {
  test.setTimeout(300_000);
  if (api) {
    await eraseLeads(api, leads);
    // Documents before the uploads they reference.
    const uploads = new Set(["media", "order-files", "lead-files"]);
    const ordered = [
      ...created.filter((doc) => !uploads.has(doc.collection)),
      ...created.filter((doc) => uploads.has(doc.collection)),
    ];
    const leftovers: string[] = [];
    for (const { collection, id } of ordered) {
      // Deleting an upload occasionally fails on Windows while a file handle is still open.
      let gone = false;
      for (let attempt = 1; attempt <= DELETE_ATTEMPTS && !gone; attempt++) {
        const response = await api.delete(`/api/${collection}/${id}/`).catch(() => null);
        gone = Boolean(response && (response.ok() || response.status() === 404));
        if (!gone) await new Promise((resolve) => setTimeout(resolve, 1_500 * attempt));
      }
      if (!gone) leftovers.push(`${collection}/${id}`);
    }
    if (leftovers.length > 0) console.warn(`[admin.spec] not cleaned up: ${leftovers.join(", ")}`);
    await api.dispose();
  }
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
});

test.beforeEach(({}, testInfo) =>
  onlyProject(testInfo, undefined, "admin scenarios mutate shared data: desktop-1366 only")
);

/** First document id of a collection (seeded taxonomies). */
async function firstId(collection: string): Promise<string> {
  const body = await okJson<{ docs: { id: string }[] }>(
    await api.get(`/api/${collection}/?limit=1&depth=0`),
    collection
  );
  const id = body.docs[0]?.id;
  if (!id) throw new Error(`no ${collection} on the stand (seed --full)`);
  return id;
}

/** Validation messages of a Payload REST error body. */
async function errorMessages(response: { text(): Promise<string> }): Promise<string> {
  return response.text();
}

function uploadsDir(): string | null {
  if (process.env.ACCEPTANCE_UPLOADS_DIR) return process.env.ACCEPTANCE_UPLOADS_DIR;
  const local = path.resolve(".data", "w8", "lead-files");
  return new URL(siteURL).hostname === "localhost" && existsSync(local) ? local : null;
}

function manualDisk(testInfo: TestInfo, what: string) {
  testInfo.annotations.push({
    type: "[ЧЕЛОВЕК]",
    description: `Проверить на сервере: ${what} (каталог загрузок недоступен тесту — ACCEPTANCE_UPLOADS_DIR)`,
  });
}

test("11a. article: draft → publish (date required) → public → delete", async ({
  page,
  request,
}) => {
  const tag = shortTag();
  const slug = `test-priemka-${tag}`;
  const title = `TEST Приёмка: статья ${tag}`;
  const draft = await okJson<{ doc: { id: string } }>(
    await api.post("/api/articles/?draft=true", {
      data: {
        title,
        slug,
        _status: "draft",
        body: lexicalDoc(["Тестовая статья приёмки. Будет удалена после проверки."]),
      },
    }),
    "create article draft"
  );
  const id = draft.doc.id;
  created.push({ collection: "articles", id });

  expect((await request.get(`/blog/${slug}/`)).status(), "draft is not public").toBe(404);

  const noDate = await api.patch(`/api/articles/${id}/`, { data: { _status: "published" } });
  expect(noDate.status(), "publish without datePublished").toBe(400);
  expect(await errorMessages(noDate)).toContain("Укажите дату публикации");

  const published = await api.patch(`/api/articles/${id}/`, {
    data: { _status: "published", datePublished: `${dateKey()}T12:00:00.000Z` },
  });
  expect(published.status(), await published.text()).toBe(200);

  const response = await page.goto(`/blog/${slug}/`);
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);

  // The admin edit view opens for it (admin session cookie).
  await page.context().addCookies([{ name: "payload-token", value: token, url: siteURL }]);
  await page.goto(`/admin/collections/articles/${id}/`, { timeout: 120_000 });
  await expect(page.locator('input[name="title"]')).toHaveValue(title, { timeout: 60_000 });

  expect((await api.delete(`/api/articles/${id}/`)).status()).toBe(200);
  created.pop();
  expect((await request.get(`/blog/${slug}/`)).status(), "deleted article").toBe(404);
});

test("11b. object: publish validation (REST + admin UI), then a full object publishes", async ({
  page,
  request,
}) => {
  const tag = shortTag();
  const slug = `test-priemka-${tag}`;
  const name = `TEST Приёмка: объект ${tag}`;
  const draft = await okJson<{ doc: { id: string } }>(
    await api.post("/api/objects/?draft=true", { data: { name, slug, _status: "draft" } }),
    "create object draft"
  );
  const id = draft.doc.id;
  created.push({ collection: "objects", id });

  const refused = await api.patch(`/api/objects/${id}/`, { data: { _status: "published" } });
  expect(refused.status(), "publish of an empty object").toBe(400);
  const refusal = await errorMessages(refused);
  for (const message of OBJECT_PUBLISH_MESSAGES) expect(refusal).toContain(message);

  // Same rule in the admin UI: «Опубликовать изменения» shows the field errors.
  await page.context().addCookies([{ name: "payload-token", value: token, url: siteURL }]);
  await page.goto(`/admin/collections/objects/${id}/`, { timeout: 120_000 });
  await expect(page.locator('input[name="name"]')).toHaveValue(name, { timeout: 60_000 });
  await page
    .getByRole("button", { name: /^Опубликовать/ })
    .first()
    .click();
  await expect(page.getByText(/Для публикации/).first()).toBeVisible({ timeout: 30_000 });
  await test.info().attach("object-publish-validation", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });

  // Fill everything in and publish.
  const photo = await sharp({
    create: { width: 1200, height: 800, channels: 3, background: { r: 38, g: 125, b: 112 } },
  })
    .jpeg({ quality: 70 })
    .toBuffer();
  const media = await okJson<{ doc: { id: string } }>(
    await api.post("/api/media/", {
      multipart: {
        file: { name: `test-priemka-${tag}.jpg`, mimeType: "image/jpeg", buffer: photo },
        _payload: JSON.stringify({ alt: `TEST фото объекта ${tag}` }),
      },
    }),
    "upload object photo"
  );
  created.push({ collection: "media", id: media.doc.id });

  const publish = await api.patch(`/api/objects/${id}/`, {
    data: {
      _status: "published",
      city: await firstId("cities"),
      objectType: await firstId("object-types"),
      products: [await firstId("products")],
      year: 2024,
      task: `Тестовая задача объекта ${tag}.`,
      spec: [{ product: "Перегородки", thickness: "10", kind: "закалённое" }],
      photos: [{ image: media.doc.id, alt: `TEST фото объекта ${tag}` }],
    },
  });
  expect(publish.status(), await publish.text()).toBe(200);
  const response = await request.get(`/obekty/${slug}/`);
  expect(response.status(), "published object page").toBe(200);
  expect(await response.text()).toContain(name);
});

test("11c. preview: pages are framed by the site itself and the draft preview works", async ({
  page,
  request,
}) => {
  for (const url of ["/", "/zakalennoe-steklo/10-mm/", "/admin/login/"]) {
    const response = await request.get(url);
    expect(response.headers()["x-frame-options"], url).toBe("SAMEORIGIN");
  }
  // A same-origin frame renders (what an in-admin preview would rely on).
  await page.goto("/kontakty/");
  const title = await page.evaluate(
    () =>
      new Promise<string>((resolve, reject) => {
        const frame = document.createElement("iframe");
        frame.src = "/zakalennoe-steklo/10-mm/";
        frame.style.width = "800px";
        frame.style.height = "600px";
        frame.onload = () => resolve(frame.contentDocument?.title ?? "");
        frame.onerror = () => reject(new Error("frame failed"));
        document.body.appendChild(frame);
      })
  );
  expect(title).toContain("10 мм");

  // Draft preview (admin redesign, task 11): the page form offers «Предпросмотр» …
  const home = await okJson<{ docs: { id: string }[] }>(
    await api.get("/api/pages/?where[path][equals]=%2F&limit=1&depth=0"),
    "home page"
  );
  const homeId = home.docs[0]?.id;
  if (!homeId) throw new Error("no home page on the stand (seed --full)");
  await page.context().addCookies([{ name: "payload-token", value: token, url: siteURL }]);
  await page.goto(`/admin/collections/pages/${homeId}/`);
  const previewButton = page.locator("#preview-button");
  await expect(previewButton).toBeVisible({ timeout: 30_000 });
  await expect(previewButton).toHaveAttribute("aria-label", "Предпросмотр");
  const href = (await previewButton.getAttribute("href")) ?? "";
  expect(href).toContain("/api/preview/?path=%2F");

  // … whose URL enables Draft Mode for staff and redirects to the page.
  const response = await api.get(href, { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(response.headers()["location"]).toBe("/");
  expect(response.headers()["set-cookie"] ?? "").toContain("__prerender_bypass");
});

test("11d. a PDF up to 52 MiB uploads in the admin; a bigger one is refused", async () => {
  tmpDir = mkdtempSync(path.join(os.tmpdir(), "inex-acceptance-pdf-"));
  /** A minimal PDF of exactly `size` bytes: header, padding, xref + `%%EOF` (Payload checks both). */
  const makePdf = (size: number) => {
    const buffer = Buffer.alloc(size, 0x20);
    Buffer.from("%PDF-1.4\n% TEST acceptance upload\n", "latin1").copy(buffer, 0);
    const tail = Buffer.from(
      "\nxref\n0 1\n0000000000 65535 f \ntrailer<</Size 1>>\nstartxref\n0\n%%EOF\n",
      "latin1"
    );
    tail.copy(buffer, size - tail.length);
    return buffer;
  };
  const upload = async (
    collection: "media" | "order-files",
    buffer: Buffer,
    label: string,
    context: APIRequestContext = api
  ) => {
    const response = await context.post(`/api/${collection}/`, {
      multipart: {
        file: { name: `test-priemka-${label}.pdf`, mimeType: "application/pdf", buffer },
        _payload: JSON.stringify(
          collection === "media" ? { alt: `TEST PDF ${label}` } : { kind: "document" }
        ),
      },
      timeout: 300_000,
    });
    if (response.ok()) {
      const doc = ((await response.json()) as { doc: { id: string; filesize?: number } }).doc;
      created.push({ collection, id: doc.id });
      return { status: response.status(), text: "", filesize: doc.filesize };
    }
    return { status: response.status(), text: await response.text(), filesize: undefined };
  };

  // Just under the limit, written to a temp file like a real upload source (never committed).
  const nearLimitPath = path.join(tmpDir, "test-52mib.pdf");
  writeFileSync(nearLimitPath, makePdf(ADMIN_MAX_FILE - 1024));
  const nearLimit = readFileSync(nearLimitPath);
  for (const collection of ["media", "order-files"] as const) {
    const result = await upload(collection, nearLimit, "52mib");
    expect(result.status, `${collection} 52 MiB − 1 KiB: ${result.text}`).toBe(201);
    expect(result.filesize).toBe(nearLimit.length);
  }

  // «до 52 МиБ» includes exactly 52 MiB (soft, so the over-limit check below still runs).
  const exact = await upload("media", makePdf(ADMIN_MAX_FILE), "52mib-exact");
  expect.soft(exact.status, `exactly 52 MiB: ${exact.text}`).toBe(201);

  // The server answers 413 and drops the connection mid-body: a throwaway context keeps the
  // reset keep-alive socket away from the shared `api` (next test: ECONNRESET otherwise).
  const oversizeContext = await staffContext(siteURL, token);
  try {
    const tooBig = await upload("media", makePdf(ADMIN_MAX_FILE + MIB), "53mib", oversizeContext);
    expect(tooBig.status, "a 53 MiB file is refused").toBe(413);
  } finally {
    await oversizeContext.dispose();
  }
});

test("11e. lead erase removes the lead, its versions and its file (record and disk)", async ({
  request,
}, info) => {
  const tag = shortTag();
  const pdf = PDF_BYTES;
  const file = await okJson<{ doc: { id: string; filename: string } }>(
    await api.post("/api/lead-files/", {
      multipart: {
        file: { name: `test-priemka-${tag}.pdf`, mimeType: "application/pdf", buffer: pdf },
        _payload: JSON.stringify({
          originalName: `test-priemka-${tag}.pdf`,
          kind: "pdf",
          source: "form",
        }),
      },
    }),
    "upload lead file"
  );
  const lead = await createTestLead(api, { tag, files: [file.doc.id] });
  leads.add(lead.id);
  // A second save → at least two versions in `_leads_v`.
  await okJson(
    await api.patch(`/api/leads/${lead.id}/`, { data: { company: `ООО «TEST ${tag} v2»` } }),
    "update lead"
  );
  const versions = async () =>
    (
      await okJson<{ totalDocs: number }>(
        await api.get(`/api/leads/versions/?where[parent][equals]=${lead.id}&limit=1&depth=0`),
        "lead versions"
      )
    ).totalDocs;
  expect(await versions()).toBeGreaterThanOrEqual(1);
  expect((await api.get(`/api/lead-files/${file.doc.id}/download/`)).status()).toBe(200);

  const dir = uploadsDir();
  const onDisk = dir ? path.join(dir, "leads", file.doc.filename) : null;
  if (onDisk) expect(existsSync(onDisk), `${onDisk} before erase`).toBe(true);
  else manualDisk(info, "файл заявки удалён из UPLOADS_DIR/leads после erase");

  const erased = await eraseLead(api, lead.id);
  expect(erased.status(), await erased.text()).toBe(200);
  const result = (await erased.json()) as { deleted: { versions: number; files: number } };
  expect(result.deleted.files).toBe(1);
  expect(result.deleted.versions).toBeGreaterThanOrEqual(1);
  leads.delete(lead.id);

  expect((await api.get(`/api/leads/${lead.id}/`)).status()).toBe(404);
  expect(await versions()).toBe(0);
  expect((await api.get(`/api/lead-files/${file.doc.id}/`)).status()).toBe(404);
  expect([403, 404]).toContain(
    (await api.get(`/api/lead-files/${file.doc.id}/download/`)).status()
  );
  expect([401, 403, 404]).toContain(
    (await request.get(`/api/lead-files/${file.doc.id}/download/`)).status()
  );
  if (onDisk) expect(existsSync(onDisk), `${onDisk} after erase`).toBe(false);
});
