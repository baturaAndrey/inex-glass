import { describe, expect, it } from "vitest";
import { SEED_PRICES_2026_10_15 } from "@/lib/domain";
import { buildQuizHref, fillLabel, prefillToQuizParams } from "./quiz-cta";

describe("buildQuizHref", () => {
  it("without parameters: the quiz page with a trailing slash", () => {
    expect(buildQuizHref()).toBe("/raschet-stoimosti/");
    expect(buildQuizHref({})).toBe("/raschet-stoimosti/");
  });

  it("encodes the page context in a fixed key order", () => {
    expect(
      buildQuizHref({
        src: "/zakalennoe-steklo/10-mm/",
        vid: "clear",
        thick: 10,
        type: "tempered",
      })
    ).toBe(
      "/raschet-stoimosti/?type=tempered&thick=10&vid=clear&src=%2Fzakalennoe-steklo%2F10-mm%2F"
    );
  });

  it("keeps the order for the calculator parameters", () => {
    expect(
      buildQuizHref({
        resume: true,
        film: 2,
        t2: 6,
        t1: 4,
        q: 3,
        h: 2000,
        w: 1000,
        type: "triplex",
      })
    ).toBe("/raschet-stoimosti/?type=triplex&w=1000&h=2000&q=3&t1=4&t2=6&film=2&resume=1");
  });

  it("skips undefined, null, empty strings, false and non-finite numbers", () => {
    expect(
      buildQuizHref({
        type: null,
        thick: undefined,
        vid: undefined,
        src: "  ",
        w: Number.NaN,
        resume: false,
      })
    ).toBe("/raschet-stoimosti/");
  });

  it("masks a secret src (order token, admin) — also when passed directly", () => {
    const href = buildQuizHref({ type: "tempered", src: "/zakaz/secret-token/" });
    expect(href).toBe("/raschet-stoimosti/?type=tempered&src=%2Fzakaz%2F");
    expect(href).not.toContain("secret-token");
    expect(buildQuizHref({ src: "/admin/collections/leads/1" })).toBe(
      "/raschet-stoimosti/?src=%2Fadmin%2F"
    );
  });

  it("passes CMS ids through as is (no mapping)", () => {
    expect(buildQuizHref({ type: "shopfronts", vid: "low-iron" })).toBe(
      "/raschet-stoimosti/?type=shopfronts&vid=low-iron"
    );
  });
});

describe("prefillToQuizParams", () => {
  it("maps the CMS group: thickness (select string) → thick, kind → vid", () => {
    expect(
      prefillToQuizParams(
        { type: "tempered", thickness: "8", kind: "matte" },
        "/zakalennoe-steklo/"
      )
    ).toEqual({ type: "tempered", thick: 8, vid: "matte", src: "/zakalennoe-steklo/" });
  });

  it("masks the order token in src", () => {
    expect(prefillToQuizParams({ type: "tempered" }, "/zakaz/secret-token/").src).toBe("/zakaz/");
  });

  it("URL aliases win and empty values are dropped", () => {
    expect(prefillToQuizParams({ thickness: "8", thick: 12, kind: "clear", vid: "bent" })).toEqual({
      type: undefined,
      thick: 12,
      vid: "bent",
      src: undefined,
    });
    expect(prefillToQuizParams(null)).toEqual({
      type: undefined,
      thick: undefined,
      vid: undefined,
      src: undefined,
    });
  });
});

describe("fillLabel", () => {
  const ctx = {
    prices: SEED_PRICES_2026_10_15,
    promo: null,
    now: new Date("2026-10-20T07:00:00Z"),
    conditions: "",
    contacts: "",
    requisites: "",
    phone: "",
  };

  it("substitutes placeholders of a CMS label", () => {
    const label = fillLabel("Рассчитать от {цена_10мм} ₽", ctx);
    expect(label).not.toContain("{");
    expect(label).toMatch(/^Рассчитать от \d/);
  });

  it("returns blank labels as empty and keeps text without a context", () => {
    expect(fillLabel("   ", ctx)).toBe("");
    expect(fillLabel(null, ctx)).toBe("");
    expect(fillLabel(" {цена_10мм} ", null)).toBe("{цена_10мм}");
  });
});
