"use client";

import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { useDroppable } from "@dnd-kit/core";
import { formatNumber } from "@/lib/domain/format";
import { statusDroppableId } from "./board-state";
import type { KanbanColumn as KanbanColumnData } from "./types";

/**
 * A status column of the kanban (mockup `.col`): header with the status dot, name and counter
 * (contract columns: «6 за 30 дней»), the cards and «Ещё N» / «Свернуть». The whole column is a
 * drop zone (`status:<id>`), outlined while a card hovers over it.
 */

export function moreLabel(column: Pick<KanbanColumnData, "total" | "cards">): string | null {
  const rest = column.total - column.cards.length;
  return rest > 0 ? `Ещё ${formatNumber(rest)}` : null;
}

export function KanbanColumn({
  column,
  expandHref,
  expanded,
  panelProps,
  children,
}: {
  column: KanbanColumnData;
  expandHref: string | undefined;
  expanded: boolean;
  /** Tab panel attributes on phones (`role="tabpanel"`, `aria-labelledby`, `hidden`). */
  panelProps: HTMLAttributes<HTMLElement> & { "data-active"?: boolean };
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: statusDroppableId(column.id),
    data: { kind: column.kind },
  });
  const more = moreLabel(column);
  const counter =
    column.kind === "contract"
      ? `${formatNumber(column.total)} за 30 дней`
      : formatNumber(column.total);

  return (
    <section
      ref={setNodeRef}
      className="iga-kanban__col"
      aria-label={column.name}
      data-status-id={column.id}
      data-status-slug={column.slug}
      data-over={isOver || undefined}
      style={{ "--iga-status-color": column.color } as CSSProperties}
      {...panelProps}
    >
      <div className="iga-kanban__col-head">
        <span className="iga-kanban__dot" aria-hidden="true" />
        {/* Focus target when the column's last card leaves for a refusal strip. */}
        <h2 className="iga-kanban__col-title" tabIndex={-1}>
          {column.name}
        </h2>
        <span className="iga-kanban__col-count">{counter}</span>
      </div>
      {children}
      {column.cards.length === 0 ? <p className="iga-kanban__empty">Нет заявок</p> : null}
      {expandHref && (more || expanded) ? (
        <a className="iga-kanban__more" href={expandHref}>
          {expanded ? "Свернуть" : more}
        </a>
      ) : null}
    </section>
  );
}
