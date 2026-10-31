import { beforeEach, describe, expect, it, vi } from "vitest";

const sendMail = vi.fn();
vi.mock("@/lib/mail/send", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/mail/send")>()),
  sendMail,
}));

const { notifyNewLead } = await import("./notify-new-lead");

function fakeReq(lead: Record<string, unknown> | null) {
  const payload = {
    findByID: vi.fn(async () => lead),
    find: vi.fn(),
    findGlobal: vi.fn(),
    update: vi.fn(),
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  };
  return { payload } as never as Parameters<typeof notifyNewLead>[1] & { payload: typeof payload };
}

describe("notifyNewLead", () => {
  beforeEach(() => {
    sendMail.mockReset();
  });

  it("skips a lead that was already notified (retry after a crash before bookkeeping)", async () => {
    const req = fakeReq({ id: "lead-1", newLeadNotifiedAt: "2026-10-20T10:00:00.000Z" });
    await expect(notifyNewLead({ leadId: "lead-1" }, req)).resolves.toEqual({
      sentTo: [],
      skipped: "already-notified",
    });
    expect(sendMail).not.toHaveBeenCalled();
    expect(req.payload.update).not.toHaveBeenCalled();
    expect(req.payload.find).not.toHaveBeenCalled();
  });

  it("skips a deleted lead", async () => {
    const req = fakeReq(null);
    await expect(notifyNewLead({ leadId: "gone" }, req)).resolves.toEqual({
      sentTo: [],
      skipped: "lead-not-found",
    });
    expect(sendMail).not.toHaveBeenCalled();
  });
});
