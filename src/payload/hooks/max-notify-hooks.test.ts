import { beforeEach, describe, expect, it, vi } from "vitest";

const env = { MAX_ENABLED: true };
vi.mock("@/lib/env", () => ({ getEnv: () => env }));

const { leadMaxNotify } = await import("./lead-max-notify");
const { orderMaxNotify } = await import("./order-max-notify");

const CHANGED_AT = "2026-10-22T09:00:00.000Z";

function hookArgs(options: {
  operation: "create" | "update";
  doc: Record<string, unknown>;
  previousDoc?: Record<string, unknown>;
  context?: Record<string, unknown>;
  queue?: ReturnType<typeof vi.fn>;
}) {
  const queue = options.queue ?? vi.fn().mockResolvedValue({ id: "job" });
  const logger = { error: vi.fn() };
  const req = { payload: { jobs: { queue }, logger } };
  const args = {
    operation: options.operation,
    doc: options.doc,
    previousDoc: options.previousDoc ?? {},
    context: options.context ?? {},
    req,
  } as never;
  const inputs = () =>
    queue.mock.calls.map(([call]) => {
      expect(call).toMatchObject({ task: "max-notify", req });
      return (call as { input: unknown }).input;
    });
  return { args, queue, logger, inputs };
}

beforeEach(() => {
  env.MAX_ENABLED = true;
});

describe("leadMaxNotify", () => {
  it("queues new_lead on create", async () => {
    const { args, inputs } = hookArgs({ operation: "create", doc: { id: "L", status: "new" } });
    const doc = await leadMaxNotify(args);
    expect(doc).toEqual({ id: "L", status: "new" });
    expect(inputs()).toEqual([{ event: "new_lead", leadId: "L" }]);
  });

  it("also queues assigned when created with an assignee", async () => {
    const { args, inputs } = hookArgs({ operation: "create", doc: { id: "L", assignee: "U" } });
    await leadMaxNotify(args);
    expect(inputs()).toEqual([
      { event: "new_lead", leadId: "L" },
      { event: "assigned", leadId: "L", assigneeId: "U" },
    ]);
  });

  it("queues assigned when the assignee changes", async () => {
    const { args, inputs } = hookArgs({
      operation: "update",
      doc: { id: "L", assignee: { id: "U2" }, status: "s" },
      previousDoc: { id: "L", assignee: "U1", status: "s" },
    });
    await leadMaxNotify(args);
    expect(inputs()).toEqual([{ event: "assigned", leadId: "L", assigneeId: "U2" }]);
  });

  it("queues nothing for the same assignee and status", async () => {
    const { args, queue } = hookArgs({
      operation: "update",
      doc: { id: "L", assignee: "U1", status: "s", statusChangedAt: CHANGED_AT },
      previousDoc: { id: "L", assignee: { id: "U1" }, status: "s" },
    });
    await leadMaxNotify(args);
    expect(queue).not.toHaveBeenCalled();
  });

  it("queues status_change with statusChangedAt and the previous status", async () => {
    const { args, inputs } = hookArgs({
      operation: "update",
      doc: { id: "L", status: "work", statusChangedAt: CHANGED_AT },
      previousDoc: { id: "L", status: { id: "new" } },
    });
    await leadMaxNotify(args);
    expect(inputs()).toEqual([
      { event: "status_change", leadId: "L", statusChangedAt: CHANGED_AT, previousStatus: "new" },
    ]);
  });

  it("skips status_change without statusChangedAt", async () => {
    const { args, queue } = hookArgs({
      operation: "update",
      doc: { id: "L", status: "work" },
      previousDoc: { id: "L", status: "new" },
    });
    await leadMaxNotify(args);
    expect(queue).not.toHaveBeenCalled();
  });

  it("respects skipMaxNotify, skipAssigneeNotify and MAX_ENABLED", async () => {
    const skipped = hookArgs({
      operation: "create",
      doc: { id: "L", assignee: "U" },
      context: { skipMaxNotify: true },
    });
    await leadMaxNotify(skipped.args);
    expect(skipped.queue).not.toHaveBeenCalled();

    const noAssignee = hookArgs({
      operation: "update",
      doc: { id: "L", assignee: "U2" },
      previousDoc: { id: "L", assignee: "U1" },
      context: { skipAssigneeNotify: true },
    });
    await leadMaxNotify(noAssignee.args);
    expect(noAssignee.queue).not.toHaveBeenCalled();

    env.MAX_ENABLED = false;
    const off = hookArgs({ operation: "create", doc: { id: "L" } });
    await leadMaxNotify(off.args);
    expect(off.queue).not.toHaveBeenCalled();
  });

  it("logs a queueing error without failing the save", async () => {
    const queue = vi.fn().mockRejectedValue(new TypeError("db down"));
    const { args, logger } = hookArgs({ operation: "create", doc: { id: "L" }, queue });
    await expect(leadMaxNotify(args)).resolves.toEqual({ id: "L" });
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ leadId: "L", error: "TypeError" })
    );
  });
});

describe("orderMaxNotify", () => {
  it("queues order_event on create", async () => {
    const { args, inputs } = hookArgs({
      operation: "create",
      doc: { id: "O", currentStatus: "spec_agreed" },
    });
    await orderMaxNotify(args);
    expect(inputs()).toEqual([{ event: "order_event", orderId: "O", orderStatus: "spec_agreed" }]);
  });

  it("queues order_event when currentStatus changes, not otherwise", async () => {
    const changed = hookArgs({
      operation: "update",
      doc: { id: "O", currentStatus: "packed" },
      previousDoc: { id: "O", currentStatus: "in_production" },
    });
    await orderMaxNotify(changed.args);
    expect(changed.inputs()).toEqual([
      { event: "order_event", orderId: "O", orderStatus: "packed" },
    ]);

    const same = hookArgs({
      operation: "update",
      doc: { id: "O", currentStatus: "packed" },
      previousDoc: { id: "O", currentStatus: "packed" },
    });
    await orderMaxNotify(same.args);
    expect(same.queue).not.toHaveBeenCalled();

    const invalid = hookArgs({ operation: "create", doc: { id: "O", currentStatus: "bogus" } });
    await orderMaxNotify(invalid.args);
    expect(invalid.queue).not.toHaveBeenCalled();
  });

  it("ignores bookkeeping writes", async () => {
    for (const context of [{ skipOrderHooks: true }, { skipMaxNotify: true }]) {
      const { args, queue } = hookArgs({
        operation: "create",
        doc: { id: "O", currentStatus: "spec_agreed" },
        context,
      });
      await orderMaxNotify(args);
      expect(queue).not.toHaveBeenCalled();
    }
  });
});
