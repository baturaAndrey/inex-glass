import { cache } from "react";
import { notFound } from "next/navigation";
import { Container } from "@/components/ig/container";
import { DocumentsCard } from "@/components/order/documents-card";
import { ManagerCard } from "@/components/order/manager-card";
import { OrderTitle } from "@/components/order/order-title";
import { PackPhotos } from "@/components/order/pack-photos";
import { loadOrderPageTexts } from "@/components/order/page-texts";
import { ShipmentCard } from "@/components/order/shipment-card";
import { StatusCard } from "@/components/order/status-card";
import { getOrderByToken } from "@/lib/orders/lookup";
import { ORDER_PAGE_METADATA } from "@/lib/orders/page-metadata";
import { toPublicOrderView } from "@/lib/orders/public-view";
import { TITLE_BRAND_SUFFIX } from "@/lib/seo/metadata";
import type { Metadata } from "next";

/**
 * Client order page `/zakaz/<token>/` (ТЗ §6.2): status timeline, packing photos, shipment,
 * documents, manager — without login. The token in the URL is the only secret.
 *
 * - DYNAMIC on purpose (`force-dynamic` → `Cache-Control: private, no-cache, no-store`): every
 *   request re-checks the token, revocation and expiry; nothing is cached publicly.
 * - Every unusable link (malformed, unknown, revoked, expired) ends in the same `notFound()` →
 *   `./not-found.tsx` «Ссылка больше не действует» with HTTP 404. A bare `notFound()` is the
 *   documented choice for DYNAMIC routes (see `@/components/page/not-found-response`): the
 *   status is 404, the body is rendered from the RSC payload on the client.
 * - noindex/nofollow/noarchive, `referrer: no-referrer` (the token must not leak to carrier
 *   sites), no JSON-LD, no breadcrumbs. Order data is wrapped in `ym-hide-content` (Metrika
 *   never starts on `/zakaz/*` anyway — a second line of defence).
 * - The simplified header is chosen by the site header on the client (`/zakaz/*`, task 14).
 */

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

/** One lookup per request for `generateMetadata` and the page. */
const loadOrder = cache((token: string) => getOrderByToken(token));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const order = await loadOrder((await params).token);
  return {
    ...ORDER_PAGE_METADATA,
    ...(order?.number
      ? { title: { absolute: `Заказ № ${order.number}${TITLE_BRAND_SUFFIX}` } }
      : {}),
  };
}

export default async function OrderPage({ params }: Props) {
  const { token } = await params;
  const order = await loadOrder(token);
  if (!order) notFound();

  const texts = await loadOrderPageTexts();
  const view = toPublicOrderView(order, new Date(), { labels: texts.labels });
  const docsBase = `/zakaz/${encodeURIComponent(token)}/docs/`;

  return (
    <Container className="ym-hide-content flex flex-col gap-8 pt-12 pb-20 max-sm:gap-5 max-sm:pt-6 max-sm:pb-12">
      <OrderTitle number={view.number} subtitle={view.subtitle} />
      <StatusCard steps={view.steps} clientComment={view.clientComment} />
      <div className="grid grid-cols-[minmax(0,1fr)_320px] items-start gap-6 max-[1100px]:grid-cols-1 max-sm:gap-5">
        <div className="flex min-w-0 flex-col gap-6 max-sm:gap-5">
          <PackPhotos
            docsBase={docsBase}
            photos={view.photos}
            caption={view.photosCaption}
            emptyText={texts.emptyPhotosText}
          />
          {view.shipment ? (
            <ShipmentCard
              shipment={view.shipment}
              copyLabel={texts.copyLabel}
              copiedLabel={texts.copiedLabel}
            />
          ) : null}
          <DocumentsCard docsBase={docsBase} documents={view.documents} />
        </div>
        <aside aria-label="Ваш менеджер" className="flex min-w-0 flex-col gap-6 max-sm:gap-5">
          <ManagerCard manager={view.manager} fallback={texts.contacts} />
        </aside>
      </div>
    </Container>
  );
}
