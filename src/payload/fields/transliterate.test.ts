import { describe, expect, it } from "vitest";
import { SLUG_PATTERN, transliterate } from "./transliterate";

describe("transliterate", () => {
  it.each([
    ["Можно ли резать закалённое стекло", "mozhno-li-rezat-zakalennoe-steklo"],
    ["Для дизайнеров и архитекторов", "dlya-dizajnerov-i-arhitektorov"],
    ["Остекление веранд", "osteklenie-verand"],
    ["Застройщикам", "zastrojshchikam"],
    ["Матовое закалённое", "matovoe-zakalennoe"],
    ["Тонированное", "tonirovannoe"],
    ["Отверстия и вырезы", "otverstiya-i-vyrezy"],
    ["Стеклянные перегородки", "steklyannye-peregorodki"],
    ["Объекты", "obekty"],
    ["Цена, ½ м² — «акция»!", "cena-m-akciya"],
  ])("%s → %s", (input, expected) => {
    expect(transliterate(input)).toBe(expected);
    expect(SLUG_PATTERN.test(expected)).toBe(true);
  });

  it("keeps Latin letters and digits, lowercases, collapses and trims hyphens", () => {
    expect(transliterate("  10 MM -- Glass  ")).toBe("10-mm-glass");
    expect(transliterate("---")).toBe("");
  });

  it("folds Latin diacritics and ligatures to ASCII", () => {
    expect(transliterate("Café Müller")).toBe("cafe-muller");
    expect(transliterate("Señor Ångström")).toBe("senor-angstrom");
    expect(transliterate("Straße Łódź Æsir Øre")).toBe("strasse-lodz-aesir-ore");
    expect(transliterate("Šťastný Čech")).toBe("stastny-cech");
  });

  it("transliterates й and ё before stripping combining marks", () => {
    expect(transliterate("Йошкар-Ола ёлка")).toBe("joshkar-ola-elka");
  });
});

describe("SLUG_PATTERN", () => {
  it("accepts kebab-case only", () => {
    expect(SLUG_PATTERN.test("10-mm")).toBe(true);
    expect(SLUG_PATTERN.test("Bad")).toBe(false);
    expect(SLUG_PATTERN.test("a--b")).toBe(false);
    expect(SLUG_PATTERN.test("-a")).toBe(false);
    expect(SLUG_PATTERN.test("a_b")).toBe(false);
  });
});
