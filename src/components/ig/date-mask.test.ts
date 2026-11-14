import { describe, expect, it } from "vitest";
import { formatRuDateFromIso, maskRuDate, parseRuDate } from "./date-mask";

describe("maskRuDate", () => {
  it.each([
    ["", ""],
    ["2", "2"],
    ["25", "25"],
    ["251", "25.1"],
    ["2512", "25.12"],
    ["25122", "25.12.2"],
    ["25122026", "25.12.2026"],
  ])("masks %j progressively", (input, expected) => {
    expect(maskRuDate(input)).toBe(expected);
  });

  it("ignores non-digits and extra digits", () => {
    expect(maskRuDate("25/12/2026")).toBe("25.12.2026");
    expect(maskRuDate("25.12.20261")).toBe("25.12.2026");
    expect(maskRuDate("ab")).toBe("");
  });

  it("drops the trailing dot after Backspace", () => {
    expect(maskRuDate("25.")).toBe("25");
    expect(maskRuDate("25.12.")).toBe("25.12");
  });
});

describe("parseRuDate", () => {
  it("converts a valid date to ISO", () => {
    expect(parseRuDate("25.12.2026")).toBe("2026-12-25");
    expect(parseRuDate("01.01.2027")).toBe("2027-01-01");
  });

  it("handles leap days", () => {
    expect(parseRuDate("29.02.2028")).toBe("2028-02-29");
    expect(parseRuDate("29.02.2027")).toBeNull();
    expect(parseRuDate("29.02.2100")).toBeNull();
    expect(parseRuDate("29.02.2000")).toBe("2000-02-29");
  });

  it("checks month boundaries", () => {
    expect(parseRuDate("31.01.2026")).toBe("2026-01-31");
    expect(parseRuDate("31.02.2026")).toBeNull();
    expect(parseRuDate("30.04.2026")).toBe("2026-04-30");
    expect(parseRuDate("31.04.2026")).toBeNull();
    expect(parseRuDate("31.12.2026")).toBe("2026-12-31");
    expect(parseRuDate("00.12.2026")).toBeNull();
    expect(parseRuDate("15.00.2026")).toBeNull();
    expect(parseRuDate("15.13.2026")).toBeNull();
  });

  it("rejects incomplete or malformed input", () => {
    expect(parseRuDate("")).toBeNull();
    expect(parseRuDate("25.12")).toBeNull();
    expect(parseRuDate("25.12.26")).toBeNull();
    expect(parseRuDate("2026-12-25")).toBeNull();
    expect(parseRuDate("00.00.0000")).toBeNull();
  });
});

describe("formatRuDateFromIso", () => {
  it("formats an ISO date", () => {
    expect(formatRuDateFromIso("2026-12-25")).toBe("25.12.2026");
    expect(formatRuDateFromIso("2028-02-29")).toBe("29.02.2028");
  });

  it("returns an empty string for empty or invalid ISO input", () => {
    expect(formatRuDateFromIso("")).toBe("");
    expect(formatRuDateFromIso("2027-02-29")).toBe("");
    expect(formatRuDateFromIso("25.12.2026")).toBe("");
  });

  it("round-trips with parseRuDate", () => {
    expect(parseRuDate(formatRuDateFromIso("2026-03-08"))).toBe("2026-03-08");
  });
});
