import { describe, expect, it } from "vitest";
import {
  columnKind,
  dropAnnouncement,
  focusAfterLeaving,
  moveCard,
  moveIntent,
  moveResultAnnouncement,
  setCardAssignee,
  statusIdOf,
} from "./board-state";
import type { KanbanCard, KanbanColumn } from "./types";

const card = (id: string, statusId: string, createdAt: string): KanbanCard => ({
  id,
  title: id,
  name: id,
  phone: null,
  productLabel: null,
  area: null,
  sourceShort: "Квиз",
  filesCount: 0,
  flags: [],
  isDuplicate: false,
  estimateFrom: null,
  kpAmount: null,
  commentsCount: 0,
  assignee: null,
  orderNumber: null,
  orderId: null,
  createdAt,
  statusChangedAt: null,
  statusId,
});

const column = (id: string, cards: KanbanCard[], total = cards.length): KanbanColumn => ({
  id,
  name: id,
  slug: id,
  color: "#2C5B86",
  kind: "open",
  isDefault: false,
  requiresReason: false,
  isContract: false,
  total,
  cards,
});

const a = card("a", "new", "2026-10-22T03:00:00.000Z");
const b = card("b", "new", "2026-10-22T02:00:00.000Z");
const c = card("c", "work", "2026-10-22T02:30:00.000Z");
const board = () => [column("new", [a, b], 5), column("work", [c], 1)];

describe("columnKind", () => {
  it("splits the statuses into columns and strips", () => {
    const flags = { isFinal: false, isContract: false, requiresReason: false };
    expect(columnKind(flags)).toBe("open");
    expect(columnKind({ ...flags, isFinal: true, isContract: true })).toBe("contract");
    expect(columnKind({ ...flags, isFinal: true, requiresReason: true })).toBe("refuse");
    expect(columnKind({ ...flags, isFinal: true })).toBe("refuse");
  });
});

describe("moveCard", () => {
  it("moves a card to the top of the target and adjusts the counters", () => {
    const [from, to] = moveCard(board(), b, "new", "work");
    expect(from?.cards.map((x) => x.id)).toEqual(["a"]);
    expect(from?.total).toBe(4);
    expect(to?.cards.map((x) => x.id)).toEqual(["b", "c"]);
    expect(to?.cards[0]?.statusId).toBe("work");
    expect(to?.total).toBe(2);
  });

  it("rolls back into the createdAt order", () => {
    const moved = moveCard(board(), a, "new", "work");
    const [from] = moveCard(moved, a, "work", "new", "sorted");
    expect(from?.cards.map((x) => x.id)).toEqual(["a", "b"]);
    expect(from?.total).toBe(5);
    const [, back] = moveCard(board(), b, "new", "work");
    const [restored] = moveCard([column("new", [a]), back!], b, "work", "new", "sorted");
    expect(restored?.cards.map((x) => x.id)).toEqual(["a", "b"]);
  });

  it("is a no-op for the same column", () => {
    expect(moveCard(board(), a, "new", "new")).toEqual(board());
  });

  it("does not double-count a rollback onto a board refreshed in the meantime", () => {
    // Optimistic move, then a refresh brings the server state back (the card is still in «new»).
    const refreshed = board();
    const rolledBack = moveCard(refreshed, a, "work", "new", "sorted");
    expect(rolledBack).toEqual(refreshed);
    expect(rolledBack[0]?.total).toBe(5);
    expect(rolledBack[1]?.total).toBe(1);
  });

  it("does not count a stale copy of the card in the target twice", () => {
    const stale = [column("new", [a, b], 5), column("work", [a, c], 2)];
    const [from, to] = moveCard(stale, a, "new", "work");
    expect(from?.total).toBe(4);
    expect(to?.cards.map((x) => x.id)).toEqual(["a", "c"]);
    expect(to?.total).toBe(2);
  });
});

describe("moveIntent", () => {
  const refuse = { ...column("no", []), kind: "refuse" as const, requiresReason: true };
  const contract = { ...column("deal", []), kind: "contract" as const, isContract: true };
  const columns = [...board(), refuse, contract];

  it("classifies the drop target", () => {
    expect(moveIntent(columns, a, null, false)).toEqual({ kind: "cancel" });
    expect(moveIntent(columns, a, "missing", false)).toEqual({ kind: "cancel" });
    expect(moveIntent(columns, a, "new", false).kind).toBe("same");
    expect(moveIntent(columns, a, "work", true).kind).toBe("busy");
    expect(moveIntent(columns, a, "no", false).kind).toBe("refuse");
    expect(moveIntent(columns, a, "deal", false).kind).toBe("contract");
    expect(moveIntent(columns, a, "work", false).kind).toBe("move");
  });

  it("never announces a move that did not happen", () => {
    const announce = (targetId: string | null, busy = false) =>
      dropAnnouncement(moveIntent(columns, a, targetId, busy), "ООО Ромашка");
    expect(announce(null)).toBe("Перенос отменён");
    for (const message of [
      announce("new"),
      announce("work", true),
      announce("no"),
      announce("deal"),
    ]) {
      expect(message).not.toMatch(/перенесена/);
    }
    expect(announce("new")).toContain("осталась в «new»");
    expect(announce("no")).toBe("Укажите причину отказа для заявки «ООО Ромашка»");
    expect(announce("deal")).toBe("Подтвердите перенос заявки «ООО Ромашка» в «deal»");
    expect(announce("work")).toBe("Заявка «ООО Ромашка»: сохраняем перенос в «work»");
  });
});

describe("moveResultAnnouncement", () => {
  it("reports success and rollback", () => {
    expect(moveResultAnnouncement({ ok: true }, "А", "work", "new")).toBe(
      "Заявка «А» перенесена в «work»"
    );
    const failed = moveResultAnnouncement({ ok: false, message: "Нет прав" }, "А", "work", "new");
    expect(failed).not.toMatch(/перенесена/);
    expect(failed).toContain("Нет прав");
    expect(failed).toContain("осталась в «new»");
  });
});

describe("focusAfterLeaving", () => {
  it("picks the next card, else the previous one, else the column", () => {
    expect(focusAfterLeaving(board(), "a")).toEqual({ kind: "card", cardId: "b" });
    expect(focusAfterLeaving(board(), "b")).toEqual({ kind: "card", cardId: "a" });
    expect(focusAfterLeaving(board(), "c")).toEqual({ kind: "column", columnId: "work" });
    expect(focusAfterLeaving(board(), "zzz")).toBeNull();
  });
});

describe("setCardAssignee", () => {
  it("replaces one card's assignee", () => {
    const me = { id: "u1", name: "Сергей Морозов", initials: "СМ" };
    const next = setCardAssignee(board(), "c", me);
    expect(next[1]?.cards[0]?.assignee).toEqual(me);
    expect(next[0]?.cards.every((x) => x.assignee === null)).toBe(true);
  });
});

describe("statusIdOf", () => {
  it("parses droppable ids", () => {
    expect(statusIdOf("status:abc")).toBe("abc");
    expect(statusIdOf("card:abc")).toBeNull();
    expect(statusIdOf(null)).toBeNull();
  });
});
