import { RenderBlocks } from "@/components/blocks/render-blocks";
import { sectionVariant } from "@/components/blocks/shared";
import { fixedPageMetadata } from "@/components/company/fixed-page";
import { RequisitesCard } from "@/components/company/requisites-card";
import { TeamTeaser } from "@/components/company/team-teaser";
import { Container } from "@/components/ig/container";
import { NotFoundResponse } from "@/components/page/not-found-response";
import { pageBlockContext } from "@/components/page/page-context";
import { PageShell } from "@/components/page/page-shell";
import { getContacts, getPlaceholderContext, getRequisites } from "@/lib/cms/globals";
import { getPageByPath, redirectIfExists } from "@/lib/cms/queries";
import { getTeamMembers } from "@/lib/cms/team";
import { organizationLd, JsonLd } from "@/lib/seo/jsonld";
import { resolveSeoText } from "@/lib/seo/metadata";
import type { Metadata } from "next";

/**
 * «О компании» (task 29). The `pages` document `/o-kompanii/` supplies the hero and the content
 * blocks (teksty/06 §1); the route appends what blocks cannot express conditionally:
 * - «Команда» — only while the `team` collection has visible members;
 * - «Реквизиты» — the `requisites` global (the `{реквизиты}` marker of teksty), PDF button only
 *   when the company card is uploaded.
 * JSON-LD: BreadcrumbList (PageShell) + Organization. ISR: data comes from tagged loaders
 * (`collection:pages`, `collection:team`, `global:requisites`, `global:contacts`).
 */

const PATH = "/o-kompanii/";

export function generateMetadata(): Promise<Metadata> {
  return fixedPageMetadata(PATH);
}

export default async function CompanyPage() {
  const page = await getPageByPath(PATH);
  if (!page) {
    await redirectIfExists(PATH);
    return <NotFoundResponse />;
  }

  const [placeholders, contacts, requisites, team] = await Promise.all([
    getPlaceholderContext(),
    getContacts(),
    getRequisites(),
    getTeamMembers(),
  ]);
  const blockPage = pageBlockContext(page, PATH, placeholders);
  const label = resolveSeoText(page.breadcrumbLabel || page.title, placeholders);
  const layout = page.layout ?? [];
  const hasHero = layout[0]?.blockType === "hero";
  // The appended sections continue the bg ↔ sf rhythm of the layout.
  const teamIndex = layout.length;
  const requisitesIndex = teamIndex + (team.length > 0 ? 1 : 0);

  return (
    <PageShell
      path={PATH}
      breadcrumbLabel={label}
      showConditions={false}
      quiz={page.hideQuizCta ? false : (page.quizPrefill ?? {})}
    >
      <JsonLd data={organizationLd(contacts)} />
      {hasHero ? null : (
        <Container className="pt-6 max-sm:pt-4">
          <h1 className="ig-h1 m-0">{blockPage.title}</h1>
        </Container>
      )}
      <RenderBlocks blocks={layout} ctx={placeholders} page={blockPage} />
      <TeamTeaser variant={sectionVariant(null, teamIndex)} />
      <RequisitesCard
        requisites={requisites}
        contacts={contacts}
        variant={sectionVariant(null, requisitesIndex)}
      />
    </PageShell>
  );
}
