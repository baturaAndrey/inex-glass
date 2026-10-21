import { ValidationError } from "payload";
import { describe, expect, it, vi } from "vitest";
import { notifyAssigneeChange } from "./lead-assignee-notify";
import { stampInternalComments } from "./lead-comments";
import { FOREIGN_COMMENT_MESSAGE, REFUSE_REASON_REQUIRED_MESSAGE } from "./lead-messages";
import { validateLeadStatusReason } from "./lead-status-validation";

const ADMIN = { id: "admin-1", role: "admin" };
const MANAGER = { id: "manager-1", role: "manager" };
const OTHER = { id: "manager-2", role: "manager" };

// ---------------------------------------------------------------------------------------------
// lead-status-validation
// ---------------------------------------------------------------------------------------------

function statusArgs(options: {
  data: Record<string, unknown>;
  originalDoc?: Record<string, unknown>;
  requiresReason?: boolean;
}) {
  const findByID = vi.fn().mockResolvedValue({ id: "s", requiresReason: options.requiresReason });
  const args = {
    data: options.data,
    originalDoc: options.originalDoc,
    operation: options.originalDoc ? "update" : "create",
    req: { payload: { findByID }, t: (key: string) => key },
  } as any;
  return { args, findByID };
}

async function validationMessage(promise: Promise<unknown>): Promise<string | null> {
  try {
    await promise;
    return null;
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationError);
    return (error as ValidationError).data.errors[0]?.message ?? null;
  }
}

describe("validateLeadStatusReason", () => {
  it("rejects a refusal status without a reason", async () => {
    const { args, findByID } = statusArgs({
      data: { status: "refused", refuseReason: "  " },
      requiresReason: true,
    });
    expect(await validationMessage(validateLeadStatusReason(args))).toBe(
      REFUSE_REASON_REQUIRED_MESSAGE
    );
    expect(findByID).toHaveBeenCalledWith(
      expect.objectContaining({ collection: "lead-statuses", id: "refused" })
    );
  });

  it("accepts a refusal with a reason without querying", async () => {
    const { args, findByID } = statusArgs({
      data: { status: "refused", refuseReason: "Дорого" },
      requiresReason: true,
    });
    await expect(validateLeadStatusReason(args)).resolves.toBe(args.data);
    expect(findByID).not.toHaveBeenCalled();
  });

  it("uses the stored status and reason on partial updates", async () => {
    const stored = statusArgs({
      data: { refuseReason: "" },
      originalDoc: { status: { id: "refused" }, refuseReason: "Дорого" },
      requiresReason: true,
    });
    expect(await validationMessage(validateLeadStatusReason(stored.args))).toBe(
      REFUSE_REASON_REQUIRED_MESSAGE
    );

    const keep = statusArgs({
      data: { comment: "x" },
      originalDoc: { status: "refused", refuseReason: "Дорого" },
      requiresReason: true,
    });
    await expect(validateLeadStatusReason(keep.args)).resolves.toBe(keep.args.data);
  });

  it("ignores statuses that do not require a reason and empty statuses", async () => {
    const plain = statusArgs({ data: { status: "new" }, requiresReason: false });
    await expect(validateLeadStatusReason(plain.args)).resolves.toBe(plain.args.data);

    const none = statusArgs({ data: { status: null }, requiresReason: true });
    await expect(validateLeadStatusReason(none.args)).resolves.toBe(none.args.data);
    expect(none.findByID).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------------------------
// lead-comments
// ---------------------------------------------------------------------------------------------

const commentArgs = (
  user: unknown,
  data: Record<string, unknown>,
  originalDoc?: Record<string, unknown>
) =>
  ({
    data,
    originalDoc,
    operation: originalDoc ? "update" : "create",
    req: { user, t: (key: string) => key },
  }) as any;

const STORED = {
  internalComments: [
    { id: "c1", author: { id: OTHER.id }, text: "Перезвонить", date: "2026-10-01T10:00:00.000Z" },
    { id: "c2", author: MANAGER.id, text: "Моё", date: "2026-10-02T10:00:00.000Z" },
  ],
};

describe("stampInternalComments", () => {
  it("stamps author and date of new rows, whatever was sent", async () => {
    const before = Date.now();
    const result = await stampInternalComments(
      commentArgs(MANAGER, {
        internalComments: [
          { text: "Новый", author: "forged", date: "2000-01-01T00:00:00.000Z" },
          { id: "client-generated", text: "Ещё один" },
        ],
      })
    );
    for (const row of result.internalComments) {
      expect(row.author).toBe(MANAGER.id);
      expect(new Date(row.date).getTime()).toBeGreaterThanOrEqual(before);
    }
  });

  it("keeps the stored author and date of existing rows", async () => {
    const result = await stampInternalComments(
      commentArgs(
        MANAGER,
        {
          internalComments: [
            { id: "c1", author: MANAGER.id, text: "Перезвонить", date: "2030-01-01T00:00:00.000Z" },
            { id: "c2", text: "Моё, исправлено" },
          ],
        },
        STORED
      )
    );
    expect(result.internalComments).toEqual([
      { id: "c1", author: OTHER.id, text: "Перезвонить", date: "2026-10-01T10:00:00.000Z" },
      { id: "c2", author: MANAGER.id, text: "Моё, исправлено", date: "2026-10-02T10:00:00.000Z" },
    ]);
  });

  it("forbids a manager to edit someone else's comment", async () => {
    const promise = Promise.resolve().then(() =>
      stampInternalComments(
        commentArgs(
          MANAGER,
          {
            internalComments: [
              { id: "c1", text: "Подменил" },
              { id: "c2", text: "Моё" },
            ],
          },
          STORED
        )
      )
    );
    expect(await validationMessage(promise)).toBe(FOREIGN_COMMENT_MESSAGE);
  });

  it("forbids a manager to remove someone else's comment but allows removing their own", async () => {
    const removeForeign = Promise.resolve().then(() =>
      stampInternalComments(
        commentArgs(MANAGER, { internalComments: [{ id: "c2", text: "Моё" }] }, STORED)
      )
    );
    expect(await validationMessage(removeForeign)).toBe(FOREIGN_COMMENT_MESSAGE);

    const removeOwn = await stampInternalComments(
      commentArgs(MANAGER, { internalComments: [{ id: "c1", text: "Перезвонить" }] }, STORED)
    );
    expect(removeOwn.internalComments).toHaveLength(1);
  });

  it("lets an admin moderate any comment", async () => {
    const result = await stampInternalComments(
      commentArgs(ADMIN, { internalComments: [{ id: "c1", text: "Исправлено админом" }] }, STORED)
    );
    expect(result.internalComments).toEqual([
      { id: "c1", author: OTHER.id, text: "Исправлено админом", date: "2026-10-01T10:00:00.000Z" },
    ]);
  });

  it("does nothing when comments are not part of the write", async () => {
    const data = { status: "new" };
    expect(await stampInternalComments(commentArgs(MANAGER, data, STORED))).toBe(data);
  });
});

// ---------------------------------------------------------------------------------------------
// lead-assignee-notify
// ---------------------------------------------------------------------------------------------

function notifyArgs(options: {
  doc: Record<string, unknown>;
  previousDoc?: Record<string, unknown>;
  operation?: "create" | "update";
  context?: Record<string, unknown>;
  queue?: ReturnType<typeof vi.fn>;
}) {
  const queue = options.queue ?? vi.fn().mockResolvedValue({ id: "job" });
  const error = vi.fn();
  const args = {
    doc: options.doc,
    previousDoc: options.previousDoc ?? {},
    operation: options.operation ?? "update",
    context: options.context ?? {},
    req: { payload: { jobs: { queue }, logger: { error } } },
  } as any;
  return { args, queue, error };
}

describe("notifyAssigneeChange", () => {
  it("queues notify-assigned when the assignee changes", async () => {
    const { args, queue } = notifyArgs({
      doc: { id: "lead-1", assignee: { id: MANAGER.id } },
      previousDoc: { assignee: OTHER.id },
    });
    await notifyAssigneeChange(args);
    expect(queue).toHaveBeenCalledWith(
      expect.objectContaining({
        task: "notify-assigned",
        input: { leadId: "lead-1", assigneeId: MANAGER.id },
      })
    );
  });

  it("queues on create with an assignee", async () => {
    const { args, queue } = notifyArgs({
      doc: { id: "lead-1", assignee: MANAGER.id },
      operation: "create",
    });
    await notifyAssigneeChange(args);
    expect(queue).toHaveBeenCalledTimes(1);
  });

  it("does not queue for the same assignee, a cleared one or a skipped context", async () => {
    const same = notifyArgs({
      doc: { id: "lead-1", assignee: MANAGER.id },
      previousDoc: { assignee: { id: MANAGER.id } },
    });
    await notifyAssigneeChange(same.args);
    const cleared = notifyArgs({
      doc: { id: "lead-1", assignee: null },
      previousDoc: { assignee: "x" },
    });
    await notifyAssigneeChange(cleared.args);
    const skipped = notifyArgs({
      doc: { id: "lead-1", assignee: MANAGER.id },
      context: { skipAssigneeNotify: true },
    });
    await notifyAssigneeChange(skipped.args);
    expect(same.queue).not.toHaveBeenCalled();
    expect(cleared.queue).not.toHaveBeenCalled();
    expect(skipped.queue).not.toHaveBeenCalled();
  });

  it("logs a queueing error without failing the save", async () => {
    const { args, error } = notifyArgs({
      doc: { id: "lead-1", assignee: MANAGER.id },
      queue: vi.fn().mockRejectedValue(new Error("db down")),
    });
    await expect(notifyAssigneeChange(args)).resolves.toBe(args.doc);
    expect(error).toHaveBeenCalledWith(expect.objectContaining({ leadId: "lead-1" }));
  });
});
