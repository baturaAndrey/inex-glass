import { beforeEach, describe, expect, it, vi } from "vitest";

const env = { MAX_ENABLED: true, SITE_URL: "https://inexglass.ru" };
vi.mock("@/lib/env", () => ({ getEnv: () => env }));

// Delivery is mocked: the handler is tested for WHO gets WHAT, never for sending.
const deliverMaxNotification = vi.fn();
const recordSkipped = vi.fn();
vi.mock("@/lib/max/notify", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/max/notify")>()),
  deliverMaxNotification,
  recordSkipped,
}));

const { MaxTransientError } = await import("@/lib/max/notify");
const { runMaxNotify } = await import("./max-notify");
const { runUnassignedReminder } = await import("./max-unassigned-reminder");

const CHANGED_AT = "2026-10-22T09:00:00.000Z";

type Docs = {
  settings?: Record<string, unknown>;
  lead?: Record<string, unknown> | null;
  order?: Record<string, unknown> | null;
  users?: Record<string, unknown>[];
  statuses?: Record<string, unknown>[];
  leads?: Record<string, unknown>[];
  journal?: Record<string, unknown>[];
};

function fakeReq(docs: Docs) {
  const payload = {
    findGlobal: vi.fn(async () => ({
      notifications: { max: { groupChatId: "-100", ...docs.settings } },
    })),
    findByID: vi.fn(async ({ collection }: { collection: string }) =>
      collection === "orders" ? (docs.order ?? null) : (docs.lead ?? null)
    ),
    find: vi.fn(async ({ collection }: { collection: string }) => {
      if (collection === "users") return { docs: docs.users ?? [] };
      if (collection === "lead-statuses") return { docs: docs.statuses ?? [] };
      if (collection === "leads") return { docs: docs.leads ?? [] };
      if (collection === "notification-log") return { docs: docs.journal ?? [] };
      return { docs: [] };
    }),
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  };
  return { payload } as never as Parameters<typeof runMaxNotify>[1];
}

const LEAD = {
  id: "L",
  formType: "quiz",
  name: "Иван",
  phone: "+79990000000",
  status: "work",
  statusChangedAt: CHANGED_AT,
  assignee: "U1",
  updatedBy: "U2",
  createdAt: "2026-10-22T05:00:00.000Z",
};
const ANNA = { id: "U1", name: "Анна", maxUserId: "111" };
const PETR = { id: "U2", name: "Пётр", maxUserId: "222" };
const USERS = [ANNA, PETR];
const STATUSES = [
  { id: "new", name: "Новая" },
  { id: "work", name: "В работе" },
];

const deliveries = () =>
  deliverMaxNotification.mock.calls.map(([, d]) => ({ key: d.key, target: d.target }));

beforeEach(() => {
  env.MAX_ENABLED = true;
  deliverMaxNotification.mockReset();
  deliverMaxNotification.mockResolvedValue("sent");
  recordSkipped.mockReset();
});

describe("runMaxNotify", () => {
  it("sends a new lead to the group", async () => {
    const req = fakeReq({ lead: LEAD });
    await expect(runMaxNotify({ event: "new_lead", leadId: "L" }, req, "J")).resolves.toEqual({
      sent: 1,
    });
    expect(deliveries()).toEqual([{ key: "max:new-lead:L:group", target: { chatId: "-100" } }]);
    const message = deliverMaxNotification.mock.calls[0]?.[1].message;
    expect(message.buttons[0][0].url).toBe(
      "https://inexglass.ru/admin/collections/leads/L/summary/"
    );
  });

  it("honours the toggle and a missing group chat", async () => {
    await expect(
      runMaxNotify(
        { event: "new_lead", leadId: "L" },
        fakeReq({ lead: LEAD, settings: { newLead: false } }),
        "J"
      )
    ).resolves.toEqual({ sent: 0, skipped: "disabled" });
    await expect(
      runMaxNotify(
        { event: "new_lead", leadId: "L" },
        fakeReq({ lead: LEAD, settings: { groupChatId: null } }),
        "J"
      )
    ).resolves.toEqual({ sent: 0, skipped: "no-group-chat" });
    expect(deliverMaxNotification).not.toHaveBeenCalled();
  });

  it("does nothing when MAX is off", async () => {
    env.MAX_ENABLED = false;
    await expect(
      runMaxNotify({ event: "new_lead", leadId: "L" }, fakeReq({ lead: LEAD }), "J")
    ).resolves.toEqual({ sent: 0, skipped: "max-disabled" });
  });

  it("sends an assignment to the assignee's direct chat with the job id in the key", async () => {
    const req = fakeReq({ lead: LEAD, users: USERS });
    await runMaxNotify({ event: "assigned", leadId: "L", assigneeId: "U1" }, req, "J7");
    expect(deliveries()).toEqual([{ key: "max:assigned:L:J7:user:U1", target: { userId: "111" } }]);
    expect(deliverMaxNotification.mock.calls[0]?.[1].message.text).toContain("Назначил: Пётр");
  });

  it("skips self-assignment and a stale assignee", async () => {
    const self = fakeReq({ lead: { ...LEAD, updatedBy: "U1" }, users: USERS });
    await expect(
      runMaxNotify({ event: "assigned", leadId: "L", assigneeId: "U1" }, self, "J")
    ).resolves.toMatchObject({ skipped: "self-assigned" });
    const stale = fakeReq({ lead: LEAD, users: USERS });
    await expect(
      runMaxNotify({ event: "assigned", leadId: "L", assigneeId: "U9" }, stale, "J")
    ).resolves.toMatchObject({ skipped: "assignee-changed" });
    expect(deliverMaxNotification).not.toHaveBeenCalled();
  });

  it("journals a skip for an assignee without MAX", async () => {
    const req = fakeReq({ lead: LEAD, users: [{ id: "U1", name: "Анна" }, PETR] });
    await runMaxNotify({ event: "assigned", leadId: "L", assigneeId: "U1" }, req, "J");
    expect(deliverMaxNotification).not.toHaveBeenCalled();
    expect(recordSkipped).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        key: "max:assigned:L:J:user:U1",
        channel: "user",
        recipientId: "U1",
      }),
      "не подключил MAX"
    );
  });

  it("sends a status change to the assignee and to the group, «from → to»", async () => {
    const req = fakeReq({ lead: LEAD, users: USERS, statuses: STATUSES });
    await runMaxNotify(
      { event: "status_change", leadId: "L", statusChangedAt: CHANGED_AT, previousStatus: "new" },
      req,
      "J"
    );
    expect(deliveries()).toEqual([
      { key: `max:status:L:${CHANGED_AT}:user:U1`, target: { userId: "111" } },
      { key: `max:status:L:${CHANGED_AT}:group`, target: { chatId: "-100" } },
    ]);
    expect(deliverMaxNotification.mock.calls[0]?.[1].message.text).toContain(
      "«Новая» → «В работе»"
    );
  });

  it("keeps the assignee's message when the group toggle is off; none for their own change", async () => {
    const off = fakeReq({
      lead: LEAD,
      users: USERS,
      statuses: STATUSES,
      settings: { statusChange: false },
    });
    await runMaxNotify(
      { event: "status_change", leadId: "L", statusChangedAt: CHANGED_AT },
      off,
      "J"
    );
    expect(deliveries()).toEqual([
      { key: `max:status:L:${CHANGED_AT}:user:U1`, target: { userId: "111" } },
    ]);

    deliverMaxNotification.mockClear();
    const own = fakeReq({ lead: { ...LEAD, updatedBy: "U1" }, users: USERS, statuses: STATUSES });
    await runMaxNotify(
      { event: "status_change", leadId: "L", statusChangedAt: CHANGED_AT },
      own,
      "J"
    );
    expect(deliveries()).toEqual([
      { key: `max:status:L:${CHANGED_AT}:group`, target: { chatId: "-100" } },
    ]);
  });

  it("skips a superseded status change", async () => {
    const req = fakeReq({ lead: { ...LEAD, statusChangedAt: "2026-10-22T10:00:00.000Z" } });
    await expect(
      runMaxNotify({ event: "status_change", leadId: "L", statusChangedAt: CHANGED_AT }, req, "J")
    ).resolves.toMatchObject({ skipped: "superseded" });
  });

  it("sends order events to the group and the manager", async () => {
    const req = fakeReq({
      order: {
        id: "O",
        number: "2026-0001",
        company: "ООО",
        manager: "U1",
        lead: "L",
        statusHistory: [{ status: "spec_agreed" }],
      },
      users: USERS,
    });
    await runMaxNotify(
      { event: "order_event", orderId: "O", orderStatus: "spec_agreed" },
      req,
      "J"
    );
    expect(deliveries()).toEqual([
      { key: "max:order:O:spec_agreed:group", target: { chatId: "-100" } },
      { key: "max:order:O:spec_agreed:user:U1", target: { userId: "111" } },
    ]);
    expect(deliverMaxNotification.mock.calls[0]?.[1].message.text).toContain("Создан заказ");
  });

  it("fails the job once after trying every recipient when one needs a retry", async () => {
    deliverMaxNotification
      .mockRejectedValueOnce(new MaxTransientError("429"))
      .mockResolvedValueOnce("sent");
    const req = fakeReq({ lead: LEAD, users: USERS, statuses: STATUSES });
    await expect(
      runMaxNotify({ event: "status_change", leadId: "L", statusChangedAt: CHANGED_AT }, req, "J")
    ).rejects.toBeInstanceOf(MaxTransientError);
    expect(deliverMaxNotification).toHaveBeenCalledTimes(2);
  });
});

describe("runUnassignedReminder", () => {
  const NOW = new Date("2026-10-22T12:00:00.000Z");

  it("reminds about leads not yet journaled, once per lead", async () => {
    const req = fakeReq({
      statuses: [{ id: "new" }],
      leads: [
        { ...LEAD, id: "A", assignee: null, createdAt: "2026-10-22T08:30:00.000Z" },
        { ...LEAD, id: "B", assignee: null, createdAt: "2026-10-22T09:00:00.000Z" },
        { ...LEAD, id: "C", assignee: null, createdAt: "2026-10-22T09:30:00.000Z" },
      ],
      journal: [
        { key: "max:unassigned:B:group", status: "sent" },
        { key: "max:unassigned:C:group", status: "failed", error: "retry: 503" },
      ],
    });
    await expect(runUnassignedReminder(req, NOW)).resolves.toEqual({ sent: 2 });
    expect(deliveries()).toEqual([
      { key: "max:unassigned:A:group", target: { chatId: "-100" } },
      { key: "max:unassigned:C:group", target: { chatId: "-100" } },
    ]);
    expect(deliverMaxNotification.mock.calls[0]?.[1].message.text).toContain("больше 3 ч");
  });

  it("does nothing when the toggle is off", async () => {
    const req = fakeReq({ settings: { unassignedReminder: false } });
    await expect(runUnassignedReminder(req, NOW)).resolves.toEqual({
      sent: 0,
      skipped: "disabled",
    });
  });
});
