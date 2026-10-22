import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect as baseExpect, test } from "@playwright/test";
import {
  annotateManualMail,
  EXPECT_ENV,
  MAIL_INTERCEPT_TO,
  expectedSubject,
  onlyProject,
  testTag,
} from "../helpers/acceptance-env";
import {
  contactsLead,
  declaredOversizeUpload,
  eraseLeads,
  issueFormToken,
  LEAD_RATE_LIMIT,
  leadsByCompany,
  submitLead,
  TEST_PREFIX,
  uploadRaw,
  waitTokenAge,
} from "../helpers/acceptance-leads";
import { skipOnMissingAdmin } from "../helpers/admin";
import { adminApi, signInBrowser, uniquePhone } from "../helpers/admin-api";
import { Mailpit, mailLinks, mailText } from "../helpers/mailpit";
import { clientIpHeaders, uniqueTestIp } from "../helpers/test-ip";
import { VIEWPORTS } from "../helpers/viewports";
import type { Lead, LeadFile } from "../../src/payload-types";
import type { AdminApi } from "../helpers/admin-api";
import type { APIRequestContext, Locator, Page, TestInfo } from "@playwright/test";

/**
 * Acceptance scenarios 1–4 of task 42 (ТЗ §6, §6.1): quiz → lead → admin → manager mail; file
 * limits on the client and the server; anti-spam (honeypot, 3-second token, per-IP rate limit
 * that a forged `X-Forwarded-For` prefix cannot bypass); duplicate highlighting.
 *
 * Widths: the UI quiz path (7 steps, upload, consent, success screen) runs at every width. Only
 * desktop-1366 submits a REAL lead and checks the admin card, the file download and the mail:
 * what the server stores does not depend on the viewport, and three real leads per run would
 * triple the mail and the rate-limit budget. 375/1920 answer the submission with `route.fulfill`
 * after asserting the request body. The pure API scenarios (2 server side, 3, 4) run at 1366 only.
 *
 * Data: every lead is a `TEST <tag>` company and is erased through the admin erase route
 * (`afterAll`), which also removes its files and versions. Mail checks need `MAILPIT_URL`;
 * without it they are annotated `[ЧЕЛОВЕК]`.
 */

const expect = baseExpect.configure({ timeout: 20_000 });
test.describe.configure({ timeout: 240_000 });
test.use({ navigationTimeout: 90_000, actionTimeout: 30_000 });

const QUIZ_PAGE = "/raschet-stoimosti/";
const LANDING = "/tripleks/";
const UTM_QUERY = "utm_source=test&utm_medium=cpc";
const CONSENT_KEY = "inex-consent-v1";
const CLIENT_ID = "1700000000123456789";
const THANKS = "Спасибо, заявка принята";

/** teksty/05-kviz.md «Ошибки формы» — verbatim. */
const SIZE_TEXT = "Файл больше 50 МБ. Сожмите его или пришлите ссылку в комментарии";
const FORMAT_TEXT = "Подойдут DWG, DXF, PDF, JPG или PNG";

const MIB = 1024 * 1024;
const OVER_LIMIT_BYTES = 50 * MIB + 1;

const DWG_FIXTURE = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "fixtures",
  "acceptance",
  "test-drawing.dwg"
);
const DWG_BYTES = readFileSync(DWG_FIXTURE);
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const RUN = testTag();
const isLaptop = (testInfo: TestInfo) => testInfo.project.name === VIEWPORTS.laptop.name;

// ---------------------------------------------------------------------------------------------
// Shared state: admin session and the leads to erase
// ---------------------------------------------------------------------------------------------

let apiContext: APIRequestContext | undefined;
let admin: AdminApi | undefined;
let mailpit: Mailpit | null = null;
const createdLeads = new Set<string>();
const mailIds: string[] = [];

async function getAdmin(): Promise<AdminApi> {
  if (!admin) throw new Error("admin session is not ready");
  return admin;
}

test.beforeAll(async ({ playwright, baseURL }) => {
  apiContext = await playwright.request.newContext({ baseURL: baseURL! });
  try {
    admin = await adminApi(apiContext);
  } catch (error) {
    skipOnMissingAdmin(error);
  }
  mailpit = await Mailpit.connect();
});

test.afterAll(async ({ baseURL }) => {
  test.setTimeout(180_000);
  if (admin && createdLeads.size > 0) {
    const failures = await eraseLeads(admin, new URL(baseURL!).origin, createdLeads);
    if (failures.length > 0) console.warn(`[lead-flow] erase failures:\n${failures.join("\n")}`);
  }
  if (mailpit) {
    // Notifications of the API-created TEST leads of this run (best effort).
    const extra = await mailpit.search(`subject:"${RUN}"`).catch(() => []);
    await mailpit.deleteMessages([...mailIds, ...extra.map((message) => message.ID)]);
    await mailpit.dispose();
  }
  await apiContext?.dispose();
});

// ---------------------------------------------------------------------------------------------
// Quiz UI helpers
// ---------------------------------------------------------------------------------------------

const quiz = (page: Page) => page.locator("[data-slot=quiz]");

async function next(page: Page) {
  await quiz(page).getByRole("button", { name: "Далее", exact: true }).click();
}

async function expectStep(page: Page, n: number, title: string) {
  await expect(quiz(page).getByRole("progressbar", { name: "Прогресс" })).toHaveAttribute(
    "aria-valuenow",
    String(n)
  );
  await expect(
    quiz(page).getByRole("heading", { level: 2, name: title, exact: true })
  ).toBeVisible();
}

const radio = (scope: Locator, group: string | RegExp, name: string | RegExp) =>
  scope.getByRole("radiogroup", { name: group }).getByRole("radio", { name });

/** Tomorrow in the company time zone, typed as `ддммгггг` (a triplex order then is urgent). */
function tomorrowDigits(): string {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Asia/Yekaterinburg",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
    .format(new Date(Date.now() + 24 * 60 * 60 * 1000))
    .replace(/\D/g, "");
}

/**
 * Consent «all» with a recording Metrika stub (tag.js itself is aborted: no real network), so the
 * lead carries a client id; a per-test client IP for the rate-limited intake API.
 */
async function prepareVisitor(page: Page, testInfo: TestInfo) {
  await page.setExtraHTTPHeaders(clientIpHeaders(uniqueTestIp(testInfo)));
  await page.route(/^https:\/\/mc\.yandex\.(ru|com)\//, (route) => route.abort());
  await page.addInitScript(
    ([consentKey, clientId]) => {
      try {
        window.localStorage.setItem(consentKey!, "all");
      } catch {
        // storage blocked: the banner just stays.
      }
      const w = window as unknown as {
        __INEX_YM_ID__: number;
        ym: (...args: unknown[]) => void;
      };
      w.__INEX_YM_ID__ = 1;
      w.ym = (...args: unknown[]) => {
        if (args[1] === "getClientID" && typeof args[2] === "function") {
          (args[2] as (id: string) => void)(clientId!);
        }
      };
    },
    [CONSENT_KEY, CLIENT_ID]
  );
}

/** Arrives with UTM tags on the landing page, then opens the quiz page (session attribution). */
async function openQuizFromLanding(page: Page) {
  await page.goto(`${LANDING}?${UTM_QUERY}`, { waitUntil: "load" });
  await expect(page.locator("main h1").first()).toBeVisible();
  const token = page.waitForResponse((response) => response.url().includes("/api/form-token/"), {
    timeout: 120_000,
  });
  await page.goto(`${QUIZ_PAGE}?src=${encodeURIComponent(LANDING)}`, { waitUntil: "load" });
  await token;
  await expect(quiz(page).getByText("Шаг 1 из 7")).toBeVisible();
  return Date.now();
}

interface QuizRun {
  company: string;
  phone: string;
  loadedAt: number;
}

/** Steps 1–7 of scenario 1: triplex 6+6 / 0.76, 80 m², 3500×1200, holes, DWG, urgent date. */
async function walkQuiz(page: Page, testInfo: TestInfo): Promise<QuizRun> {
  const loadedAt = await openQuizFromLanding(page);
  const q = quiz(page);

  await q.getByRole("radio", { name: "Триплекс" }).click();
  await next(page);

  await expectStep(page, 2, "Какое стекло?");
  await radio(q, "Стекло 1", "6 мм").click();
  await radio(q, "Стекло 2", "6 мм").click();
  await radio(q, "Плёнка EVA", "0,76 мм").click();
  await expect(page.locator("[data-slot=quiz-triplex-summary]")).toContainText(/6\+6/);
  const kinds = q.getByRole("radiogroup", { name: "Вид" });
  if ((await kinds.count()) > 0) await radio(q, "Вид", "Прозрачное").click();
  await next(page);

  await expectStep(page, 3, "Объём и размеры");
  await q.getByLabel("Площадь, м²").fill("80");
  await q.getByLabel("Ширина, мм").fill("3500");
  await q.getByLabel("Высота, мм").fill("1200");
  await expect(q.getByText(/Нестандартный размер/)).toBeVisible();
  // Triplex has no price estimate (ТЗ §6: the estimate is for single glass only).
  await expect(page.locator("[data-slot=quiz-estimate]")).toHaveCount(0);
  await next(page);

  await expectStep(page, 4, "Обработка");
  await radio(q, "Отверстия", "есть").click();
  await q.getByLabel("Количество").fill("4");
  await q.getByLabel("Диаметры, мм").fill("12, 16");
  await expect(page.locator("#quiz-hint-holes")).toBeVisible();
  await next(page);

  await expectStep(page, 5, "Чертёж");
  const upload = page.waitForResponse((response) => response.url().includes("/api/upload/"), {
    timeout: 120_000,
  });
  await page.locator("input[type=file]").setInputFiles(DWG_FIXTURE);
  expect((await upload).status()).toBe(200);
  await expect(page.locator(".ig-file__name")).toContainText("test-drawing.dwg");
  await next(page);

  await expectStep(page, 6, "Сроки и доставка");
  await q.getByLabel("К какой дате нужно стекло?").pressSequentially(tomorrowDigits());
  await expect(q.getByText(/Срочного изготовления нет/)).toBeVisible();
  await radio(q, "Город доставки", "Екатеринбург").click();
  await radio(q, /Нужен пакет документов/, "да").click();
  await next(page);

  await expectStep(page, 7, "Контакты");
  const company = `${TEST_PREFIX} ${RUN} квиз ${testInfo.project.name}`;
  const phone = uniquePhone();
  await q.getByLabel("Компания").fill(company);
  await q.getByLabel("Имя").fill(`${TEST_PREFIX} Приёмка`);
  await q.getByLabel("Телефон").pressSequentially(phone.slice(2));
  const consent = q.getByRole("checkbox");
  // ТЗ §6: consent is NOT pre-checked and blocks the submission.
  await expect(consent).not.toBeChecked();
  await expect(q.getByRole("button", { name: "Получить КП" })).toHaveAttribute(
    "aria-disabled",
    "true"
  );
  await consent.check();
  return { company, phone, loadedAt };
}

/** Submits step 7 and returns the request body and the server answer. */
async function submitQuiz(page: Page, run: QuizRun, fulfill: boolean) {
  let body: Record<string, unknown> | null = null;
  await page.route("**/api/forms/lead/", async (route) => {
    body = route.request().postDataJSON() as Record<string, unknown>;
    if (fulfill) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: '{"ok":true,"leadId":"fulfilled"}',
      });
    } else {
      await route.continue();
    }
  });
  const left = 3_100 - (Date.now() - run.loadedAt);
  if (left > 0) await page.waitForTimeout(left);
  const response = page.waitForResponse((r) => r.url().includes("/api/forms/lead/"), {
    timeout: 120_000,
  });
  await quiz(page).getByRole("button", { name: "Получить КП" }).click();
  const answer = await response;
  expect(answer.status(), await answer.text()).toBe(200);
  const json = (await answer.json()) as { ok: boolean; leadId?: string };
  expect(json.ok).toBe(true);
  await expect(quiz(page).getByRole("heading", { name: THANKS })).toBeVisible();
  return { body: body as Record<string, unknown> | null, leadId: json.leadId };
}

// ---------------------------------------------------------------------------------------------
// Scenario 1: quiz → lead → admin → mail
// ---------------------------------------------------------------------------------------------

test.describe("scenario 1 — quiz lead end to end", () => {
  test("7 steps, DWG, consent, success; admin card, file access, manager mail", async ({
    page,
    request,
    baseURL,
  }, testInfo) => {
    await prepareVisitor(page, testInfo);
    const run = await walkQuiz(page, testInfo);
    const real = isLaptop(testInfo);
    const { body, leadId } = await submitQuiz(page, run, !real);
    await testInfo.attach(`success-${testInfo.project.name}`, {
      body: await quiz(page).screenshot(),
      contentType: "image/png",
    });

    // Request body (every width).
    expect(body).not.toBeNull();
    const sent = body!;
    expect(sent).toMatchObject({
      formType: "quiz",
      consent: true,
      company_website: "",
      entryPage: LANDING,
      utm: { source: "test", medium: "cpc" },
      metrikaClientId: CLIENT_ID,
    });
    expect(sent.uploadTokens).toHaveLength(1);
    expect(sent.answers).toMatchObject({
      type: "triplex",
      area: 80,
      maxW: 3500,
      maxH: 1200,
      holes: { has: true, count: 4, diameters: [12, 16] },
      needDocs: true,
      city: "Екатеринбург",
    });

    if (!real) {
      testInfo.annotations.push({
        type: "note",
        description: "UI path only at this width; the stored lead is checked at desktop-1366",
      });
      return;
    }

    // ---- Stored lead (admin REST) ----
    const api = await getAdmin();
    expect(leadId).toBeTruthy();
    createdLeads.add(leadId!);
    const lead = await api.json<Lead>(`/api/leads/${leadId}/?depth=1`);
    expect(lead).toMatchObject({
      formType: "quiz",
      sourceLabel: "Квиз",
      company: run.company,
      name: `${TEST_PREFIX} Приёмка`,
      productType: "triplex",
      area: 80,
      city: "Екатеринбург",
      entryPage: LANDING,
      metrikaClientId: CLIENT_ID,
    });
    expect(String(lead.phone).replace(/\D/g, "")).toBe(run.phone.replace(/\D/g, ""));
    expect(lead.utm).toMatchObject({ source: "test", medium: "cpc" });
    expect([...(lead.flags ?? [])].sort()).toEqual(
      ["needs_docs", "nonstandard_size", "urgent"].sort()
    );
    const answers = lead.answers as Record<string, unknown>;
    expect(answers).toMatchObject({
      type: "triplex",
      triplex: { glass1: 6, glass2: 6, film: 0.76 },
      area: 80,
      holes: { has: true, count: 4, diameters: [12, 16] },
      file: { name: "test-drawing.dwg" },
    });
    expect(JSON.stringify(answers)).not.toContain("uploadToken");
    expect(lead.files).toHaveLength(1);
    const file = lead.files![0] as LeadFile;
    expect(file.originalName).toBe("test-drawing.dwg");

    // ---- File: admin downloads, anonymous does not ----
    const download = await api.get(`/api/lead-files/${file.id}/download/`);
    expect(download.status()).toBe(200);
    expect(download.headers()["content-disposition"]).toContain("attachment");
    expect(Buffer.compare(await download.body(), DWG_BYTES)).toBe(0);
    const anonymous = await request.get(`/api/lead-files/${file.id}/download/`);
    expect([401, 403]).toContain(anonymous.status());
    expect((await anonymous.body()).includes(DWG_BYTES.subarray(0, 6))).toBe(false);

    // ---- Admin UI: the card shows flags and attribution ----
    await signInBrowser(page.context(), api, baseURL!);
    await page.goto(`/admin/collections/leads/${leadId}/summary/`);
    const flags = page.getByRole("region", { name: "Флаги" });
    for (const flag of ["Нестандартный размер", "Срочно", "Нужны документы"]) {
      await expect(flags.getByRole("button", { name: flag, pressed: true })).toBeVisible();
    }
    // «Откуда пришёл клиент» is collapsed (<details>): open it before checking the UTM rows.
    const source = page.getByRole("region", { name: "Откуда пришёл клиент" });
    await source.getByText("Откуда пришёл клиент").click();
    await expect(source.getByText("test", { exact: true })).toBeVisible();
    await expect(source.getByText("cpc", { exact: true })).toBeVisible();
    await expect(source.getByText(CLIENT_ID)).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Файлы" }).getByRole("link", { name: "Скачать" })
    ).toHaveAttribute("href", `/api/lead-files/${file.id}/download/`);
    await testInfo.attach("admin-lead-summary", {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });

    // ---- Manager mail in the interceptor ----
    if (!mailpit) {
      annotateManualMail(testInfo, `письмо менеджеру «Новая заявка: Квиз — ${run.company}»`);
      return;
    }
    const settings = await api.json<{
      notifications?: { leadNotifyEmails?: { email: string }[] | null } | null;
    }>("/api/globals/site-settings/?depth=0");
    const configured = (settings.notifications?.leadNotifyEmails ?? []).map((row) => row.email);
    const expectedTo = MAIL_INTERCEPT_TO ? [MAIL_INTERCEPT_TO] : configured;
    expect(expectedTo.length, "recipients of new-lead mails are configured").toBeGreaterThan(0);

    const mail = await mailpit.waitFor(`subject:"${run.company}"`);
    mailIds.push(mail.ID);
    expect(mail.Subject).toBe(expectedSubject(`Новая заявка: Квиз — ${run.company}`, configured));
    const to = mail.To.map((address) => address.Address.toLowerCase());
    for (const address of expectedTo) expect(to).toContain(address.toLowerCase());
    const text = mailText(mail.HTML);
    for (const value of ["Источник", "Квиз", "Страница входа", LANDING, run.company, "80"]) {
      expect(text, `mail table contains «${value}»`).toContain(value);
    }
    expect(mail.HTML).toMatch(/<table/i);
    const adminLink = mailLinks(mail.HTML).find((href) =>
      href.includes(`/admin/collections/leads/${leadId}`)
    );
    expect(adminLink, "link to the lead in the admin").toBeTruthy();
    expect(new URL(adminLink!).origin).toBe(new URL(baseURL!).origin);
    testInfo.annotations.push({ type: "env", description: `EXPECT_ENV=${EXPECT_ENV}` });
  });
});

// ---------------------------------------------------------------------------------------------
// Scenario 2: file size / format — client and server
// ---------------------------------------------------------------------------------------------

test.describe("scenario 2 — file limits", () => {
  test("client: > 50 MB, wrong format and a spoofed .pdf are rejected with the quiz texts", async ({
    page,
  }, testInfo) => {
    await prepareVisitor(page, testInfo);
    await openQuizFromLanding(page);
    for (let step = 1; step < 5; step += 1) await next(page);
    await expectStep(page, 5, "Чертёж");
    const input = page.locator("input[type=file]");
    const title = page.locator(".ig-upload__title");

    const uploads: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("/api/upload/")) uploads.push(r.url());
    });

    await input.setInputFiles({
      name: "setup.exe",
      mimeType: "application/octet-stream",
      buffer: Buffer.from("MZ"),
    });
    await expect(title).toHaveText(FORMAT_TEXT);

    // Playwright cannot pass buffers over 50 MB: the 50 MB + 1 byte file goes through disk.
    const big = testInfo.outputPath("big.pdf");
    writeFileSync(big, Buffer.alloc(OVER_LIMIT_BYTES));
    await input.setInputFiles(big);
    await expect(title).toHaveText(SIZE_TEXT);
    // Both rejected before any network request.
    expect(uploads).toEqual([]);

    // Extension spoof: the browser accepts `.pdf`, the server checks the signature.
    const spoof = page.waitForResponse((r) => r.url().includes("/api/upload/"), {
      timeout: 120_000,
    });
    await input.setInputFiles({
      name: "spoof.pdf",
      mimeType: "application/pdf",
      buffer: PNG_MAGIC,
    });
    expect((await spoof).status()).toBe(400);
    await expect(title).toHaveText(FORMAT_TEXT);
    await expect(page.locator(".ig-file__name")).toHaveCount(0);
  });

  test("server: 413 over 50 MB, format and signature checks without the UI", async ({
    request,
    baseURL,
  }, testInfo) => {
    onlyProject(testInfo, VIEWPORTS.laptop.name, "API scenario: viewport-independent");
    const ip = uniqueTestIp(testInfo);
    const token = await issueFormToken(request, ip);

    // Declared length over the limit → refused from the header alone (task-17 pre-check).
    const declared = await declaredOversizeUpload(baseURL!, { token, ip, bytes: 60 * MIB });
    expect(declared.status).toBe(413);
    expect(declared.body).toMatchObject({ ok: false, code: "size", message: SIZE_TEXT });

    // Real 50 MB + 1 byte stream → the busboy limit answers 413.
    const big = await uploadRaw(baseURL!, {
      token,
      ip,
      name: "big.pdf",
      bytes: new Uint8Array(OVER_LIMIT_BYTES),
    }).catch((error: unknown) => ({ status: -1, body: { error: String(error) } }));
    expect(big.status, JSON.stringify(big.body)).toBe(413);
    if (big.body) expect(big.body).toMatchObject({ ok: false, code: "size", message: SIZE_TEXT });

    // Unsupported format. The task-17 contract answers 400 `format` (ТЗ: «413/415» — any 4xx
    // refusal with the format text is the requirement; the code is fixed by the contract).
    const exe = await uploadRaw(baseURL!, {
      token,
      ip,
      name: "setup.exe",
      bytes: Buffer.from("MZ"),
    });
    expect([400, 415]).toContain(exe.status);
    expect(exe.body).toMatchObject({ ok: false, code: "format", message: FORMAT_TEXT });

    // `.pdf` with PNG bytes and `.dwg` with PDF bytes: rejected by signature.
    for (const [name, bytes] of [
      ["spoof.pdf", PNG_MAGIC],
      ["spoof.dwg", Buffer.from("%PDF-1.4\n%%EOF\n")],
    ] as const) {
      const spoof = await uploadRaw(baseURL!, { token, ip, name, bytes });
      expect([400, 415], name).toContain(spoof.status);
      expect(spoof.body, name).toMatchObject({ ok: false, code: "format", message: FORMAT_TEXT });
    }

    // Control: the real DWG passes.
    const ok = await uploadRaw(baseURL!, { token, ip, name: "test-drawing.dwg", bytes: DWG_BYTES });
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ ok: true, ext: "dwg", size: DWG_BYTES.length });

    // A form (not the quiz) refuses photos.
    const png = await uploadRaw(baseURL!, {
      token,
      ip,
      name: "sketch.png",
      bytes: PNG_MAGIC,
      purpose: "form",
    });
    expect(png.status).toBe(400);
    expect(png.body).toMatchObject({ code: "format", message: "Подойдут DWG, DXF или PDF" });
  });
});

// ---------------------------------------------------------------------------------------------
// Scenario 3: anti-spam
// ---------------------------------------------------------------------------------------------

test.describe("scenario 3 — anti-spam", () => {
  test.beforeEach(({}, testInfo) => {
    onlyProject(testInfo, VIEWPORTS.laptop.name, "API scenario: viewport-independent");
  });

  test("honeypot → silent 200 without a lead; < 3 s → rejected", async ({ request }, testInfo) => {
    const api = await getAdmin();
    const ip = uniqueTestIp(testInfo);

    const company = `${TEST_PREFIX} ${RUN} honeypot`;
    const token = await issueFormToken(request, ip);
    await waitTokenAge();
    const trapped = await submitLead(
      request,
      {
        ...contactsLead(token, { company, phone: uniquePhone() }),
        company_website: "http://spam.example",
      },
      ip
    );
    expect(trapped.status()).toBe(200);
    const trappedBody = (await trapped.json()) as { ok: boolean; leadId?: string };
    expect(trappedBody.ok).toBe(true);
    expect(trappedBody.leadId).toBeUndefined();

    const fastCompany = `${TEST_PREFIX} ${RUN} too-fast`;
    const fresh = await issueFormToken(request, ip);
    const fast = await submitLead(
      request,
      contactsLead(fresh, { company: fastCompany, phone: uniquePhone() }),
      ip
    );
    expect(fast.status()).toBe(400);
    expect(await fast.json()).toMatchObject({ ok: false, code: "too_fast" });

    const stored = [
      ...(await leadsByCompany(api, company)),
      ...(await leadsByCompany(api, fastCompany)),
    ];
    stored.forEach((lead) => createdLeads.add(lead.id));
    expect(stored.map((lead) => lead.company)).toEqual([]);
  });

  test("6th lead from one IP in 10 min → 429; forged left X-Forwarded-For entries do not help", async ({
    request,
  }, testInfo) => {
    const ip = uniqueTestIp(testInfo);
    const company = `${TEST_PREFIX} ${RUN} rate`;
    const tokens: string[] = [];
    for (let index = 0; index <= LEAD_RATE_LIMIT; index += 1) {
      tokens.push(await issueFormToken(request, ip));
    }
    await waitTokenAge();

    const statuses: number[] = [];
    for (let index = 0; index <= LEAD_RATE_LIMIT; index += 1) {
      // A different forged (public, documentation-range) client in front every time: a limiter
      // that trusted the LEFT-most entry would see six different clients.
      const forged = `198.51.100.${(index * 37 + 11) % 250}, 203.0.113.${(index * 53 + 7) % 250}`;
      const response = await submitLead(
        request,
        contactsLead(tokens[index]!, { company, phone: uniquePhone() }),
        `${forged}, ${ip}`
      );
      statuses.push(response.status());
      if (response.ok()) {
        const { leadId } = (await response.json()) as { leadId?: string };
        if (leadId) createdLeads.add(leadId);
      } else if (response.status() === 429) {
        expect(Number(response.headers()["retry-after"])).toBeGreaterThan(0);
        expect(await response.json()).toMatchObject({ ok: false, code: "rate" });
      }
    }
    expect(statuses).toEqual([...Array<number>(LEAD_RATE_LIMIT).fill(200), 429]);

    // Behind Traefik the proxy appends the real peer; the forged prefix is ignored either way.
    testInfo.annotations.push({
      type: "note",
      description:
        "Locally the right-most public X-Forwarded-For entry is the client (no proxy). On staging " +
        "Traefik appends the runner's real IP, so the same assertion covers the proxy chain.",
    });
  });
});

// ---------------------------------------------------------------------------------------------
// Scenario 4: duplicates
// ---------------------------------------------------------------------------------------------

test.describe("scenario 4 — duplicate highlighting", () => {
  test("second lead with the same phone is marked «Повтор» in the admin list", async ({
    page,
    request,
    baseURL,
  }, testInfo) => {
    onlyProject(testInfo, VIEWPORTS.laptop.name, "admin UI is checked at 1366");
    const api = await getAdmin();
    const phone = uniquePhone();
    const company = `${TEST_PREFIX} ${RUN} dup`;

    const ids: string[] = [];
    for (let index = 0; index < 2; index += 1) {
      const ip = uniqueTestIp(testInfo);
      const token = await issueFormToken(request, ip);
      await waitTokenAge();
      const response = await submitLead(
        request,
        contactsLead(token, { company, phone, name: `${TEST_PREFIX} Дубль ${index + 1}` }),
        ip
      );
      expect(response.status(), await response.text()).toBe(200);
      const { leadId } = (await response.json()) as { leadId: string };
      createdLeads.add(leadId);
      ids.push(leadId);
    }
    const [first, second] = ids as [string, string];

    const original = await api.json<Lead>(`/api/leads/${first}/?depth=0`);
    const repeat = await api.json<Lead>(`/api/leads/${second}/?depth=0`);
    expect(original.isDuplicate).toBeFalsy();
    expect(repeat).toMatchObject({ isDuplicate: true, duplicateReason: "phone" });
    const duplicateOf =
      typeof repeat.duplicateOf === "object" && repeat.duplicateOf
        ? repeat.duplicateOf.id
        : repeat.duplicateOf;
    expect(duplicateOf).toBe(first);

    await signInBrowser(page.context(), api, baseURL!);
    await page.goto(`/admin/collections/leads/?search=${encodeURIComponent(company)}`);
    const table = page.locator(".table table");
    await expect(table.locator("tbody tr")).toHaveCount(2);
    await expect(
      table.locator(`tbody tr[data-id="${second}"]`).getByText("Повтор", { exact: true })
    ).toBeVisible();
    await expect(
      table.locator(`tbody tr[data-id="${first}"]`).getByText("Повтор", { exact: true })
    ).toHaveCount(0);
    await testInfo.attach("admin-duplicates", {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
  });
});
