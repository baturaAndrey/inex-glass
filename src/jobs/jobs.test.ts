import { mkdtemp, readdir, rm, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanupTmpDir, TMP_UPLOAD_MAX_AGE_MS } from "./cleanup-tmp-uploads";
import { orderStatusSkipReason } from "./send-order-status";

describe("cleanupTmpDir", () => {
  let dir: string;
  const now = new Date("2026-10-20T12:00:00.000Z");

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "inex-tmp-uploads-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  async function file(name: string, ageMs: number) {
    const target = path.join(dir, name);
    await writeFile(target, "x");
    const time = new Date(now.getTime() - ageMs);
    await utimes(target, time, time);
  }

  it("deletes files older than 24 h and keeps fresh ones", async () => {
    await file("old.part", TMP_UPLOAD_MAX_AGE_MS + 60_000);
    await file("old.dwg", TMP_UPLOAD_MAX_AGE_MS * 3);
    await file("fresh.pdf", 60_000);
    expect(await cleanupTmpDir(dir, now)).toBe(2);
    expect(await readdir(dir)).toEqual(["fresh.pdf"]);
    // Idempotent.
    expect(await cleanupTmpDir(dir, now)).toBe(0);
  });

  it("respects the batch limit", async () => {
    await file("a", TMP_UPLOAD_MAX_AGE_MS * 2);
    await file("b", TMP_UPLOAD_MAX_AGE_MS * 2);
    expect(await cleanupTmpDir(dir, now, TMP_UPLOAD_MAX_AGE_MS, 1)).toBe(1);
  });

  it("is a no-op for a missing directory", async () => {
    expect(await cleanupTmpDir(path.join(dir, "missing"), now)).toBe(0);
  });
});

describe("orderStatusSkipReason", () => {
  const now = new Date("2026-10-20T12:00:00.000Z");
  const order = {
    revoked: false,
    expiresAt: null,
    notifyClient: true,
    clientEmail: "client@example.com",
    statusHistory: [{ status: "spec_agreed" as const, date: "2026-10-01" }],
  };

  it("sends for an active order with an e-mail", () => {
    expect(orderStatusSkipReason(order, "spec_agreed", now)).toBeNull();
  });

  it.each([
    [{ revoked: true }, "link-revoked"],
    [{ expiresAt: "2026-10-20T11:59:59.000Z" }, "link-expired"],
    [{ notifyClient: false }, "notifications-off"],
    [{ clientEmail: "  " }, "no-client-email"],
    [{ clientEmail: null }, "no-client-email"],
  ])("skips %j → %s", (patch, reason) => {
    expect(orderStatusSkipReason({ ...order, ...patch }, "spec_agreed", now)).toBe(reason);
  });

  it("skips a status that is not in the history", () => {
    expect(orderStatusSkipReason(order, "shipped", now)).toBe("status-not-in-history");
  });
});

describe("isJobsRunnerEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it.each([
    [undefined, false],
    ["false", false],
    ["true", true],
  ])("JOBS_ENABLED=%s → %s", async (value, expected) => {
    vi.resetModules();
    vi.stubEnv("DATABASE_URL", "postgresql://test:test@127.0.0.1:1/test");
    vi.stubEnv("PAYLOAD_SECRET", "test-payload-secret-test-payload-secret");
    vi.stubEnv("JOBS_ENABLED", value ?? "");
    const { isJobsRunnerEnabled } = await import("./index");
    expect(isJobsRunnerEnabled()).toBe(expected);
  });
});

describe("describeError (job logs)", () => {
  it("logs a Postgres/SMTP error without its message", async () => {
    const { describeError } = await import("./shared");
    const pg = Object.assign(
      new Error("duplicate key value: Key (email)=(a@b.ru) already exists"),
      {
        code: "23505",
      }
    );
    expect(describeError(pg)).toBe("Error code=23505");
  });
});
