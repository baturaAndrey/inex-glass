import { describe, expect, it } from "vitest";
import { buildCsv, CSV_BOM, csvCell, neutralizeFormula } from "./csv";

describe("neutralizeFormula", () => {
  it.each([
    "=SUM(A1)",
    "@cmd",
    "-1+1",
    "+cmd",
    "\tcmd",
    "\rcmd",
    "-",
    "=1",
    "-123",
    "-7 (351) 247-05-57",
    "+",
    "+ 7",
    "+(7)SUM(A1)",
    "+7SUM(A1)",
    "+7\t123",
    "=7",
    "@7",
  ])("guards %j with a leading quote", (value) => {
    expect(neutralizeFormula(value)).toBe(`'${value}`);
  });

  it.each([
    "+7 (351) 247-05-57",
    "+79001234567",
    "+7-351-247-05-57",
    "7451234567",
    "(351) 247-05-57",
  ])("keeps the phone-like %j as is", (value) => {
    expect(neutralizeFormula(value)).toBe(value);
  });

  it("does not treat a TAB before digits as a phone", () => {
    expect(neutralizeFormula("\t123")).toBe("'\t123");
  });

  it("leaves ordinary text and empty values alone", () => {
    expect(neutralizeFormula("ООО «Стекло»")).toBe("ООО «Стекло»");
    expect(neutralizeFormula("")).toBe("");
  });
});

describe("csvCell", () => {
  it("quotes every value and doubles inner quotes", () => {
    expect(csvCell('ООО "Ромашка"')).toBe('"ООО ""Ромашка"""');
  });

  it("keeps separators and line breaks inside the quotes", () => {
    expect(csvCell("a;b\r\nc")).toBe('"a;b\r\nc"');
  });

  it("renders empty values as an empty quoted string", () => {
    expect(csvCell(null)).toBe('""');
    expect(csvCell(undefined)).toBe('""');
  });

  it("guards formulas before quoting", () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
  });
});

describe("buildCsv", () => {
  it("starts with the BOM, uses ; and CRLF", () => {
    const csv = buildCsv(["Имя", "Телефон"], [["Иван", "+79001234567"]]);
    expect(csv.startsWith(CSV_BOM)).toBe(true);
    expect(csv).toBe(`${CSV_BOM}"Имя";"Телефон"\r\n"Иван";"+79001234567"\r\n`);
  });

  it("gives only the header line without rows", () => {
    expect(buildCsv(["A", "B"], [])).toBe(`${CSV_BOM}"A";"B"\r\n`);
  });
});
