import { describe, expect, it } from "vitest";
import { SEO_DESCRIPTION_SOFT_LIMIT, SEO_TITLE_SOFT_LIMIT } from "@/payload/fields/seo";
import {
  buildSnippet,
  clipForSnippet,
  counterState,
  SNIPPET_BRAND_SUFFIX,
  SNIPPET_UNTITLED,
} from "./snippet";

const ORIGIN = "https://inexglass.ru";

describe("counterState", () => {
  it("is empty for missing, blank and non-string values", () => {
    expect(counterState("", 70)).toEqual({ length: 0, limit: 70, state: "empty" });
    expect(counterState("   \n ", 70).state).toBe("empty");
    expect(counterState(null, 70).state).toBe("empty");
    expect(counterState(undefined, 70).state).toBe("empty");
    expect(counterState(42, 70).state).toBe("empty");
  });

  it("is ok up to the limit inclusive and over beyond it", () => {
    expect(counterState("а".repeat(SEO_TITLE_SOFT_LIMIT), SEO_TITLE_SOFT_LIMIT)).toEqual({
      length: 70,
      limit: 70,
      state: "ok",
    });
    expect(counterState("а".repeat(71), SEO_TITLE_SOFT_LIMIT)).toEqual({
      length: 71,
      limit: 70,
      state: "over",
    });
  });

  it("ignores edge whitespace", () => {
    expect(counterState(`  ${"x".repeat(70)}  `, 70)).toMatchObject({ length: 70, state: "ok" });
  });

  it("counts Cyrillic and emoji by characters, not UTF-16 units", () => {
    expect(counterState("Закалённое стекло", 70).length).toBe(17);
    expect(counterState("стекло 🔥", 70).length).toBe(8);
    expect(counterState("😀".repeat(70), 70).state).toBe("ok");
  });

  it("uses the description limit of 170", () => {
    expect(SEO_DESCRIPTION_SOFT_LIMIT).toBe(170);
    expect(counterState("д".repeat(170), SEO_DESCRIPTION_SOFT_LIMIT).state).toBe("ok");
    expect(counterState("д".repeat(171), SEO_DESCRIPTION_SOFT_LIMIT).state).toBe("over");
  });
});

describe("buildSnippet", () => {
  it("uses the SEO title as is", () => {
    const snippet = buildSnippet({
      seoTitle: "  Закалённое стекло на заказ  ",
      docTitle: "Закалённое стекло",
      origin: ORIGIN,
    });
    expect(snippet.title).toBe("Закалённое стекло на заказ");
    expect(snippet.titleIsFallback).toBe(false);
  });

  it("falls back to the document title with the brand suffix", () => {
    const snippet = buildSnippet({ seoTitle: " ", docTitle: "Закалённое стекло", origin: ORIGIN });
    expect(snippet.title).toBe(`Закалённое стекло${SNIPPET_BRAND_SUFFIX}`);
    expect(snippet.title).toBe("Закалённое стекло | Inex Glass");
    expect(snippet.titleIsFallback).toBe(true);
  });

  it("does not add the suffix when the document title already names the brand", () => {
    const snippet = buildSnippet({ docTitle: "О компании Inex Glass", origin: ORIGIN });
    expect(snippet.title).toBe("О компании Inex Glass");
  });

  it("shows «Без заголовка» without any title", () => {
    const snippet = buildSnippet({ seoTitle: null, docTitle: "", origin: ORIGIN });
    expect(snippet.title).toBe(SNIPPET_UNTITLED);
    expect(snippet.titleIsFallback).toBe(false);
  });

  it("builds the URL line from the host and the path segments", () => {
    expect(buildSnippet({ path: "/", origin: ORIGIN }).url).toBe("inexglass.ru");
    expect(buildSnippet({ path: "/zakalennoe-steklo/10-mm/", origin: ORIGIN }).url).toBe(
      "inexglass.ru › zakalennoe-steklo › 10-mm"
    );
    expect(buildSnippet({ origin: ORIGIN }).url).toBe("inexglass.ru");
    expect(buildSnippet({ path: null, origin: "http://localhost:3100" }).url).toBe(
      "localhost:3100"
    );
  });

  it("keeps the description or returns null for a blank one", () => {
    expect(buildSnippet({ seoDescription: " Текст ", origin: ORIGIN }).description).toBe("Текст");
    expect(buildSnippet({ seoDescription: "  ", origin: ORIGIN }).description).toBeNull();
    expect(buildSnippet({ origin: ORIGIN }).description).toBeNull();
  });

  it("detects placeholders in the title or the description", () => {
    expect(buildSnippet({ seoTitle: "Стекло {N} мм", origin: ORIGIN }).hasPlaceholders).toBe(true);
    expect(
      buildSnippet({ seoTitle: "Стекло", seoDescription: "от {цена} ₽", origin: ORIGIN })
        .hasPlaceholders
    ).toBe(true);
    expect(buildSnippet({ seoTitle: "Стекло 10 мм", origin: ORIGIN }).hasPlaceholders).toBe(false);
    expect(buildSnippet({ seoTitle: "Пустые {} скобки", origin: ORIGIN }).hasPlaceholders).toBe(
      false
    );
  });

  it("reports noindex", () => {
    expect(buildSnippet({ origin: ORIGIN, noindex: true }).noindex).toBe(true);
    expect(buildSnippet({ origin: ORIGIN, noindex: null }).noindex).toBe(false);
    expect(buildSnippet({ origin: ORIGIN }).noindex).toBe(false);
  });
});

describe("clipForSnippet", () => {
  it("keeps a short text unchanged", () => {
    expect(clipForSnippet("Закалённое стекло", 70)).toBe("Закалённое стекло");
    expect(clipForSnippet("x".repeat(70), 70)).toBe("x".repeat(70));
  });

  it("cuts a long text at a word boundary and adds «…»", () => {
    const text =
      "Закалённое стекло на заказ по чертежу с проверкой спецификации до закалки и упаковкой";
    const clipped = clipForSnippet(text, 70);
    expect(clipped.endsWith("…")).toBe(true);
    expect([...clipped].length).toBeLessThanOrEqual(70);
    const visible = clipped.slice(0, -1);
    expect(text.startsWith(visible)).toBe(true);
    // The cut lands between words: the next character of the source is a space.
    expect(text[visible.length]).toBe(" ");
  });

  it("drops trailing punctuation before «…»", () => {
    const text = `${"слово ".repeat(10)}конец, ещё немного текста для обрезки`;
    const clipped = clipForSnippet(text, 66);
    expect(clipped).not.toMatch(/[,\s]…$/u);
    expect(clipped.endsWith("…")).toBe(true);
  });

  it("cuts inside a very long word when there is no usable boundary", () => {
    const clipped = clipForSnippet("а".repeat(200), 70);
    expect([...clipped].length).toBe(70);
    expect(clipped.endsWith("…")).toBe(true);
  });
});
