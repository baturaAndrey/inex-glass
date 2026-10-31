import { describe, expect, it } from "vitest";
import { isTrackablePath, quizSrc } from "./quiz-src";

describe("isTrackablePath", () => {
  it.each([
    ["/", true],
    ["/zakazy/", true],
    [undefined, true],
    ["/zakaz/token/", false],
    ["/Admin/", false],
  ])("%s → %s", (path, expected) => {
    expect(isTrackablePath(path)).toBe(expected);
  });
});

describe("quizSrc", () => {
  it("keeps regular paths", () => {
    expect(quizSrc("/zakalennoe-steklo/10-mm/")).toBe("/zakalennoe-steklo/10-mm/");
  });

  it("collapses secret paths to their first segment", () => {
    expect(quizSrc("/zakaz/secret-token/")).toBe("/zakaz/");
    expect(quizSrc("/ADMIN/collections/leads/1")).toBe("/admin/");
  });
});
