/**
 * Text helpers of the inex.su import (`scripts/import-inex/*`, task 37) — the wave-6 review
 * fixes: `<br>` handling, regions vs cities, the page date and the CMS stop-word list.
 */
import * as cheerio from "cheerio";
import { describe, expect, it } from "vitest";
import {
  blockText,
  cleanText,
  findPageDate,
  splitLocation,
} from "../../../scripts/import-inex/parse-objects";
import { cmsStopWordCheck } from "../../../scripts/import-inex/stop-words";

const KHP_VARNA =
  "<div class='opisanie'><p>Формирование пространства в офисе. <br>\n" +
  "Зонирование между кабинетами стационарными перегородками на алюминиевом профиле,<br>\n" +
  "двойной витраж стекло с жалюзи. <br>\n" +
  "Двери цельностеклянные в алюминиевой коробке.</p></div>";

const textOf = (html: string, legacyBr = false) =>
  blockText(cheerio.load(html), ".opisanie", { legacyBr });

describe("blockText", () => {
  it("keeps a single <br> inside the paragraph (a soft wrap, not a sentence end)", () => {
    expect(textOf(KHP_VARNA)).toBe(
      "Формирование пространства в офисе. Зонирование между кабинетами стационарными " +
        "перегородками на алюминиевом профиле, двойной витраж стекло с жалюзи. Двери " +
        "цельностеклянные в алюминиевой коробке."
    );
  });

  it("splits paragraphs on <p> and on a double <br>", () => {
    const html = "<div class='opisanie'><p>Первый.</p><p>Второй<br><br>\n Третий.</p></div>";
    expect(textOf(html).split("\n")).toEqual(["Первый.", "Второй", "Третий."]);
  });

  it("legacy mode reproduces the first import (every <br> was a paragraph)", () => {
    expect(textOf(KHP_VARNA, true).split("\n")).toHaveLength(4);
  });

  it("cleanText then keeps the wrapped sentence whole", () => {
    const { text } = cleanText(textOf(KHP_VARNA));
    expect(text).toContain("на алюминиевом профиле, двойной витраж стекло с жалюзи.");
    expect(text).not.toContain("\n");
  });
});

describe("splitLocation", () => {
  it("a city stays a city", () => {
    expect(splitLocation("Челябинск")).toEqual({ city: "Челябинск" });
    expect(splitLocation("поселок Соколиная гора")).toEqual({ city: "поселок Соколиная гора" });
    expect(splitLocation("Краснодар")).toEqual({ city: "Краснодар" });
  });

  it("a region is never a city", () => {
    expect(splitLocation("Челябинская область")).toEqual({ region: "Челябинская область" });
    expect(splitLocation("Ханты-Мансийский автономный округ – Югра")).toEqual({
      region: "Ханты-Мансийский автономный округ – Югра",
    });
    expect(splitLocation("ХМАО")).toEqual({ region: "ХМАО" });
    expect(splitLocation("Пермский край")).toEqual({ region: "Пермский край" });
  });

  it("city and region separated by a comma", () => {
    expect(splitLocation("Сатка, Челябинская область")).toEqual({
      city: "Сатка",
      region: "Челябинская область",
    });
  });

  it("empty location", () => {
    expect(splitLocation("")).toEqual({});
  });
});

describe("findPageDate", () => {
  const dateOf = (html: string) => findPageDate(cheerio.load(html), html);

  it("reads article:published_time, JSON-LD and <time>", () => {
    expect(
      dateOf("<meta property='article:published_time' content='2019-05-04T10:00:00+05:00'>")
    ).toBe("2019-05-04T05:00:00.000Z");
    expect(dateOf('<script>{"datePublished": "2018-03-01"}</script>')).toBe(
      "2018-03-01T00:00:00.000Z"
    );
    expect(
      dateOf("<div class='content_right'><time datetime='2017-11-02'>2 ноября</time></div>")
    ).toBe("2017-11-02T00:00:00.000Z");
  });

  it("no date (inex.su pages) and invalid dates", () => {
    expect(dateOf("<div class='content_right'><h1>Объект</h1></div>")).toBeUndefined();
    expect(dateOf("<meta property='article:published_time' content='вчера'>")).toBeUndefined();
  });
});

describe("cmsStopWordCheck", () => {
  const check = cmsStopWordCheck({
    stopWords: [
      { word: "стеклопакет", kind: "stem" },
      { word: "витраж", kind: "stem" },
      { word: "под ключ", kind: "phrase" },
      { word: "Завод Икс", kind: "factory" },
    ],
  });

  it("adds the CMS stems, phrases and factories to the built-in rules", () => {
    const found = check("Двойной витраж и стеклопакеты под ключ от завод икс, HST.");
    expect(found.map((f) => f.match)).toEqual([
      "витраж",
      "стеклопакеты",
      "под ключ",
      "завод икс",
      "HST",
    ]);
  });

  it("reports a place found by both lists once", () => {
    expect(check("стеклопакет")).toHaveLength(1);
  });

  it("stems match word starts only", () => {
    expect(check("предвитражный")).toEqual([]);
  });

  it("is the check cleanText reports", () => {
    const { notes } = cleanText("Двойной витраж.", check);
    expect(notes.filter((note) => note.kind === "stop-word")).toHaveLength(1);
  });
});
