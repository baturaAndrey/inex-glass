import type { KanbanAssignee, KanbanCard, KanbanColumn, KanbanColumnKind } from "./types";

/**
 * Pure state transitions of the kanban board (optimistic updates and their rollbacks). The board
 * keeps a local copy of the server columns; `router.refresh()` replaces it with fresh data.
 */

export const STATUS_DROPPABLE_PREFIX = "status:";
export const CARD_DRAGGABLE_PREFIX = "card:";

export const statusDroppableId = (statusId: string) => `${STATUS_DROPPABLE_PREFIX}${statusId}`;
export const cardDraggableId = (cardId: string) => `${CARD_DRAGGABLE_PREFIX}${cardId}`;

/** Status id of a droppable id (`status:<id>`), `null` for anything else. */
export function statusIdOf(droppableId: string | number | null | undefined): string | null {
  return typeof droppableId === "string" && droppableId.startsWith(STATUS_DROPPABLE_PREFIX)
    ? droppableId.slice(STATUS_DROPPABLE_PREFIX.length)
    : null;
}

/**
 * Place of a status on the board: a dead end (`requiresReason`, or final but not a contract,
 * «Отказ» in the seed) is a drop strip under the board; a contract status is a column after the
 * open ones; everything else is a working column.
 */
export function columnKind(status: {
  isFinal: boolean;
  isContract: boolean;
  requiresReason: boolean;
}): KanbanColumnKind {
  if (status.requiresReason) return "refuse";
  if (status.isContract) return "contract";
  return status.isFinal ? "refuse" : "open";
}

export function findCard(
  columns: readonly KanbanColumn[],
  cardId: string
): { column: KanbanColumn; card: KanbanCard } | null {
  for (const column of columns) {
    const card = column.cards.find((candidate) => candidate.id === cardId);
    if (card) return { column, card };
  }
  return null;
}

/** Inserts `card` keeping the server order of a column (`-createdAt`). */
function insertSorted(cards: readonly KanbanCard[], card: KanbanCard): KanbanCard[] {
  const index = cards.findIndex((candidate) => candidate.createdAt < card.createdAt);
  return index === -1 ? [...cards, card] : [...cards.slice(0, index), card, ...cards.slice(index)];
}

/**
 * Moves `card` from the column `fromId` to `toId` and adjusts both counters. `top` (an
 * optimistic move) puts it first in the target; `sorted` (a rollback) puts it back at its
 * `-createdAt` place.
 *
 * A card that is not in the source column leaves the board unchanged: the server data was
 * refreshed in the meantime (`router.refresh()` of another action), so the fresh columns already
 * hold the card where the server has it and its counters are exact — moving it again would
 * count it twice.
 */
export function moveCard(
  columns: readonly KanbanColumn[],
  card: KanbanCard,
  fromId: string,
  toId: string,
  position: "top" | "sorted" = "top"
): KanbanColumn[] {
  const source = columns.find((column) => column.id === fromId);
  const inSource = source?.cards.some((candidate) => candidate.id === card.id) ?? false;
  if (fromId === toId || !inSource) return [...columns];
  const moved: KanbanCard = { ...card, statusId: toId };
  return columns.map((column) => {
    if (column.id === fromId) {
      const cards = column.cards.filter((candidate) => candidate.id !== card.id);
      return { ...column, cards, total: Math.max(0, column.total - 1) };
    }
    if (column.id === toId) {
      const rest = column.cards.filter((candidate) => candidate.id !== card.id);
      const cards = position === "top" ? [moved, ...rest] : insertSorted(rest, moved);
      // A stale duplicate of the card in the target is replaced, not counted again.
      const total = rest.length === column.cards.length ? column.total + 1 : column.total;
      return { ...column, cards, total };
    }
    return column;
  });
}

/**
 * What dropping (or picking in «Перенести в…») `card` onto the column `targetId` does:
 * - `cancel` — no such column;
 * - `same` — the card's own column, nothing to do;
 * - `busy` — the card is still being saved, the move is ignored;
 * - `refuse` / `contract` — a confirmation dialog opens first, nothing is moved yet;
 * - `move` — an optimistic move starts at once.
 */
export type MoveIntent =
  | { kind: "cancel" }
  | { kind: "same" | "busy" | "refuse" | "contract" | "move"; target: KanbanColumn };

export function moveIntent(
  columns: readonly KanbanColumn[],
  card: KanbanCard,
  targetId: string | null,
  busy: boolean
): MoveIntent {
  const target = targetId ? columns.find((column) => column.id === targetId) : undefined;
  if (!target) return { kind: "cancel" };
  if (card.statusId === target.id) return { kind: "same", target };
  if (busy) return { kind: "busy", target };
  if (target.requiresReason) return { kind: "refuse", target };
  if (target.isContract) return { kind: "contract", target };
  return { kind: "move", target };
}

/**
 * Screen-reader message at the end of a drag: it describes what actually happens, never a
 * «перенесена» that has not happened (the server result is announced separately).
 */
export function dropAnnouncement(intent: MoveIntent, cardTitle: string): string {
  switch (intent.kind) {
    case "cancel":
      return "Перенос отменён";
    case "same":
      return `Перенос отменён: заявка «${cardTitle}» осталась в «${intent.target.name}»`;
    case "busy":
      return `Перенос отменён: заявка «${cardTitle}» ещё сохраняется`;
    case "refuse":
      return `Укажите причину отказа для заявки «${cardTitle}»`;
    case "contract":
      return `Подтвердите перенос заявки «${cardTitle}» в «${intent.target.name}»`;
    case "move":
      return `Заявка «${cardTitle}»: сохраняем перенос в «${intent.target.name}»`;
  }
}

/** Screen-reader message with the server's verdict on a move. */
export function moveResultAnnouncement(
  result: { ok: true } | { ok: false; message: string },
  cardTitle: string,
  targetName: string,
  sourceName: string
): string {
  return result.ok
    ? `Заявка «${cardTitle}» перенесена в «${targetName}»`
    : `Не удалось перенести заявку «${cardTitle}» в «${targetName}»: ` +
        `${result.message.replace(/[.!]+\s*$/, "")}. ` +
        `Заявка осталась в «${sourceName}»`;
}

/**
 * Where the keyboard focus goes when `cardId` leaves its column for a place that may be hidden
 * (a collapsed refusal strip): the next card of the column, else the previous one, else the
 * column itself. `null` when the card is not on the board.
 */
export function focusAfterLeaving(
  columns: readonly KanbanColumn[],
  cardId: string
): { kind: "card"; cardId: string } | { kind: "column"; columnId: string } | null {
  const found = findCard(columns, cardId);
  if (!found) return null;
  const { cards } = found.column;
  const index = cards.findIndex((candidate) => candidate.id === cardId);
  const neighbour = cards[index + 1] ?? cards[index - 1];
  return neighbour
    ? { kind: "card", cardId: neighbour.id }
    : { kind: "column", columnId: found.column.id };
}

/** Replaces the assignee of one card (optimistic «Взять себе» and its rollback). */
export function setCardAssignee(
  columns: readonly KanbanColumn[],
  cardId: string,
  assignee: KanbanAssignee | null
): KanbanColumn[] {
  return columns.map((column) =>
    column.cards.some((card) => card.id === cardId)
      ? {
          ...column,
          cards: column.cards.map((card) => (card.id === cardId ? { ...card, assignee } : card)),
        }
      : column
  );
}
