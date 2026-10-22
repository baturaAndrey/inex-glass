import { expect, test } from "@playwright/test";
import { skipOnMissingAdmin } from "./helpers/admin";
import {
  adminApi,
  createLead,
  deleteDocs,
  findStatusId,
  signInBrowser,
  uniquePhone,
} from "./helpers/admin-api";
import { VIEWPORTS } from "./helpers/viewports";
import type { AdminApi } from "./helpers/admin-api";
import type { Lead } from "../src/payload-types";
import type { APIRequestContext, Locator, Page } from "@playwright/test";

/**
 * Leads kanban (admin redesign, task 05): `/admin/collections/leads/kanban/`.
 *
 * Mutating tests run at 1366 only and serially: fixtures are created through REST under the e2e
 * admin, tagged with a per-run marker in `company`, and the page is opened with
 * `?search=<marker>` so parallel specs never show up on the board. `afterAll` removes the orders
 * and leads created here. The phone check (375) is read-only.
 */

test.describe.configure({ mode: "serial" });

const RUN = `e2e-kanban-${Date.now().toString(36)}`;
const KANBAN = "/admin/collections/leads/kanban/";
const BOARD_URL = `${KANBAN}?search=${encodeURIComponent(RUN)}`;
/** Tall enough to keep the board and the refusal strip in one screen. */
const TALL_VIEWPORT = { width: VIEWPORTS.laptop.width, height: 1400 };

let apiContext: APIRequestContext | undefined;
let admin: AdminApi;
let leadA: Lead;
let leadB: Lead;
let leadC: Lead;
const statuses: Record<string, string> = {};
const leadIds = new Set<string>();
const orderIds = new Set<string>();

const isLaptop = (name: string) => name === VIEWPORTS.laptop.name;

test.beforeAll(async ({ playwright, baseURL }, testInfo) => {
  const project = testInfo.project.name;
  test.skip(
    project !== VIEWPORTS.laptop.name && project !== VIEWPORTS.mobile.name,
    "The kanban is checked at 1366 (all) and 375 (phone mode)"
  );
  apiContext = await playwright.request.newContext({ baseURL: baseURL! });
  try {
    admin = await adminApi(apiContext);
  } catch (error) {
    skipOnMissingAdmin(error);
  }
  if (!isLaptop(project)) return;

  for (const slug of ["new", "in-progress", "kp-sent", "contract", "refused"]) {
    statuses[slug] = await findStatusId(admin, slug);
  }
  leadA = await createLead(admin, {
    formType: "quiz",
    company: `ООО «${RUN} Альфа»`,
    name: "Андрей",
    phone: uniquePhone(),
    area: 120,
    productType: "facade",
    flags: ["urgent"],
    estimate: { from: 168000 },
  });
  leadB = await createLead(admin, {
    formType: "drawing",
    company: `ИП ${RUN} Бета`,
    name: "Марина",
    phone: uniquePhone(),
    area: 58,
    productType: "partitions",
  });
  leadC = await createLead(admin, {
    formType: "callback",
    company: `${RUN} Гамма`,
    name: "Олег",
    phone: uniquePhone(),
    productType: "tempered",
  });
  for (const lead of [leadA, leadB, leadC]) leadIds.add(lead.id);
});

test.afterAll(async () => {
  if (admin && leadIds.size > 0) {
    const ids = [...leadIds].join(",");
    const { docs } = await admin.json<{ docs: { id: string }[] }>(
      `/api/orders/?where[lead][in]=${ids}&limit=50&depth=0`
    );
    for (const doc of docs) orderIds.add(doc.id);
    await deleteDocs(admin, "orders", orderIds);
    await deleteDocs(admin, "leads", leadIds);
  }
  await apiContext?.dispose();
});

const column = (page: Page, slug: string) =>
  page.locator(`.iga-kanban__col[data-status-slug="${slug}"]`);
const strip = (page: Page, slug = "refused") =>
  page.locator(`.iga-kstrip[data-status-slug="${slug}"]`);
const card = (page: Page, lead: Lead) => page.locator(`#kcard-${lead.id}`);

async function openBoard(page: Page, baseURL: string | undefined, url = BOARD_URL) {
  await page.setViewportSize(TALL_VIEWPORT);
  await signInBrowser(page.context(), admin, baseURL!);
  await page.goto(url);
  await expect(page.getByRole("heading", { level: 1, name: "Заявки" })).toBeVisible();
}

async function leadDoc(id: string): Promise<Lead> {
  return admin.json<Lead>(`/api/leads/${id}/?depth=0`);
}

const relId = (value: unknown) =>
  typeof value === "object" && value !== null ? (value as { id: string }).id : value;

/** Mouse drag with intermediate steps (the sensor needs ≥ 6 px of travel). */
async function dragTo(page: Page, source: Locator, target: Locator) {
  // Grab the tags row: no link or button under the pointer.
  const from = await source.locator(".iga-kcard__tags").boundingBox();
  const to = await target.boundingBox();
  if (!from || !to) throw new Error("drag: element is not visible");
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + Math.min(to.height / 2, 40), { steps: 15 });
  await page.mouse.up();
}

test("columns from the dictionary, the refusal strip and the cards", async ({
  page,
  baseURL,
}, testInfo) => {
  test.skip(!isLaptop(testInfo.project.name), "Fixtures are mutated at 1366 only");
  await openBoard(page, baseURL);

  const titles = await page.locator(".iga-kanban__col-title").allTextContents();
  expect(titles).toEqual(["Новая", "В работе", "КП отправлено", "Договор"]);
  await expect(strip(page)).toContainText("Отказ");
  await expect(strip(page)).toContainText("перетащите карточку сюда");

  const fresh = column(page, "new");
  for (const lead of [leadA, leadB, leadC]) {
    const item = fresh.locator(`#kcard-${lead.id}`);
    await expect(item).toBeVisible();
    await expect(item.locator(`a[href="tel:${lead.phone}"]`)).toBeVisible();
    await expect(item.locator(".iga-kcard__title")).toHaveAttribute(
      "href",
      `/admin/collections/leads/${lead.id}/summary/`
    );
  }
  const alpha = card(page, leadA);
  await expect(alpha.locator(".iga-kcard__title")).toHaveText(`ООО «${RUN} Альфа»`);
  await expect(alpha.locator(".iga-kcard__tags")).toContainText("Фасады");
  await expect(alpha.locator(".iga-kcard__tags")).toContainText("120 м²");
  await expect(alpha.locator(".iga-kcard__tags")).toContainText("Квиз");
  await expect(alpha.locator(".iga-badge--no")).toHaveText("Срочно");
  await expect(alpha.locator(".iga-kcard__foot")).toContainText("от 168 000 ₽");
  await expect(alpha.getByRole("button", { name: "Взять себе" })).toBeVisible();
});

test("drag with the mouse to «В работе»", async ({ page, baseURL }, testInfo) => {
  test.skip(!isLaptop(testInfo.project.name), "Fixtures are mutated at 1366 only");
  await openBoard(page, baseURL);
  const before = Date.now();

  await dragTo(page, card(page, leadA), column(page, "in-progress"));
  await expect(page.getByText("Статус: «В работе»")).toBeVisible();
  await expect(column(page, "in-progress").locator(`#kcard-${leadA.id}`)).toBeVisible();
  await page.reload();
  await expect(column(page, "in-progress").locator(`#kcard-${leadA.id}`)).toBeVisible();

  const doc = await leadDoc(leadA.id);
  expect(relId(doc.status)).toBe(statuses["in-progress"]);
  expect(new Date(doc.statusChangedAt ?? 0).getTime()).toBeGreaterThanOrEqual(before - 5_000);
});

test("drag with the keyboard (handle, Space, →, Space)", async ({ page, baseURL }, testInfo) => {
  test.skip(!isLaptop(testInfo.project.name), "Fixtures are mutated at 1366 only");
  await openBoard(page, baseURL);
  // Payload has a DndContext of its own: look for our announcement in any live region.
  const announced = (text: string) =>
    expect(page.locator(`[id^="DndLiveRegion"]`, { hasText: text })).toHaveCount(1);

  await card(page, leadB).locator(".iga-kcard__handle").focus();
  await page.keyboard.press("Space");
  await announced("Взята заявка");
  await page.keyboard.press("ArrowRight");
  await announced("Над колонкой «В работе»");
  await page.keyboard.press("Space");
  // The drop announces the pending save, the board's own live region the server's verdict.
  await announced("сохраняем перенос в «В работе»");
  await expect(page.locator('.iga-kanban__sr-only[role="status"]')).toHaveText(
    `Заявка «ИП ${RUN} Бета» перенесена в «В работе»`
  );

  await expect(page.getByText("Статус: «В работе»")).toBeVisible();
  await expect(column(page, "in-progress").locator(`#kcard-${leadB.id}`)).toBeVisible();
  expect(relId((await leadDoc(leadB.id)).status)).toBe(statuses["in-progress"]);
});

test("dropping on «Отказ» asks for the reason", async ({ page, baseURL }, testInfo) => {
  test.skip(!isLaptop(testInfo.project.name), "Fixtures are mutated at 1366 only");
  await openBoard(page, baseURL);

  await dragTo(page, card(page, leadC), strip(page).locator("summary"));
  const dialog = page.getByRole("dialog", { name: `Закрыть заявку «${RUN} Гамма»` });
  await expect(dialog).toBeVisible();

  // No reason: the native validation blocks the submit.
  const reason = dialog.getByLabel("Причина");
  await dialog.getByRole("button", { name: "Закрыть заявку" }).click();
  expect(await reason.evaluate((node: HTMLSelectElement) => node.validity.valueMissing)).toBe(true);
  await expect(dialog).toBeVisible();

  // «Другое» needs a comment.
  await reason.selectOption({ label: "Другое" });
  await dialog.getByRole("button", { name: "Закрыть заявку" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Укажите причину отказа");
  await expect(column(page, "new").locator(`#kcard-${leadC.id}`)).toBeVisible();

  await reason.selectOption({ label: "Дорого" });
  await dialog.getByRole("button", { name: "Закрыть заявку" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Статус: «Отказ»")).toBeVisible();
  await expect(column(page, "new").locator(`#kcard-${leadC.id}`)).toHaveCount(0);
  // The column's last card left: the focus stays in the column, on its heading.
  await expect(column(page, "new").locator(".iga-kanban__col-title")).toBeFocused();

  const doc = await leadDoc(leadC.id);
  expect(relId(doc.status)).toBe(statuses.refused);
  expect(doc.refuseReasonCode).toBe("expensive");
});

test("«Взять себе» assigns the lead to the viewer", async ({ page, baseURL }, testInfo) => {
  test.skip(!isLaptop(testInfo.project.name), "Fixtures are mutated at 1366 only");
  await openBoard(page, baseURL);

  await card(page, leadA).getByRole("button", { name: "Взять себе" }).click();
  await expect(page.getByText("Заявка назначена на вас")).toBeVisible();
  await expect(card(page, leadA).locator(".iga-avatar")).toHaveAttribute(
    "title",
    admin.user.name ?? /.+/
  );
  expect(relId((await leadDoc(leadA.id)).assignee)).toBe(admin.user.id);
});

test("«Перенести в…» → «Договор» needs a confirmation and creates the order", async ({
  page,
  baseURL,
}, testInfo) => {
  test.skip(!isLaptop(testInfo.project.name), "Fixtures are mutated at 1366 only");
  await openBoard(page, baseURL);
  const moveTo = async (status: string) => {
    await card(page, leadA)
      .getByRole("button", { name: `Перенести заявку «ООО «${RUN} Альфа»» в другой статус` })
      .click();
    await page.getByRole("menuitem", { name: status }).click();
  };
  const confirm = page.getByRole("dialog", { name: `Перевести «ООО «${RUN} Альфа»» в «Договор»?` });

  await moveTo("Договор");
  await expect(confirm).toBeVisible();
  await confirm.getByRole("button", { name: "Отмена" }).click();
  await expect(confirm).toBeHidden();
  expect(relId((await leadDoc(leadA.id)).status)).toBe(statuses["in-progress"]);

  await moveTo("Договор");
  await confirm.getByRole("button", { name: "Перевести" }).click();
  await expect(page.getByText("Статус: «Договор»")).toBeVisible();
  const contractCard = column(page, "contract").locator(`#kcard-${leadA.id}`);
  await expect(contractCard.locator(".iga-kcard__order")).toHaveText(/^Заказ \S+ →$/);

  const { docs } = await admin.json<{ docs: { id: string; number: string }[] }>(
    `/api/orders/?where[lead][equals]=${leadA.id}&depth=0`
  );
  expect(docs).toHaveLength(1);
  orderIds.add(docs[0]!.id);
  await expect(contractCard.locator(".iga-kcard__order")).toHaveText(`Заказ ${docs[0]!.number} →`);
});

test("1366: four columns fit; «Перенести в…» is not clipped by the board", async ({
  page,
  baseURL,
}, testInfo) => {
  test.skip(!isLaptop(testInfo.project.name), "Needs the fixtures of the tests above");
  await openBoard(page, baseURL);

  const scroller = page.locator(".iga-kanban__scroller");
  const overflow = await scroller.evaluate((node) => node.scrollWidth - node.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  const scrollerBox = await scroller.boundingBox();
  const contractBox = await column(page, "contract").boundingBox();
  expect(contractBox!.x + contractBox!.width).toBeLessThanOrEqual(
    scrollerBox!.x + scrollerBox!.width + 1
  );

  // Lead A sits in «Договор», the last column: its menu used to be cut by the board's overflow.
  const button = card(page, leadA).getByRole("button", {
    name: `Перенести заявку «ООО «${RUN} Альфа»» в другой статус`,
  });
  await button.focus();
  await page.keyboard.press("Enter");
  const menu = page.getByRole("menu", { name: "Перенести в…" });
  await expect(menu).toBeVisible();
  await expect(page.getByRole("menuitem").first()).toBeFocused();
  const items = page.getByRole("menuitem");
  const last = items.last();
  const lastBox = await last.boundingBox();
  const viewport = page.viewportSize()!;
  expect(lastBox!.x).toBeGreaterThanOrEqual(0);
  expect(lastBox!.x + lastBox!.width).toBeLessThanOrEqual(viewport.width);
  // Hit-testing proves nothing (the board's overflow box included) covers or clips the item.
  const hit = await last.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return node.contains(top);
  });
  expect(hit).toBe(true);

  await page.keyboard.press("End");
  await expect(last).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(button).toBeFocused();
});

test("filters live in the URL; the switch leads to the table", async ({
  page,
  baseURL,
}, testInfo) => {
  test.skip(!isLaptop(testInfo.project.name), "Fixtures are mutated at 1366 only");
  await openBoard(page, baseURL);

  await page.locator('[data-kanban-filter="unassigned"]').click();
  await expect(page).toHaveURL(/[?&]filter=unassigned/);
  await expect(page).toHaveURL(new RegExp(`[?&]search=${RUN}`));
  await expect(page.locator('[data-kanban-filter="unassigned"]')).toHaveAttribute(
    "aria-current",
    "true"
  );
  await expect(card(page, leadB)).toBeVisible();
  await expect(card(page, leadA)).toHaveCount(0);

  await page.getByLabel("Источник").selectOption("drawing");
  await expect(page).toHaveURL(/[?&]source=drawing/);
  await expect(card(page, leadB)).toBeVisible();

  await page.getByRole("group", { name: "Вид" }).getByRole("link", { name: "Таблица" }).click();
  await expect(page).toHaveURL(/\/admin\/collections\/leads\/(\?.*)?$/);
  await expect(
    page.getByRole("group", { name: "Вид" }).getByRole("link", { name: "Канбан" })
  ).toBeVisible();
  await expect(page.locator('[data-quick-filter="all"]')).toBeVisible();
});

test("phone: tabs instead of the grid, «Перенести в…», no horizontal scroll", async ({
  page,
  baseURL,
}, testInfo) => {
  test.skip(testInfo.project.name !== VIEWPORTS.mobile.name, "Phone mode is checked at 375");
  await signInBrowser(page.context(), admin, baseURL!);
  await page.goto(KANBAN);

  const tabs = page.getByRole("tab");
  await expect(tabs.first()).toBeVisible();
  expect(await tabs.count()).toBeGreaterThan(1);
  for (const box of await tabs.evaluateAll((nodes) =>
    nodes.map((node) => node.getBoundingClientRect().height)
  )) {
    expect(box).toBeGreaterThanOrEqual(44);
  }

  const panel = page.locator('[role="tabpanel"]:visible');
  await expect(panel).toHaveCount(1);
  const firstLabel = await panel.getAttribute("aria-label");
  await tabs.nth(1).click();
  await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
  await expect(panel).toHaveCount(1);
  expect(await panel.getAttribute("aria-label")).not.toBe(firstLabel);

  const cards = page.locator(".iga-kcard:visible");
  if ((await cards.count()) > 0) {
    await expect(cards.first().locator(".iga-kmenu__button")).toBeVisible();
    await expect(cards.first().locator(".iga-kcard__handle")).toHaveCount(0);
  }

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
  expect(overflow).toBeLessThanOrEqual(0);

  // The refusal strip as a tab panel stays open: its summary must not collapse it to nothing.
  await tabs.last().click();
  const refusal = strip(page).locator("details");
  await expect(refusal).toHaveAttribute("open", "");
  await strip(page).locator("summary").click();
  await expect(refusal).toHaveAttribute("open", "");
});
