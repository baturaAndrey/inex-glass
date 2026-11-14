import { describe, expect, it } from "vitest";
import { formatPhoneMask, isPhoneComplete, phoneDigits, toE164 } from "./phone-mask";

const FULL = "+7 (900) 123-45-67";

describe("phoneDigits", () => {
  it.each([
    ["9001234567", "9001234567"],
    ["8 900 123-45-67", "9001234567"],
    ["89001234567", "9001234567"],
    ["79001234567", "9001234567"],
    ["+79001234567", "9001234567"],
    ["+7(900)1234567", "9001234567"],
    ["+7 (900) 123-45-67", "9001234567"],
    ["+7 8 900 123 45 67", "9001234567"],
  ])("normalises pasted %j", (input, expected) => {
    expect(phoneDigits(input)).toBe(expected);
  });

  it("keeps an 8 that is the first national digit after +7", () => {
    expect(phoneDigits("+7 (800) 555-35-35")).toBe("8005553535");
    expect(phoneDigits("+7 (8")).toBe("8");
  });

  it("drops a leading 7/8 typed as the first character", () => {
    expect(phoneDigits("8")).toBe("");
    expect(phoneDigits("8 (9")).toBe("9");
  });

  it("ignores extra characters and caps the length at 10 digits", () => {
    expect(phoneDigits("тел.: 900-123-45-67, доб. 12")).toBe("9001234567");
    expect(phoneDigits("+7 (900) 123-45-6789")).toBe("9001234567");
  });

  it("returns an empty string for empty or digit-less input", () => {
    expect(phoneDigits("")).toBe("");
    expect(phoneDigits("abc")).toBe("");
    expect(phoneDigits("+7 (")).toBe("");
  });
});

describe("formatPhoneMask", () => {
  it.each([
    ["9", "+7 (9"],
    ["900", "+7 (900"],
    ["9001", "+7 (900) 1"],
    ["90012", "+7 (900) 12"],
    ["9001234", "+7 (900) 123-4"],
    ["900123456", "+7 (900) 123-45-6"],
    ["9001234567", FULL],
  ])("formats partial input %j progressively", (input, expected) => {
    expect(formatPhoneMask(input)).toBe(expected);
  });

  it.each([
    "8 900 123-45-67",
    "89001234567",
    "79001234567",
    "+79001234567",
    "+7(900)1234567",
    "+7 (900) 123 45 67",
  ])("normalises pasted %j", (input) => {
    expect(formatPhoneMask(input)).toBe(FULL);
  });

  it("is idempotent on an already masked value", () => {
    expect(formatPhoneMask(FULL)).toBe(FULL);
    expect(formatPhoneMask("+7 (900) 12")).toBe("+7 (900) 12");
  });

  it("removes the trailing separator when the last digit is erased", () => {
    // Backspace after "+7 (900) 1" leaves "+7 (900) " in the input.
    expect(formatPhoneMask("+7 (900) ")).toBe("+7 (900");
    expect(formatPhoneMask("+7 (900) 123-")).toBe("+7 (900) 123");
  });

  it("returns an empty string for empty input", () => {
    expect(formatPhoneMask("")).toBe("");
    expect(formatPhoneMask("+7 (")).toBe("");
  });

  it("drops extra digits beyond 10", () => {
    expect(formatPhoneMask("900123456789")).toBe(FULL);
  });
});

describe("isPhoneComplete / toE164", () => {
  it("accepts exactly 10 national digits", () => {
    expect(isPhoneComplete(FULL)).toBe(true);
    expect(isPhoneComplete("89001234567")).toBe(true);
    expect(isPhoneComplete("+7 (900) 123-45")).toBe(false);
    expect(isPhoneComplete("")).toBe(false);
  });

  it("converts to E.164", () => {
    expect(toE164(FULL)).toBe("+79001234567");
    expect(toE164("8 900 123-45-67")).toBe("+79001234567");
    expect(toE164("+7 (900) 123")).toBeNull();
    expect(toE164("")).toBeNull();
  });
});
