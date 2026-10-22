import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MaxDelivery } from "./notify";

// The real client is never called: no message may leave the test run.
const { maxSendMessage, resolveMaxTarget } = vi.hoisted(() => ({
  maxSendMessage: vi.fn(),
  resolveMaxTarget: vi.fn(),
}));
vi.mock("@/lib/max/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/max/client")>()),
  maxSendMessage,
  maxDeleteMessage: vi.fn(),
}));

vi.mock("@/lib/max/target", () => ({
  resolveMaxTarget,
  decorateMaxText: (text: string) => `<b>[ТЕСТ] Inex Glass</b>\n${text}`,
}));

const {
  deliverMaxNotification,
  MAX_CHAT_INTERVAL_MS,
  MaxTransientError,
  recordSkipped,
  resetMaxThrottle,
} = await import("./notify");
const { MAX_UNCONFIRMED_CODE, MaxApiError } = await import("./client");

type Row = Record<string, unknown> & { id: string; key: string; status: string };

function fakePayload(initial: Row[] = []) {
  const rows: Row[] = initial.map((row) => ({ ...row }));
  let nextId = rows.length + 1;
  const keyOf = (where: unknown) =>
    (where as { key?: { equals?: string } } | undefined)?.key?.equals;
  const payload = {
    rows,
    find: vi.fn(async ({ where }: { where: unknown }) => ({
      docs: rows.filter((row) => row.key === keyOf(where)),
    })),
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      if (rows.some((row) => row.key === data.key)) throw new Error("unique");
      const row = { ...data, id: `row-${nextId++}` } as Row;
      rows.push(row);
      return row;
    }),
    update: vi.fn(
      async ({ collection, id, data }: { collection: string; id: string; data: object }) => {
        if (collection !== "notification-log") return { id };
        const row = rows.find((item) => item.id === id);
        if (!row) throw new Error("not found");
        Object.assign(row, data);
        return row;
      }
    ),
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  };
  return payload;
}

const asPayload = (payload: ReturnType<typeof fakePayload>) =>
  payload as unknown as Parameters<typeof deliverMaxNotification>[0];

const GROUP: MaxDelivery = {
  key: "max:new-lead:L1:group",
  event: "new_lead",
  channel: "group",
  leadId: "L1",
  target: { chatId: "-100" },
  message: { text: "<b>Новая заявка</b>", buttons: [[{ text: "Открыть", url: "https://x/" }]] },
};

const USER: MaxDelivery = {
  key: "max:assigned:L1:J1:user:U1",
  event: "assigned",
  channel: "user",
  leadId: "L1",
  recipientId: "U1",
  target: { userId: "777" },
  message: { text: "Вам назначена заявка" },
};

beforeEach(() => {
  resetMaxThrottle();
  maxSendMessage.mockReset();
  resolveMaxTarget.mockReset();
  resolveMaxTarget.mockImplementation((target: object) => target);
  maxSendMessage.mockResolvedValue({ messageId: "mid.1" });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("deliverMaxNotification", () => {
  it("returns «disabled» without touching the journal when there is no target", async () => {
    resolveMaxTarget.mockReturnValue(null);
    const payload = fakePayload();
    await expect(deliverMaxNotification(asPayload(payload), GROUP)).resolves.toBe("disabled");
    expect(payload.find).not.toHaveBeenCalled();
    expect(payload.create).not.toHaveBeenCalled();
    expect(maxSendMessage).not.toHaveBeenCalled();
  });

  it("reserves a pending row, sends the decorated text and marks the row sent", async () => {
    const payload = fakePayload();
    await expect(deliverMaxNotification(asPayload(payload), GROUP)).resolves.toBe("sent");

    expect(payload.create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: "notification-log",
        data: expect.objectContaining({ key: GROUP.key, status: "pending", lead: "L1" }),
        overrideAccess: true,
      })
    );
    // Journal writes never run in the job transaction.
    for (const call of [...payload.create.mock.calls, ...payload.update.mock.calls]) {
      expect(call[0]).not.toHaveProperty("req");
    }
    expect(maxSendMessage).toHaveBeenCalledWith({
      chatId: "-100",
      text: "<b>[ТЕСТ] Inex Glass</b>\n<b>Новая заявка</b>",
      buttons: GROUP.message.buttons,
      notify: true,
    });
    expect(payload.rows[0]).toMatchObject({
      status: "sent",
      messageId: "mid.1",
      chatId: "-100",
      error: null,
    });
    expect(typeof payload.rows[0]?.sentAt).toBe("string");
  });

  it("does not send again for a key that was sent or is in flight", async () => {
    for (const status of ["sent", "pending"]) {
      const payload = fakePayload([{ id: "r1", key: GROUP.key, status }]);
      await expect(deliverMaxNotification(asPayload(payload), GROUP)).resolves.toBe("duplicate");
    }
    expect(maxSendMessage).not.toHaveBeenCalled();
  });

  it("treats a lost race on the unique key as a duplicate", async () => {
    const payload = fakePayload();
    payload.find.mockResolvedValueOnce({ docs: [] });
    payload.create.mockImplementationOnce(async () => {
      payload.rows.push({ id: "other", key: GROUP.key, status: "pending" });
      throw new Error("unique");
    });
    await expect(deliverMaxNotification(asPayload(payload), GROUP)).resolves.toBe("duplicate");
    expect(maxSendMessage).not.toHaveBeenCalled();
  });

  it("retries a failed row in place", async () => {
    const payload = fakePayload([
      { id: "r1", key: GROUP.key, status: "failed", error: "retry: 429" },
    ]);
    await expect(deliverMaxNotification(asPayload(payload), GROUP)).resolves.toBe("sent");
    expect(payload.create).not.toHaveBeenCalled();
    expect(payload.rows).toHaveLength(1);
    expect(payload.rows[0]).toMatchObject({ id: "r1", status: "sent", messageId: "mid.1" });
  });

  it("marks the user's bot as stopped on a permanent 403 in a direct chat", async () => {
    maxSendMessage.mockRejectedValue(new MaxApiError("denied", 403, "chat.denied"));
    const payload = fakePayload();
    await expect(deliverMaxNotification(asPayload(payload), USER)).resolves.toBe("failed");
    expect(payload.rows[0]).toMatchObject({ status: "failed", error: "403 chat.denied" });
    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: "users",
        id: "U1",
        data: { maxBotStopped: true },
        overrideAccess: true,
      })
    );
  });

  it("does not blame the user for a 403 of the intercept chat", async () => {
    resolveMaxTarget.mockReturnValue({ chatId: "-999" });
    maxSendMessage.mockRejectedValue(new MaxApiError("denied", 403));
    const payload = fakePayload();
    await expect(deliverMaxNotification(asPayload(payload), USER)).resolves.toBe("failed");
    expect(payload.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ collection: "users" })
    );
  });

  it("records an unconfirmed send as a permanent failure (no retry, no duplicate)", async () => {
    maxSendMessage.mockRejectedValue(new MaxApiError("no id", 502, "unconfirmed_response"));
    const payload = fakePayload();
    await expect(deliverMaxNotification(asPayload(payload), GROUP)).resolves.toBe("failed");
    expect(payload.rows[0]).toMatchObject({ status: "failed", error: "502 unconfirmed_response" });
  });

  it("returns «sent» and never resends when the journal write after a send fails", async () => {
    const payload = fakePayload();
    payload.update.mockRejectedValueOnce(new Error("db down"));
    await expect(deliverMaxNotification(asPayload(payload), GROUP)).resolves.toBe("sent");
    expect(payload.rows[0]).toMatchObject({ status: "pending" });
    expect(payload.logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ key: GROUP.key, error: "Error" })
    );

    // A retried job (or a second job of the same event) must not deliver it again.
    await expect(deliverMaxNotification(asPayload(payload), GROUP)).resolves.toBe("duplicate");
    expect(maxSendMessage).toHaveBeenCalledTimes(1);
  });

  it("never resends an unconfirmed message when another recipient makes the job retry", async () => {
    // First run: the group message is accepted without an id, the user's one hits a 429.
    maxSendMessage
      .mockRejectedValueOnce(new MaxApiError("no id", 502, MAX_UNCONFIRMED_CODE))
      .mockRejectedValueOnce(new MaxApiError("slow down", 429));
    const payload = fakePayload();
    await expect(deliverMaxNotification(asPayload(payload), GROUP)).resolves.toBe("failed");
    await expect(deliverMaxNotification(asPayload(payload), USER)).rejects.toBeInstanceOf(
      MaxTransientError
    );

    // Retry of the job: only the retryable user message goes out again.
    resetMaxThrottle();
    await expect(deliverMaxNotification(asPayload(payload), GROUP)).resolves.toBe("duplicate");
    await expect(deliverMaxNotification(asPayload(payload), USER)).resolves.toBe("sent");
    expect(maxSendMessage).toHaveBeenCalledTimes(3);
    expect(maxSendMessage.mock.calls.filter(([args]) => "chatId" in args)).toHaveLength(1);
    expect(payload.rows.find((row) => row.key === GROUP.key)).toMatchObject({
      status: "failed",
      error: `502 ${MAX_UNCONFIRMED_CODE}`,
    });
  });

  it("throws a transient error on 429 and leaves a retryable row", async () => {
    maxSendMessage.mockRejectedValue(new MaxApiError("slow down", 429));
    const payload = fakePayload();
    await expect(deliverMaxNotification(asPayload(payload), GROUP)).rejects.toBeInstanceOf(
      MaxTransientError
    );
    expect(payload.rows[0]).toMatchObject({ status: "failed", error: "retry: 429" });
  });

  it("spaces messages into one chat by at least the API interval", async () => {
    vi.useFakeTimers();
    const sentAt: number[] = [];
    maxSendMessage.mockImplementation(async () => {
      sentAt.push(Date.now());
      return { messageId: `mid.${sentAt.length}` };
    });
    const payload = fakePayload();
    const first = deliverMaxNotification(asPayload(payload), GROUP);
    const second = deliverMaxNotification(asPayload(payload), {
      ...GROUP,
      key: "max:new-lead:L2:group",
      leadId: "L2",
    });
    await vi.runAllTimersAsync();
    await expect(Promise.all([first, second])).resolves.toEqual(["sent", "sent"]);
    expect(sentAt).toHaveLength(2);
    expect((sentAt[1] ?? 0) - (sentAt[0] ?? 0)).toBeGreaterThanOrEqual(MAX_CHAT_INTERVAL_MS);
  });
});

describe("recordSkipped", () => {
  it("journals a skip once", async () => {
    const payload = fakePayload();
    const { target: _target, message: _message, ...journal } = USER;
    await recordSkipped(asPayload(payload), journal, "не подключил MAX");
    await recordSkipped(asPayload(payload), journal, "не подключил MAX");
    expect(payload.rows).toEqual([
      expect.objectContaining({
        key: USER.key,
        status: "skipped",
        error: "не подключил MAX",
        recipient: "U1",
      }),
    ]);
  });
});
