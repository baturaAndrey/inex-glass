"use client";

import { useDraggable } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import { FUNNEL_KP_SLUG } from "@/lib/leads-admin/report";
import { leadSummaryPath } from "@/payload/admin/leads/constants";
import { cardDraggableId } from "./board-state";
import {
  cardAge,
  commentsLabel,
  formatArea,
  formatEstimateFrom,
  formatKpAmount,
  formatPhoneDisplay,
} from "./format";
import { MoveMenu } from "./move-menu";
import type { CardAgeMode } from "./format";
import type { MoveTarget } from "./move-menu";
import type { KanbanCard as KanbanCardData, KanbanColumn } from "./types";

/**
 * One lead on the kanban (mockup `.lc`): title link to the «Сводка» tab, age, contact, tags and
 * flags, the sum / order and the assignee. Dragged by the whole card (mouse, touch) or by the
 * grip handle (keyboard: the handle is the activator); «Перенести в…» moves it without dragging.
 */

type ColumnInfo = Pick<KanbanColumn, "kind" | "slug" | "isDefault">;

export const cardDomId = (cardId: string) => `kcard-${cardId}`;

/** Order management tab of a contract card's order. */
const orderManagePath = (orderId: string) =>
  `/admin/collections/orders/${encodeURIComponent(orderId)}/manage/`;

function ageMode(column: ColumnInfo): CardAgeMode {
  if (column.kind !== "open") return "contract";
  if (column.isDefault) return "default";
  return column.slug === FUNNEL_KP_SLUG ? "kp" : "open";
}

interface CardActions {
  moveTargets: MoveTarget[];
  onMove: (statusId: string) => void;
  onTakeSelf: () => void;
}

interface CardBodyProps {
  card: KanbanCardData;
  column: ColumnInfo;
  now: Date;
  busy: boolean;
  /** `null` for the drag overlay copy: no interactive controls. */
  actions: CardActions | null;
}

function CardFooterValue({ card, column }: { card: KanbanCardData; column: ColumnInfo }) {
  if (column.kind === "contract" && card.orderId) {
    return (
      <a className="iga-kcard__order" href={orderManagePath(card.orderId)}>
        {card.orderNumber ? `Заказ ${card.orderNumber} →` : "Заказ →"}
      </a>
    );
  }
  if (card.kpAmount !== null) {
    return <span className="iga-kcard__sum">{formatKpAmount(card.kpAmount)}</span>;
  }
  if (card.estimateFrom !== null) {
    return <span className="iga-kcard__sum">{formatEstimateFrom(card.estimateFrom)}</span>;
  }
  if (card.commentsCount > 0) {
    return <span className="iga-kcard__muted">{commentsLabel(card.commentsCount)}</span>;
  }
  return <span className="iga-kcard__muted">—</span>;
}

function CardBody({ card, column, now, busy, actions }: CardBodyProps) {
  const age = cardAge(card, ageMode(column), now);
  return (
    <>
      <div className="iga-kcard__top">
        <a className="iga-kcard__title" href={leadSummaryPath(card.id)}>
          {card.title}
        </a>
        <span
          className="iga-kcard__age"
          title={age.title || undefined}
          data-tone={age.tone ?? undefined}
        >
          {age.label}
        </span>
      </div>
      <div className="iga-kcard__contact">
        {card.name}
        {card.phone ? (
          <>
            {" · "}
            <a href={`tel:${card.phone}`}>{formatPhoneDisplay(card.phone)}</a>
          </>
        ) : null}
      </div>
      <div className="iga-kcard__tags">
        {card.productLabel ? <span className="iga-tag">{card.productLabel}</span> : null}
        {card.area !== null ? <span className="iga-tag">{formatArea(card.area)}</span> : null}
        <span className="iga-tag">{card.sourceShort}</span>
        {card.filesCount > 0 ? <span className="iga-tag">Файлы: {card.filesCount}</span> : null}
        {card.flags.map((flag) => (
          <span key={flag.value} className={`iga-badge iga-badge--${flag.tone}`}>
            {flag.label}
          </span>
        ))}
        {card.isDuplicate ? <span className="iga-badge iga-badge--work">Повтор</span> : null}
      </div>
      <div className="iga-kcard__foot">
        <CardFooterValue card={card} column={column} />
        {card.assignee ? (
          <span className="iga-avatar iga-avatar--sm" title={card.assignee.name}>
            <span aria-hidden="true">{card.assignee.initials}</span>
            <span className="iga-kanban__sr-only">Ответственный: {card.assignee.name}</span>
          </span>
        ) : actions ? (
          <button
            type="button"
            className="iga-kcard__take"
            disabled={busy}
            onClick={actions.onTakeSelf}
          >
            Взять себе
          </button>
        ) : (
          <span className="iga-kcard__take" aria-hidden="true">
            Взять себе
          </span>
        )}
      </div>
      {actions ? (
        <div className="iga-kcard__menu">
          <MoveMenu
            cardTitle={card.title}
            targets={actions.moveTargets}
            disabled={busy}
            onSelect={actions.onMove}
          />
        </div>
      ) : null}
    </>
  );
}

export interface KanbanCardProps extends CardActions {
  card: KanbanCardData;
  column: ColumnInfo;
  now: Date;
  busy: boolean;
  /** Phones: drag-and-drop is off, only «Перенести в…». */
  dragDisabled: boolean;
}

export function KanbanCard({
  card,
  column,
  now,
  busy,
  dragDisabled,
  moveTargets,
  onMove,
  onTakeSelf,
}: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
    id: cardDraggableId(card.id),
    data: { cardId: card.id, statusId: card.statusId },
    disabled: dragDisabled || busy,
  });
  // The handle is the keyboard activator (a native button: no generic `role`/roledescription).
  // Mouse and touch listeners sit on the whole card; key presses bubble up from the handle.
  const handleAttributes = {
    tabIndex: attributes.tabIndex,
    "aria-describedby": attributes["aria-describedby"],
    "aria-pressed": attributes["aria-pressed"],
    "aria-disabled": attributes["aria-disabled"],
  };

  return (
    <article
      ref={setNodeRef}
      id={cardDomId(card.id)}
      className="iga-kcard"
      aria-busy={busy || undefined}
      data-card-id={card.id}
      data-dragging={isDragging || undefined}
      {...listeners}
    >
      {dragDisabled ? null : (
        <button
          ref={setActivatorNodeRef}
          type="button"
          className="iga-kcard__handle"
          aria-label={`Перетащить заявку «${card.title}»`}
          {...handleAttributes}
        >
          <GripVertical aria-hidden="true" />
        </button>
      )}
      <CardBody
        card={card}
        column={column}
        now={now}
        busy={busy}
        actions={{ moveTargets, onMove, onTakeSelf }}
      />
    </article>
  );
}

/** Copy of a card under the pointer while dragging (`DragOverlay`). */
export function KanbanCardOverlay({
  card,
  column,
  now,
}: {
  card: KanbanCardData;
  column: ColumnInfo;
  now: Date;
}) {
  return (
    <article className="iga-kcard is-dragging" aria-hidden="true">
      <CardBody card={card} column={column} now={now} busy={false} actions={null} />
    </article>
  );
}
