import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearConsent, setConsent } from "@/lib/consent";

/** Mutable navigation state behind the mocked `next/navigation` hooks. */
const nav = vi.hoisted(() => ({ pathname: "/", search: "" }));

vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search),
}));

// Render tag.js as an inert element: tests must never hit mc.yandex.ru.
vi.mock("next/script", () => ({
  default: ({ id, src }: { id: string; src: string }) => <div data-testid={id} data-src={src} />,
}));

const COUNTER_ID = 987654;

/** Fresh module graph per test: `metrika-client.tsx` keeps per-document counter state. */
async function loadModules() {
  vi.resetModules();
  const { MetrikaClient } = await import("./metrika-client");
  const { ClickTracker } = await import("./click-tracker");
  const consent = await import("@/lib/consent");
  return { MetrikaClient, ClickTracker, consent };
}

/** Navigates the jsdom location and the mocked router hooks together. */
function navigate(path: string) {
  window.history.pushState(null, "", path);
  const url = new URL(window.location.href);
  nav.pathname = url.pathname;
  nav.search = url.search.slice(1);
}

function ymCalls(method: string) {
  const queue = (window.ym as unknown as { a?: unknown[][] } | undefined)?.a ?? [];
  return queue.filter((args) => args[1] === method);
}

beforeEach(() => {
  window.localStorage.clear();
  clearConsent();
  delete window.ym;
  delete window.__INEX_YM_ID__;
  navigate("/");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("MetrikaClient", () => {
  it("loads nothing until the visitor accepts, then initializes once with one hit", async () => {
    const { MetrikaClient, consent } = await loadModules();
    const { queryByTestId } = render(<MetrikaClient counterId={COUNTER_ID} webvisor />);

    expect(window.ym).toBeUndefined();
    expect(queryByTestId("ym-init")).toBeNull();

    act(() => consent.setConsent("necessary"));
    expect(window.ym).toBeUndefined();
    expect(queryByTestId("ym-init")).toBeNull();

    act(() => consent.setConsent("all"));
    expect(queryByTestId("ym-init")).toHaveAttribute(
      "data-src",
      "https://mc.yandex.ru/metrika/tag.js"
    );
    expect(window.__INEX_YM_ID__).toBe(COUNTER_ID);
    expect(ymCalls("init")).toEqual([
      [
        COUNTER_ID,
        "init",
        expect.objectContaining({ webvisor: true, defer: true, trackLinks: true }),
      ],
    ]);
    expect(ymCalls("hit")).toEqual([[COUNTER_ID, "hit", "http://localhost:3000/"]]);
  });

  it("sends exactly one hit per client navigation with the previous url as referer", async () => {
    setConsent("all");
    const { MetrikaClient } = await loadModules();
    const view = render(<MetrikaClient counterId={COUNTER_ID} webvisor />);
    expect(ymCalls("hit")).toHaveLength(1);

    navigate("/steklo/?t=8");
    view.rerender(<MetrikaClient counterId={COUNTER_ID} webvisor />);
    view.rerender(<MetrikaClient counterId={COUNTER_ID} webvisor />);

    expect(ymCalls("hit")).toEqual([
      [COUNTER_ID, "hit", "http://localhost:3000/"],
      [
        COUNTER_ID,
        "hit",
        "http://localhost:3000/steklo/?t=8",
        expect.objectContaining({ referer: "http://localhost:3000/" }),
      ],
    ]);
  });

  it("never initializes or loads tag.js on the order page", async () => {
    setConsent("all");
    navigate("/zakaz/secret-token/");
    const { MetrikaClient } = await loadModules();
    const { queryByTestId } = render(<MetrikaClient counterId={COUNTER_ID} webvisor={false} />);

    expect(window.ym).toBeUndefined();
    expect(window.__INEX_YM_ID__).toBeUndefined();
    expect(queryByTestId("ym-init")).toBeNull();
  });
});

describe("ClickTracker", () => {
  async function setup() {
    setConsent("all");
    const ym = vi.fn();
    window.ym = ym;
    window.__INEX_YM_ID__ = COUNTER_ID;
    const { ClickTracker } = await loadModules();
    render(<ClickTracker />);
    return ym;
  }

  it("tracks tel:/mailto: links added after mount without sending the contact itself", async () => {
    const ym = await setup();
    document.body.insertAdjacentHTML(
      "beforeend",
      '<a href="tel:+74950000000" data-goal-place="header"><span>Позвонить</span></a>' +
        '<a href="MAILTO:info@example.ru">Почта</a>'
    );
    const phoneLabel = document.querySelector('a[href^="tel:"] span')!;
    const mail = document.querySelector('a[href^="MAILTO:"]')!;

    fireEvent.click(phoneLabel);
    fireEvent.click(mail, { ctrlKey: true });
    fireEvent(mail, new MouseEvent("auxclick", { bubbles: true, button: 1 }));
    fireEvent(mail, new MouseEvent("auxclick", { bubbles: true, button: 2 }));

    expect(ym.mock.calls).toEqual([
      [COUNTER_ID, "reachGoal", "click_phone", { place: "header" }],
      [COUNTER_ID, "reachGoal", "click_email", { place: "link" }],
      [COUNTER_ID, "reachGoal", "click_email", { place: "link" }],
    ]);
    document.body.innerHTML = "";
  });

  it("tracks known data-goal values only and keeps the default action", async () => {
    const ym = await setup();
    document.body.insertAdjacentHTML(
      "beforeend",
      '<button data-goal="calc_to_quiz">Квиз</button><button data-goal="evil">x</button>'
    );
    const good = document.querySelector('[data-goal="calc_to_quiz"]')!;
    const bad = document.querySelector('[data-goal="evil"]')!;

    const notPrevented = fireEvent.click(good);
    fireEvent.click(bad);

    expect(notPrevented).toBe(true);
    expect(ym.mock.calls).toEqual([[COUNTER_ID, "reachGoal", "calc_to_quiz", undefined]]);
    document.body.innerHTML = "";
  });

  it("marks links to the order page so trackLinks skips them", async () => {
    await setup();
    document.body.insertAdjacentHTML("beforeend", '<a href="/zakaz/token/">Заказ</a>');
    const link = document.querySelector("a")!;
    link.addEventListener("click", (event) => event.preventDefault());

    fireEvent.click(link);

    expect(link).toHaveClass("ym-disable-tracklink");
    document.body.innerHTML = "";
  });

  it("sends nothing without consent", async () => {
    const ym = await setup();
    clearConsent();
    document.body.insertAdjacentHTML("beforeend", '<a href="tel:+74950000000">x</a>');
    fireEvent.click(document.querySelector("a")!);
    expect(ym).not.toHaveBeenCalled();
    document.body.innerHTML = "";
  });
});
