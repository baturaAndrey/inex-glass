import { describe, expect, it, vi } from "vitest";
import { enqueueNotifyNewLead, NOTIFY_NEW_LEAD_TASK } from "./enqueue";
import type { Payload } from "payload";

const fakePayload = (queue: () => Promise<unknown>) => {
  const logger = { error: vi.fn(), warn: vi.fn() };
  const payload = { jobs: { queue: vi.fn(queue) }, logger } as unknown as Payload;
  return { payload, queue: payload.jobs.queue as ReturnType<typeof vi.fn>, logger };
};

describe("enqueueNotifyNewLead", () => {
  it("queues notify-new-lead with the lead id", async () => {
    const { payload, queue } = fakePayload(async () => ({ id: "job-1" }));
    await expect(enqueueNotifyNewLead(payload, "lead-1")).resolves.toBe(true);
    expect(queue).toHaveBeenCalledWith({ task: NOTIFY_NEW_LEAD_TASK, input: { leadId: "lead-1" } });
  });

  it("never throws when the queue fails and logs only the lead id", async () => {
    const { payload, logger } = fakePayload(async () => {
      throw new Error("relation payload_jobs does not exist");
    });
    await expect(enqueueNotifyNewLead(payload, "lead-2")).resolves.toBe(false);
    expect(logger.error).toHaveBeenCalledWith(
      { leadId: "lead-2", error: "relation payload_jobs does not exist" },
      expect.stringContaining(NOTIFY_NEW_LEAD_TASK)
    );
  });
});
