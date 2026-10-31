import { RenderBlocks } from "@/components/blocks/render-blocks";
import { sectionVariant } from "@/components/blocks/shared";
import { ContactCards } from "@/components/company/contact-cards";
import { mapPoints } from "@/components/company/contact-format";
import { fixedPageMetadata } from "@/components/company/fixed-page";
import { RequisitesCard } from "@/components/company/requisites-card";
import { YandexMap } from "@/components/company/yandex-map";
import { Breadcrumbs } from "@/components/ig/breadcrumbs";
import { PageHero } from "@/components/ig/page-hero";
import { Section } from "@/components/ig/section";
import { NotFoundResponse } from "@/components/page/not-found-response";
import { pageBlockContext } from "@/components/page/page-context";
import { PageShell } from "@/components/page/page-shell";
import { getContacts, getPlaceholderContext, getRequisites } from "@/lib/cms/globals";
import { getPageByPath, redirectIfExists } from "@/lib/cms/queries";
import { buildBreadcrumbs } from "@/lib/seo/breadcrumbs";
import { JsonLd, localBusinessLd, localBusinessLocations, organizationLd } from "@/lib/seo/jsonld";
import { resolveSeoText } from "@/lib/seo/metadata";
import type { Metadata } from "next";

/**
 * «Контакты» (task 29, `Contacts.dc.html`):
 * 1. top block — crumbs + H1 (the primary CTA lives in the header / sticky bar);
 * 2. address cards and the click-to-load Yandex map — the `contacts` global, nothing hardcoded;
 * 3. «Отправьте чертёж» — the `form` block (`formKey: contacts`) of the document's layout;
 * 4. «Реквизиты» — `#rekvizity`, the `requisites` global.
 * JSON-LD: BreadcrumbList (PageShell) + Organization + LocalBusiness per office (not the
 * warehouse). No quiz CTA and no «Условия» section: the page has its own form.
 */

const PATH = "/kontakty/";
const LOCATIONS_LABEL = "Адреса";

export function generateMetadata(): Promise<Metadata> {
  return fixedPageMetadata(PATH);
}

export default async function ContactsPage() {
  const page = await getPageByPath(PATH);
  if (!page) {
    await redirectIfExists(PATH);
    return <NotFoundResponse />;
  }

  const [placeholders, contacts, requisites] = await Promise.all([
    getPlaceholderContext(),
    getContacts(),
    getRequisites(),
  ]);
  const blockPage = pageBlockContext(page, PATH, placeholders);
  const label = resolveSeoText(page.breadcrumbLabel || page.title, placeholders);
  const crumbs = buildBreadcrumbs(PATH, { lastLabel: label });
  const points = mapPoints(contacts);
  const layout = page.layout ?? [];

  return (
    <PageShell
      path={PATH}
      breadcrumbLabel={label}
      breadcrumbs={crumbs}
      hideBreadcrumbs
      showConditions={false}
      quiz={false}
    >
      <JsonLd
        data={[
          organizationLd(contacts),
          ...localBusinessLocations(contacts).map((location) =>
            localBusinessLd(location, contacts)
          ),
        ]}
      />
      <PageHero
        variant="ct-hero"
        title={blockPage.title}
        breadcrumbs={<Breadcrumbs items={crumbs} />}
        className="bg-surface border-line border-0 border-b pb-14 max-sm:pb-8"
      />
      {contacts ? (
        <Section variant="bg" aria-label={LOCATIONS_LABEL}>
          <div className="flex flex-col gap-8">
            <ContactCards contacts={contacts} />
            {points.length > 0 ? <YandexMap points={points} /> : null}
          </div>
        </Section>
      ) : null}
      <RenderBlocks blocks={layout} ctx={placeholders} page={blockPage} />
      <RequisitesCard
        requisites={requisites}
        contacts={contacts}
        variant={sectionVariant(null, layout.length)}
      />
    </PageShell>
  );
}
