import { isOrderStatus, ORDER_STATUS_META } from "@/lib/orders/status";
import type { DefaultServerCellComponentProps } from "payload";

/** Badge geometry of the admin list (Payload admin has no Tailwind; inline styles on purpose). */
const BADGE_STYLE = {
  display: "inline-block",
  padding: "2px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 500,
  lineHeight: "20px",
  whiteSpace: "nowrap",
} as const;

/** `orders.currentStatus` in the list: a badge in the stage colour (task 33). */
export function StatusCell({ cellData }: DefaultServerCellComponentProps) {
  if (!isOrderStatus(cellData)) return <span>—</span>;
  const meta = ORDER_STATUS_META[cellData];
  return (
    <span style={{ ...BADGE_STYLE, background: meta.badgeBg, color: meta.badgeText }}>
      {meta.label}
    </span>
  );
}
