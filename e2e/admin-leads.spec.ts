import { expect, test } from "@playwright/test";
import { skipOnMissingAdmin } from "./helpers/admin";
import {
  adminApi,
  createLead,
  deleteDocs,
  deleteStaffApi,
  findStatusId,
  signInBrowser,
  staffApi,
  uniquePhone,
  uploadLeadPdf,
} from "./helpers/admin-api";
import { clientIpHeaders, uniqueTestIp } from "./helpers/test-ip";
import { VIEWPORTS } from "./helpers/viewports";
import {
  FOREIGN_COMMENT_MESSAGE,
  REFUSE_REASON_REQUIRED_MESSAGE,
} from "../src/payload/hooks/lead-messages";
import type { AdminApi } from "./helpers/admin-api";
import type { Lead } from "../src/payload-types";
import type { APIRequestContext, APIResponse, Locator } from "@playwright/test";

/**
 * Leads admin module (task 32, ТЗ §6.1): list, summary, statuses, assignee job, comments,
 * duplicates, export, report, rights and personal-data erasure. Runs at 1366 only (admin UI),
 * serially: the tests share fixtures created through REST under the e2e admin and removed in
 * `afterAll`. Every fixture is tagged with a per-run marker in `company`.
 */

test.describe.configure({ mode: "serial" });

const RUN = `e2e-leads-${Date.now().toString(36)}`;
const COMPANY = `ООО «${RUN}»`;
const BOM = "﻿";
const EXPORT_HEADER =
  '"Дата создания";"Источник";"Метка источника";"Страница входа";"Компания";"ИНН";"Имя";' +
  '"Телефон";"E-mail";"Роль";"Город";"Площадь, м²";"Тип изделия";"Комментарий";"Статус";' +
  '"Причина отказа";"Ответственный";"Флаги";"Повтор";"utm_source";"utm_medium";"utm_campaign";' +
  '"utm_term";"utm_content";"Client ID";"Файлов";"Ответы"';

/** Today in the company time zone (`YYYY-MM-DD`). */
const todayKey = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Yekaterinburg" }).format(new Date());

type FieldError = { path?: string | undefined; message?: string | undefined };

type PayloadErrorBody = {
  errors?: { name?: string; data?: { errors?: FieldError[] } }[];
};

/**
 * Field errors (`path` + `message`) of a Payload `ValidationError` response. A response without
 * `name`/`data` (e.g. a production bundle with duplicated Payload classes) yields `[]` and fails
 * the caller's `toEqual`, so the admin UI's ability to mark failing fields stays covered.
 */
async function fieldErrorsOf(response: APIResponse): Promise<FieldError[]> {
  const body = (await response.json()) as PayloadErrorBody;
  const [error] = body.errors ?? [];
  expect(error?.name, JSON.stringify(body)).toBe("ValidationError");
  return (error?.data?.errors ?? []).map(({ path, message }) => ({ path, message }));
}

let apiContext: APIRequestContext | undefined;
let admin: AdminApi;
let manager: AdminApi;
let leadA: Lead;
let leadB: Lead;
let leadC: Lead;
let statusNew: string;
let statusRefused: string;
const phoneAB = uniquePhone();
const leadIds = new Set<string>();
const fileIds = new Set<string>();
const orderIds = new Set<string>();

test.beforeAll(async ({ playwright, baseURL }, testInfo) => {
  // Admin UI + shared REST fixtures: one project only (skips every test of the file elsewhere).
  test.skip(testInfo.project.name !== VIEWPORTS.laptop.name, "Admin UI is checked at 1366 only");
  // A context of our own: the `request` fixture of a hook is disposed when the hook ends, but
  // the fixtures and the cleanup in `afterAll` need the API for the whole file.
  apiContext = await playwright.request.newContext({ baseURL: baseURL! });
  try {
    admin = await adminApi(apiContext);
  } catch (error) {
    skipOnMissingAdmin(error);
  }
  manager = await staffApi(admin, "manager");
  statusNew = await findStatusId(admin, "new");
  statusRefused = await findStatusId(admin, "refused");

  const fileId = await uploadLeadPdf(admin);
  fileIds.add(fileId);
  leadA = await createLead(admin, {
    formType: "drawing",
    sourceLabel: "Форма: Отправить чертёж",
    entryPage: "/zakalennoe-steklo/",
    company: COMPANY,
    name: "Иван Первый",
    phone: phoneAB,
    email: `${RUN}-a@example.com`,
    area: 120,
    productType: "tempered",
    flags: ["urgent", "needs_docs"],
    utm: { source: "yandex", medium: "cpc", campaign: RUN },
    metrikaClientId: "1234567890",
    files: [fileId],
  });
  leadB = await createLead(admin, {
    formType: "callback",
    company: COMPANY,
    name: "Иван Повторный",
    phone: phoneAB,
  });
  leadC = await createLead(admin, {
    formType: "quiz",
    company: `${COMPANY} третья`,
    name: "Пётр",
    phone: uniquePhone(),
    area: 30,
    flags: ["small_volume"],
  });
  for (const lead of [leadA, leadB, leadC]) leadIds.add(lead.id);
});

test.afterAll(async () => {
  if (admin) {
    await deleteDocs(admin, "orders", orderIds);
    await deleteDocs(admin, "leads", leadIds);
    await deleteDocs(admin, "lead-files", fileIds);
    if (manager) await deleteStaffApi(admin, manager);
  }
  await apiContext?.dispose();
});

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== VIEWPORTS.laptop.name, "Admin UI is checked at 1366 only");
});

test("list: columns, duplicate badge, quick filters and search", async ({ page, baseURL }) => {
  expect(leadB.isDuplicate).toBe(true);
  expect(leadA.isDuplicate).toBe(false);
  await signInBrowser(page.context(), admin, baseURL!);

  await page.goto(`/admin/collections/leads/?search=${encodeURIComponent(RUN)}`);
  const table = page.locator(".table table");
  await expect(table).toBeVisible();
  const headers = await table.locator("thead th").allInnerTexts();
  for (const label of ["Форма", "Компания", "Имя", "Площадь, м²", "Тип изделия", "Статус"]) {
    expect(
      headers.some((header) => header.includes(label)),
      label
    ).toBe(true);
  }
  expect(headers.some((header) => header.includes("Ответственный"))).toBe(true);
  await expect(table.locator("tbody tr")).toHaveCount(3);

  const rowB = table.locator(`tbody tr[data-id="${leadB.id}"]`);
  await expect(rowB.getByText("Повтор", { exact: true })).toBeVisible();
  await expect(rowB.getByText(phoneAB)).toBeVisible();
  await expect(rowB.getByText("Новая")).toBeVisible();
  const rowA = table.locator(`tbody tr[data-id="${leadA.id}"]`);
  await expect(rowA.getByText("Отправить чертёж", { exact: true })).toBeVisible();
  await expect(rowA.getByText("/zakalennoe-steklo/")).toBeVisible();

  // Quick filter «Дубли»: the URL carries the condition, B is in the list, A is not.
  await page.locator('[data-quick-filter="duplicates"]').click();
  await expect(page).toHaveURL(/where%5BisDuplicate%5D%5Bequals%5D=true|where\[isDuplicate\]/);
  await expect(page.locator(`.table tbody tr[data-id="${leadB.id}"]`)).toBeVisible();
  await expect(page.locator(`.table tbody tr[data-id="${leadA.id}"]`)).toHaveCount(0);

  // Status chip: the URL gets `where[status][equals]` and every row shows that status.
  await page.locator('[data-quick-filter="status-new"]').click();
  await expect(page).toHaveURL(new RegExp(`${statusNew}`));
  const statusCells = page.locator(".table tbody tr td.cell-status");
  await expect(statusCells.first()).toBeVisible();
  const count = await statusCells.count();
  expect(count).toBeGreaterThan(0);
  for (let index = 0; index < count; index += 1) {
    await expect(statusCells.nth(index)).toHaveText("Новая");
  }

  // Search by a part of the phone and by the company name.
  await page.goto(`/admin/collections/leads/?search=${phoneAB.slice(-7)}`);
  await expect(page.locator(`.table tbody tr[data-id="${leadA.id}"]`)).toBeVisible();
  await expect(page.locator(`.table tbody tr[data-id="${leadB.id}"]`)).toBeVisible();
  await page.goto(`/admin/collections/leads/?search=${encodeURIComponent(`${COMPANY} третья`)}`);
  await expect(page.locator(".table tbody tr")).toHaveCount(1);
});

test("status «Отказ» requires a reason; the change creates a version", async () => {
  const versionsPath = `/api/leads/versions/?where[parent][equals]=${leadC.id}&limit=0`;
  const before = (await admin.json<{ totalDocs: number }>(versionsPath)).totalDocs;

  const rejected = await admin.patch(`/api/leads/${leadC.id}/`, { status: statusRefused });
  expect(rejected.status()).toBe(400);
  expect(await fieldErrorsOf(rejected)).toEqual([
    { path: "refuseReason", message: REFUSE_REASON_REQUIRED_MESSAGE },
  ]);

  const saved = await admin.patch(`/api/leads/${leadC.id}/`, {
    status: statusRefused,
    refuseReason: "Дорого",
  });
  expect(saved.status()).toBe(200);
  const after = (await admin.json<{ totalDocs: number }>(versionsPath)).totalDocs;
  expect(after).toBe(before + 1);
});

test("assigning a manager queues exactly one notify-assigned job", async () => {
  const jobsFor = async () => {
    const { docs } = await admin.json<{
      docs: { input?: { leadId?: string; assigneeId?: string } }[];
    }>(
      "/api/payload-jobs/?where[taskSlug][equals]=notify-assigned&limit=200&depth=0&sort=-createdAt"
    );
    return docs.filter((job) => job.input?.leadId === leadA.id);
  };
  expect(await jobsFor()).toHaveLength(0);

  const assigned = await admin.patch(`/api/leads/${leadA.id}/`, { assignee: manager.user.id });
  expect(assigned.status()).toBe(200);
  const jobs = await jobsFor();
  expect(jobs).toHaveLength(1);
  expect(jobs[0]?.input).toEqual({ leadId: leadA.id, assigneeId: manager.user.id });

  const again = await admin.patch(`/api/leads/${leadA.id}/`, { city: "Челябинск" });
  expect(again.status()).toBe(200);
  expect(await jobsFor()).toHaveLength(1);
});

test("comments: author and date are stamped; foreign comments are protected", async () => {
  const added = await manager.patch(`/api/leads/${leadA.id}/`, {
    internalComments: [{ text: "Позвонил клиенту", author: admin.user.id, date: "2000-01-01" }],
  });
  expect(added.status(), await added.text()).toBe(200);
  const [own] = ((await added.json()) as { doc: Lead }).doc.internalComments ?? [];
  expect(own?.text).toBe("Позвонил клиенту");
  const authorId = typeof own?.author === "object" ? own.author?.id : own?.author;
  expect(authorId).toBe(manager.user.id);
  expect(new Date(own?.date ?? 0).getFullYear()).toBeGreaterThan(2020);

  const byAdmin = await admin.patch(`/api/leads/${leadA.id}/`, {
    internalComments: [{ id: own?.id, text: own?.text }, { text: "Комментарий админа" }],
  });
  expect(byAdmin.status()).toBe(200);
  const rows = ((await byAdmin.json()) as { doc: Lead }).doc.internalComments ?? [];
  const adminRow = rows.find((row) => row.text === "Комментарий админа");

  const tampered = await manager.patch(`/api/leads/${leadA.id}/`, {
    internalComments: [
      { id: own?.id, text: own?.text },
      { id: adminRow?.id, text: "Подменил текст" },
    ],
  });
  expect(tampered.status()).toBe(400);
  expect(await fieldErrorsOf(tampered)).toEqual([
    { path: "internalComments", message: FOREIGN_COMMENT_MESSAGE },
  ]);
});

test("summary tab: contacts, flags, UTM, files and repeat requests", async ({
  page,
  baseURL,
  request,
}) => {
  await signInBrowser(page.context(), admin, baseURL!);
  await page.goto(`/admin/collections/leads/${leadA.id}/summary/`);

  const contacts = page.getByRole("region", { name: "Контакты" });
  await expect(contacts.locator(`a[href="tel:${phoneAB}"]`)).toBeVisible();
  await expect(contacts.locator(`a[href="mailto:${RUN}-a@example.com"]`)).toBeVisible();
  // «Флаги» (inside «Обработка»): every flag is a toggle chip, the lead's flags are pressed.
  const flags = page.getByRole("region", { name: "Флаги" });
  await expect(flags.getByRole("button", { name: "Срочно", pressed: true })).toBeVisible();
  await expect(flags.getByRole("button", { name: "Нужны документы", pressed: true })).toBeVisible();
  await expect(flags.getByRole("button", { name: "Малый объём", pressed: false })).toBeVisible();
  // «Откуда пришёл клиент» is collapsed (<details>): open it, then the UTM rows are visible.
  const source = page.getByRole("region", { name: "Откуда пришёл клиент" });
  await source.getByText("Откуда пришёл клиент").click();
  await expect(source.getByText("utm_source")).toBeVisible();
  await expect(source.getByText("yandex")).toBeVisible();
  await expect(source.getByText("1234567890")).toBeVisible();
  await expect(page.getByRole("region", { name: "Повторные обращения" })).toContainText(
    "Есть повторы: 1"
  );

  const [fileId] = fileIds;
  const link = page.getByRole("region", { name: "Файлы" }).getByRole("link", { name: "Скачать" });
  await expect(link).toHaveAttribute("href", `/api/lead-files/${fileId}/download/`);
  const download = await admin.get(`/api/lead-files/${fileId}/download/`);
  expect(download.status()).toBe(200);
  const anonymous = await request.get(`/api/lead-files/${fileId}/download/`);
  expect([401, 403]).toContain(anonymous.status());

  // The duplicate shows its original.
  await page.goto(`/admin/collections/leads/${leadB.id}/summary/`);
  await expect(
    page.getByRole("region", { name: "Повторные обращения" }).getByRole("link", {
      name: "Исходная заявка",
    })
  ).toHaveAttribute("href", `/admin/collections/leads/${leadA.id}/summary/`);
});

test("card: comment is added and shown with author", async ({ page, baseURL }) => {
  const before = (await admin.json<Lead>(`/api/leads/${leadA.id}/?depth=0`)).internalComments ?? [];
  expect(before.length, "comments of the «comments…» test").toBeGreaterThan(0);
  const authorOf = (row: { author?: unknown }) =>
    typeof row.author === "object" && row.author !== null
      ? (row.author as { id?: string }).id
      : row.author;

  await signInBrowser(page.context(), manager, baseURL!);
  await page.goto(`/admin/collections/leads/${leadA.id}/summary/`);
  const comments = page.getByRole("region", { name: "Комментарии", exact: true });
  const text = `${RUN} комментарий`;
  await comments.getByLabel("Внутренний комментарий (клиент его не видит)").fill(text);
  await comments.getByRole("button", { name: "Добавить" }).click();

  const row = comments.getByRole("listitem").filter({ hasText: text });
  await expect(row).toBeVisible();
  await expect(row).toContainText(manager.user.name ?? "");
  await expect(comments.getByLabel("Внутренний комментарий (клиент его не видит)")).toHaveValue("");

  // Server state: the new row is the manager's; earlier rows and their authors are untouched.
  const after = (await admin.json<Lead>(`/api/leads/${leadA.id}/?depth=0`)).internalComments ?? [];
  expect(after).toHaveLength(before.length + 1);
  const added = after.find((comment) => comment.text === text);
  expect(added && authorOf(added)).toBe(manager.user.id);
  for (const old of before) {
    const kept = after.find((comment) => comment.id === old.id);
    expect(kept?.text).toBe(old.text);
    expect(kept && authorOf(kept)).toBe(authorOf(old));
    expect(kept?.date).toBe(old.date);
  }
});

test("card: processing panel saves status and history shows it", async ({ page, baseURL }) => {
  const adminName = admin.user.name ?? "";
  await signInBrowser(page.context(), admin, baseURL!);
  await page.goto(`/admin/collections/leads/${leadB.id}/summary/`);
  const processing = page.getByRole("region", { name: "Обработка" });
  const history = page.getByRole("region", { name: "История", exact: true });
  const save = processing.getByRole("button", { name: "Сохранить" });

  // «Новая» → «В работе»: saved through REST, the version shows up in the history with its author.
  await processing.getByLabel("Статус", { exact: true }).selectOption({ label: "В работе" });
  await save.click();
  await expect(page.getByText("Сохранено", { exact: true })).toBeVisible();
  const toWork = history.getByRole("listitem").filter({ hasText: "Статус: «Новая» → «В работе»" });
  await expect(toWork).toBeVisible();
  await expect(toWork).toContainText(adminName);

  // «Отказ» without a reason is refused by the server rule; with a reason code it is saved.
  await processing.getByLabel("Статус", { exact: true }).selectOption({ label: "Отказ" });
  await save.click();
  await expect(processing.getByText(REFUSE_REASON_REQUIRED_MESSAGE)).toBeVisible();
  await processing.getByLabel("Причина отказа").selectOption({ label: "Дорого" });
  await save.click();
  await expect(
    history
      .getByRole("listitem")
      .filter({ hasText: "Статус: «В работе» → «Отказ» · причина: Дорого" })
  ).toBeVisible();
  const saved = await admin.json<Lead>(`/api/leads/${leadB.id}/?depth=0`);
  expect(saved.status).toBe(statusRefused);
  expect(saved.refuseReasonCode).toBe("expensive");

  // «Назначить себя» saves the assignee at once.
  await processing.getByRole("button", { name: "Назначить себя" }).click();
  await expect(
    history.getByRole("listitem").filter({ hasText: `Ответственный: ${adminName}` })
  ).toBeVisible();
});

test("card: MAX notification rows appear in history", async () => {
  // `notification-log` is written only through the Local API (REST create is denied for
  // everyone), so e2e cannot put rows into it without a dedicated endpoint, which must not exist.
  test.info().annotations.push({
    type: "covered-by",
    description: "проверяется unit-тестом buildLeadTimeline (build-timeline.test.ts, правило 4)",
  });
  test.skip(
    true,
    "notification-log пишется только Local API; проверяется unit-тестом buildLeadTimeline"
  );
});

test("export: CSV and XLSX for a period, access and validation", async ({ request }) => {
  const today = todayKey();
  const csv = await admin.get(
    `/api/admin/leads/export/?format=csv&from=${today}&to=${today}&source=drawing`
  );
  expect(csv.status()).toBe(200);
  expect(csv.headers()["content-type"]).toContain("text/csv");
  expect(csv.headers()["cache-control"]).toContain("no-store");
  const text = (await csv.body()).toString("utf8");
  expect(text.startsWith(BOM)).toBe(true);
  const lines = text.slice(1).trimEnd().split("\r\n");
  expect(lines[0]).toBe(EXPORT_HEADER);
  const count = await admin.json<{ totalDocs: number }>(
    `/api/leads/?limit=0&where[formType][equals]=drawing` +
      `&where[createdAt][greater_than_equal]=${today}T00:00:00%2B05:00`
  );
  expect(lines.length - 1).toBe(count.totalDocs);
  const rowA = lines.find((line) => line.includes(`${RUN}-a@example.com`));
  expect(rowA).toContain(`"${phoneAB}"`);
  expect(rowA).toContain('"Срочно; Нужны документы"');

  const xlsx = await admin.get(`/api/admin/leads/export/?format=xlsx&from=${today}&to=${today}`);
  expect(xlsx.status()).toBe(200);
  expect((await xlsx.body()).subarray(0, 2).toString("latin1")).toBe("PK");

  const empty = await admin.get("/api/admin/leads/export/?from=2000-01-01&to=2000-01-02");
  expect(empty.status()).toBe(200);
  expect((await empty.body()).toString("utf8").slice(1).trimEnd()).toBe(EXPORT_HEADER);

  expect((await admin.get("/api/admin/leads/export/?from=garbage")).status()).toBe(400);
  expect([401, 403]).toContain((await request.get("/api/admin/leads/export/")).status());
  expect((await manager.get(`/api/admin/leads/export/?from=${today}&to=${today}`)).status()).toBe(
    200
  );
});

test("report: counters follow the leads and the period", async ({ page, baseURL }) => {
  await signInBrowser(page.context(), admin, baseURL!);
  const today = todayKey();
  const countToday = async (extra = "") =>
    (
      await admin.json<{ totalDocs: number }>(
        `/api/leads/?limit=0&where[createdAt][greater_than_equal]=${today}T00:00:00%2B05:00${extra}`
      )
    ).totalDocs;

  // The shared database may get leads from parallel specs: a counter must lie between the REST
  // counts taken right before and right after the page was rendered.
  const expectBetween = async (locator: Locator, extra = "") => {
    const before = await countToday(extra);
    await page.reload();
    const after = await countToday(extra);
    const shown = Number((await locator.innerText()).replace(/D/g, ""));
    expect(shown).toBeGreaterThanOrEqual(Math.min(before, after));
    expect(shown).toBeLessThanOrEqual(Math.max(before, after));
  };

  await page.goto(`/admin/leads-report/?period=today`);
  await expectBetween(page.locator('[data-tile="total"] div').nth(1));
  await expectBetween(
    page.locator('[data-report="by-source"] tr[data-source="quiz"] [data-total]'),
    "&where[formType][equals]=quiz"
  );
  const headers = await page.locator('[data-report="by-source"] thead th').allInnerTexts();
  const refusedColumn = headers.indexOf("Отказ") + 1;
  expect(refusedColumn).toBeGreaterThan(0);
  await expectBetween(
    page.locator(`[data-report="by-source"] tr[data-source="quiz"] > :nth-child(${refusedColumn})`),
    `&where[formType][equals]=quiz&where[status][equals]=${statusRefused}`
  );

  await page.goto(`/admin/leads-report/?period=custom&from=2000-01-01&to=2000-01-02`);
  await expect(page.locator('[data-tile="total"]')).toContainText("0");
  await expect(page.locator("[data-export-link]")).toHaveAttribute(
    "href",
    /from=2000-01-01&to=2000-01-02/
  );
});

test("rights: managers cannot delete or erase; anonymous cannot read", async ({
  page,
  baseURL,
  request,
}) => {
  expect((await manager.delete(`/api/leads/${leadC.id}/`)).status()).toBe(403);
  const erase = await manager.post(
    `/api/admin/leads/${leadC.id}/erase/`,
    { confirm: "УДАЛИТЬ" },
    { Origin: new URL(baseURL!).origin }
  );
  expect(erase.status()).toBe(403);
  expect([401, 403]).toContain((await request.get("/api/leads/")).status());

  await signInBrowser(page.context(), manager, baseURL!);
  await page.goto(`/admin/collections/leads/${leadC.id}/`);
  await page.locator(".doc-controls__dots").click();
  await expect(page.locator(".popup__content")).toBeVisible();
  await expect(page.getByText("Удалить персональные данные…")).toHaveCount(0);
});

test("erasure: lead, versions and files go away; consent stays anonymized", async ({
  page,
  baseURL,
  request,
}, testInfo) => {
  const origin = new URL(baseURL!).origin;

  // A public lead (with its consent record) through the real intake API. Token and lead are
  // rate-limited per client IP: a per-test documentation-range IP, not the shared `unknown`.
  const ipHeaders = clientIpHeaders(uniqueTestIp(testInfo));
  const tokenResponse = await request.post("/api/form-token/", { headers: ipHeaders });
  expect(tokenResponse.status(), await tokenResponse.text()).toBe(200);
  const { token } = (await tokenResponse.json()) as { token: string };
  await page.waitForTimeout(3_100); // the form token has a 3-second minimum age
  const email = `${RUN}-erase@example.com`;
  const submitted = await request.post("/api/forms/lead/", {
    headers: ipHeaders,
    data: {
      formType: "contacts",
      name: "Удаляемый",
      phone: uniquePhone(),
      email,
      company: COMPANY,
      entryPage: "/kontakty/",
      consent: true,
      formToken: token,
    },
  });
  expect(submitted.status(), await submitted.text()).toBe(200);
  const { leadId } = (await submitted.json()) as { leadId: string };
  leadIds.add(leadId);

  const fileId = await uploadLeadPdf(admin, "erase-me.pdf");
  fileIds.add(fileId);
  expect((await admin.patch(`/api/leads/${leadId}/`, { files: [fileId] })).status()).toBe(200);
  expect((await admin.patch(`/api/leads/${leadId}/`, { city: "Курган" })).status()).toBe(200);
  const lead = await admin.json<Lead>(`/api/leads/${leadId}/?depth=0`);
  const consentId = typeof lead.consent === "string" ? lead.consent : lead.consent?.id;
  expect(consentId).toBeTruthy();

  // Without the Origin header or the confirmation the request is refused.
  expect(
    (await admin.post(`/api/admin/leads/${leadId}/erase/`, { confirm: "УДАЛИТЬ" })).status()
  ).toBe(403);
  expect(
    (
      await admin.post(`/api/admin/leads/${leadId}/erase/`, { confirm: "да" }, { Origin: origin })
    ).status()
  ).toBe(400);

  const erased = await admin.post(
    `/api/admin/leads/${leadId}/erase/`,
    { confirm: "УДАЛИТЬ" },
    { Origin: origin }
  );
  expect(erased.status(), await erased.text()).toBe(200);
  const body = (await erased.json()) as {
    ok: boolean;
    deleted: { versions: number; files: number; consentAnonymized: number };
  };
  expect(body.ok).toBe(true);
  expect(body.deleted.versions).toBeGreaterThanOrEqual(2);
  expect(body.deleted.files).toBe(1);
  expect(body.deleted.consentAnonymized).toBeGreaterThanOrEqual(1);

  expect((await admin.get(`/api/leads/${leadId}/`)).status()).toBe(404);
  const versions = await admin.json<{ totalDocs: number }>(
    `/api/leads/versions/?where[parent][equals]=${leadId}&limit=0`
  );
  expect(versions.totalDocs).toBe(0);
  expect((await admin.get(`/api/lead-files/${fileId}/`)).status()).toBe(404);
  expect((await admin.get(`/api/lead-files/${fileId}/download/`)).status()).toBe(404);
  const consent = await admin.json<{
    ip?: string | null;
    userAgent?: string | null;
    lead?: unknown;
    anonymizedAt?: string | null;
    consentVersion?: string | null;
  }>(`/api/consent-log/${consentId}/?depth=0`);
  expect(consent.ip ?? null).toBeNull();
  expect(consent.userAgent ?? null).toBeNull();
  expect(consent.lead ?? null).toBeNull();
  expect(consent.anonymizedAt).toBeTruthy();
  expect(consent.consentVersion).toBeTruthy();

  // A lead with an order is kept (409).
  const order = await admin.post("/api/orders/", {
    lead: leadC.id,
    statusHistory: [{ status: "spec_agreed", date: new Date().toISOString() }],
  });
  expect(order.status(), await order.text()).toBe(201);
  orderIds.add(((await order.json()) as { doc: { id: string } }).doc.id);
  const blocked = await admin.post(
    `/api/admin/leads/${leadC.id}/erase/`,
    { confirm: "УДАЛИТЬ" },
    { Origin: origin }
  );
  expect(blocked.status()).toBe(409);
  expect(await blocked.text()).toContain("По заявке есть заказ");
});

test("erase menu item is offered to admins", async ({ page, baseURL }) => {
  await signInBrowser(page.context(), admin, baseURL!);
  await page.goto(`/admin/collections/leads/${leadB.id}/`);
  await page.locator(".doc-controls__dots").click();
  await page.getByText("Удалить персональные данные…").click();
  const dialog = page.getByRole("dialog", { name: "Удалить персональные данные" });
  await expect(dialog).toBeVisible();
  const confirm = dialog.getByRole("button", { name: "Удалить данные" });
  await expect(confirm).toBeDisabled();
  await dialog.getByRole("textbox").fill("УДАЛИТЬ");
  await expect(confirm).toBeEnabled();
  await dialog.getByRole("button", { name: "Отмена" }).click();
  await expect(dialog).toHaveCount(0);
});
