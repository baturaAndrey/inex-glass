import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect as baseExpect, test } from "@playwright/test";
import { clientIpHeaders, uniqueTestIp } from "./helpers/test-ip";
import { VIEWPORTS } from "./helpers/viewports";
import type { Locator, Page, Request, TestInfo } from "@playwright/test";

/**
 * Quiz «Расчёт стоимости» core (task 20) on the dev harness `/ui-kit/quiz/` (the real routes
 * are task 34). Precondition: `pnpm seed --minimal` (prices, promo, holidays, contacts).
 *
 * Anti-spam/rate limits of the intake API are per IP (5 leads, 20 uploads, 60 tokens per
 * 10 min): every test gets its own documentation-range client IP via `X-Forwarded-For`, and
 * only the full pass creates a real lead (company «E2E квиз task-20», delete after local runs);
 * the other submissions are answered by `route.fulfill`.
 */

/** The shared dev server compiles on demand and may be slow under load. */
const expect = baseExpect.configure({ timeout: 15_000 });
test.describe.configure({ timeout: 180_000 });
test.use({ navigationTimeout: 90_000, actionTimeout: 30_000 });

const HARNESS = "/ui-kit/quiz/";
const DRAFT_KEY = "inex-quiz-draft-v1";
const CONSENT_KEY = "inex-consent-v1";
const E2E_COMPANY = "E2E квиз task-20";
/** The server accepts a form no earlier than 3 s after the token was issued. */
const ANTISPAM_MIN_MS = 3100;

const PDF = Buffer.from(
  "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\nxref\n0 1\n0000000000 65535 f \ntrailer\n<< /Root 1 0 R >>\nstartxref\n9\n%%EOF\n"
);
const DWG = Buffer.concat([Buffer.from("AC1015"), Buffer.alloc(2048)]);

/** NBSP → space, for text comparisons. */
const plain = (text: string | null) => (text ?? "").replace(/ /g, " ");

/** Random mobile number (per-phone lead limit). */
function randomPhoneDigits(): string {
  return `9${String(Math.floor(Math.random() * 1e9)).padStart(9, "0")}`;
}

async function prepare(page: Page, testInfo: TestInfo, consent: "necessary" | "all" = "necessary") {
  await page.setExtraHTTPHeaders(clientIpHeaders(uniqueTestIp(testInfo)));
  await page.addInitScript(
    ([key, value]) => {
      try {
        window.localStorage.setItem(key!, value!);
      } catch {
        // storage blocked: the banner just stays.
      }
    },
    [CONSENT_KEY, consent]
  );
}

/** Opens the harness and waits for hydration (the form token is requested on mount). */
async function openQuiz(page: Page, query = ""): Promise<number> {
  const token = page.waitForResponse((response) => response.url().includes("/api/form-token/"), {
    timeout: 120_000,
  });
  await page.goto(`${HARNESS}${query}`, { waitUntil: "domcontentloaded" });
  await token;
  return Date.now();
}

const quiz = (page: Page) => page.locator("[data-slot=quiz]");
const stepHeading = (page: Page, name: string) =>
  quiz(page).getByRole("heading", { level: 2, name, exact: true });

async function next(page: Page) {
  await quiz(page).getByRole("button", { name: "Далее", exact: true }).click();
}

async function expectStep(page: Page, n: number, title: string) {
  await expect(quiz(page).getByRole("progressbar", { name: "Прогресс" })).toHaveAttribute(
    "aria-valuenow",
    String(n)
  );
  await expect(stepHeading(page, title)).toBeFocused();
}

async function attachShot(page: Page, testInfo: TestInfo, name: string) {
  await testInfo.attach(`${name}-${testInfo.project.name}`, {
    body: await quiz(page).screenshot(),
    contentType: "image/png",
  });
}

async function fillContacts(page: Page, phoneDigits = randomPhoneDigits()) {
  await quiz(page).getByLabel("Компания").fill(E2E_COMPANY);
  await quiz(page).getByLabel("Имя").fill("Тест");
  await quiz(page).getByLabel("Телефон").pressSequentially(phoneDigits);
}

/**
 * Goes from the current step to step 7 with «Далее». Waits for the heading focus: a step change
 * scrolls to the top and focuses the heading, so nothing is clicked before the page settles.
 */
async function goToContacts(page: Page, from: number) {
  for (let step = from; step < 7; step += 1) await next(page);
  await expectStep(page, 7, "Контакты");
}

/**
 * Clicks an `aria-disabled` button, which Playwright's enabled check refuses without `force`.
 * `force` also skips the visibility/stability checks and clicks at the current coordinates, so
 * the button is first scrolled into view (that call waits for it to be visible and stable).
 */
async function forceClick(locator: Locator) {
  await locator.scrollIntoViewIfNeeded();
  await locator.click({ force: true });
}

/** Minimal valid choices of steps 1–2. */
async function chooseBasics(page: Page) {
  await quiz(page).getByRole("radio", { name: "Закалённое стекло" }).click();
  await next(page);
  await quiz(page)
    .getByRole("radiogroup", { name: "Толщина" })
    .getByRole("radio", { name: /^10 мм/ })
    .click();
  await quiz(page)
    .getByRole("radiogroup", { name: "Вид" })
    .getByRole("radio", { name: "Прозрачное" })
    .click();
  await next(page);
}

/** Tomorrow in the company time zone as `дд.мм.гггг`. */
function tomorrowRu(): string {
  const now = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const parts = new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Asia/Yekaterinburg",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(now);
  return parts;
}

test.describe("quiz — full pass", () => {
  test("pre-filled card → hints → file → submit → thank-you, request body", async ({
    page,
  }, testInfo) => {
    await prepare(page, testInfo);
    const loadedAt = await openQuiz(
      page,
      "?type=tempered&thick=10&vid=clear&src=/zakalennoe-steklo/"
    );

    await expect(page.locator("[data-slot=quiz-prefill]")).toContainText(
      "Из карточки: Закалённое стекло, 10 мм"
    );
    await expect(quiz(page).getByText("Шаг 1 из 7")).toBeVisible();
    await expect(quiz(page).getByRole("radio", { name: "Закалённое стекло" })).toHaveAttribute(
      "aria-checked",
      "true"
    );
    await attachShot(page, testInfo, "step-1");
    await next(page);
    await expectStep(page, 2, "Какое стекло?");
    await next(page);
    await expectStep(page, 3, "Объём и размеры");

    await quiz(page).getByLabel("Площадь, м²").fill("86");
    await quiz(page).getByLabel("Ширина, мм").fill("3000");
    await quiz(page).getByLabel("Высота, мм").fill("1200");
    await expect(quiz(page).getByText(/Мы работаем с заказами от 50/)).toHaveCount(0);
    const priceState = await page.locator("[data-price-state]").getAttribute("data-price-state");
    if (priceState === "price") {
      await expect(page.locator("[data-slot=quiz-estimate]")).toContainText("Ориентировочно от");
    } else {
      await expect(page.locator("[data-slot=quiz-estimate]")).toHaveCount(0);
    }
    await attachShot(page, testInfo, "step-3");
    await next(page);

    await expectStep(page, 4, "Обработка");
    await quiz(page)
      .getByRole("radiogroup", { name: "Отверстия" })
      .getByRole("radio", { name: "есть" })
      .click();
    await quiz(page).getByLabel("Количество").fill("4");
    await quiz(page).getByLabel("Диаметры, мм").fill("12, 16");
    const holeHint = page.locator("#quiz-hint-holes");
    await expect(holeHint).toContainText("20 мм");
    await expect(holeHint).toContainText("60 мм");
    await next(page);

    await expectStep(page, 5, "Чертёж");
    const upload = page.waitForResponse((response) => response.url().includes("/api/upload/"), {
      timeout: 120_000,
    });
    await page.locator("input[type=file]").setInputFiles({
      name: "drawing.pdf",
      mimeType: "application/pdf",
      buffer: PDF,
    });
    expect((await upload).status()).toBe(200);
    await expect(page.locator(".ig-file__name")).toBeVisible();
    await expect(quiz(page).getByText(/загружено/)).toBeVisible();
    await attachShot(page, testInfo, "step-5");
    await next(page);

    await expectStep(page, 6, "Сроки и доставка");
    await quiz(page)
      .getByRole("radiogroup", { name: "Город доставки" })
      .getByRole("radio", { name: "Екатеринбург" })
      .click();
    await quiz(page)
      .getByRole("radiogroup", { name: /Нужен пакет документов/ })
      .getByRole("radio", { name: "да" })
      .click();
    await next(page);

    await expectStep(page, 7, "Контакты");
    const phoneDigits = randomPhoneDigits();
    await fillContacts(page, phoneDigits);
    await quiz(page).getByRole("checkbox").check();
    await attachShot(page, testInfo, "step-7");

    let body: Record<string, unknown> | null = null;
    await page.route("**/api/forms/lead/", async (route) => {
      body = route.request().postDataJSON() as Record<string, unknown>;
      await route.continue();
    });
    const elapsed = Date.now() - loadedAt;
    if (elapsed < ANTISPAM_MIN_MS) await page.waitForTimeout(ANTISPAM_MIN_MS - elapsed);

    const lead = page.waitForResponse((response) => response.url().includes("/api/forms/lead/"), {
      timeout: 120_000,
    });
    await quiz(page).getByRole("button", { name: "Получить КП" }).click();
    const response = await lead;
    expect(response.status(), await response.text()).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true });

    await expect(
      quiz(page).getByRole("heading", { name: "Спасибо, заявка принята" })
    ).toBeFocused();
    await expect(quiz(page).getByRole("link", { name: "Требования к чертежам" })).toHaveAttribute(
      "href",
      "/kak-zakazat/trebovaniya-k-chertezham/"
    );
    await attachShot(page, testInfo, "success");

    const sent = body as Record<string, unknown> | null;
    expect(sent).not.toBeNull();
    const answers = sent!.answers as { contact: { phone: string }; holes: unknown; type: string };
    expect(sent).toMatchObject({ formType: "quiz", consent: true, company_website: "" });
    expect(sent!.entryPage).toBe("/zakalennoe-steklo/");
    expect(typeof sent!.formToken).toBe("string");
    expect(sent!.uploadTokens).toHaveLength(1);
    expect(answers.contact.phone.replace(/\D/g, "")).toBe(`7${phoneDigits}`);
    expect(answers.type).toBe("tempered");
    expect(answers.holes).toMatchObject({ has: true, count: 4, diameters: [12, 16] });

    expect(await page.evaluate((key) => localStorage.getItem(key), DRAFT_KEY)).toBeNull();
  });
});

test.describe("quiz — hints", () => {
  test("volume, promo, size, thickness, kinds, facet and triplex", async ({ page }, testInfo) => {
    await prepare(page, testInfo);
    await openQuiz(page);

    await quiz(page).getByRole("radio", { name: "Зеркала" }).click();
    await next(page);
    const kinds = quiz(page).getByRole("radiogroup", { name: "Вид" });
    await kinds.getByRole("radio", { name: "Крашеное по RAL" }).click();
    await expect(quiz(page).getByText(/толщина 4–15 мм/)).toBeVisible();
    await expect(quiz(page).getByLabel("Цвет RAL")).toBeVisible();
    await kinds.getByRole("radio", { name: "Гнутое" }).click();
    await expect(quiz(page).getByLabel("Радиус гиба, мм")).toBeVisible();
    await expect(quiz(page).getByLabel("Цвет RAL")).toHaveCount(0);
    await quiz(page)
      .getByRole("radiogroup", { name: "Толщина" })
      .getByRole("radio", { name: /^15 мм/ })
      .click();
    await next(page);

    const area = quiz(page).getByLabel("Площадь, м²");
    await area.fill("49");
    await expect(quiz(page).getByText(/Мы работаем с заказами от 50 м²/)).toBeVisible();
    // 15 mm is always «по запросу»: no estimate.
    await expect(page.locator("[data-slot=quiz-estimate]")).toHaveCount(0);
    await area.fill("120");
    await expect(quiz(page).getByText(/Мы работаем с заказами от 50 м²/)).toHaveCount(0);
    const promo = page.locator('[data-slot=quiz-hint][data-variant="promo"]');
    if ((await promo.count()) > 0) await expect(promo).toContainText(/\S/);
    await quiz(page).getByLabel("Ширина, мм").fill("3500");
    await quiz(page).getByLabel("Высота, мм").fill("1200");
    await expect(quiz(page).getByText(/Нестандартный размер/)).toBeVisible();
    await next(page);

    const edges = quiz(page).getByRole("group", { name: "Кромка" });
    await edges.getByRole("button", { name: "фацет 30 мм" }).click();
    await expect(edges.getByRole("button", { name: "фацет 30 мм" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    // «не знаю» is exclusive.
    await edges.getByRole("button", { name: "не знаю — подскажите" }).click();
    await expect(edges.getByRole("button", { name: "фацет 30 мм" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    await edges.getByRole("button", { name: "фацет 30 мм" }).click();

    // Back to step 1: «Перегородки» → no facet, the chosen one is dropped.
    for (let i = 0; i < 3; i += 1) await quiz(page).getByRole("button", { name: "Назад" }).click();
    await quiz(page).getByRole("radio", { name: "Перегородки", exact: true }).click();
    for (let i = 0; i < 3; i += 1) await next(page);
    await expect(quiz(page).getByRole("button", { name: "фацет 30 мм" })).toHaveCount(0);

    // Triplex → layer constructor instead of the thickness grid.
    for (let i = 0; i < 3; i += 1) await quiz(page).getByRole("button", { name: "Назад" }).click();
    await quiz(page).getByRole("radio", { name: "Триплекс" }).click();
    await next(page);
    await quiz(page)
      .getByRole("radiogroup", { name: "Стекло 1" })
      .getByRole("radio", { name: "6 мм" })
      .click();
    await quiz(page)
      .getByRole("radiogroup", { name: "Стекло 2" })
      .getByRole("radio", { name: "6 мм" })
      .click();
    await quiz(page)
      .getByRole("radiogroup", { name: "Плёнка EVA" })
      .getByRole("radio", { name: "0,76 мм" })
      .click();
    expect(plain(await page.locator("[data-slot=quiz-triplex-summary]").textContent())).toContain(
      "Схема 6+6, плёнка 0,76 мм"
    );
    await expect(
      quiz(page)
        .getByRole("radiogroup", { name: "Толщина" })
        .getByRole("radio", { name: /^10 мм/ })
    ).toHaveCount(0);
  });

  test("urgent date counts working days", async ({ page }, testInfo) => {
    await prepare(page, testInfo);
    await openQuiz(page);
    for (let i = 1; i < 6; i += 1) await next(page);
    await expectStep(page, 6, "Сроки и доставка");
    await quiz(page)
      .getByLabel("К какой дате нужно стекло?")
      .pressSequentially(tomorrowRu().replace(/\D/g, ""));
    await expect(quiz(page).getByText(/Срочного изготовления нет/)).toBeVisible();
  });
});

test.describe("quiz — file", () => {
  test("format, size, DWG upload and «Нет чертежа?»", async ({ page }, testInfo) => {
    await prepare(page, testInfo);
    await openQuiz(page);
    for (let i = 1; i < 5; i += 1) await next(page);
    await expectStep(page, 5, "Чертёж");
    const input = page.locator("input[type=file]");

    await input.setInputFiles({
      name: "setup.exe",
      mimeType: "application/octet-stream",
      buffer: Buffer.from("MZ"),
    });
    await expect(page.locator(".ig-upload__title")).toHaveText(
      "Подойдут DWG, DXF, PDF, JPG или PNG"
    );

    // Playwright cannot pass buffers over 50 MB: the 50 MB + 1 byte file goes through disk.
    const big = testInfo.outputPath("big.pdf");
    mkdirSync(path.dirname(big), { recursive: true });
    writeFileSync(big, Buffer.alloc(52428801));
    await input.setInputFiles(big);
    await expect(page.locator(".ig-upload__title")).toHaveText(
      "Файл больше 50 МБ. Сожмите его или пришлите ссылку в комментарии"
    );

    const upload = page.waitForResponse((response) => response.url().includes("/api/upload/"), {
      timeout: 120_000,
    });
    await input.setInputFiles({ name: "plan.dwg", mimeType: "application/acad", buffer: DWG });
    expect((await upload).status()).toBe(200);
    await expect(page.locator(".ig-file__name")).toBeVisible();
    await quiz(page).getByRole("button", { name: "Удалить файл plan.dwg" }).click();

    await quiz(page)
      .getByRole("button", { name: "Нет чертежа? Продолжите — менеджер уточнит размеры" })
      .click();
    await expectStep(page, 6, "Сроки и доставка");
  });
});

test.describe("quiz — blocking validation", () => {
  test("required contacts and consent", async ({ page }, testInfo) => {
    await prepare(page, testInfo);
    await openQuiz(page, "?type=tempered&thick=10&vid=clear");
    await goToContacts(page, 1);

    const submit = quiz(page).getByRole("button", { name: "Получить КП" });
    await expect(submit).toHaveAttribute("aria-disabled", "true");
    await forceClick(submit);
    await expect(
      quiz(page).getByText("Заполните поле, чтобы мы могли связаться с вами")
    ).toHaveCount(3);
    await expect(
      quiz(page).getByText(
        "Чтобы отправить заявку, отметьте согласие на обработку персональных данных"
      )
    ).toBeVisible();
    await expect(quiz(page).getByLabel("Компания")).toBeFocused();

    await quiz(page).getByLabel("Компания").fill(E2E_COMPANY);
    await forceClick(submit);
    await expect(quiz(page).getByLabel("Имя")).toBeFocused();
  });

  test("unanswered type jumps back to step 1", async ({ page }, testInfo) => {
    await prepare(page, testInfo);
    await openQuiz(page);
    await goToContacts(page, 1);
    await fillContacts(page);
    await quiz(page).getByRole("checkbox").check();
    await quiz(page).getByRole("button", { name: "Получить КП" }).click();
    await expect(quiz(page).getByRole("progressbar", { name: "Прогресс" })).toHaveAttribute(
      "aria-valuenow",
      "1"
    );
    await expect(
      quiz(page).getByText("Заполните поле, чтобы мы могли связаться с вами")
    ).toBeVisible();
  });
});

test.describe("quiz — draft", () => {
  test("restores with resume, keeps the answers at step 1 without it", async ({
    page,
  }, testInfo) => {
    await prepare(page, testInfo);
    await openQuiz(page);
    await chooseBasics(page);
    await quiz(page).getByLabel("Площадь, м²").fill("86,5");
    await expect
      .poll(() => page.evaluate((key) => localStorage.getItem(key), DRAFT_KEY))
      .toContain("86,5");

    await openQuiz(page, "?resume=1");
    await expect(page.locator("[data-slot=quiz-resumed]")).toHaveText("Продолжаем ваш расчёт");
    await expect(quiz(page).getByText("Шаг 3 из 7")).toBeVisible();
    await expect(quiz(page).getByLabel("Площадь, м²")).toHaveValue("86,5");
    await quiz(page).getByRole("button", { name: "Назад" }).click();
    await expect(
      quiz(page)
        .getByRole("radiogroup", { name: "Толщина" })
        .getByRole("radio", { name: /^10 мм/ })
    ).toHaveAttribute("aria-checked", "true");

    // Without resume: step 1, but the draft answers are kept (task-34 source priority).
    await openQuiz(page);
    await expect(quiz(page).getByText("Шаг 1 из 7")).toBeVisible();
    await expect(page.locator("[data-slot=quiz-resumed]")).toHaveCount(0);
    await expect(quiz(page).getByRole("radio", { name: "Закалённое стекло" })).toHaveAttribute(
      "aria-checked",
      "true"
    );
    await next(page);
    await next(page);
    await expect(quiz(page).getByLabel("Площадь, м²")).toHaveValue("86,5");
  });

  test("submit error keeps the data and shows the phone", async ({ page }, testInfo) => {
    await prepare(page, testInfo);
    await openQuiz(page, "?type=tempered&thick=10&vid=clear");
    await goToContacts(page, 1);
    await fillContacts(page);
    await quiz(page).getByRole("checkbox").check();
    await page.route("**/api/forms/lead/", (route) => route.fulfill({ status: 500, body: "" }));
    await quiz(page).getByRole("button", { name: "Получить КП" }).click();
    const alert = quiz(page).getByRole("alert").filter({ hasText: "Не удалось отправить заявку" });
    await expect(alert).toBeVisible();
    expect(plain(await alert.textContent())).toContain(
      "Не удалось отправить заявку. Попробуйте ещё раз или позвоните: +7 (351) 247-05-57"
    );
    await expect(alert.getByRole("link")).toHaveAttribute("href", /^tel:\+7/);
    await expect(quiz(page).getByLabel("Компания")).toHaveValue(E2E_COMPANY);
    await expect(quiz(page).getByRole("checkbox")).toBeChecked();
  });
});

test.describe("quiz — Metrika goals", () => {
  test("quiz_start, steps 1–7, file_upload, quiz_submit in order, once", async ({
    page,
  }, testInfo) => {
    await prepare(page, testInfo, "all");
    await page.addInitScript(() => {
      const calls: unknown[][] = [];
      (window as unknown as { __goals: unknown[][] }).__goals = calls;
      window.ym = (...args: unknown[]) => {
        calls.push(args);
      };
      window.__INEX_YM_ID__ = 99_999_999;
    });
    await page.route("**/api/forms/lead/", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: '{"ok":true,"leadId":"x"}',
      })
    );
    await openQuiz(page, "?type=tempered&thick=10&vid=clear");
    await next(page);
    await quiz(page).getByRole("button", { name: "Назад" }).click();
    await next(page);
    for (let i = 2; i < 5; i += 1) await next(page);
    const upload = page.waitForResponse((response) => response.url().includes("/api/upload/"), {
      timeout: 120_000,
    });
    await page
      .locator("input[type=file]")
      .setInputFiles({ name: "d.pdf", mimeType: "application/pdf", buffer: PDF });
    await upload;
    await expect(page.locator(".ig-file__name")).toBeVisible();
    await next(page);
    await next(page);
    await fillContacts(page);
    await quiz(page).getByRole("checkbox").check();
    await quiz(page).getByRole("button", { name: "Получить КП" }).click();
    await expect(
      quiz(page).getByRole("heading", { name: "Спасибо, заявка принята" })
    ).toBeVisible();

    const goals = await page.evaluate(() =>
      (window as unknown as { __goals: unknown[][] }).__goals
        .filter((call) => call[1] === "reachGoal")
        .map((call) => ({ name: call[2], params: call[3] }))
    );
    expect(goals.map((goal) => goal.name)).toEqual([
      "quiz_start",
      "quiz_step_1",
      "quiz_step_2",
      "quiz_step_3",
      "quiz_step_4",
      "file_upload",
      "quiz_step_5",
      "quiz_step_6",
      "quiz_step_7",
      "quiz_submit",
    ]);
    expect(goals[0]!.params).toMatchObject({ variant: "page", resumed: false });
    expect(goals.at(-1)!.params).toMatchObject({ type: "tempered" });
    expect(JSON.stringify(goals)).not.toContain(E2E_COMPANY);
    expect(goals.some((goal) => goal.name === "form_submit")).toBe(false);
  });
});

test.describe("quiz — keyboard and a11y", () => {
  test("keyboard pass, axe on every step, mobile layout", async ({ page }, testInfo) => {
    await prepare(page, testInfo);
    await openQuiz(page);

    const axe = async () => {
      const results = await new AxeBuilder({ page }).include("[data-slot=quiz]").analyze();
      const critical = results.violations.filter((violation) => violation.impact === "critical");
      expect(critical.map((violation) => violation.id)).toEqual([]);
    };

    // Step 1 with the keyboard: focus the radiogroup, arrows select, Enter on «Далее».
    await quiz(page).getByRole("radio", { name: "Закалённое стекло" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(quiz(page).getByRole("radio", { name: "Триплекс" })).toBeFocused();
    await expect(quiz(page).getByRole("radio", { name: "Триплекс" })).toHaveAttribute(
      "aria-checked",
      "true"
    );
    await page.keyboard.press("ArrowLeft");
    await expect(quiz(page).getByRole("radio", { name: "Закалённое стекло" })).toHaveAttribute(
      "aria-checked",
      "true"
    );
    await axe();
    await quiz(page).getByRole("button", { name: "Далее" }).focus();
    await page.keyboard.press("Enter");
    await expectStep(page, 2, "Какое стекло?");

    for (let step = 2; step <= 7; step += 1) {
      await axe();
      if (testInfo.project.name === VIEWPORTS.mobile.name) {
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
          VIEWPORTS.mobile.width
        );
        await expect(page.locator("[data-slot=quiz-footer]")).toBeInViewport();
      }
      if (step < 7) {
        await quiz(page).getByRole("button", { name: "Далее" }).focus();
        await page.keyboard.press("Enter");
      }
    }
    await expect(stepHeading(page, "Контакты")).toBeFocused();
  });

  test("no own h1 in variant=page, «Далее» never submits", async ({ page }, testInfo) => {
    await prepare(page, testInfo);
    await openQuiz(page);
    await expect(page.locator("[data-slot=quiz-body] h1")).toHaveCount(0);
    const requests: string[] = [];
    page.on("request", (request: Request) => requests.push(request.url()));
    await next(page);
    expect(requests.filter((url) => url.includes("/api/forms/lead/"))).toEqual([]);
  });
});
