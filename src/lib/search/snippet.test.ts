import { describe, expect, it } from "vitest";
import { sanitizeSnippet, snippetSegments } from "./snippet";

describe("sanitizeSnippet", () => {
  it("keeps <mark> pairs and escapes the rest", () => {
    expect(sanitizeSnippet("толщина <mark>10</mark> мм & «вес»")).toBe(
      "толщина <mark>10</mark> мм &amp; «вес»"
    );
  });

  it("neutralizes <script> and attribute payloads", () => {
    const result = sanitizeSnippet(
      `<script>alert(1)</script><img src=x onerror=alert(1)> "q" 'a' <mark onclick="x">`
    );
    expect(result).not.toMatch(/<(?!\/?mark>)/);
    expect(result).toBe(
      "&lt;script&gt;alert(1)&lt;/script&gt;&lt;img src=x onerror=alert(1)&gt; &quot;q&quot; " +
        "&#39;a&#39; &lt;mark onclick=&quot;x&quot;&gt;"
    );
  });

  it("re-balances marks", () => {
    expect(sanitizeSnippet("</mark>а <mark>б <mark>в")).toBe("а <mark>б в</mark>");
  });

  it("treats non-strings as empty", () => {
    expect(sanitizeSnippet(null)).toBe("");
    expect(sanitizeSnippet(undefined)).toBe("");
  });
});

describe("snippetSegments", () => {
  it("splits a sanitized snippet and decodes entities", () => {
    expect(snippetSegments(sanitizeSnippet("a <mark>10</mark> & <b>"))).toEqual([
      { text: "a ", mark: false },
      { text: "10", mark: true },
      { text: " & <b>", mark: false },
    ]);
  });
});
