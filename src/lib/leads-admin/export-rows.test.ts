import { describe, expect, it } from "vitest";
import {
  answersText,
  EXPORT_COLUMNS,
  EXPORT_HEADERS,
  exportFileName,
  flagsText,
  formatDateTime,
  toCsvValues,
  toExportRow,
} from "./export-rows";
import type { ExportLead, ExportLookups } from "./export-rows";

const lookups: ExportLookups = {
  statusNames: new Map([["s-new", "Новая"]]),
  userNames: new Map([["u-1", "Анна"]]),
};

const lead: ExportLead = {
  createdAt: "2026-10-19T19:30:00.000Z",
  formType: "quiz",
  sourceLabel: "Квиз",
  entryPage: "/zakalennoe-steklo/",
  company: "ООО «Стекло»",
  inn: "7451234567",
  name: "Иван",
  phone: "+79001234567",
  email: "ivan@example.com",
  role: "contractor",
  city: "Челябинск",
  area: 12.5,
  productType: "tempered",
  comment: "  Срочно  ",
  status: "s-new",
  refuseReason: null,
  assignee: "u-1",
  flags: ["urgent", "no_file"],
  isDuplicate: true,
  utm: { source: "yandex", medium: "cpc", campaign: null, content: "" },
  metrikaClientId: "123",
  files: ["f1", "f2"],
  answers: { type: "tempered", area: 12.5 },
};

describe("EXPORT_COLUMNS", () => {
  it("has the agreed order and Russian headers", () => {
    expect(EXPORT_HEADERS).toEqual([
      "Дата создания",
      "Источник",
      "Метка источника",
      "Страница входа",
      "Компания",
      "ИНН",
      "Имя",
      "Телефон",
      "E-mail",
      "Роль",
      "Город",
      "Площадь, м²",
      "Тип изделия",
      "Комментарий",
      "Статус",
      "Причина отказа",
      "Ответственный",
      "Флаги",
      "Повтор",
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "Client ID",
      "Файлов",
      "Ответы",
    ]);
    expect(EXPORT_COLUMNS).toHaveLength(27);
  });
});

describe("toExportRow", () => {
  it("maps a lead in column order", () => {
    const row = toExportRow(lead, lookups);
    expect(row).toHaveLength(EXPORT_COLUMNS.length);
    expect(row[0]).toEqual(new Date("2026-10-19T19:30:00.000Z"));
    expect(row.slice(1)).toEqual([
      "Квиз",
      "Квиз",
      "/zakalennoe-steklo/",
      "ООО «Стекло»",
      "7451234567",
      "Иван",
      "+79001234567",
      "ivan@example.com",
      "Подрядчик",
      "Челябинск",
      12.5,
      "Закалённое стекло",
      "Срочно",
      "Новая",
      null,
      "Анна",
      "Срочно; Без файла",
      "Да",
      "yandex",
      "cpc",
      null,
      null,
      null,
      "123",
      2,
      '{"type":"tempered","area":12.5}',
    ]);
  });

  it("fills empty values with null and «Нет»", () => {
    const row = toExportRow(
      { createdAt: "2026-10-20T00:00:00.000Z", formType: "callback", name: "", phone: "" },
      lookups
    );
    expect(row[1]).toBe("Заказать звонок");
    expect(row.slice(2, 18).every((value) => value === null)).toBe(true);
    expect(row[18]).toBe("Нет");
    expect(row[25]).toBe(0);
    expect(row[26]).toBeNull();
  });

  it("falls back to the id of an unknown status or user", () => {
    const row = toExportRow({ ...lead, status: "s-x", assignee: "u-x" }, lookups);
    expect(row[14]).toBe("s-x");
    expect(row[16]).toBe("u-x");
  });
});

describe("formatting", () => {
  it("formats dates in the company time zone", () => {
    expect(formatDateTime("2026-10-19T19:30:00.000Z")).toBe("20.10.2026 00:30");
    expect(formatDateTime("2026-12-31T19:05:00.000Z")).toBe("01.01.2027 00:05");
    expect(formatDateTime("bad")).toBe("");
  });

  it("renders CSV values: dates, decimal comma, strings as is", () => {
    expect(toCsvValues([new Date("2026-10-20T05:07:00.000Z"), 12.5, 3, "x", null])).toEqual([
      "20.10.2026 10:07",
      "12,5",
      "3",
      "x",
      null,
    ]);
  });

  it("labels flags and skips unknown ones", () => {
    expect(flagsText(["small_volume", "bogus", "needs_docs"])).toBe("Малый объём; Нужны документы");
    expect(flagsText([])).toBeNull();
    expect(flagsText(null)).toBeNull();
  });

  it("serializes answers into one line", () => {
    expect(answersText({ a: "x\ny" })).toBe('{"a":"x\\ny"}');
    expect(answersText({})).toBeNull();
    expect(answersText(null)).toBeNull();
    expect(answersText("x".repeat(40_000))?.length).toBe(32_001);
  });

  it("names the file after the period", () => {
    expect(exportFileName("2026-09-21", "2026-10-20", "csv")).toBe(
      "leads_2026-09-21_2026-10-20.csv"
    );
  });
});
