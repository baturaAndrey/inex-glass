import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FooterShell } from "./footer-shell";
import { OrderFooter } from "./order-footer";

const pathname = vi.hoisted(() => ({ current: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }));

const CONTACTS = {
  phone: { display: "+7 (000) 000-00-00", href: "tel:+70000000000" },
  email: "sale@example.com",
  locations: [
    { title: "Челябинск — офис", address: "ул. Артиллерийская, 124А", detail: "" },
    { title: "Екатеринбург", address: "ул. Данилы Зверева, 17б", detail: "" },
  ],
};

const FULL = <footer data-testid="full-footer">Каталог</footer>;

describe("FooterShell", () => {
  beforeEach(() => {
    pathname.current = "/";
  });

  it("renders the full site footer outside the order page", () => {
    pathname.current = "/zakazy/";
    render(<FooterShell full={FULL} order={<OrderFooter contacts={CONTACTS} />} />);
    expect(screen.getByTestId("full-footer")).toBeTruthy();
    expect(screen.queryByText(/Inex Glass ·/)).toBeNull();
  });

  it("renders the minimal order footer on /zakaz/<token>/", () => {
    pathname.current = "/zakaz/test-token/";
    render(<FooterShell full={FULL} order={<OrderFooter contacts={CONTACTS} />} />);
    expect(screen.queryByTestId("full-footer")).toBeNull();

    const footer = screen.getByRole("contentinfo");
    expect(footer.querySelector("nav")).toBeNull();
    expect(screen.getByRole("link", { name: CONTACTS.phone.display }).getAttribute("href")).toBe(
      CONTACTS.phone.href
    );
    expect(screen.getByRole("link", { name: CONTACTS.email }).getAttribute("href")).toBe(
      `mailto:${CONTACTS.email}`
    );
    expect(footer.textContent).toContain(
      "Челябинск, ул. Артиллерийская, 124А · Екатеринбург, ул. Данилы Зверева, 17б"
    );
  });
});
