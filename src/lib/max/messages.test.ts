import { describe, expect, it } from "vitest";
import type { Lead } from "@/payload-types";
import { MAX_TEXT_LIMIT } from "./html";
import {
  assignedMessage,
  leadAdminUrl,
  newLeadMessage,
  orderAdminUrl,
  orderEventMessage,
  statusChangeMessage,
  toLeadForMessage,
  unassignedReminderMessage,
} from "./messages";
import type { LeadForMessage } from "./messages";

const NBSP = " ";
const HTTPS = { siteUrl: "https://inexglass.ru" };
const HTTP = { siteUrl: "http://localhost:3000" };

const LEAD: LeadForMessage = {
  id: "lead-1",
  formType: "quiz",
  company: "ООО «Стекло»",
  name: "Иван",
  phone: "+79991234567",
  city: "Челябинск",
  productType: "triplex",
  area: 12.5,
  estimateFrom: 168000,
  estimatePriceDate: "2026-10-15",
  flags: ["urgent", "no_file"],
  isDuplicate: true,
  comment: "Нужно быстро",
  kpAmount: 250000,
  createdAt: "2026-10-20T07:30:00.000Z",
};

describe("admin links", () => {
  it("points at the lead summary with a trailing slash", () => {
    expect(leadAdminUrl("https://inexglass.ru/", "abc")).toBe(
      "https://inexglass.ru/admin/collections/leads/abc/summary/"
    );
    expect(orderAdminUrl("https://inexglass.ru", "o-1")).toBe(
      "https://inexglass.ru/admin/collections/orders/o-1/"
    );
  });
});

describe("newLeadMessage", () => {
  it("lists contacts, product, estimate with NBSP, flags and a link button", () => {
    const message = newLeadMessage(LEAD, HTTPS);
    const lines = message.text.split("\n");
    expect(lines[0]).toBe("<b>Новая заявка · Квиз</b>");
    expect(message.text).toContain("ООО «Стекло» · Иван");
    expect(message.text).toContain("Телефон: +79991234567");
    expect(message.text).toContain("Город: Челябинск");
    expect(message.text).toContain(`Изделие: Триплекс, 12,5${NBSP}м²`);
    expect(message.text).toContain(`Ориентир: от 168${NBSP}000${NBSP}₽ на 15.10.2026`);
    expect(message.text).toContain("Флаги: Срочно, Без файла");
    expect(message.text).toContain("Повторное обращение");
    expect(message.text).toContain("Комментарий: Нужно быстро");
    expect(message.buttons).toEqual([
      [
        {
          text: "Открыть заявку",
          url: "https://inexglass.ru/admin/collections/leads/lead-1/summary/",
        },
      ],
    ]);
  });

  it("escapes HTML in every value", () => {
    const message = newLeadMessage(
      { ...LEAD, company: `<b>A&B</b> "x"`, comment: "<script>&" },
      HTTPS
    );
    expect(message.text).toContain("&lt;b&gt;A&amp;B&lt;/b&gt; &quot;x&quot;");
    expect(message.text).toContain("Комментарий: &lt;script&gt;&amp;");
    expect(message.text).not.toContain("<script>");
  });

  it("drops empty lines", () => {
    const message = newLeadMessage(
      {
        ...LEAD,
        company: null,
        city: null,
        productType: null,
        area: null,
        estimateFrom: null,
        flags: [],
        isDuplicate: false,
        comment: null,
      },
      HTTPS
    );
    expect(message.text.split("\n")).toEqual([
      "<b>Новая заявка · Квиз</b>",
      "Иван",
      "Телефон: +79991234567",
    ]);
  });

  it("cuts the comment and keeps the message within the limit", () => {
    const long = "я".repeat(10_000);
    const message = newLeadMessage({ ...LEAD, comment: long, company: "&".repeat(5000) }, HTTPS);
    expect(message.text.length).toBeLessThanOrEqual(MAX_TEXT_LIMIT);
    const comment = newLeadMessage({ ...LEAD, comment: long }, HTTPS).text;
    expect(comment).toContain(`Комментарий: ${"я".repeat(300)}…`);
    expect(comment).not.toContain("я".repeat(301));
  });

  it("puts the link into the text when the site is not https", () => {
    const message = newLeadMessage(LEAD, HTTP);
    expect(message.buttons).toBeUndefined();
    expect(message.text.split("\n").at(-1)).toBe(
      "Открыть заявку: http://localhost:3000/admin/collections/leads/lead-1/summary/"
    );
  });
});

describe("assignedMessage", () => {
  it("names who assigned", () => {
    const message = assignedMessage(LEAD, { assignedBy: "Пётр <admin>" }, HTTPS);
    expect(message.text.split("\n")[0]).toBe("<b>Вам назначена заявка</b>");
    expect(message.text).toContain("Назначил: Пётр &lt;admin&gt;");
    expect(message.text).toContain("Телефон: +79991234567");
  });
});

describe("statusChangeMessage", () => {
  const base = { reason: null, changedBy: "Система", isContract: false };

  it("shows «from → to»", () => {
    const message = statusChangeMessage(LEAD, { ...base, from: "Новая", to: "В работе" }, HTTPS);
    expect(message.text.split("\n")[0]).toBe("<b>Статус заявки: «Новая» → «В работе»</b>");
    expect(message.text).toContain("Изменил: Система");
    expect(message.text).not.toContain("Сумма КП");
  });

  it("shows only the new status without «from»", () => {
    const message = statusChangeMessage(LEAD, { ...base, from: null, to: "В работе" }, HTTPS);
    expect(message.text.split("\n")[0]).toBe("<b>Статус заявки: «В работе»</b>");
  });

  it("adds the refusal reason and the offer amount for a contract", () => {
    const refused = statusChangeMessage(
      LEAD,
      { ...base, from: "КП", to: "Отказ", reason: "Дорого: <нашли дешевле>" },
      HTTPS
    );
    expect(refused.text).toContain("Причина: Дорого: &lt;нашли дешевле&gt;");
    const contract = statusChangeMessage(
      LEAD,
      { ...base, from: "КП", to: "Договор", isContract: true },
      HTTPS
    );
    expect(contract.text).toContain(`Сумма КП: 250${NBSP}000${NBSP}₽`);
  });
});

describe("unassignedReminderMessage", () => {
  it("states the hours and the creation time in the company time zone", () => {
    const message = unassignedReminderMessage(LEAD, { hours: 3 }, HTTPS);
    expect(message.text.split("\n")[0]).toBe("<b>Заявка без ответственного больше 3 ч</b>");
    expect(message.text).toMatch(/Создана: 20\.10\.2026 \d{2}:30/);
  });
});

describe("orderEventMessage", () => {
  const order = { id: "o-1", number: "2026-0007", company: null, leadCompany: "ООО Лид" };

  it("announces a new order without the client's phone", () => {
    const message = orderEventMessage(order, { isNew: true, statusLabel: "x" }, HTTPS);
    expect(message.text).toBe(`<b>Создан заказ №${NBSP}2026-0007</b>\nКомпания: ООО Лид`);
    expect(message.buttons?.[0]?.[0]).toEqual({
      text: "Открыть заказ",
      url: "https://inexglass.ru/admin/collections/orders/o-1/",
    });
  });

  it("shows the stage of an existing order", () => {
    const message = orderEventMessage(
      { ...order, company: "ООО Заказ" },
      { isNew: false, statusLabel: "Отгружено" },
      HTTPS
    );
    expect(message.text).toBe(`<b>Заказ №${NBSP}2026-0007: Отгружено</b>\nКомпания: ООО Заказ`);
  });
});

describe("toLeadForMessage", () => {
  it("flattens a lead document", () => {
    const lead = {
      id: "l",
      formType: "drawing",
      name: " Иван ",
      phone: "+7",
      company: "",
      estimate: { from: 100, priceDate: "2026-10-01" },
      flags: ["urgent"],
      isDuplicate: null,
      createdAt: "2026-10-01T00:00:00.000Z",
      updatedAt: "2026-10-01T00:00:00.000Z",
    } as unknown as Lead;
    expect(toLeadForMessage(lead)).toMatchObject({
      id: "l",
      name: "Иван",
      company: null,
      estimateFrom: 100,
      estimatePriceDate: "2026-10-01",
      flags: ["urgent"],
      isDuplicate: false,
      area: null,
    });
  });
});
