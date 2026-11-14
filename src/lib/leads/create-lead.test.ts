import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_TECH_LIMITS } from "@/lib/domain";
import type { TechLimits } from "@/lib/domain";
import type { Payload } from "payload";

const cms = vi.hoisted(() => ({
  getTechLimits: vi.fn<() => Promise<TechLimits>>(),
  getHolidays: vi.fn<() => Promise<string[]>>(),
  getWorkdays: vi.fn<() => Promise<string[]>>(),
}));
vi.mock("@/lib/cms/globals", () => cms);

const { loadFlagSettings } = await import("./create-lead");

const logger = { warn: vi.fn() };
const payload = { logger } as unknown as Payload;

describe("loadFlagSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the CMS tech limits and production calendar", async () => {
    const limits: TechLimits = { ...DEFAULT_TECH_LIMITS, minAreaM2: 7 };
    cms.getTechLimits.mockResolvedValue(limits);
    cms.getHolidays.mockResolvedValue(["2026-11-04"]);
    cms.getWorkdays.mockResolvedValue(["2026-11-01"]);

    await expect(loadFlagSettings(payload)).resolves.toEqual({
      limits,
      holidays: ["2026-11-04"],
      workdays: ["2026-11-01"],
    });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("falls back to defaults per part when a CMS read fails", async () => {
    cms.getTechLimits.mockRejectedValue(new Error("db down"));
    cms.getHolidays.mockResolvedValue(["2026-11-04"]);
    cms.getWorkdays.mockRejectedValue(new Error("db down"));

    await expect(loadFlagSettings(payload)).resolves.toEqual({
      limits: DEFAULT_TECH_LIMITS,
      holidays: ["2026-11-04"],
      workdays: [],
    });
    expect(logger.warn).toHaveBeenCalledOnce();
  });
});
