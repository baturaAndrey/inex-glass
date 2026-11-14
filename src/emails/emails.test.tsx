// @vitest-environment node
// Server-side rendering of e-mails: no DOM needed (react-dom/server).
import { describe, expect, it } from "vitest";
import { NBSP } from "@/lib/domain";
import type { Lead } from "@/payload-types";
import { buildLeadEmailData, flagLabels, formatFileSize, summarizeAnswers } from "./format-answers";
import { DEFAULT_FOOTER_CONTACTS, footerFromContacts } from "./layout";
import { LeadAssignedEmail, leadAssignedSubject } from "./lead-assigned";
import { NewLeadEmail, newLeadSubject } from "./new-lead";
import { OrderStatusEmail, orderStatusSubject } from "./order-status";
import { renderEmail } from "./render";
import type { OrderStatusEmailProps } from "./order-status";

const SITE_URL = "https://inexglass.ru";
const footer = footerFromContacts(null, SITE_URL);
const FLEX_OR_GRID = /display:\s*(inline-)?(flex|grid)/i;

const lead: Lead = {
  id: "0b6e8c1a-3f0e-4c35-9a59-2d7f2d1b8a11",
  formType: "quiz",
  sourceLabel: "Квиз",
  entryPage: "/zakalennoe-steklo/10-mm/",
  pageUrl: "/raschet-stoimosti/",
  company: "ООО «Стеклострой»",
  inn: "7451234567",
  name: "Иван Петров",
  phone: "+79514890409",
  email: "ivan@example.com",
  role: "contractor",
  city: "Челябинск",
  area: 86,
  productType: "tempered",
  comment: "Нужна доставка на объект",
  answers: {
    type: "tempered",
    thickness: 10,
    kind: "low-iron",
    area: 86,
    positions: 42,
    maxW: 2000,
    maxH: 3000,
    edges: ["polished"],
    holes: { has: true, count: 4, diameters: [12, 20] },
    desiredDate: "2026-11-20",
    city: "Челябинск",
    packing: ["crate"],
    needDocs: true,
    uploadTokens: ["secret-token"],
  },
  flags: ["urgent", "needs_docs"],
  files: [
    {
      id: "f1",
      originalName: "plan.dwg",
      sizeBytes: 2_621_440,
      updatedAt: "2026-10-20T10:00:00.000Z",
      createdAt: "2026-10-20T10:00:00.000Z",
    },
  ],
  utm: { source: "yandex", medium: "cpc", yclid: "123" },
  isDuplicate: true,
  updatedAt: "2026-10-20T10:00:00.000Z",
  createdAt: "2026-10-20T10:00:00.000Z",
};

const leadData = buildLeadEmailData(lead, SITE_URL);

const signature = {
  name: "Анна Смирнова",
  title: "Менеджер по заказам Inex Glass",
  phone: "+7 (351) 247-05-57",
  email: "anna@inex.su",
};

const orderProps = (overrides: Partial<OrderStatusEmailProps> = {}): OrderStatusEmailProps => ({
  siteUrl: SITE_URL,
  footer,
  orderNumber: "2026-0147",
  status: "shipped",
  date: "2026-11-15T00:00:00.000Z",
  carrier: "Деловые Линии",
  waybill: "НК-123456",
  orderUrl: `${SITE_URL}/zakaz/AbCdEfGhIjKlMnOpQrStUv/`,
  signature,
  ...overrides,
});

function expectEmailBasics(html: string, text: string) {
  expect(html).toContain('width="600"');
  expect(html).not.toMatch(FLEX_OR_GRID);
  expect(html).not.toMatch(/<link[^>]+stylesheet/i);
  expect(html).toContain(`${SITE_URL}/email/logo@2x.png`);
  expect(html).toContain('alt="Inex Glass"');
  expect(text.trim().length).toBeGreaterThan(0);
}

describe("order status e-mail", () => {
  it("renders the shipped status with carrier and waybill", async () => {
    const { html, text } = await renderEmail(<OrderStatusEmail {...orderProps()} />);
    expectEmailBasics(html, text);
    expect(html).toContain("Статус заказа № 2026-0147: Отгружено");
    expect(html).toContain("Дата отгрузки");
    expect(html).toContain("15.11.2026");
    expect(html).toContain("Деловые Линии");
    expect(html).toContain("Номер накладной");
    expect(html).toContain("НК-123456");
    expect(html).toContain("Открыть страницу заказа");
    expect(html).toContain(`href="${SITE_URL}/zakaz/AbCdEfGhIjKlMnOpQrStUv/"`);
    expect(html).toContain("Фото упаковки, документы на партию и ссылка на отслеживание");
    expect(html).toContain("Вы получили это письмо, потому что оформили заказ в Inex Glass.");
    expect(html).toContain("Анна Смирнова");
    expect(text).toContain("Статус заказа № 2026-0147: Отгружено");
    expect(text).toContain("НК-123456");
  });

  it("renders in_production without the shipment rows", async () => {
    const { html, text } = await renderEmail(
      <OrderStatusEmail
        {...orderProps({
          status: "in_production",
          plannedDate: "2026-11-14",
          clientComment: "Срок перенесён на 14.11",
        })}
      />
    );
    expectEmailBasics(html, text);
    expect(html).toContain("Статус заказа № 2026-0147: В производстве");
    expect(html).not.toContain("Номер накладной");
    expect(html).not.toContain("Транспортная компания");
    expect(html).toContain("Плановая дата");
    expect(html).toContain("14.11.2026");
    expect(html).toContain("Срок перенесён на 14.11");
    expect(html).toContain("Все этапы заказа и документы — на странице заказа.");
  });

  it("omits rows without data", async () => {
    const { html } = await renderEmail(
      <OrderStatusEmail {...orderProps({ carrier: null, waybill: "  " })} />
    );
    expect(html).not.toContain("Транспортная компания");
    expect(html).not.toContain("Номер накладной");
  });

  it("builds the subject from the settings template", () => {
    expect(orderStatusSubject(null, "2026-0147", "Отгружено")).toBe(
      "Статус заказа № 2026-0147: Отгружено"
    );
    expect(orderStatusSubject("Заказ № {номер}: {статус}", "2026-0147", "Получено")).toBe(
      "Заказ № 2026-0147: Получено"
    );
  });
});

describe("new lead e-mail", () => {
  it("renders contacts, flags, answers, files and the admin button", async () => {
    const { html, text } = await renderEmail(
      <NewLeadEmail siteUrl={SITE_URL} footer={footer} lead={leadData} />
    );
    expectEmailBasics(html, text);
    expect(html).toContain("Новая заявка: Квиз — ООО «Стеклострой»");
    expect(html).toContain("Источник и страница входа");
    expect(html).toContain("/zakalennoe-steklo/10-mm/");
    expect(html).toContain('href="tel:+79514890409"');
    expect(html).toContain('href="mailto:ivan@example.com"');
    expect(html).toContain("Повторная заявка");
    expect(html).toContain("Срочно");
    expect(html).toContain("Нужны документы");
    expect(html).toContain("Осветлённое");
    expect(html).toContain("plan.dwg");
    expect(html).toContain(`${SITE_URL}/api/lead-files/f1/download/`);
    expect(html).toContain("utm_source");
    expect(html).toContain("Открыть заявку в админке");
    expect(html).toContain(`${SITE_URL}/admin/collections/leads/${lead.id}`);
    expect(html).not.toContain("secret-token");
    // Manager e-mails do not carry the client-only footer line.
    expect(html).not.toContain("Вы получили это письмо");
  });

  it("builds the subject from the source and the company (or the name)", () => {
    expect(newLeadSubject(leadData)).toBe("Новая заявка: Квиз — ООО «Стеклострой»");
    const noCompany = buildLeadEmailData({ ...lead, company: null }, SITE_URL);
    expect(newLeadSubject(noCompany)).toBe("Новая заявка: Квиз — Иван Петров");
  });
});

describe("lead assigned e-mail", () => {
  it("renders the short summary and the button", async () => {
    const { html, text } = await renderEmail(
      <LeadAssignedEmail siteUrl={SITE_URL} footer={footer} lead={leadData} assigneeName="Анна" />
    );
    expectEmailBasics(html, text);
    expect(html).toContain("Вам назначена заявка: Квиз — ООО «Стеклострой»");
    expect(html).toContain("Анна, вы назначены ответственным");
    expect(html).toContain("Открыть заявку");
    expect(leadAssignedSubject(leadData)).toBe("Вам назначена заявка: Квиз — ООО «Стеклострой»");
  });
});

describe("format-answers", () => {
  it("summarizes quiz answers in step order", () => {
    const rows = summarizeAnswers(lead.answers);
    expect(rows.map((row) => row.label)).toEqual([
      "Тип",
      "Толщина",
      "Вид",
      "Объём и размеры",
      "Обработка",
      "Желаемая дата",
      "Доставка",
      "Документы",
    ]);
    expect(rows.find((row) => row.label === "Желаемая дата")?.value).toBe("20.11.2026");
  });

  it("renders the triplex formula", () => {
    const rows = summarizeAnswers({
      type: "triplex",
      triplex: { glass1: 5, glass2: 5, film: 0.76 },
    });
    expect(rows).toContainEqual({
      label: "Формула триплекса",
      value: `5 + 5${NBSP}мм, плёнка 0,76${NBSP}мм`,
    });
  });

  it("ignores garbage", () => {
    expect(summarizeAnswers(null)).toEqual([]);
    expect(summarizeAnswers("text")).toEqual([]);
    expect(summarizeAnswers({ type: "nope", thickness: -1, edges: "x" })).toEqual([]);
  });

  it("maps flags and file sizes", () => {
    expect(flagLabels(["small_volume", "bogus"])).toEqual(["Малый объём"]);
    expect(formatFileSize(2_621_440)).toBe(`2,5${NBSP}МБ`);
    expect(formatFileSize(1000)).toBe(`1${NBSP}КБ`);
    expect(formatFileSize(undefined)).toBeNull();
  });
});

describe("footer contacts", () => {
  it("falls back to the constants without the contacts global", () => {
    expect(footer.lines).toEqual(DEFAULT_FOOTER_CONTACTS.lines);
    expect(footer.siteLabel).toBe("inexglass.ru");
  });

  it("builds lines from the contacts global", () => {
    const built = footerFromContacts(
      {
        locations: [
          {
            title: "Челябинск — склад и самовывоз",
            address: "Свердловский тракт, 7В",
            hours: "Пн–пт, 9:00–18:00",
            phones: [],
          },
        ],
      },
      SITE_URL
    );
    expect(built.lines).toEqual([DEFAULT_FOOTER_CONTACTS.lines[1]]);
  });
});
