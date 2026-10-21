import { RenderBlocks } from "@/components/blocks/render-blocks";
import { sectionVariant } from "@/components/blocks/shared";
import { Container } from "@/components/ig/container";
import { NotFoundResponse } from "@/components/page/not-found-response";
import { PageShell } from "@/components/page/page-shell";
import { PaymentTerms } from "@/components/service/payment-terms";
import { redirectIfExists } from "@/lib/cms/queries";
import { pickFirst, withExplicitBackgrounds } from "@/lib/service/page-compose";
import { loadServicePage, servicePageMetadata } from "@/lib/service/service-page";
import type { Metadata } from "next";

/**
 * «Оплата и договор» (teksty 11 §3). Rendered like the catch-all `[...slug]` (same frame, same
 * blocks), with one exception: the first `table` block is the key/value «Условия» table, drawn
 * by `PaymentTerms` — no header row, and the «Скидка | {акция_текст}» row disappears while no
 * promo is active (the generic `table` block would show an empty cell).
 */

const PATH = "/kak-zakazat/oplata/";

/** The «Скидка» row follows the promo dates, not only edits: re-render hourly (ISR). */
export const revalidate = 3600;

export function generateMetadata(): Promise<Metadata> {
  return servicePageMetadata(PATH);
}

export default async function PaymentPage() {
  const data = await loadServicePage(PATH);
  if (!data) {
    await redirectIfExists(PATH);
    return <NotFoundResponse />;
  }
  const { page, path, placeholders: ctx, blockPage, breadcrumbLabel } = data;
  // Blocks are rendered one by one around `PaymentTerms`: fix the bg ↔ sf rhythm first.
  const layout = withExplicitBackgrounds(page.layout);
  const terms = pickFirst(layout, "table");
  const hasHero = layout[0]?.blockType === "hero";

  return (
    <PageShell
      path={path}
      breadcrumbLabel={breadcrumbLabel}
      showConditions={!page.hideConditions}
      quiz={page.hideQuizCta ? false : (page.quizPrefill ?? {})}
    >
      {hasHero ? null : (
        <Container className="pt-6 max-sm:pt-4">
          <h1 className="ig-h1 m-0">{blockPage.title}</h1>
        </Container>
      )}
      {layout.map((block, index) =>
        block === terms ? (
          <PaymentTerms
            key={block.id ?? index}
            block={terms}
            ctx={ctx}
            page={blockPage}
            section={{
              index,
              variant: sectionVariant(terms.background, index),
              headingId: `blk-${block.id ?? index}-title`,
            }}
          />
        ) : (
          <RenderBlocks key={block.id ?? index} blocks={[block]} ctx={ctx} page={blockPage} />
        )
      )}
    </PageShell>
  );
}
