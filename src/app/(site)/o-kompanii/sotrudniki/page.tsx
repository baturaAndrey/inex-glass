import { RenderBlocks } from "@/components/blocks/render-blocks";
import { sectionVariant } from "@/components/blocks/shared";
import { fixedPageMetadata } from "@/components/company/fixed-page";
import { TeamGrid } from "@/components/company/team-grid";
import { Container } from "@/components/ig/container";
import { Section } from "@/components/ig/section";
import { NotFoundResponse } from "@/components/page/not-found-response";
import { pageBlockContext } from "@/components/page/page-context";
import { PageShell } from "@/components/page/page-shell";
import { getPlaceholderContext } from "@/lib/cms/globals";
import { getPageByPath, redirectIfExists } from "@/lib/cms/queries";
import { getTeamMembers, isTeamIndexable } from "@/lib/cms/team";
import { resolveSeoText } from "@/lib/seo/metadata";
import type { Metadata } from "next";

/**
 * «Команда» (task 29). The `pages` document supplies H1, the intro and the «Рассчитать стоимость»
 * hero; the route adds the grid of visible `team` members (sorted by `order`, then name).
 *
 * Empty team: the page still answers 200 (all-URLs check of task 40) but is `noindex, follow`,
 * shows only the hero, and nothing links to it (`TeamTeaser` is hidden). With ≥ 1 member it is
 * indexable — `isTeamIndexable()` drives both the robots tag and the sitemap (task 36).
 */

const PATH = "/o-kompanii/sotrudniki/";
const GRID_LABEL = "Сотрудники";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  return fixedPageMetadata(PATH, { forceNoindex: !(await isTeamIndexable()) });
}

export default async function TeamPage() {
  const page = await getPageByPath(PATH);
  if (!page) {
    await redirectIfExists(PATH);
    return <NotFoundResponse />;
  }

  const [placeholders, members] = await Promise.all([getPlaceholderContext(), getTeamMembers()]);
  const blockPage = pageBlockContext(page, PATH, placeholders);
  const label = resolveSeoText(page.breadcrumbLabel || page.title, placeholders);
  const layout = page.layout ?? [];
  const hasHero = layout[0]?.blockType === "hero";

  return (
    <PageShell
      path={PATH}
      breadcrumbLabel={label}
      showConditions={false}
      quiz={page.hideQuizCta ? false : (page.quizPrefill ?? {})}
    >
      {hasHero ? null : (
        <Container className="pt-6 max-sm:pt-4">
          <h1 className="ig-h1 m-0">{blockPage.title}</h1>
        </Container>
      )}
      <RenderBlocks blocks={layout} ctx={placeholders} page={blockPage} />
      {members.length > 0 ? (
        <Section variant={sectionVariant(null, layout.length)} aria-label={GRID_LABEL}>
          <TeamGrid members={members} />
        </Section>
      ) : null}
    </PageShell>
  );
}
