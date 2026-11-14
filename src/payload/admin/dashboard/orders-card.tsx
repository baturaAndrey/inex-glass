import type { Block, OrdersData } from "@/lib/admin-dashboard/load";
import { formatNumber } from "@/lib/domain/format";
import { BlockError } from "./block-error";
import { CardHead } from "./funnel-card";

const ORDERS_LIST = "/admin/collections/orders/";

const orderManagePath = (id: string) => `${ORDERS_LIST}${encodeURIComponent(id)}/manage/`;

/** «Заказы в работе»: four stage tiles (not tied to the period) and the nearest shipment. */
export function OrdersCard({ block }: { block: Block<OrdersData> }) {
  return (
    <section className="iga-card iga-dash-card" aria-labelledby="iga-dash-orders-h">
      <CardHead
        id="iga-dash-orders-h"
        title="Заказы в работе"
        link={{ href: ORDERS_LIST, text: "все заказы →" }}
      />
      {!block.ok ? (
        <BlockError />
      ) : (
        <>
          <div className="iga-order-tiles">
            {block.data.tiles.map((tile) => (
              <div key={tile.status} className="iga-order-tile" data-order-status={tile.status}>
                <div className="iga-order-tile__num">{formatNumber(tile.count)}</div>
                <div className="iga-order-tile__label">{tile.label}</div>
              </div>
            ))}
          </div>
          <div className="iga-meter__row">
            <span className="iga-dash__muted">Ближайшая отгрузка</span>
            {block.data.nearest ? (
              <a href={orderManagePath(block.data.nearest.id)}>{block.data.nearest.label}</a>
            ) : (
              <span className="iga-dash__muted">не запланирована</span>
            )}
          </div>
        </>
      )}
    </section>
  );
}
