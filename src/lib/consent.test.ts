// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CONSENT_COOKIE,
  CONSENT_EVENT,
  CONSENT_STORAGE_KEY,
  clearConsent,
  getConsent,
  onConsentChange,
  parseConsent,
  setConsent,
  type ConsentEventDetail,
} from "./consent";

function readCookie(name: string): string | undefined {
  return document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function expireCookie() {
  document.cookie = `${CONSENT_COOKIE}=; Path=/; Max-Age=0`;
}

/** Makes every localStorage call throw, like Safari private mode / blocked site data. */
function blockLocalStorage() {
  const fail = () => {
    throw new DOMException("blocked", "SecurityError");
  };
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(fail);
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(fail);
  vi.spyOn(Storage.prototype, "removeItem").mockImplementation(fail);
}

beforeEach(() => {
  window.localStorage.clear();
  expireCookie();
});

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
  expireCookie();
});

describe("parseConsent", () => {
  it("accepts only known values", () => {
    expect(parseConsent("all")).toBe("all");
    expect(parseConsent("necessary")).toBe("necessary");
    expect(parseConsent("yes")).toBeNull();
    expect(parseConsent("")).toBeNull();
    expect(parseConsent(null)).toBeNull();
    expect(parseConsent(undefined)).toBeNull();
  });
});

describe("getConsent / setConsent", () => {
  it("returns null when nothing is stored", () => {
    expect(getConsent()).toBeNull();
  });

  it.each(["all", "necessary"] as const)("stores %s in localStorage and the cookie", (value) => {
    setConsent(value);
    expect(window.localStorage.getItem(CONSENT_STORAGE_KEY)).toBe(value);
    expect(readCookie(CONSENT_COOKIE)).toBe(value);
    expect(getConsent()).toBe(value);
  });

  it("overwrites a previous choice", () => {
    setConsent("necessary");
    setConsent("all");
    expect(getConsent()).toBe("all");
  });

  it("ignores garbage in localStorage and falls back to the cookie", () => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, "garbage");
    expect(getConsent()).toBeNull();
    document.cookie = `${CONSENT_COOKIE}=necessary; Path=/`;
    expect(getConsent()).toBe("necessary");
  });

  it("reads the cookie when localStorage was wiped", () => {
    setConsent("all");
    window.localStorage.clear();
    expect(getConsent()).toBe("all");
  });

  it("falls back to the cookie when localStorage is unavailable", () => {
    blockLocalStorage();
    expect(() => setConsent("necessary")).not.toThrow();
    expect(readCookie(CONSENT_COOKIE)).toBe("necessary");
    expect(getConsent()).toBe("necessary");
  });

  it("returns null when both stores are unavailable", () => {
    blockLocalStorage();
    vi.spyOn(document, "cookie", "get").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    expect(getConsent()).toBeNull();
  });

  it("writes the cookie for one year, site-wide, SameSite=Lax (no Secure on http)", () => {
    const setter = vi.spyOn(document, "cookie", "set");
    setConsent("all");
    const written = setter.mock.calls.at(-1)?.[0];
    expect(written).toBe(`${CONSENT_COOKIE}=all; Path=/; Max-Age=31536000; SameSite=Lax`);
  });

  it("adds Secure on https", () => {
    const setter = vi.spyOn(document, "cookie", "set").mockImplementation(() => {});
    vi.spyOn(window, "location", "get").mockReturnValue({
      ...window.location,
      protocol: "https:",
    });
    setConsent("necessary");
    expect(setter.mock.calls.at(-1)?.[0]).toMatch(/; SameSite=Lax; Secure$/);
  });
});

describe("clearConsent", () => {
  it("removes both stores", () => {
    setConsent("all");
    clearConsent();
    expect(window.localStorage.getItem(CONSENT_STORAGE_KEY)).toBeNull();
    expect(readCookie(CONSENT_COOKIE)).toBeUndefined();
    expect(getConsent()).toBeNull();
  });
});

describe("events", () => {
  it("dispatches inex:consent with the value on set and null on clear", () => {
    const details: ConsentEventDetail[] = [];
    const listener = (event: Event) => {
      details.push((event as CustomEvent<ConsentEventDetail>).detail);
    };
    window.addEventListener(CONSENT_EVENT, listener);
    setConsent("all");
    setConsent("necessary");
    clearConsent();
    window.removeEventListener(CONSENT_EVENT, listener);
    expect(details).toEqual([{ value: "all" }, { value: "necessary" }, { value: null }]);
  });

  it("onConsentChange notifies until unsubscribed", () => {
    const cb = vi.fn();
    const unsubscribe = onConsentChange(cb);
    setConsent("all");
    clearConsent();
    expect(cb.mock.calls).toEqual([["all"], [null]]);

    unsubscribe();
    setConsent("necessary");
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it("onConsentChange reacts to other tabs via the storage event", () => {
    const cb = vi.fn();
    const unsubscribe = onConsentChange(cb);

    // Another tab wrote the value: this tab only sees the storage event.
    window.localStorage.setItem(CONSENT_STORAGE_KEY, "necessary");
    window.dispatchEvent(new StorageEvent("storage", { key: CONSENT_STORAGE_KEY }));
    // Unrelated keys are ignored.
    window.dispatchEvent(new StorageEvent("storage", { key: "something-else" }));
    // localStorage.clear() in another tab (key === null).
    window.localStorage.clear();
    window.dispatchEvent(new StorageEvent("storage", { key: null }));

    expect(cb.mock.calls).toEqual([["necessary"], [null]]);
    unsubscribe();
  });

  it("does not let one subscriber's unsubscribe affect another", () => {
    const first = vi.fn();
    const second = vi.fn();
    const unsubscribeFirst = onConsentChange(first);
    const unsubscribeSecond = onConsentChange(second);
    unsubscribeFirst();
    setConsent("all");
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith("all");
    unsubscribeSecond();
  });
});
