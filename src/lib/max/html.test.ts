import { describe, expect, it } from "vitest";
import { escapeHtml, MAX_TEXT_LIMIT, truncateMaxText } from "./html";

describe("escapeHtml", () => {
  it("escapes & < > \" '", () => {
    expect(escapeHtml(`<a href="x">Tom & Jerry's</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/a&gt;"
    );
  });

  it("leaves plain text alone", () => {
    expect(escapeHtml("Иван, +7 900 000-00-00")).toBe("Иван, +7 900 000-00-00");
  });
});

describe("truncateMaxText", () => {
  it("returns short texts unchanged", () => {
    const text = "<b>Заявка</b> от Ивана";
    expect(truncateMaxText(text)).toBe(text);
    expect(truncateMaxText("x".repeat(MAX_TEXT_LIMIT))).toHaveLength(MAX_TEXT_LIMIT);
  });

  it("cuts to the limit and appends …", () => {
    const result = truncateMaxText("x".repeat(5000));
    expect(result.length).toBeLessThanOrEqual(MAX_TEXT_LIMIT);
    expect(result.endsWith("…")).toBe(true);
  });

  it("never leaves half a tag", () => {
    const text = `${"x".repeat(15)}<a href="https://inexglass.ru/">ссылка</a>`;
    const result = truncateMaxText(text, 25);
    expect(result).toBe(`${"x".repeat(15)}…`);
  });

  it("never leaves half an entity", () => {
    const text = `${"x".repeat(17)}&amp;&amp;&amp;`;
    const result = truncateMaxText(text, 20);
    expect(result).toBe(`${"x".repeat(17)}…`);
  });

  it("closes open <b> and <a> and stays within the limit", () => {
    const text = `<b>Заявка <a href="https://x.ru/">${"y".repeat(100)}</a></b>`;
    const result = truncateMaxText(text, 60);
    expect(result.length).toBeLessThanOrEqual(60);
    expect(result.endsWith("</a></b>…")).toBe(true);
    expect(result.startsWith('<b>Заявка <a href="https://x.ru/">')).toBe(true);
  });

  it("does not close tags that were already closed", () => {
    const text = `<b>Итого</b> ${"z".repeat(100)}`;
    const result = truncateMaxText(text, 40);
    expect(result).not.toContain("</b>…");
    expect(result.length).toBeLessThanOrEqual(40);
  });

  it("keeps the 4000 limit for a long realistic message", () => {
    const line = `<b>${escapeHtml("Ответ <клиента>")}</b> <i>${"текст ".repeat(10)}</i>\n`;
    const result = truncateMaxText(line.repeat(200));
    expect(result.length).toBeLessThanOrEqual(MAX_TEXT_LIMIT);
    expect(result).not.toMatch(/<[^>]*…$/);
    expect(result).not.toMatch(/&[#a-z0-9]*…$/i);
  });

  /** A lone UTF-16 surrogate: half of a character outside the BMP. */
  const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

  it.each([9, 10, 11, 12])("never splits a surrogate pair (limit %i)", (limit) => {
    // "abcdefg" + 😀 (2 units) puts a pair right at every possible cut point.
    const result = truncateMaxText(`abcdefg${"😀".repeat(10)}`, limit);
    expect(result.length).toBeLessThanOrEqual(limit);
    expect(result).not.toMatch(LONE_SURROGATE);
    expect(result.endsWith("…")).toBe(true);
  });

  it("never splits a grapheme cluster (emoji with a skin tone, combining marks)", () => {
    const thumbs = "👍🏽"; // 4 UTF-16 units, one grapheme
    for (let limit = 6; limit <= 14; limit++) {
      const result = truncateMaxText(`ab${thumbs.repeat(5)}`, limit);
      expect(result.length).toBeLessThanOrEqual(limit);
      expect(result.slice(2, -1).length % thumbs.length).toBe(0);
    }
    const combining = "й".repeat(10); // «й» as и + combining breve
    const cut = truncateMaxText(combining, 8);
    expect(cut.slice(0, -1).length % 2).toBe(0);
  });
});
