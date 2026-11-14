import { CtaButtons } from "@/components/blocks/cta-buttons";
import { RenderBlocks } from "@/components/blocks/render-blocks";
import { asMedia, fill, hasText, mediaSrc, resolveLink } from "@/components/blocks/shared";
import type { BlockOf, BlockPageContext } from "@/components/blocks/types";
import { HOW_TO_ORDER_TEMPLATE_COPY } from "@/components/how-to-order/copy";
import { TermsPanel, WhoPaysPanel } from "@/components/how-to-order/hub-panels";
import {
  OrderSteps,
  type OrderStep,
  type OrderStepLink,
} from "@/components/how-to-order/order-steps";
import {
  findSubpagesBlock,
  SubpageLinks,
  subpageLinksOf,
} from "@/components/how-to-order/subpage-links";
import { NotFoundResponse } from "@/components/page/not-found-response";
import { PageShell } from "@/components/page/page-shell";
import { buildQuizHref, prefillToQuizParams } from "@/components/page/quiz-cta";
import { ProcessingHero } from "@/components/processing/processing-hero";
import { RichText } from "@/components/rich-text/rich-text";
import { CreamBlock } from "@/components/zak-hub/zak-info";
import { redirectIfExists } from "@/lib/cms/queries";
import type { PlaceholderContext } from "@/lib/domain";
import {
  isQuizUrl,
  listItemsOf,
  pickFirst,
  splitStepText,
  withExplicitBackgrounds,
} from "@/lib/service/page-compose";
import { loadServicePage, servicePageMetadata } from "@/lib/service/service-page";
import type { Metadata } from "next";

/**
 * «Как заказать» hub (teksty 04 §1) in the layout of the Paper mockup `2560_kak-zakazat`
 * (2026-11). Reads the `pages` document `/kak-zakazat/` and places its blocks by role
 * (`@/lib/service/page-compose`):
 * - `hero` → photo hero with the H1, lead and the two buttons;
 * - first `steps` → the six steps in a row (no heading, `OrderSteps`);
 * - cream block: first `richText` → «Условия» icon tiles, first `table` → «Кто за что отвечает»,
 *   the `linkList` `#subpages` → the subpage cards, the hero buttons repeated at the end.
 * Any other block an editor adds renders between the steps and the cream block. A missing block
 * hides its part. The frame's «Условия» strip and quiz CTA are off: both are on the page.
 */

const PATH = "/kak-zakazat/";
const TERMS_HEADING_ID = "order-terms-title";
const WHO_PAYS_HEADING_ID = "order-who-title";

export function generateMetadata(): Promise<Metadata> {
  return servicePageMetadata(PATH);
}

function stepLink(label: string, url: string, page: BlockPageContext): OrderStepLink {
  if (!isQuizUrl(url)) return { label, href: url };
  // Like every quiz CTA: the page pre-fill and `src` of the hub.
  return {
    label,
    href: buildQuizHref(prefillToQuizParams(page.quizPrefill, page.path ?? PATH)),
    quiz: true,
  };
}

function toSteps(
  block: BlockOf<"steps">,
  ctx: PlaceholderContext,
  page: BlockPageContext
): OrderStep[] {
  return (block.items ?? []).map((item) => {
    const { text, links } = splitStepText(fill(item.text, ctx));
    const main = resolveLink(item.link);
    const mainLabel = fill(item.linkLabel, ctx) || main?.label;
    return {
      title: fill(item.title, ctx),
      text: text || undefined,
      links: [
        ...(main && mainLabel ? [stepLink(mainLabel, main.href, page)] : []),
        ...links.map((link) => stepLink(link.label, link.url, page)),
      ],
    };
  });
}

function whoPaysRows(block: BlockOf<"table">, ctx: PlaceholderContext): Array<[string, string]> {
  return (block.table?.rows ?? []).map((row) => [
    fill(row.cells?.[0]?.value, ctx),
    fill(row.cells?.[1]?.value, ctx),
  ]);
}

export default async function HowToOrderPage() {
  const data = await loadServicePage(PATH);
  if (!data) {
    await redirectIfExists(PATH);
    return <NotFoundResponse />;
  }
  const { page, path, placeholders: ctx, blockPage, title, breadcrumbLabel } = data;
  const layout = page.layout ?? [];
  const hero = pickFirst(layout, "hero");
  const steps = pickFirst(layout, "steps");
  const terms = pickFirst(layout, "richText");
  const whoPays = pickFirst(layout, "table");
  const subpages = findSubpagesBlock(layout);
  const used = new Set<unknown>([hero, steps, terms, whoPays, subpages]);
  const rest = layout.filter((block) => !used.has(block));

  const media = hero ? asMedia(hero.image) : null;
  const src = media ? mediaSrc(media) : null;
  const termItems = terms ? listItemsOf(terms.content).map((item) => fill(item, ctx)) : [];
  const whoPaysHeading = whoPays ? fill(whoPays.heading, ctx) : "";
  const columns = whoPays?.table?.columns ?? [];
  const links = subpages ? subpageLinksOf(subpages, ctx) : [];
  const actions = hero ? (
    <CtaButtons buttons={hero.buttons} ctx={ctx} page={blockPage} className="contents" />
  ) : null;

  return (
    <PageShell path={path} breadcrumbLabel={breadcrumbLabel} showConditions={false} quiz={false}>
      <ProcessingHero
        title={(hero ? fill(hero.titleOverride, ctx) : "") || title}
        lead={hero?.lead ? <RichText data={hero.lead} ctx={ctx} /> : undefined}
        actions={actions}
        media={media && src ? { src, alt: media.alt?.trim() ?? "" } : null}
        indentActions
      />

      {steps ? <OrderSteps steps={toSteps(steps, ctx, blockPage)} /> : null}

      {rest.length > 0 ? (
        <RenderBlocks blocks={withExplicitBackgrounds(rest)} ctx={ctx} page={blockPage} />
      ) : null}

      <CreamBlock>
        {termItems.length > 0 || whoPays ? (
          <div className="grid grid-cols-2 items-stretch gap-6 max-md:grid-cols-1">
            {termItems.length > 0 ? (
              <TermsPanel
                heading={fill(terms?.heading, ctx) || HOW_TO_ORDER_TEMPLATE_COPY.terms}
                headingId={TERMS_HEADING_ID}
                items={termItems}
              />
            ) : null}
            {whoPays && hasText(whoPaysHeading) ? (
              <WhoPaysPanel
                heading={whoPaysHeading}
                headingId={WHO_PAYS_HEADING_ID}
                columns={[fill(columns[0]?.label, ctx), fill(columns[1]?.label, ctx)]}
                rows={whoPaysRows(whoPays, ctx)}
              />
            ) : null}
          </div>
        ) : null}
        <SubpageLinks links={links} />
        {hero ? <CtaButtons buttons={hero.buttons} ctx={ctx} page={blockPage} /> : null}
      </CreamBlock>
    </PageShell>
  );
}
