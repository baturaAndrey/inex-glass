import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StickyCta } from "./sticky-cta";

const pathname = vi.hoisted(() => ({ current: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }));

const LINK = { name: "Рассчитать стоимость" };

afterEach(() => {
  vi.restoreAllMocks();
  document.documentElement.style.removeProperty("--ig-sticky-h");
});

describe("StickyCta", () => {
  it("links to the quiz with the current page as src", () => {
    pathname.current = "/zakalennoe-steklo/10-mm/";
    render(<StickyCta />);
    // next/link keeps the trailing slash only with the app config (trailingSlash: true).
    expect(screen.getByRole("link", LINK)).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/raschet-stoimosti\/?\?src=%2Fzakalennoe-steklo%2F10-mm%2F$/)
    );
  });

  it.each(["/raschet-stoimosti/", "/raschet-stoimosti", "/zakaz/abc123/"])(
    "is hidden on %s",
    (path) => {
      pathname.current = path;
      render(<StickyCta />);
      expect(screen.queryByRole("link", LINK)).toBeNull();
    }
  );

  it("is shown on paths that only start like the excluded ones", () => {
    pathname.current = "/zakazat-obrazec/";
    render(<StickyCta />);
    expect(screen.getByRole("link", LINK)).toBeInTheDocument();
  });

  it("publishes its height as --ig-sticky-h and removes it on unmount", () => {
    pathname.current = "/";
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      height: 72.4,
    } as DOMRect);
    const { unmount } = render(<StickyCta />);
    expect(document.documentElement.style.getPropertyValue("--ig-sticky-h")).toBe("72px");
    unmount();
    expect(document.documentElement.style.getPropertyValue("--ig-sticky-h")).toBe("");
  });

  it("does not set the variable while hidden (zero height on desktop)", () => {
    pathname.current = "/";
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      height: 0,
    } as DOMRect);
    render(<StickyCta />);
    expect(document.documentElement.style.getPropertyValue("--ig-sticky-h")).toBe("");
  });
});
