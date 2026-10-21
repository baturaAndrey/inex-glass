import { CtaButtons } from "@/components/blocks/cta-buttons";
import { fill, hasText, resolveLink } from "@/components/blocks/shared";
import type { BlockOf, BlockPageContext } from "@/components/blocks/types";
import { Section, SectionHead } from "@/components/ig/section";
import { NotFoundResponse } from "@/components/page/not-found-response";
import { PageShell } from "@/components/page/page-shell";
import { buildQuizHref, prefillToQuizParams, QuizLink } from "@/components/page/quiz-cta";
import { HtAsideCard } from "@/components/service/ht-aside-card";
import { HtSteps, type HtStep, type HtStepLink } from "@/components/service/ht-steps";
import { ServiceHero } from "@/components/service/service-hero";
import { WhoPaysTable } from "@/components/service/who-pays-table";
import { redirectIfExists } from "@/lib/cms/queries";
import type { PlaceholderContext } from "@/lib/domain";
import { isQuizUrl, listItemsOf, pickFirst, splitStepText } from "@/lib/service/page-compose";
import { loadServicePage, servicePageMetadata } from "@/lib/service/service-page";
import { lexicalToPlainText } from "@/payload/utils/lexical-text";
import type { Metadata } from "next";

/**
 * «Как заказать» hub (`HowTo.dc.html`, teksty 04 §1). Reads the `pages` document `/kak-zakazat/`
 * and lays its blocks out by role (`@/lib/service/page-compose`):
 * - `hero` → white first screen with crumbs, lead and the two buttons;
 * - first `steps` → the vertical timeline; first `richText` → the sticky «Условия» card;
 * - first `table` → «Кто за что отвечает» with payer badges, the hero buttons repeated under it.
 * A missing block hides its section. The frame's own «Условия» and quiz CTA are off: both are
 * already on the page.
 */

const PATH = "/kak-zakazat/";
const STEPS_LABEL = "Шаги заказа";
/** Title of the conditions card when the `richText` block has no heading (teksty 04 §1). */
const TERMS_TITLE = "Условия";
const WHO_PAYS_HEADING_ID = "ht-who";

/** The hub shows the promo / prices nowhere, but the header does: re-render hourly (ISR). */
export const revalidate = 3600;

export function generateMetadata(): Promise<Metadata> {
  return servicePageMetadata(PATH);
}

function stepLink(label: string, url: string, page: BlockPageContext): HtStepLink {
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
): HtStep[] {
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
  const { page, path, placeholders: ctx, blockPage, title, breadcrumbLabel, crumbs } = data;
  const layout = page.layout;
  const hero = pickFirst(layout, "hero");
  const steps = pickFirst(layout, "steps");
  const terms = pickFirst(layout, "richText");
  const whoPays = pickFirst(layout, "table");

  const lead = hero ? fill(lexicalToPlainText(hero.lead), ctx) : "";
  const actions = hero ? <CtaButtons buttons={hero.buttons} ctx={ctx} page={blockPage} /> : null;
  const stepItems = steps ? toSteps(steps, ctx, blockPage) : [];
  const termItems = terms ? listItemsOf(terms.content).map((item) => fill(item, ctx)) : [];
  const whoPaysHeading = whoPays ? fill(whoPays.heading, ctx) : "";
  const columns = whoPays?.table?.columns ?? [];

  return (
    <PageShell
      path={path}
      breadcrumbLabel={breadcrumbLabel}
      hideBreadcrumbs
      showConditions={false}
      quiz={false}
    >
      <ServiceHero title={title} crumbs={crumbs} lead={lead || undefined} actions={actions} />

      {stepItems.length > 0 || termItems.length > 0 ? (
        <Section variant="bg" aria-label={STEPS_LABEL}>
          <div className="grid grid-cols-[minmax(0,1fr)_400px] items-start gap-16 max-md:grid-cols-1 max-md:gap-10">
            <HtSteps steps={stepItems} />
            {termItems.length > 0 ? (
              <HtAsideCard
                title={fill(terms?.heading, ctx) || TERMS_TITLE}
                items={termItems}
                action={
                  <QuizLink
                    prefill={blockPage.quizPrefill}
                    src={path}
                    size="m"
                    className="ig-btn--block"
                    ctx={ctx}
                  />
                }
              />
            ) : null}
          </div>
        </Section>
      ) : null}

      {whoPays ? (
        <Section
          variant="sf"
          {...(hasText(whoPaysHeading) ? { "aria-labelledby": WHO_PAYS_HEADING_ID } : {})}
        >
          {hasText(whoPaysHeading) ? (
            <SectionHead title={whoPaysHeading} headingId={WHO_PAYS_HEADING_ID} />
          ) : null}
          <WhoPaysTable
            columns={[fill(columns[0]?.label, ctx), fill(columns[1]?.label, ctx)]}
            rows={whoPaysRows(whoPays, ctx)}
          />
          {hero ? (
            <CtaButtons buttons={hero.buttons} ctx={ctx} page={blockPage} className="mt-10" />
          ) : null}
        </Section>
      ) : null}
    </PageShell>
  );
}
