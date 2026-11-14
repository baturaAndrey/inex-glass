"use client";

import { useCallback, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  pointerWithin,
  rectIntersection,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { toast } from "@payloadcms/ui";
import { patchLead } from "./api";
import {
  CARD_DRAGGABLE_PREFIX,
  dropAnnouncement,
  findCard,
  focusAfterLeaving,
  moveCard,
  moveIntent,
  moveResultAnnouncement,
  setCardAssignee,
  statusIdOf,
} from "./board-state";
import { initials } from "./format";
import { cardDomId, KanbanCard, KanbanCardOverlay } from "./kanban-card";
import { KanbanColumn } from "./kanban-column";
import { ContractDialog, RefuseDialog } from "./move-dialogs";
import { RefuseStrip } from "./refuse-strip";
import type { PatchResult } from "./api";
import type {
  KanbanBoardProps,
  KanbanCard as KanbanCardData,
  KanbanColumn as KanbanColumnData,
} from "./types";
import type {
  Announcements,
  CollisionDetection,
  DragEndEvent,
  DragStartEvent,
  KeyboardCoordinateGetter,
  UniqueIdentifier,
} from "@dnd-kit/core";

/**
 * The kanban board (client): columns and refusal strips, drag-and-drop (`@dnd-kit/core`: mouse,
 * touch, keyboard with Russian screen-reader announcements), «Перенести в…», «Взять себе» and the
 * confirmation dialogs. Moves are optimistic: the card jumps at once, `PATCH /api/leads/<id>/`
 * runs the collection hooks, success refreshes the server data, a failure rolls back with a toast.
 *
 * Phones (≤ 599 px): no drag-and-drop; one column at a time behind a tab list.
 */

const PHONE_QUERY = "(max-width: 599px)";
/** The pointer must travel this far before a drag starts: plain clicks on links still work. */
const MOUSE_DRAG_DISTANCE_PX = 6;
/** Touch drag starts after a long press (scrolling stays a scroll). */
const TOUCH_DRAG_DELAY_MS = 250;
const TOUCH_DRAG_TOLERANCE_PX = 5;
/** Keyboard drag: the card is placed this far below the top of the target zone. */
const KEYBOARD_TARGET_OFFSET_PX = 8;
const KEYBOARD_ARROWS = ["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"];

const SCREEN_READER_INSTRUCTIONS =
  "Чтобы перенести заявку, нажмите пробел, выберите колонку стрелками влево/вправо " +
  "(вниз — «Отказ») и снова нажмите пробел. Escape — отмена.";

function subscribePhone(callback: () => void) {
  const query = window.matchMedia(PHONE_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

/** `true` on phones; `false` during SSR (the CSS hides the extra columns until hydration). */
function useIsPhone(): boolean {
  return useSyncExternalStore(
    subscribePhone,
    () => window.matchMedia(PHONE_QUERY).matches,
    () => false
  );
}

const cardIdOf = (id: UniqueIdentifier | null | undefined): string | null =>
  typeof id === "string" && id.startsWith(CARD_DRAGGABLE_PREFIX)
    ? id.slice(CARD_DRAGGABLE_PREFIX.length)
    : null;

/**
 * Pointer drags hit the zone under the pointer only (dropping elsewhere cancels); keyboard drags
 * have no pointer and use the card's rectangle placed by `keyboardCoordinates`.
 */
const collisionDetection: CollisionDetection = (args) =>
  args.pointerCoordinates ? pointerWithin(args) : rectIntersection(args);

/**
 * Keyboard drag: ←/→ jump to the previous/next column (by `droppableRects`, sorted by `left`),
 * ↓ to the refusal strip(s), ↑ back to the column the card came from (`active.data.statusId`).
 */
const keyboardCoordinates: KeyboardCoordinateGetter = (event, { context }) => {
  const { active, collisionRect, droppableRects, droppableContainers, over } = context;
  if (!KEYBOARD_ARROWS.includes(event.code)) return undefined;
  event.preventDefault();
  if (!active || !collisionRect) return undefined;

  const zones = droppableContainers.getEnabled().flatMap((container) => {
    const rect = droppableRects.get(container.id);
    if (!rect) return [];
    const kind = (container.data.current as { kind?: string } | undefined)?.kind;
    return [{ id: container.id, rect, isStrip: kind === "refuse" }];
  });
  const columns = zones.filter((zone) => !zone.isStrip).sort((a, b) => a.rect.left - b.rect.left);
  const strips = zones.filter((zone) => zone.isStrip).sort((a, b) => a.rect.top - b.rect.top);
  const overId = over?.id ?? null;
  const homeStatus = (active.data.current as { statusId?: string } | undefined)?.statusId;
  const homeIndex = Math.max(
    0,
    columns.findIndex((zone) => statusIdOf(zone.id) === homeStatus)
  );
  const columnIndex = columns.findIndex((zone) => zone.id === overId);
  const stripIndex = strips.findIndex((zone) => zone.id === overId);

  let target: (typeof zones)[number] | undefined;
  switch (event.code) {
    case "ArrowRight":
    case "ArrowLeft": {
      const step = event.code === "ArrowRight" ? 1 : -1;
      // Over a strip (or nothing): the column the card came from is the starting point.
      const from = columnIndex !== -1 ? columnIndex : homeIndex;
      target = columns[Math.min(columns.length - 1, Math.max(0, from + step))];
      break;
    }
    case "ArrowDown":
      target = stripIndex === -1 ? strips[0] : strips[stripIndex + 1];
      break;
    case "ArrowUp":
      if (stripIndex > 0) target = strips[stripIndex - 1];
      else if (stripIndex === 0) target = columns[homeIndex];
      break;
  }
  if (!target) return undefined;
  return {
    x: target.rect.left + (target.rect.width - collisionRect.width) / 2,
    y: target.rect.top + KEYBOARD_TARGET_OFFSET_PX,
  };
};

type PendingDialog =
  | { kind: "refuse"; card: KanbanCardData; target: KanbanColumnData }
  | { kind: "contract"; card: KanbanCardData; target: KanbanColumnData };

/** Moves the keyboard focus back to a card (after a dialog or a move). */
function focusCard(cardId: string) {
  requestAnimationFrame(() => {
    const card = document.getElementById(cardDomId(cardId));
    card?.querySelector<HTMLElement>(".iga-kcard__handle, .iga-kmenu__button")?.focus();
  });
}

/** Focuses a column's heading (a strip's summary): the place left when its last card goes. */
function focusColumn(columnId: string) {
  requestAnimationFrame(() => {
    const zone = document.querySelector(`[data-status-id="${CSS.escape(columnId)}"]`);
    zone?.querySelector<HTMLElement>(".iga-kanban__col-title, .iga-kstrip__summary")?.focus();
  });
}

export function KanbanBoard(props: KanbanBoardProps) {
  const { currentUserId, currentUserName, reasonOptions, expandHrefs, expandedId } = props;
  const router = useRouter();
  const isPhone = useIsPhone();
  const tabsId = useId();
  const now = useMemo(() => new Date(props.now), [props.now]);

  // Local copy of the server columns for optimistic moves; a refresh brings new props and
  // replaces it (state adjusted during render, React's pattern for derived state).
  const [columns, setColumns] = useState(props.columns);
  const [sourceColumns, setSourceColumns] = useState(props.columns);
  if (sourceColumns !== props.columns) {
    setSourceColumns(props.columns);
    setColumns(props.columns);
  }

  const [busyIds, setBusyIds] = useState<ReadonlySet<string>>(() => new Set());
  const [dialog, setDialog] = useState<PendingDialog | null>(null);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [activeLane, setActiveLane] = useState(0);
  /** Server verdicts on moves for screen readers (dnd-kit only announces the drop itself). */
  const [liveMessage, setLiveMessage] = useState("");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const setBusy = useCallback((cardId: string, busy: boolean) => {
    setBusyIds((current) => {
      const next = new Set(current);
      if (busy) next.add(cardId);
      else next.delete(cardId);
      return next;
    });
  }, []);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: MOUSE_DRAG_DISTANCE_PX } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: TOUCH_DRAG_DELAY_MS, tolerance: TOUCH_DRAG_TOLERANCE_PX },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: keyboardCoordinates })
  );

  const boardColumns = columns.filter((column) => column.kind !== "refuse");
  const strips = columns.filter((column) => column.kind === "refuse");
  // Phone tabs: the board columns first, then the strips (same order as on the page).
  const lanes = [...boardColumns, ...strips];
  const laneIndex = Math.min(activeLane, Math.max(0, lanes.length - 1));

  const columnName = useCallback(
    (columnId: string) => columns.find((column) => column.id === columnId)?.name ?? "",
    [columns]
  );

  /**
   * PATCHes a status change; the card moves at once and comes back on failure (a no-op when a
   * refresh meanwhile already put it back, see `moveCard`).
   */
  const commitMove = useCallback(
    async (
      card: KanbanCardData,
      target: KanbanColumnData,
      sourceName: string,
      body: Record<string, unknown>
    ) => {
      const fromId = card.statusId;
      setColumns((current) => moveCard(current, card, fromId, target.id));
      setBusy(card.id, true);
      const result = await patchLead(card.id, body);
      setBusy(card.id, false);
      setLiveMessage(moveResultAnnouncement(result, card.title, target.name, sourceName));
      if (result.ok) {
        toast.success(`Статус: «${target.name}»`);
        router.refresh();
      } else {
        setColumns((current) => moveCard(current, card, target.id, fromId, "sorted"));
        toast.error(result.message);
      }
      return result;
    },
    [router, setBusy]
  );

  /** Common entry of drag-and-drop and «Перенести в…». */
  const moveLead = useCallback(
    (card: KanbanCardData, targetId: string) => {
      const intent = moveIntent(columns, card, targetId, busyIds.has(card.id));
      switch (intent.kind) {
        case "refuse":
        case "contract":
          setDialog({ kind: intent.kind, card, target: intent.target });
          break;
        case "move":
          void commitMove(card, intent.target, columnName(card.statusId), {
            status: intent.target.id,
          });
          break;
        default:
          break;
      }
    },
    [busyIds, columnName, columns, commitMove]
  );

  const takeSelf = useCallback(
    async (card: KanbanCardData) => {
      if (busyIds.has(card.id)) return;
      const previous = card.assignee;
      const me = { id: currentUserId, name: currentUserName, initials: initials(currentUserName) };
      setColumns((current) => setCardAssignee(current, card.id, me));
      setBusy(card.id, true);
      const result = await patchLead(card.id, { assignee: currentUserId });
      setBusy(card.id, false);
      if (result.ok) {
        toast.success("Заявка назначена на вас");
        router.refresh();
      } else {
        setColumns((current) => setCardAssignee(current, card.id, previous));
        toast.error(result.message);
      }
    },
    [busyIds, currentUserId, currentUserName, router, setBusy]
  );

  const closeDialog = () => {
    if (dialog) focusCard(dialog.card.id);
    setDialog(null);
  };

  const submitRefusal = useCallback(
    async (
      card: KanbanCardData,
      target: KanbanColumnData,
      reason: { refuseReasonCode: string; refuseReason?: string }
    ): Promise<PatchResult> => {
      // The card leaves for a strip that may be collapsed (or another phone tab), so the focus
      // stays in the source column: on its neighbour, or on the column heading. Taken while the
      // card is still in place.
      const focusTo = focusAfterLeaving(columns, card.id);
      // Not optimistic: the card stays put until the server accepts the reason.
      setBusy(card.id, true);
      const result = await patchLead(card.id, { status: target.id, ...reason });
      setBusy(card.id, false);
      if (result.ok) {
        setColumns((current) => moveCard(current, card, card.statusId, target.id));
        setDialog(null);
        const sourceName = columnName(card.statusId);
        setLiveMessage(moveResultAnnouncement(result, card.title, target.name, sourceName));
        toast.success(`Статус: «${target.name}»`);
        router.refresh();
        if (focusTo?.kind === "card") focusCard(focusTo.cardId);
        else if (focusTo?.kind === "column") focusColumn(focusTo.columnId);
      }
      return result;
    },
    [columnName, columns, router, setBusy]
  );

  // --- Drag-and-drop --------------------------------------------------------------------------

  const titleOf = (id: UniqueIdentifier | null | undefined) => {
    const cardId = cardIdOf(id);
    return cardId ? (findCard(columns, cardId)?.card.title ?? "") : "";
  };
  const zoneName = (id: UniqueIdentifier | null | undefined) => {
    const statusId = statusIdOf(id);
    return columns.find((column) => column.id === statusId)?.name ?? "";
  };

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Взята заявка «${titleOf(active.id)}»`,
    // dnd-kit reports the card's own column right after the pick-up and the live region keeps
    // only the last message, so the pick-up is repeated there.
    onDragOver: ({ active, over }) => {
      if (!over) return "Заявка вне колонок";
      const home = (active.data.current as { statusId?: string } | undefined)?.statusId;
      return statusIdOf(over.id) === home
        ? `Взята заявка «${titleOf(active.id)}», колонка «${zoneName(over.id)}»`
        : `Над колонкой «${zoneName(over.id)}»`;
    },
    // The drop only starts a move (or opens a dialog): the server's verdict comes later in the
    // board's own live region.
    onDragEnd: ({ active, over }) => {
      const cardId = cardIdOf(active.id);
      const found = cardId ? findCard(columns, cardId) : null;
      if (!found) return "Перенос отменён";
      const intent = moveIntent(
        columns,
        found.card,
        statusIdOf(over?.id),
        busyIds.has(found.card.id)
      );
      return dropAnnouncement(intent, found.card.title);
    },
    onDragCancel: () => "Перенос отменён",
  };

  const onDragStart = ({ active }: DragStartEvent) => {
    setActiveCardId(cardIdOf(active.id));
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveCardId(null);
    const cardId = cardIdOf(active.id);
    const targetId = statusIdOf(over?.id);
    const found = cardId ? findCard(columns, cardId) : null;
    if (found && targetId) moveLead(found.card, targetId);
  };

  const activeCard = activeCardId ? findCard(columns, activeCardId) : null;

  // --- Rendering ------------------------------------------------------------------------------

  const renderCards = (column: KanbanColumnData) =>
    column.cards.map((card) => (
      <KanbanCard
        key={card.id}
        card={card}
        column={column}
        now={now}
        busy={busyIds.has(card.id)}
        dragDisabled={isPhone}
        moveTargets={columns
          .filter((candidate) => candidate.id !== card.statusId)
          .map(({ id, name, color }) => ({ id, name, color }))}
        onMove={(statusId) => moveLead(card, statusId)}
        onTakeSelf={() => void takeSelf(card)}
      />
    ));

  const tabId = (index: number) => `${tabsId}-tab-${index}`;
  const panelId = (index: number) => `${tabsId}-panel-${index}`;
  const panelProps = (column: KanbanColumnData) => {
    const index = lanes.indexOf(column);
    const active = index === laneIndex;
    return isPhone
      ? {
          id: panelId(index),
          role: "tabpanel",
          "aria-labelledby": tabId(index),
          hidden: !active,
          "data-active": active,
        }
      : { "data-active": active };
  };

  const onTabKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    const edge = event.key === "Home" ? 0 : event.key === "End" ? lanes.length - 1 : null;
    if (step === 0 && edge === null) return;
    event.preventDefault();
    const next = edge ?? (laneIndex + step + lanes.length) % lanes.length;
    setActiveLane(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      accessibility={{
        announcements,
        screenReaderInstructions: { draggable: SCREEN_READER_INSTRUCTIONS },
      }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveCardId(null)}
    >
      <div className="iga-kanban__board-area">
        <div
          className="iga-ktabs"
          role="tablist"
          aria-label="Статусы заявок"
          onKeyDown={onTabKeyDown}
        >
          {lanes.map((column, index) => (
            <button
              key={column.id}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              id={tabId(index)}
              type="button"
              role="tab"
              className="iga-ktabs__tab"
              aria-selected={index === laneIndex}
              aria-controls={isPhone ? panelId(index) : undefined}
              tabIndex={index === laneIndex ? 0 : -1}
              onClick={() => setActiveLane(index)}
            >
              {column.name} <b>{column.total}</b>
            </button>
          ))}
        </div>

        <div className="iga-kanban__scroller">
          <div
            className="iga-kanban__board"
            style={{ "--iga-kanban-cols": boardColumns.length } as CSSProperties}
          >
            {boardColumns.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                expandHref={expandHrefs[column.id]}
                expanded={expandedId === column.id}
                panelProps={panelProps(column)}
              >
                {renderCards(column)}
              </KanbanColumn>
            ))}
          </div>
        </div>

        {strips.map((column) => (
          <RefuseStrip
            key={column.id}
            column={column}
            expandHref={expandHrefs[column.id]}
            expanded={expandedId === column.id}
            forceOpen={isPhone && lanes.indexOf(column) === laneIndex}
            panelProps={panelProps(column)}
          >
            {renderCards(column)}
          </RefuseStrip>
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeCard ? (
          <KanbanCardOverlay card={activeCard.card} column={activeCard.column} now={now} />
        ) : null}
      </DragOverlay>

      {dialog?.kind === "refuse" ? (
        <RefuseDialog
          key={dialog.card.id}
          cardTitle={dialog.card.title}
          reasonOptions={reasonOptions}
          onSubmit={(reason) => submitRefusal(dialog.card, dialog.target, reason)}
          onClose={closeDialog}
        />
      ) : null}
      {dialog?.kind === "contract" ? (
        <ContractDialog
          key={dialog.card.id}
          cardTitle={dialog.card.title}
          statusName={dialog.target.name}
          onConfirm={() => {
            const { card, target } = dialog;
            setDialog(null);
            focusCard(card.id);
            void commitMove(card, target, columnName(card.statusId), { status: target.id });
          }}
          onClose={closeDialog}
        />
      ) : null}

      <div className="iga-kanban__sr-only" role="status" aria-live="polite" aria-atomic="true">
        {liveMessage}
      </div>
    </DndContext>
  );
}
