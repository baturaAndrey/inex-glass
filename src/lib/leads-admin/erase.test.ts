import { describe, expect, it } from "vitest";
import {
  collectFileIds,
  consentRecordsWhere,
  isEraseConfirmed,
  isSameOrigin,
  pendingJobsWhere,
} from "./erase";

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
