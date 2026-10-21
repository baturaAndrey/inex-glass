import { daysBetween, todayKey } from "@/lib/domain";
import { formatOrderDate, orderDateKey } from "@/lib/orders/status";
import type { DefaultServerCellComponentProps } from "payload";

const DANGER = "#B23B3B";
const MUTED = "#5B636B";

export interface LinkExpiryState {
  text: string;
  tone: "ok" | "muted" | "danger";
}

/**
 * Text of the «Ссылка действует до» column: «Отозвана», «Действует» (no `expiresAt` yet —
 * the order is not received), «До 18.02.2027 (90 дн.)», «Истекла 18.02.2027».
 */
export function linkExpiryState(
  revoked: unknown,
  expiresAt: unknown,
  now: Date = new Date()
): LinkExpiryState {
  if (revoked === true) return { text: "Отозвана", tone: "danger" };
  const key = orderDateKey(expiresAt);
  if (!key || typeof expiresAt !== "string") return { text: "Действует", tone: "ok" };
  const date = formatOrderDate(expiresAt) ?? key;
  if (new Date(expiresAt).getTime() <= now.getTime()) {
    return { text: `Истекла ${date}`, tone: "danger" };
  }
  const days = Math.max(0, daysBetween(todayKey(now), key));
  return { text: `До ${date} (${days} дн.)`, tone: "muted" };
}

/** `orders.expiresAt` in the list, combined with `revoked` of the same row (task 33). */
export function LinkExpiryCell({ cellData, rowData }: DefaultServerCellComponentProps) {
  const { text, tone } = linkExpiryState(
    (rowData as { revoked?: unknown } | undefined)?.revoked,
    cellData
  );
  const color = tone === "danger" ? DANGER : tone === "muted" ? MUTED : undefined;
  return (
    <span style={{ color, fontWeight: tone === "danger" ? 500 : undefined, whiteSpace: "nowrap" }}>
      {text}
    </span>
  );
}
