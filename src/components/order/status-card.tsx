import { Timeline } from "@/components/ig/timeline";
import type { PublicStep } from "@/lib/orders/public-view";
import { ClientComment } from "./client-comment";
import { OrderCard } from "./order-card";

/** «Статус» card: the 5-stage timeline (horizontal ≥600 px, vertical on phones) + comment. */
export function StatusCard({
  steps,
  clientComment,
}: {
  steps: PublicStep[];
  clientComment: string | null;
}) {
  return (
    <OrderCard title="Статус" titleId="order-status-title">
      <Timeline steps={steps} label="Этапы заказа" />
      <ClientComment text={clientComment} />
    </OrderCard>
  );
}
