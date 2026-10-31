import { describe, expect, it } from "vitest";
import { quizHref, quizSrc } from "./calc-link";

describe("quizSrc", () => {
  it("keeps trackable paths as they are", () => {
    expect(quizSrc("/")).toBe("/");
    expect(quizSrc("/zakalennoe-steklo/")).toBe("/zakalennoe-steklo/");
    // Whole-segment match only: `/zakazy` is a regular page.
    expect(quizSrc("/zakazy/")).toBe("/zakazy/");
  });

  it("strips the order token from /zakaz/<token>/", () => {
    expect(quizSrc("/zakaz/test-token/")).toBe("/zakaz/");
    expect(quizSrc("/zakaz/test-token")).toBe("/zakaz/");
    expect(quizSrc("/ZAKAZ/Secret-Token/")).toBe("/zakaz/");
    expect(quizSrc("/zakaz")).toBe("/zakaz/");
  });

  it("strips nested admin paths", () => {
    expect(quizSrc("/admin/collections/leads/42")).toBe("/admin/");
  });
});

describe("quizHref", () => {
  it("encodes the current path as src", () => {
    expect(quizHref("/zakalennoe-steklo/")).toBe(
      "/raschet-stoimosti/?src=%2Fzakalennoe-steklo%2F",
    );
  });

  it("never leaks the order token", () => {
    const href = quizHref("/zakaz/test-token/");
    expect(href).toBe("/raschet-stoimosti/?src=%2Fzakaz%2F");
    expect(href).not.toContain("test-token");
  });
});
