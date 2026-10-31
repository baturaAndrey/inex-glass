import { isOrderStatus, ORDER_STATUS_META } from "@/lib/orders/status";
import type { OrderStatus } from "@/lib/orders/status";
import type { DefaultServerCellComponentProps } from "payload";

/**
 * Theme class of each stage badge (`.iga-badge--*` in `_base.scss`); the tokens match the
 * stage colours of `ORDER_STATUS_META` (info → warning → brand → success → neutral).
 */
const STAGE_BADGE_CLASS: Readonly<Record<OrderStatus, string>> = {
  spec_agreed: "iga-badge iga-badge--new",
  in_production: "iga-badge iga-badge--work",
  packed: "iga-badge iga-badge--kp",
  shipped: "iga-badge iga-badge--ok",
  received: "iga-badge",
};

/** `orders.currentStatus` in the list: a badge in the stage colour (task 33). */
export function StatusCell({ cellData }: DefaultServerCellComponentProps) {
  if (!isOrderStatus(cellData)) return <span>—</span>;
  return <span className={STAGE_BADGE_CLASS[cellData]}>{ORDER_STATUS_META[cellData].label}</span>;
}
