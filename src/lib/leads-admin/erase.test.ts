import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  collectFileIds,
  collectMaxMessageIds,
  consentRecordsWhere,
  deleteMaxMessages,
  isEraseConfirmed,
  isSameOrigin,
  pendingJobsWhere,
} from "./erase";
import type { Payload } from "payload";

const env = vi.hoisted(() => ({
  MAX_BOT_TOKEN: "token-0123456789abcdef" as string | undefined,
  MAX_ENABLED: false,
}));
vi.mock("@/lib/env", () => ({ getEnv: () => env }));

const maxDeleteMessage = vi.hoisted(() => vi.fn<(id: string) => Promise<void>>());
vi.mock("@/lib/max/client", () => ({ maxDeleteMessage }));

describe("isEraseConfirmed", () => {
  it("requires the exact confirmation word", () => {
    expect(isEraseConfirmed({ confirm: "УДАЛИТЬ" })).toBe(true);
    expect(isEraseConfirmed({ confirm: "удалить" })).toBe(false);
    expect(isEraseConfirmed({})).toBe(false);
    expect(isEraseConfirmed(null)).toBe(false);
    expect(isEraseConfirmed("УДАЛИТЬ")).toBe(false);
  });
});

describe("isSameOrigin", () => {
  it("compares origins and rejects missing or foreign ones", () => {
    expect(isSameOrigin("http://localhost:3000", "http://localhost:3000")).toBe(true);
    expect(isSameOrigin("https://inexglass.ru", "https://inexglass.ru/")).toBe(true);
    expect(isSameOrigin("https://evil.example", "https://inexglass.ru")).toBe(false);
    expect(isSameOrigin(null, "https://inexglass.ru")).toBe(false);
    expect(isSameOrigin("null", "https://inexglass.ru")).toBe(false);
  });
});

describe("collectFileIds", () => {
  it("merges populated and plain ids without duplicates", () => {
    expect(collectFileIds(["a", { id: "b" }, null], [{ id: "b" }, { id: "c" }])).toEqual([
      "a",
      "b",
      "c",
    ]);
    expect(collectFileIds(undefined, [])).toEqual([]);
  });
});

describe("consentRecordsWhere", () => {
  it("matches the lead link, the referenced record and orphans by contact hash", () => {
    expect(
      consentRecordsWhere({ leadId: "L", consentId: "C", phoneHash: "ph", emailHash: "eh" })
    ).toEqual({
      or: [
        { lead: { equals: "L" } },
        { id: { equals: "C" } },
        {
          and: [
            { lead: { exists: false } },
            { or: [{ phoneHash: { equals: "ph" } }, { emailHash: { equals: "eh" } }] },
          ],
        },
      ],
    });
  });

  it("uses only the lead link without consent id and hashes", () => {
    expect(
      consentRecordsWhere({ leadId: "L", consentId: null, phoneHash: null, emailHash: null })
    ).toEqual({ or: [{ lead: { equals: "L" } }] });
  });
});

describe("pendingJobsWhere", () => {
  it("targets only queued jobs of the lead", () => {
    expect(pendingJobsWhere("L")).toEqual({
      and: [
        { "input.leadId": { equals: "L" } },
        { completedAt: { exists: false } },
        { processing: { equals: false } },
      ],
    });
  });
});

describe("collectMaxMessageIds", () => {
  const production = { SITE_ENV: "production", MAX_INTERCEPT_CHAT_ID: undefined } as const;

  it("in production keeps unique non-empty string ids of every chat", () => {
    expect(
      collectMaxMessageIds(
        [
          { messageId: "mid.1", chatId: "-1" },
          { messageId: "mid.1", chatId: "-1" },
          { messageId: " mid.2 ", chatId: "-2" },
          { messageId: "" },
          { messageId: null },
          { messageId: 42 },
          {},
        ],
        production
      )
    ).toEqual(["mid.1", "mid.2"]);
    expect(collectMaxMessageIds([], production)).toEqual([]);
  });

  it("outside production keeps only messages of the intercept chat", () => {
    const rows = [
      { messageId: "mid.own", chatId: "-100" },
      { messageId: "mid.own2", chatId: " -100 " },
      { messageId: "mid.real", chatId: "-200" },
      { messageId: "mid.nochat" },
    ];
    for (const SITE_ENV of ["staging", "development"] as const) {
      expect(collectMaxMessageIds(rows, { SITE_ENV, MAX_INTERCEPT_CHAT_ID: "-100" })).toEqual([
        "mid.own",
        "mid.own2",
      ]);
    }
  });

  it("outside production without an intercept chat deletes nothing", () => {
    expect(
      collectMaxMessageIds([{ messageId: "mid.1", chatId: "-100" }], {
        SITE_ENV: "staging",
        MAX_INTERCEPT_CHAT_ID: undefined,
      })
    ).toEqual([]);
  });
});

describe("deleteMaxMessages (after the commit)", () => {
  const logger = { info: vi.fn(), warn: vi.fn() };
  const payload = { logger } as unknown as Payload;

  beforeEach(() => {
    env.MAX_BOT_TOKEN = "token-0123456789abcdef";
    env.MAX_ENABLED = false;
    logger.info.mockReset();
    logger.warn.mockReset();
    maxDeleteMessage.mockReset();
    maxDeleteMessage.mockResolvedValue(undefined);
  });

  it("deletes already-sent messages with a token even while MAX is switched off", async () => {
    await deleteMaxMessages(payload, "L", ["m1", "m2"]);
    expect(maxDeleteMessage.mock.calls).toEqual([["m1"], ["m2"]]);
    expect(logger.info).toHaveBeenCalledWith({
      event: "lead-erase-max-messages",
      leadId: "L",
      deleted: 2,
      failed: 0,
    });
  });

  it("counts failures without logging the API error", async () => {
    maxDeleteMessage.mockRejectedValueOnce(new Error("api said +7 900 000-00-00"));
    await deleteMaxMessages(payload, "L", ["m1", "m2"]);
    expect(logger.warn).toHaveBeenCalledWith({
      event: "lead-erase-max-messages",
      leadId: "L",
      deleted: 1,
      failed: 1,
    });
  });

  it("without a token only the count is logged (no ids)", async () => {
    env.MAX_BOT_TOKEN = undefined;
    env.MAX_ENABLED = true;
    await deleteMaxMessages(payload, "L", ["m1", "m2"]);
    expect(maxDeleteMessage).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith({
      event: "lead-erase-max-skipped",
      leadId: "L",
      count: 2,
    });
    expect(JSON.stringify(logger.warn.mock.calls)).not.toContain("m1");
  });

  it("does nothing without message ids", async () => {
    await deleteMaxMessages(payload, "L", []);
    expect(maxDeleteMessage).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalled();
  });
});
