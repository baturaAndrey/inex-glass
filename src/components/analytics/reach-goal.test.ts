import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getConsent } from "@/lib/consent";
import { CLIENT_ID_TIMEOUT_MS, getClientId } from "./client-id";
import { GOALS, isGoalName, isMetrikaReady, isTrackablePath, reachGoal } from "./reach-goal";

vi.mock("@/lib/consent", () => ({ getConsent: vi.fn() }));

const COUNTER_ID = 12345678;
const consent = vi.mocked(getConsent);

/** Node has no `window`: install a minimal one with a counter stub. */
function installWindow(overrides: Record<string, unknown> = {}) {
  const ym = vi.fn();
  vi.stubGlobal("window", { ym, __INEX_YM_ID__: COUNTER_ID, ...overrides });
  return ym;
}

beforeEach(() => {
  consent.mockReturnValue("all");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  consent.mockReset();
});

describe("GOALS", () => {
  it("lists the ТЗ §10 goals without duplicates", () => {
    expect(new Set(GOALS).size).toBe(GOALS.length);
    expect(GOALS).toContain("quiz_step_7");
    expect(GOALS).toContain("click_phone");
  });

  it("isGoalName accepts only known goals", () => {
    expect(isGoalName("form_submit")).toBe(true);
    expect(isGoalName("quiz_step_8")).toBe(false);
    expect(isGoalName(undefined)).toBe(false);
  });
});

describe("reachGoal", () => {
  it("is a no-op on the server", () => {
    expect(typeof window).toBe("undefined");
    expect(() => reachGoal("form_submit")).not.toThrow();
    expect(isMetrikaReady()).toBe(false);
  });

  it.each([["necessary" as const], [null]])("is a no-op with consent %s", (value) => {
    consent.mockReturnValue(value);
    const ym = installWindow();
    reachGoal("form_submit", { form: "callback" });
    expect(ym).not.toHaveBeenCalled();
    expect(isMetrikaReady()).toBe(false);
  });

  it("is a no-op without an initialized counter", () => {
    const ym = installWindow({ __INEX_YM_ID__: undefined });
    reachGoal("click_email");
    expect(ym).not.toHaveBeenCalled();
  });

  it("is a no-op without ym", () => {
    installWindow({ ym: undefined });
    expect(() => reachGoal("click_email")).not.toThrow();
    expect(isMetrikaReady()).toBe(false);
  });

  it("sends the goal to the counter when ready", () => {
    const ym = installWindow();
    expect(isMetrikaReady()).toBe(true);
    reachGoal("quiz_submit", { type: "drawing" });
    expect(ym).toHaveBeenCalledWith(COUNTER_ID, "reachGoal", "quiz_submit", { type: "drawing" });
  });

  it("swallows errors thrown by ym", () => {
    installWindow({
      ym: () => {
        throw new Error("blocked");
      },
    });
    expect(() => reachGoal("file_upload")).not.toThrow();
  });
});

describe("isTrackablePath", () => {
  it.each([
    ["/", true],
    ["/steklo/", true],
    ["/zakazy-info/", true],
    [null, true],
    ["/zakaz", false],
    ["/zakaz/abc.def-token/", false],
    ["/ZAKAZ/x/", false],
    ["/admin", false],
    ["/admin/collections/leads", false],
  ])("%s → %s", (path, expected) => {
    expect(isTrackablePath(path)).toBe(expected);
  });
});

describe("getClientId", () => {
  it("resolves null without consent", async () => {
    consent.mockReturnValue("necessary");
    installWindow();
    await expect(getClientId()).resolves.toBeNull();
  });

  it("resolves the client id from the counter", async () => {
    const ym = installWindow();
    ym.mockImplementation((...args: unknown[]) => (args[2] as (id: unknown) => void)(1700));
    await expect(getClientId()).resolves.toBe("1700");
    expect(ym).toHaveBeenCalledWith(COUNTER_ID, "getClientID", expect.any(Function));
  });

  it("resolves null on timeout", async () => {
    vi.useFakeTimers();
    installWindow();
    const pending = getClientId();
    vi.advanceTimersByTime(CLIENT_ID_TIMEOUT_MS);
    await expect(pending).resolves.toBeNull();
  });
});
