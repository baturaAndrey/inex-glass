import { describe, expect, it } from "vitest";
import { SEED_PRICES_2026_10_15 } from "@/lib/domain";
import type { PlaceholderContext } from "@/lib/domain";
import type { Page } from "@/payload-types";
import { pageBlockContext } from "./page-context";

const CTX: PlaceholderContext = {
  prices: SEED_PRICES_2026_10_15,
  promo: null,
  now: new Date("2026-10-20T07:00:00Z"),
  conditions: "Заказы от 50 м²",
  contacts: "+7 (351) 247-05-57",
  requisites: "ИП",
  phone: "+7 (351) 247-05-57",
};

const FAQ: NonNullable<Page["faq"]> = [
  {
    id: "q1",
    question: "Сколько стоит?",
    answer: {
      root: { type: "root", children: [], direction: null, format: "", indent: 0, version: 1 },
    },
  },
];

describe("pageBlockContext (catch-all → RenderBlocks `page`)", () => {
  it("passes path, resolved H1, faq and quiz pre-fill", () => {
    const result = pageBlockContext(
      {
        path: "/zakalennoe-steklo/",
        title: "Закалённое стекло",
        seo: { h1: "Закалённое  стекло на заказ" },
        faq: FAQ,
        quizPrefill: { type: "tempered", ctaLabel: "Рассчитать" },
      },
      "/fallback/",
      CTX
    );
    expect(result).toEqual({
      path: "/zakalennoe-steklo/",
      title: "Закалённое стекло на заказ",
      faq: FAQ,
      quizPrefill: { type: "tempered", ctaLabel: "Рассчитать" },
    });
  });

  it("falls back to the document title and the requested path", () => {
    const result = pageBlockContext(
      { path: null, title: "Как заказать", seo: { h1: "" }, faq: null, quizPrefill: {} },
      "/kak-zakazat/",
      CTX
    );
    expect(result.path).toBe("/kak-zakazat/");
    expect(result.title).toBe("Как заказать");
    expect(result.title).not.toBe("[…]");
  });
});
