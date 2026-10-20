import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CONSENT_EVENT, CONSENT_STORAGE_KEY, clearConsent, setConsent } from "@/lib/consent";
import { CookieBanner } from "./cookie-banner";

const TEXT =
  "Мы используем файлы cookie и Яндекс.Метрику, чтобы сайт работал удобнее, а мы понимали, какие разделы полезны. Подробнее — в политике обработки персональных данных.";
const REGION = { name: "Уведомление о cookie" };

function resetStores() {
  window.localStorage.clear();
  document.cookie = "inex_consent=; Path=/; Max-Age=0";
}

beforeEach(resetStores);
afterEach(() => {
  vi.restoreAllMocks();
  resetStores();
});

describe("CookieBanner", () => {
  it("is not part of the server HTML (no hydration mismatch)", () => {
    expect(renderToString(<CookieBanner />)).toBe("");
  });

  it("shows the verbatim text, the policy link and both buttons when there is no choice", () => {
    render(<CookieBanner />);
    const region = screen.getByRole("region", REGION);
    expect(region.querySelector("p")?.textContent?.replace(/\s+/g, " ").trim()).toBe(TEXT);
    // next/link keeps the trailing slash only with the app config (trailingSlash: true).
    expect(
      screen.getByRole("link", { name: "политике обработки персональных данных" })
    ).toHaveAttribute("href", expect.stringMatching(/^\/politika-konfidencialnosti\/?$/));
    expect(screen.getByRole("button", { name: "Только необходимые" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Принять" })).toBeInTheDocument();
  });

  it("«Принять» stores `all`, fires inex:consent and hides the banner", async () => {
    const user = userEvent.setup();
    const listener = vi.fn();
    window.addEventListener(CONSENT_EVENT, listener);
    render(<CookieBanner />);

    await user.click(screen.getByRole("button", { name: "Принять" }));

    expect(window.localStorage.getItem(CONSENT_STORAGE_KEY)).toBe("all");
    expect(listener).toHaveBeenCalledTimes(1);
    expect((listener.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({ value: "all" });
    expect(screen.queryByRole("region", REGION)).toBeNull();
    window.removeEventListener(CONSENT_EVENT, listener);
  });

  it("«Только необходимые» stores `necessary`", async () => {
    const user = userEvent.setup();
    render(<CookieBanner />);
    await user.click(screen.getByRole("button", { name: "Только необходимые" }));
    expect(window.localStorage.getItem(CONSENT_STORAGE_KEY)).toBe("necessary");
    expect(screen.queryByRole("region", REGION)).toBeNull();
  });

  it("stays hidden on a repeat visit and reappears after clearConsent()", () => {
    setConsent("necessary");
    render(<CookieBanner />);
    expect(screen.queryByRole("region", REGION)).toBeNull();

    act(() => clearConsent());
    expect(screen.getByRole("region", REGION)).toBeInTheDocument();
  });

  it("does not move focus when it appears", () => {
    const outside = document.createElement("button");
    document.body.append(outside);
    outside.focus();
    render(<CookieBanner />);
    expect(outside).toHaveFocus();
    outside.remove();
  });
});
