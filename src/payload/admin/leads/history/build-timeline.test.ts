import { describe, expect, it } from "vitest";
import { formatRub } from "@/lib/domain/format";
import {
  AUTHOR_SITE,
  AUTHOR_SYSTEM,
  AUTHOR_UNKNOWN_STAFF,
  buildLeadTimeline,
  MAX_ERROR_LENGTH,
} from "./build-timeline";
import type { NotificationRow, TimelineInput, VersionSnapshot } from "./build-timeline";

const CREATED = "2026-10-22T05:48:00.000Z";
const at = (offsetSeconds: number) =>
  new Date(Date.parse(CREATED) + offsetSeconds * 1000).toISOString();

const statuses = new Map([
  ["new", { name: "Новая", requiresReason: false }],
  ["work", { name: "В работе", requiresReason: false }],
  ["refused", { name: "Отказ", requiresReason: true }],
]);
const staff = new Map([
  ["u-admin", "E2E Админ"],
  ["u-manager", "Сергей Морозов"],
]);
const reasons = new Map([
  ["expensive", "Дорого"],
  ["other", "Другое"],
]);

function version(id: string, offsetSeconds: number, patch: Partial<VersionSnapshot> = {}) {
  return {
    id,
    createdAt: at(offsetSeconds),
    status: "new",
    assignee: null,
    refuseReasonCode: null,
    refuseReason: null,
    kpAmount: null,
    updatedBy: null,
    ...patch,
  } satisfies VersionSnapshot;
}

function notification(id: string, patch: Partial<NotificationRow> = {}): NotificationRow {
  return {
    id,
    event: "new_lead",
    channel: "group",
    status: "sent",
    recipient: null,
    error: null,
    sentAt: at(60),
    createdAt: at(59),
    ...patch,
  };
}

function input(patch: Partial<TimelineInput> = {}): TimelineInput {
  return {
    lead: {
      createdAt: CREATED,
      formType: "quiz",
      newLeadNotifiedAt: null,
      assigneeNotifiedAt: null,
    },
    versions: [version("v1", 0.2)],
    notifications: [],
    orders: [],
    statuses,
    staff,
    reasons,
    groupChatTitle: "Заявки Inex Glass",
    ...patch,
  };
}

const texts = (data: TimelineInput) => buildLeadTimeline(data).map((item) => item.text);

describe("buildLeadTimeline — rule 1: creation", () => {
  it("a public lead: author «Сайт», form type and the initial status", () => {
    const [item] = buildLeadTimeline(input());
    expect(item).toEqual({
      id: "created:lead",
      date: CREATED,
      kind: "created",
      author: AUTHOR_SITE,
      text: "Заявка создана · Квиз · статус «Новая»",
      tone: "default",
    });
  });

  it("a lead created by staff: the author of the first version", () => {
    const [item] = buildLeadTimeline(
      input({ versions: [version("v1", 1, { updatedBy: "u-manager" })] })
    );
    expect(item?.author).toBe("Сергей Морозов");
  });

  it("an unknown creator id → «Сотрудник»", () => {
    const [item] = buildLeadTimeline(
      input({ versions: [version("v1", 1, { updatedBy: "gone" })] })
    );
    expect(item?.author).toBe(AUTHOR_UNKNOWN_STAFF);
  });

  it("trimmed versions: the earliest one is not the creation → «Сайт», no status", () => {
    const data = input({
      versions: [version("v9", 3600, { updatedBy: "u-admin", status: "work" })],
    });
    const [item] = buildLeadTimeline(data).filter((entry) => entry.kind === "created");
    expect(item?.author).toBe(AUTHOR_SITE);
    expect(item?.text).toBe("Заявка создана · Квиз");
  });

  it("no versions and an unknown form type", () => {
    const data = input({ versions: [], lead: { ...input().lead, formType: null } });
    expect(texts(data)).toEqual(["Заявка создана · —"]);
  });
});

describe("buildLeadTimeline — rule 2: versions", () => {
  it("the first kept version yields no events", () => {
    const data = input({
      versions: [version("v1", 3600, { status: "refused", assignee: "u-admin", kpAmount: 5 })],
    });
    expect(buildLeadTimeline(data).map((item) => item.kind)).toEqual(["created"]);
  });

  it("status change with the editor as author; versions in any order", () => {
    const data = input({
      versions: [version("v2", 120, { status: "work", updatedBy: "u-admin" }), version("v1", 0.2)],
    });
    const [item] = buildLeadTimeline(data);
    expect(item).toEqual({
      id: "status:v2",
      date: at(120),
      kind: "status",
      author: "E2E Админ",
      text: "Статус: «Новая» → «В работе»",
      tone: "default",
    });
  });

  it("a status set from nothing shows «—»", () => {
    const data = input({
      versions: [version("v1", 0.2, { status: null }), version("v2", 60, { status: "new" })],
    });
    expect(texts(data)[0]).toBe("Статус: «—» → «Новая»");
  });

  it("a refusal: danger tone, reason label and text", () => {
    const data = input({
      versions: [
        version("v1", 0.2),
        version("v2", 60, {
          status: "refused",
          refuseReasonCode: "expensive",
          refuseReason: " нашли дешевле ",
          updatedBy: "u-manager",
        }),
        version("v3", 120, { status: "work" }),
        version("v4", 180, { status: "refused", refuseReason: "Передумали" }),
      ],
    });
    const items = buildLeadTimeline(data);
    expect(items.map((item) => [item.text, item.tone])).toEqual([
      ["Статус: «В работе» → «Отказ» · причина: Передумали", "danger"],
      ["Статус: «Отказ» → «В работе»", "default"],
      ["Статус: «Новая» → «Отказ» · причина: Дорого: нашли дешевле", "danger"],
      ["Заявка создана · Квиз · статус «Новая»", "default"],
    ]);
  });

  it("a refusal without a reason has no suffix", () => {
    const data = input({
      versions: [version("v1", 0.2), version("v2", 60, { status: "refused" })],
    });
    expect(texts(data)[0]).toBe("Статус: «Новая» → «Отказ»");
  });

  it("assignee set, changed to an unknown user and removed", () => {
    const data = input({
      versions: [
        version("v1", 0.2),
        version("v2", 60, { assignee: "u-manager" }),
        version("v3", 120, { assignee: "gone" }),
        version("v4", 180, { assignee: null }),
      ],
    });
    expect(texts(data)).toEqual([
      "Ответственный снят",
      `Ответственный: ${AUTHOR_UNKNOWN_STAFF}`,
      "Ответственный: Сергей Морозов",
      "Заявка создана · Квиз · статус «Новая»",
    ]);
  });

  it("КП amount set and removed", () => {
    const data = input({
      versions: [
        version("v1", 0.2),
        version("v2", 60, { kpAmount: 186000 }),
        version("v3", 120, { kpAmount: null }),
      ],
    });
    expect(texts(data).slice(0, 2)).toEqual(["Сумма КП удалена", `Сумма КП: ${formatRub(186000)}`]);
  });

  it("updatedBy = null → «Система»; unknown editor → «Сотрудник»", () => {
    const data = input({
      versions: [
        version("v1", 0.2),
        version("v2", 60, { status: "work" }),
        version("v3", 120, { status: "new", updatedBy: "gone" }),
      ],
    });
    expect(buildLeadTimeline(data).map((item) => item.author)).toEqual([
      AUTHOR_UNKNOWN_STAFF,
      AUTHOR_SYSTEM,
      AUTHOR_SITE,
    ]);
  });

  it("one version may yield several events with distinct ids", () => {
    const data = input({
      versions: [
        version("v1", 0.2),
        version("v2", 60, {
          status: "work",
          assignee: "u-admin",
          kpAmount: 1000,
          updatedBy: "u-admin",
        }),
      ],
    });
    const items = buildLeadTimeline(data).filter((item) => item.kind !== "created");
    expect(items.map((item) => item.id)).toEqual(["status:v2", "assignee:v2", "kp:v2"]);
    expect(new Set(items.map((item) => item.author))).toEqual(new Set(["E2E Админ"]));
  });

  it("a version without changes (e.g. a job stamp) yields nothing", () => {
    const data = input({ versions: [version("v1", 0.2), version("v2", 60)] });
    expect(buildLeadTimeline(data)).toHaveLength(1);
  });
});

describe("buildLeadTimeline — rule 3: mails", () => {
  it("both mail stamps, authored by the system, no addresses", () => {
    const data = input({
      lead: { ...input().lead, newLeadNotifiedAt: at(30), assigneeNotifiedAt: at(90) },
    });
    const mails = buildLeadTimeline(data).filter((item) => item.kind === "email");
    expect(mails).toEqual([
      {
        id: "email:assignee",
        date: at(90),
        kind: "email",
        author: AUTHOR_SYSTEM,
        text: "Письмо ответственному отправлено",
        tone: "default",
      },
      {
        id: "email:new-lead",
        date: at(30),
        kind: "email",
        author: AUTHOR_SYSTEM,
        text: "Письмо о заявке отправлено менеджерам",
        tone: "default",
      },
    ]);
  });
});

describe("buildLeadTimeline — rule 4: MAX", () => {
  const maxItems = (rows: NotificationRow[], patch: Partial<TimelineInput> = {}) =>
    buildLeadTimeline(input({ notifications: rows, ...patch })).filter(
      (item) => item.kind === "max"
    );

  it("sent to the group chat (with and without its title)", () => {
    const [item] = maxItems([notification("n1")]);
    expect(item).toEqual({
      id: "max:n1",
      date: at(60),
      kind: "max",
      author: AUTHOR_SYSTEM,
      text: "Новая заявка: Уведомление в MAX отправлено в чат «Заявки Inex Glass»",
      tone: "default",
    });
    expect(maxItems([notification("n1")], { groupChatTitle: null })[0]?.text).toBe(
      "Новая заявка: Уведомление в MAX отправлено в групповой чат"
    );
  });

  it("sent to a user", () => {
    const [item] = maxItems([
      notification("n2", { event: "assigned", channel: "user", recipient: "u-manager" }),
    ]);
    expect(item?.text).toBe("Назначение: Уведомление в MAX отправлено: Сергей Морозов");
  });

  it("failed: danger tone, recipient and a truncated error", () => {
    const longError = "x".repeat(MAX_ERROR_LENGTH + 50);
    const [user, group] = maxItems([
      notification("n3", {
        event: "status_change",
        channel: "user",
        recipient: "u-admin",
        status: "failed",
        error: longError,
        sentAt: null,
        createdAt: at(120),
      }),
      notification("n4", { event: "order_event", status: "failed", error: "chat not found" }),
    ]);
    expect(user?.tone).toBe("danger");
    expect(user?.date).toBe(at(120));
    expect(user?.text).toBe(
      `Смена статуса: Не удалось отправить в MAX (E2E Админ): ${"x".repeat(MAX_ERROR_LENGTH)}…`
    );
    expect(group?.text).toBe("Заказ: Не удалось отправить в MAX (групповой чат): chat not found");
  });

  it("pending: the delivery is still in progress", () => {
    const [item] = maxItems([notification("n5", { status: "pending", sentAt: null })]);
    expect(item?.text).toBe("Новая заявка: Отправка в MAX…");
    expect(item?.tone).toBe("default");
  });

  it("skipped: the recipient has not linked MAX, or the stored reason", () => {
    const [noLink, withReason] = maxItems([
      notification("n6", {
        event: "unassigned_reminder",
        channel: "user",
        recipient: "u-manager",
        status: "skipped",
        sentAt: at(200),
      }),
      notification("n7", {
        status: "skipped",
        error: "Групповой чат не подключён",
        sentAt: at(100),
      }),
    ]);
    expect(noLink?.text).toBe(
      "Напоминание: нет ответственного: Не отправлено в MAX: Сергей Морозов не подключил MAX"
    );
    expect(withReason?.text).toBe("Новая заявка: Не отправлено в MAX: Групповой чат не подключён");
  });
});

describe("buildLeadTimeline — rule 5: orders", () => {
  it("an order links to its admin page; a missing number is omitted", () => {
    const data = input({
      orders: [
        { id: "o1", number: "IG-0001", createdAt: at(300) },
        { id: "o2", number: null, createdAt: at(200) },
      ],
    });
    const orders = buildLeadTimeline(data).filter((item) => item.kind === "order");
    expect(orders.map((item) => [item.text, item.href])).toEqual([
      ["Создан заказ № IG-0001", "/admin/collections/orders/o1/"],
      ["Создан заказ", "/admin/collections/orders/o2/"],
    ]);
  });
});

describe("buildLeadTimeline — rule 6: order of the items", () => {
  it("newest first; on equal dates the creation is last and the rest keep their order", () => {
    const data = input({
      lead: { ...input().lead, newLeadNotifiedAt: CREATED },
      versions: [version("v1", 0.2), version("v2", 600, { status: "work", kpAmount: 10 })],
      notifications: [notification("n1", { sentAt: CREATED })],
      orders: [{ id: "o1", number: "1", createdAt: at(900) }],
    });
    expect(buildLeadTimeline(data).map((item) => item.id)).toEqual([
      "order:o1",
      "status:v2",
      "kp:v2",
      "email:new-lead",
      "max:n1",
      "created:lead",
    ]);
  });
});
