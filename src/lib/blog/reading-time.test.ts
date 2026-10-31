import { describe, expect, it } from "vitest";
import { BLOG_WORDS_PER_MINUTE, estimateReadingMinutes } from "./reading-time";

const words = (count: number) => Array.from({ length: count }, () => "слово").join(" ");

describe("estimateReadingMinutes", () => {
  it("is at least one minute", () => {
    expect(estimateReadingMinutes("")).toBe(1);
    expect(estimateReadingMinutes("Коротко: нет.")).toBe(1);
  });

  it("rounds up by 200 words", () => {
    expect(BLOG_WORDS_PER_MINUTE).toBe(200);
    expect(estimateReadingMinutes(words(200))).toBe(1);
    expect(estimateReadingMinutes(words(201))).toBe(2);
    expect(estimateReadingMinutes(words(600))).toBe(3);
  });

  it("counts Cyrillic words, numbers and hyphenated words once", () => {
    expect(estimateReadingMinutes(`${words(199)} 5–6 одна-две`)).toBe(2);
  });
});
