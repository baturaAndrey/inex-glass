import { describe, expect, it } from "vitest";
import { checkStopWords, EXPERIENCE_PHRASE } from "./stop-words";
import type { StopRuleId } from "./stop-words";

const rulesOf = (text: string, opts?: Parameters<typeof checkStopWords>[1]) =>
  checkStopWords(text, opts).map((f) => f.rule);

describe("checkStopWords — built-in rules", () => {
  it.each<[StopRuleId, string, string]>([
    ["heat-soak", "Проводим Heat Soak Test для фасадов", "Закалка по ГОСТ 30698-2014"],
    ["heat-soak", "Возможна термовыдержка стекла", "Выдержка сроков"],
    ["hst", "Стекло с HST", "AHSTB — артикул"],
    ["stekloppaket", "Изготовление стеклопакетов", "Изготовление стекла"],
    ["own-production", "Собственное производство в Челябинске", "Производство в Челябинске"],
    ["harden-self", "Мы закаливаем сами", "Мы закаливаем стекло"],
    ["turnkey", "Монтаж под ключ", "Монтаж по договорённости"],
    ["armored", "Бронированное стекло", "Закалённое стекло"],
    ["smart-glass", "Смарт-стекло для офиса", "Стекло для офиса"],
    ["antiglare", "Антибликовое стекло", "Матовое стекло"],
    ["spy", "Стекло шпион", "Тонированное стекло"],
  ])("%s: «%s» is caught, «%s» is clean", (rule, positive, negative) => {
    expect(rulesOf(positive)).toContain(rule);
    expect(rulesOf(negative)).not.toContain(rule);
  });

  it("catches inflected forms and reports position", () => {
    const [finding] = checkStopWords("Не делаем стеклопакетов.");
    expect(finding).toMatchObject({ rule: "stekloppaket", match: "стеклопакетов", index: 10 });
    expect(finding?.message).toBeTruthy();
  });

  it("allows «монтаж под ключ» in a sentence bridging to inex.su", () => {
    expect(rulesOf("Монтаж под ключ — на inex.su. Стекло — у нас.")).not.toContain("turnkey");
    expect(rulesOf("Монтаж под ключ. Подробнее на inex.su.")).toContain("turnkey");
  });
});

describe("checkStopWords — experience", () => {
  it("flags any other wording", () => {
    expect(rulesOf("За 20 лет мы сделали 1000 проектов")).toEqual(["experience"]);
    expect(rulesOf("1500+ проектов за 21 год")).toEqual(["experience"]);
  });

  it("allows the exact phrase", () => {
    expect(checkStopWords(EXPERIENCE_PHRASE)).toEqual([]);
    expect(checkStopWords(`${EXPERIENCE_PHRASE}. Работаем по договору.`)).toEqual([]);
  });

  it("respects a custom phrase from site settings", () => {
    const phrase = "За 22 года специалисты Inex выполнили более 1600 проектов";
    expect(rulesOf(phrase, { experiencePhrase: phrase })).toEqual([]);
    expect(rulesOf(EXPERIENCE_PHRASE, { experiencePhrase: phrase })).toEqual(["experience"]);
  });
});

describe("checkStopWords — options", () => {
  it("catches partner factory names as whole words", () => {
    expect(rulesOf("Стекло от завод х", { partnerFactories: ["Завод Х"] })).toEqual([
      "partner-factory",
    ]);
    expect(rulesOf("Заводхолдинг", { partnerFactories: ["Завод"] })).toEqual([]);
  });

  it("supports extra stop-words", () => {
    expect(rulesOf("Лучшая цена", { extraStopWords: ["лучшая цена"] })).toEqual(["extra"]);
  });

  it("disables rules via ignoreRules", () => {
    expect(rulesOf("Стеклопакеты", { ignoreRules: ["stekloppaket"] })).toEqual([]);
    expect(
      rulesOf("Марка М1", { partnerFactories: ["М1"], ignoreRules: ["partner-factory"] })
    ).toEqual([]);
  });

  it("returns findings sorted by position", () => {
    const findings = checkStopWords("Стеклопакеты и HST, монтаж под ключ");
    expect(findings.map((f) => f.rule)).toEqual(["stekloppaket", "hst", "turnkey"]);
  });
});
