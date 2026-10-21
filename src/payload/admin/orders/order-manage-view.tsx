import { Banner, Gutter } from "@payloadcms/ui";
import { formatOrderDate, isOrderStatus, nextStatus } from "@/lib/orders/status";
import type { Order } from "@/payload-types";
import { orderWarnings } from "./order-warnings";
import { StatusPanel } from "./status-panel";
import { TokenPanel } from "./token-panel";
import type { DocumentViewServerProps } from "payload";

/**
 * «Управление» tab of an order (`/admin/collections/orders/<id>/manage`, task 33): warnings,
 * the client link panel and the status panel. Server component: reads the order through the
 * Local API AS THE SIGNED-IN USER (access control of `orders` applies).
 */
export async function OrderManageView({ doc, initPageResult }: DocumentViewServerProps) {
  const { req } = initPageResult;
  const id = typeof doc?.id === "string" ? doc.id : null;
  const order: Order | null = id
    ? await req.payload.findByID({
        collection: "orders",
        id,
        depth: 0,
        overrideAccess: false,
        user: req.user,
        disableErrors: true,
      })
    : null;

  if (!order) {
    return (
      <Gutter>
        <p style={{ marginTop: 24 }}>Сначала сохраните заказ.</p>
      </Gutter>
    );
  }

  const warnings = orderWarnings(order);
  const current = isOrderStatus(order.currentStatus) ? order.currentStatus : null;
  const currentRow = order.statusHistory.find((row) => row.status === current);

  return (
    <Gutter>
      <div
        data-testid="order-manage"
        style={{ display: "flex", flexDirection: "column", gap: 24, padding: "24px 0 48px" }}
      >
        {warnings.length > 0 ? (
          <section aria-label="Предупреждения" style={{ display: "grid", gap: 8 }}>
            {warnings.map((warning) => (
              <Banner key={warning.key} type={warning.tone === "danger" ? "error" : "warning"}>
                <span data-warning={warning.key}>{warning.text}</span>
              </Banner>
            ))}
          </section>
        ) : null}

        <TokenPanel orderId={order.id} hasClientEmail={Boolean(order.clientEmail?.trim())} />

        <StatusPanel
          orderId={order.id}
          currentStatus={current}
          suggestedStatus={nextStatus(current) ?? current ?? "spec_agreed"}
          history={order.statusHistory.map((row) => ({
            status: row.status,
            date: formatOrderDate(row.date),
          }))}
          clientComment={order.clientComment?.text ?? ""}
          currentPlannedDate={currentRow?.plannedDate ?? null}
        />
      </div>
    </Gutter>
  );
}
