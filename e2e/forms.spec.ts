import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { clientIpHeaders, uniqueTestIp } from "./helpers/test-ip";
import { VIEWPORTS } from "./helpers/viewports";
import type { Locator, Page } from "@playwright/test";

/**
 * Site forms (task 21) on the dev harness `/ui-kit/forms-live/` (precondition: `pnpm seed
 * --minimal`). Successful submissions create real leads: every test uses its own public client IP
 * (`X-Forwarded-For`, the server takes the first non-private address) and phone, so the
 * per-IP / per-phone rate limits (5 / 10 min) never interfere. Names start with «E2E» so the
 * leads are easy to find and remove on a shared database.
 */

const HARNESS = "/ui-kit/forms-live/";
const LEAD_URL = "**/api/forms/lead/";
/** The server accepts a form no earlier than 3 s after its token was issued. */
const ANTISPAM_DELAY_MS = 3100;

const REQUIRED = "Заполните поле, чтобы мы могли связаться с вами";
const CONSENT = "Чтобы отправить заявку, отметьте согласие на обработку персональных данных";
const PHONE_ERROR = "Укажите телефон в формате +7 (900) 000-00-00";
const EMAIL_ERROR = "Проверьте адрес электронной почты";
const FORMAT_ERROR = "Подойдут DWG, DXF или PDF";
const THANKS = "Спасибо, заявка принята";
/** teksty/05-kviz.md, the screen after sending — verbatim. */
const THANKS_TEXT =
  "Менеджер проверит данные и пришлёт КП — в среднем за 2–3 рабочих дня, для больших объёмов дольше. Связь — звонком и по e-mail.";

/** Minimal valid PDF: `%PDF-` magic + `xref` / `%%EOF` trailer (checked by the upload API). */
const PDF = Buffer.from(
  "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\nxref\n0 1\n0000000000 65535 f \ntrailer\n<< /Size 1 /Root 1 0 R >>\nstartxref\n9\n%%EOF\n",
  "latin1"
);

interface FormsConfigBody {
  phone: string;
  workHours: string;
  thankYouTitle: string;
  thankYouText: string;
  submitErrorText: string;
}

/** 10 national digits starting with 9 (mobile), unique enough per test. */
const randomPhone = () => `9${String(Math.floor(Math.random() * 1e9)).padStart(9, "0")}`;

type Goal = { name: string; params?: Record<string, unknown> };

test.describe.configure({ timeout: 150_000 });

test.beforeEach(async ({ page }, testInfo) => {
  await page.setExtraHTTPHeaders(clientIpHeaders(uniqueTestIp(testInfo)));
  // A real tag.js would replace the stub below.
  await page.route("https://mc.yandex.ru/**", (route) => route.abort());
  // Analytics consent (hides the cookie banner) + a Metrika stub that records goals.
  await page.addInitScript(() => {
    const w = window as unknown as {
      __goals: Goal[];
      __INEX_YM_ID__: number;
      ym: (...args: unknown[]) => void;
    };
    window.localStorage.setItem("inex-consent-v1", "all");
    w.__goals = [];
    w.__INEX_YM_ID__ = 1;
    w.ym = (...args: unknown[]) => {
      if (args[1] === "reachGoal") {
        w.__goals.push({ name: String(args[2]), params: args[3] as Record<string, unknown> });
      }
      if (args[1] === "getClientID" && typeof args[2] === "function") {
        (args[2] as (id: string) => void)("e2e-client-id");
      }
    };
  });
});

async function openHarness(page: Page) {
  // The shared dev server compiles on demand: allow a slow first load.
  // Inline forms request their token right after hydration: a reliable "page is interactive" signal.
  const hydrated = page.waitForResponse("**/api/form-token/", { timeout: 90_000 });
  const response = await page.goto(HARNESS, { timeout: 90_000 });
  expect(response?.status()).toBe(200);
  await hydrated;
}

/** Opens a modal form and returns the dialog plus the moment it was opened. */
async function openModal(page: Page, trigger: string) {
  await page.getByTestId(`open-${trigger}`).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  // The form chunk is loaded lazily.
  await expect(dialog.locator("form")).toBeVisible({ timeout: 60_000 });
  return { dialog, openedAt: Date.now() };
}

async function waitAntispam(page: Page, openedAt: number) {
  const left = ANTISPAM_DELAY_MS - (Date.now() - openedAt);
  if (left > 0) await page.waitForTimeout(left);
}

/** Control by the start of its label (the label also holds the decorative «*»). */
function field(scope: Locator, label: string): Locator {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return scope.getByLabel(new RegExp(`^${escaped}`));
}

async function fillContacts(scope: Locator, opts: { company?: boolean } = {}) {
  if (opts.company !== false) await field(scope, "Компания").fill("E2E ООО «Тест»");
  await field(scope, "Имя").fill("E2E Тест");
  await field(scope, "Телефон").fill(randomPhone());
}

const consentBox = (scope: Locator) => scope.getByRole("checkbox", { name: /Даю согласие/ });
const submitButton = (scope: Locator) => scope.locator('button[type="submit"]');

async function goals(page: Page): Promise<Goal[]> {
  return page.evaluate(() => (window as unknown as { __goals: Goal[] }).__goals);
}

test.describe("site forms", () => {
  test("every modal form opens with its title and fields; Esc returns focus", async ({ page }) => {
    await openHarness(page);
    const cases = [
      {
        trigger: "drawing",
        title: "Отправить чертёж",
        fields: ["Компания", "Имя", "Телефон", "E-mail", "Комментарий"],
      },
      { trigger: "callback", title: "Заказать звонок", fields: ["Имя", "Телефон"] },
      {
        trigger: "sample",
        title: "Заказать образец",
        fields: ["Компания", "Вид стекла", "Адрес или город"],
      },
      {
        trigger: "load",
        title: "Подобрать под нагрузку",
        fields: [
          "Опишите конструкцию: размер стекла, как крепится, где стоит",
          "Размеры, мм",
          "Способ крепления",
          "Телефон",
        ],
      },
    ];

    for (const { trigger, title, fields } of cases) {
      const { dialog } = await openModal(page, trigger);
      await expect(dialog.getByRole("heading", { name: title, exact: true })).toBeVisible();
      for (const label of fields) {
        await expect(field(dialog, label)).toBeVisible();
      }
      await expect(consentBox(dialog)).not.toBeChecked();
      expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true);

      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(page.getByTestId(`open-${trigger}`)).toBeFocused();
    }
  });

  test("parameters: label becomes the title, vid pre-selects the glass kind", async ({ page }) => {
    await openHarness(page);
    const plan = await openModal(page, "drawing-plan");
    await expect(plan.dialog.getByRole("heading", { name: "Отправить планировку" })).toBeVisible();
    await page.keyboard.press("Escape");

    const matte = await openModal(page, "sample-matte");
    await expect(field(matte.dialog, "Вид стекла")).toHaveValue("Матовое");
    await page.keyboard.press("Escape");

    const load = await openModal(page, "load-10");
    await expect(load.dialog.getByText("Толщина: 10 мм")).toBeVisible();
  });

  test("validation: required fields, consent, phone and e-mail formats", async ({ page }) => {
    await openHarness(page);
    const { dialog } = await openModal(page, "drawing");

    await submitButton(dialog).click({ force: true });
    await expect(dialog.getByText(REQUIRED)).toHaveCount(3);
    await expect(dialog.getByText(CONSENT)).toBeVisible();
    await expect(field(dialog, "Компания")).toBeFocused();

    await field(dialog, "Телефон").fill("90012");
    await field(dialog, "E-mail").fill("name@");
    await submitButton(dialog).click({ force: true });
    await expect(dialog.getByText(PHONE_ERROR)).toBeVisible();
    await expect(dialog.getByText(EMAIL_ERROR)).toBeVisible();
  });

  test("drawing: file upload, request body, goals and the thank-you screen", async ({ page }) => {
    await openHarness(page);
    const { dialog, openedAt } = await openModal(page, "drawing-plan");
    const fileInput = dialog.locator('input[type="file"]');

    await fileInput.setInputFiles({
      name: "virus.exe",
      mimeType: "application/octet-stream",
      buffer: Buffer.from("MZ"),
    });
    await expect(dialog.getByText(FORMAT_ERROR).first()).toBeVisible();

    await fileInput.setInputFiles({ name: "plan.pdf", mimeType: "application/pdf", buffer: PDF });
    await expect(dialog.getByText("plan.pdf", { exact: true })).toBeVisible();
    await expect(dialog.getByText(/загружено/)).toBeVisible({ timeout: 60_000 });

    await fillContacts(dialog);
    await consentBox(dialog).check();
    await waitAntispam(page, openedAt);

    let sent: Record<string, unknown> | null = null;
    await page.route(LEAD_URL, async (route) => {
      sent = route.request().postDataJSON() as Record<string, unknown>;
      await route.continue();
    });
    await submitButton(dialog).click();

    await expect(dialog.getByRole("heading", { name: THANKS })).toBeVisible({ timeout: 30_000 });
    await expect(dialog.getByRole("button", { name: "Закрыть", exact: true }).last()).toBeVisible();

    expect(sent).not.toBeNull();
    const body = sent as unknown as Record<string, unknown>;
    expect(body).toMatchObject({
      formType: "drawing",
      consent: true,
      sourceLabel: "Отправить планировку",
      params: { source: "ui-kit-plan" },
      entryPage: HARNESS,
      company_website: "",
    });
    expect(typeof body.formToken).toBe("string");
    expect(body.uploadTokens).toHaveLength(1);

    const recorded = await goals(page);
    expect(recorded).toContainEqual({
      name: "file_upload",
      params: { ext: "pdf", form: "drawing" },
    });
    expect(recorded).toContainEqual({
      name: "form_submit",
      params: { form: "drawing", source: "ui-kit-plan" },
    });
  });

  test("inline full and contacts forms: the thank-you screen replaces the card", async ({
    page,
  }) => {
    await openHarness(page);
    const openedAt = Date.now();

    for (const key of ["full", "contacts"] as const) {
      const section = page.locator(`[data-form-section="${key}"]`);
      const form = section.locator("form");
      await fillContacts(form);
      if (key === "full") {
        await field(form, "Город доставки").fill("Екатеринбург");
        await field(form, "Площадь, м²").fill("120");
      }
      await consentBox(form).check();
      await waitAntispam(page, openedAt);
      await submitButton(form).click();
      await expect(section.getByRole("heading", { name: THANKS })).toBeVisible({ timeout: 30_000 });
      await expect(section.locator("form")).toHaveCount(0);
    }
  });

  test("submit errors show the banner from /api/forms-config/ and keep the data", async ({
    page,
    request,
  }) => {
    const config = (await (await request.get("/api/forms-config/")).json()) as FormsConfigBody;
    await openHarness(page);
    const { dialog } = await openModal(page, "callback");
    await fillContacts(dialog, { company: false });
    await consentBox(dialog).check();

    for (const status of [500, 429]) {
      await page.route(LEAD_URL, (route) =>
        route.fulfill({
          status,
          contentType: "application/json",
          body: JSON.stringify({
            ok: false,
            code: status === 429 ? "rate" : "server",
            message: "",
          }),
        })
      );
      await submitButton(dialog).click();
      const alert = dialog.getByRole("alert");
      await expect(alert).toHaveText(config.submitErrorText, { timeout: 30_000 });
      await expect(alert.locator('a[href^="tel:"]')).toBeVisible();
      await expect(field(dialog, "Имя")).toHaveValue("E2E Тест");
      await page.unroute(LEAD_URL);
    }
  });

  test("a filled honeypot is accepted silently and the UI shows success", async ({ page }) => {
    await openHarness(page);
    const { dialog, openedAt } = await openModal(page, "callback");
    await fillContacts(dialog, { company: false });
    await dialog
      .locator('input[name="company_website"]')
      .fill("http://spam.example", { force: true });
    await consentBox(dialog).check();
    await waitAntispam(page, openedAt);

    const response = page.waitForResponse(LEAD_URL);
    await submitButton(dialog).click();
    expect((await response).status()).toBe(200);
    await expect(dialog.getByRole("heading", { name: THANKS })).toBeVisible({ timeout: 30_000 });
  });

  test("GET /api/forms-config/ returns the public form texts", async ({ request }) => {
    const response = await request.get("/api/forms-config/");
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toContain("max-age=300");
    const body = (await response.json()) as FormsConfigBody;
    expect(Object.keys(body).sort()).toEqual(
      ["phone", "submitErrorText", "thankYouText", "thankYouTitle", "workHours"].sort()
    );
    expect(body.thankYouTitle).toBe(THANKS);
    expect(body.thankYouText).toBe(THANKS_TEXT);
    expect(body.submitErrorText).not.toContain("{телефон}");
    expect(body.submitErrorText).toContain(body.phone);
  });
});

test.describe("site forms at 375 px", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== VIEWPORTS.mobile.name, "mobile layout only");
  });

  test("the modal is full screen with a pinned submit button and no a11y criticals", async ({
    page,
  }) => {
    await openHarness(page);
    const { dialog } = await openModal(page, "load");

    const box = await dialog.boundingBox();
    expect(box).toMatchObject({ x: 0, y: 0, width: VIEWPORTS.mobile.width });
    expect(Math.round(box?.height ?? 0)).toBe(VIEWPORTS.mobile.height);
    await expect(submitButton(dialog)).toBeInViewport();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(overflow).toBe(false);

    const results = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
    const critical = results.violations.filter((violation) => violation.impact === "critical");
    expect(critical.map((violation) => violation.id)).toEqual([]);
  });
});
