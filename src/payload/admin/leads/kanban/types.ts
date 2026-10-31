/**
 * Serializable data of the leads kanban (`/admin/collections/leads/kanban/`): the server view
 * (`kanban-view.tsx` + `data.ts`) builds it, the client board (`kanban-board.tsx`) renders it.
 * Only plain JSON values: everything here crosses the server → client boundary.
 */

/**
 * - `open` — a working column (`!isFinal && !requiresReason`);
 * - `contract` — a column of `isContract` statuses, last 30 days by `statusChangedAt`;
 * - `refuse` — a dead-end status (`requiresReason`, or final but not a contract): a drop strip
 *   under the board, last 30 days.
 */
export type KanbanColumnKind = "open" | "contract" | "refuse";

export interface KanbanCardFlag {
  value: string;
  label: string;
  /** «Срочно» is red (`.iga-badge--no`), every other flag amber (`--work`). */
  tone: "no" | "work";
}

export interface KanbanAssignee {
  id: string;
  name: string;
  initials: string;
}

export interface KanbanCard {
  id: string;
  /** `company || name`. */
  title: string;
  name: string;
  /** Normalized `+79123456789`. */
  phone: string | null;
  /** Label of `LEAD_PRODUCT_TYPES`. */
  productLabel: string | null;
  area: number | null;
  /** «Квиз», «Чертёж», «Звонок», «Образец», «Под нагрузку», «Контакты», «Полная форма». */
  sourceShort: string;
  filesCount: number;
  flags: KanbanCardFlag[];
  isDuplicate: boolean;
  estimateFrom: number | null;
  kpAmount: number | null;
  commentsCount: number;
  assignee: KanbanAssignee | null;
  /** Contract columns only: the order created by `orderFromLead`. */
  orderNumber: string | null;
  orderId: string | null;
  createdAt: string;
  statusChangedAt: string | null;
  statusId: string;
}

export interface KanbanReasonCount {
  label: string;
  count: number;
}

export interface KanbanColumn {
  id: string;
  name: string;
  slug: string;
  /** Text colour of the status (`lead-statuses.color`), already sanitized to a hex colour. */
  color: string;
  kind: KanbanColumnKind;
  isDefault: boolean;
  requiresReason: boolean;
  isContract: boolean;
  /** All matching leads (the header counter and «Ещё N»); `cards` holds at most the limit. */
  total: number;
  cards: KanbanCard[];
  /** Refusal strips: breakdown by `refuseReasonCode`. */
  reasons?: KanbanReasonCount[];
}

export interface KanbanBoardProps {
  columns: KanbanColumn[];
  currentUserId: string;
  /** Display name of the viewer: the optimistic avatar of «Взять себе». */
  currentUserName: string;
  /** Options of the refusal dialog (`LEAD_REFUSE_REASON_CODES`). */
  reasonOptions: { value: string; label: string }[];
  /** Column id → «Ещё N» link (`expand=<id>`), or «Свернуть» for the expanded column. */
  expandHrefs: Record<string, string>;
  /** Id of the column shown with the extended limit (`expand`), if any. */
  expandedId: string | null;
  /** Server time (ISO) the ages are computed against: no hydration mismatch. */
  now: string;
}
