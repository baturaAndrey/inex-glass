import { fill } from "@/components/blocks/shared";
import type { LayoutBlock } from "@/components/blocks/types";
import { OrderTable } from "@/components/how-to-order/order-table";
import type { ArticlePiece } from "@/components/how-to-order/subpage-article";
import { HowToOrderSubpage } from "@/components/how-to-order/subpage-template";
import { paymentTermRows } from "@/components/service/payment-terms";
import { pickFirst } from "@/lib/service/page-compose";
import { servicePageMetadata, type ServicePageData } from "@/lib/service/service-page";
import type { Metadata } from "next";

/**
 * «Оплата и договор» (teksty 11 §3) on the subpage template (Paper mockup
 * `2560_kak-zakazat_trebovaniya`), with one exception: the first `table` block is the key/value
 * «Условия» table — no header row (the column labels the schema requires are editor-only), and
 * the «Скидка | {акция_текст}» row disappears while no promo is active (`paymentTermRows`).
 */

const PATH = "/kak-zakazat/oplata/";

export function generateMetadata(): Promise<Metadata> {
  return servicePageMetadata(PATH);
}

function compose({ page, placeholders: ctx }: ServicePageData) {
  const terms = pickFirst(page.layout, "table");
  const override = (block: LayoutBlock): ArticlePiece[] | null => {
    if (block !== terms) return null;
    const heading = fill(terms.heading, ctx);
    const rows = paymentTermRows(terms.table?.rows, ctx);
    return [
      {
        title: heading || undefined,
        content:
          rows.length > 0 ? (
            <OrderTable
              headerless
              caption={heading || undefined}
              columns={[{ label: "", width: "40%" }, { label: "" }]}
              rows={rows.map((row) => ({ key: row.label, cells: [row.label, row.value] }))}
              data-testid="payment-terms"
            />
          ) : null,
      },
    ];
  };
  return { override };
}

export default function PaymentPage() {
  return <HowToOrderSubpage path={PATH} compose={compose} />;
}
