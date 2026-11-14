import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Media } from "@/payload-types";
import { CtCards, type CtCardItem } from "./ct-cards-section";

const media = (name: string): Media =>
  ({
    id: name,
    url: `/api/media/file/${name}.webp`,
    alt: `Фото ${name}`,
    sizes: { card: { url: `/api/media/file/${name}-card.webp` } },
  }) as unknown as Media;

function render(items: CtCardItem[]) {
  const container = document.createElement("div");
  container.innerHTML = renderToStaticMarkup(<CtCards items={items} />);
  return container;
}

describe("CtCards", () => {
  it("renders text-only cards when no card has an image (prototype ct-card)", () => {
    const container = render([
      { key: "a", title: "Спецификация на согласование." },
      { key: "b", title: "Документы на партию.", href: "/kak-zakazat/dokumenty/" },
    ]);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector(".ig-ph")).toBeNull();
  });

  it("shows card images with sizes, and an image-less card keeps an equal media strip", () => {
    const container = render([
      { key: "clear", title: "Прозрачное" },
      {
        key: "matte",
        title: "Матовое",
        href: "/zakalennoe-steklo/matovoe/",
        image: media("gen-gt-matovoe"),
      },
    ]);
    const cards = container.querySelectorAll("[data-ct-cards] > li");
    expect(cards).toHaveLength(2);

    const img = cards[1]?.querySelector("img");
    expect(img?.getAttribute("alt")).toBe("Фото gen-gt-matovoe");
    expect(img?.getAttribute("src")).toContain("gen-gt-matovoe-card.webp");
    expect(img?.getAttribute("sizes")).toBeTruthy();
    // Below the fold: never a priority image (only the hero is).
    expect(img?.getAttribute("loading")).toBe("lazy");
    expect(img?.getAttribute("fetchpriority")).toBeNull();
    // The image sits above the title inside the link card.
    expect(cards[1]?.querySelector("a > div:first-child img")).toBeTruthy();

    expect(cards[0]?.querySelector("img")).toBeNull();
    expect(cards[0]?.querySelector(".ig-ph")).toBeTruthy();
  });
});
