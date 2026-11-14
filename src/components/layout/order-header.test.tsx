import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OrderHeader } from "./order-header";

vi.mock("next/navigation", () => ({ usePathname: () => "/zakaz/test-token/" }));

const CONTACTS = { phone: { display: "+7 (000) 000-00-00", href: "tel:+70000000000" } };

describe("OrderHeader", () => {
  it("links to the quiz without leaking the order token", () => {
    render(<OrderHeader contacts={CONTACTS} />);
    const links = screen.getAllByRole("link", { name: "Рассчитать стоимость" });
    expect(links).toHaveLength(2);
    for (const link of links) {
      const href = link.getAttribute("href") ?? "";
      expect(href).toMatch(/^\/raschet-stoimosti\/?\?src=%2Fzakaz%2F$/);
      expect(href).not.toContain("test-token");
    }
  });
});
