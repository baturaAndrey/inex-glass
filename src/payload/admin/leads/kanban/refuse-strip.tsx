"use client";

import { useState } from "react";
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { useDroppable } from "@dnd-kit/core";
import { formatNumber } from "@/lib/domain/format";
import { statusDroppableId } from "./board-state";
import { moreLabel } from "./kanban-column";
import type { KanbanColumn } from "./types";

/**
 * A dead-end status («Отказ») under the board (mockup `<details class="card">`): the last 30 days
 * counter and a drop hint; opened — the breakdown by reason and the cards. The whole strip is a
 * drop zone: dropping a card opens the refusal dialog.
 */
export function RefuseStrip({
  column,
  expandHref,
  expanded,
  forceOpen,
  panelProps,
  children,
}: {
  column: KanbanColumn;
  expandHref: string | undefined;
  expanded: boolean;
  /** Phones: the strip's tab is selected, so its cards are shown. */
  forceOpen: boolean;
  panelProps: HTMLAttributes<HTMLElement> & { "data-active"?: boolean };
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: statusDroppableId(column.id),
    data: { kind: column.kind },
  });
  // Opened by default when the user came back from «Ещё N» of this strip. On phones the strip
  // is a tab panel (`forceOpen`): always open, the summary does not toggle it and the native
  // toggle never writes into `open`, so the desktop state survives a switch between modes.
  const [open, setOpen] = useState(expanded);
  const isOpen = open || forceOpen;
  const more = moreLabel(column);
  const reasons = column.reasons ?? [];

  return (
    <section
      ref={setNodeRef}
      className="iga-kstrip"
      aria-label={column.name}
      data-status-id={column.id}
      data-status-slug={column.slug}
      data-over={isOver || undefined}
      style={{ "--iga-status-color": column.color } as CSSProperties}
      {...panelProps}
    >
      <details
        className="iga-card iga-kstrip__details"
        open={isOpen}
        onToggle={(event) => {
          if (!forceOpen) setOpen(event.currentTarget.open);
        }}
      >
        <summary
          className="iga-kstrip__summary"
          // A click (Enter/Space included) would close the panel natively behind React's back.
          onClick={(event) => {
            if (forceOpen) event.preventDefault();
          }}
        >
          <span className="iga-kanban__dot" aria-hidden="true" />
          <span className="iga-kstrip__name">{column.name}</span>
          <span className="iga-kstrip__hint">
            {formatNumber(column.total)} за 30 дней · перетащите карточку сюда, чтобы закрыть заявку
            с причиной
          </span>
        </summary>
        {reasons.length > 0 ? (
          <p className="iga-kstrip__reasons">
            {reasons.map((reason) => `${reason.label}: ${formatNumber(reason.count)}`).join(" · ")}
          </p>
        ) : null}
        {column.cards.length > 0 ? (
          <div className="iga-kstrip__cards">{children}</div>
        ) : (
          <p className="iga-kanban__empty">Нет заявок за 30 дней</p>
        )}
        {expandHref && (more || expanded) ? (
          <a className="iga-kanban__more" href={expandHref}>
            {expanded ? "Свернуть" : more}
          </a>
        ) : null}
      </details>
    </section>
  );
}
