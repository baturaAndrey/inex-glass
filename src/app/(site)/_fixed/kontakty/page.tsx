import { CtaButtons, toFormParams } from "@/components/blocks/cta-buttons";
import { RenderBlocks } from "@/components/blocks/render-blocks";
import { fill } from "@/components/blocks/shared";
import type { BlockOf } from "@/components/blocks/types";
import { ContactCards } from "@/components/company/contact-cards";
import { mapPoints } from "@/components/company/contact-format";
import { fixedPageMetadata } from "@/components/company/fixed-page";
import { REQUISITES_ANCHOR, RequisitesPanel } from "@/components/company/requisites-card";
import { YandexMap } from "@/components/company/yandex-map";
import { DrawingPanel } from "@/components/forms/drawing-panel";
import type { FormParams } from "@/components/forms/form-dialog-provider";
import { FORM_TEXTS } from "@/components/forms/form-texts";
import { NotFoundResponse } from "@/components/page/not-found-response";
import { pageBlockContext } from "@/components/page/page-context";
import { PageShell } from "@/components/page/page-shell";
import { ProcessingHero } from "@/components/processing/processing-hero";
import { CreamBlock } from "@/components/zak-hub/zak-info";
import { getContacts, getPlaceholderContext, getRequisites } from "@/lib/cms/globals";
import { getPageByPath, redirectIfExists } from "@/lib/cms/queries";
import type { PlaceholderContext } from "@/lib/domain";
import { buildBreadcrumbs } from "@/lib/seo/breadcrumbs";
import { JsonLd, localBusinessLd, localBusinessLocations, organizationLd } from "@/lib/seo/jsonld";
import { resolveSeoText } from "@/lib/seo/metadata";
import { pickFirst, withExplicitBackgrounds } from "@/lib/service/page-compose";
import type { Metadata } from "next";

/**
 * «Контакты» (task 29), restyled to the Paper mockup `2560_kontakty` (2026-11). One page
 * background, no white header band:
 * 1. hero — crumbs, H1 and the buttons of the document's `hero` block (no photo);
 * 2. address cards and the click-to-load Yandex map — the `contacts` global, nothing hardcoded;
 *    then «Реквизиты» (`#rekvizity`, the `requisites` global);
 * 3. cream block — the drawing-form panel with the `contacts` form; heading, sub and submit
 *    label come from the document's `form` block (`formKey: contacts`, teksty/06 §2).
 * Any other block of the layout renders before the cream block.
 * JSON-LD: BreadcrumbList (PageShell) + Organization + LocalBusiness per office (not the
 * warehouse). No quiz CTA and no «Условия» section: the page has its own form.
 */

const PATH = "/kontakty/";
const LOCATIONS_LABEL = "Адреса";
const FORM_HEADING_ID = "contacts-form-title";
const FORM_ANCHOR = "form";

export function generateMetadata(): Promise<Metadata> {
  return fixedPageMetadata(PATH);
}

/** Lead params of the contacts form: the block params, its source caption and submit label. */
function contactsFormParams(form: BlockOf<"form"> | null, ctx: PlaceholderContext): FormParams {
  const fallbackSource = `${PATH}#${form?.anchorId?.trim() || FORM_ANCHOR}`;
  const params: FormParams = toFormParams(form?.params, fallbackSource);
  const label = fill(form?.sourceLabel, ctx);
  const submitLabel = fill(form?.submitLabel, ctx);
  const fileLabel = fill(form?.fileLabel, ctx);
  if (label) params.label = label;
  if (submitLabel) params.submitLabel = submitLabel;
  if (fileLabel) params.fileLabel = fileLabel;
  return params;
}

export default async function ContactsPage() {
  const page = await getPageByPath(PATH);
  if (!page) {
    await redirectIfExists(PATH);
    return <NotFoundResponse />;
  }

  const [ctx, contacts, requisites] = await Promise.all([
    getPlaceholderContext(),
    getContacts(),
    getRequisites(),
  ]);
  const blockPage = pageBlockContext(page, PATH, ctx);
  const label = resolveSeoText(page.breadcrumbLabel || page.title, ctx);
  const crumbs = buildBreadcrumbs(PATH, { lastLabel: label });
  const points = mapPoints(contacts);
  const layout = page.layout ?? [];
  const hero = pickFirst(layout, "hero");
  const form = layout.find(
    (block): block is BlockOf<"form"> => block.blockType === "form" && block.formKey === "contacts"
  );
  const rest = layout.filter((block) => block !== hero && block !== form);

  return (
    <PageShell
      path={PATH}
      breadcrumbLabel={label}
      breadcrumbs={crumbs}
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
      <ProcessingHero
        title={(hero ? fill(hero.titleOverride, ctx) : "") || blockPage.title}
        actions={
          hero ? (
            <CtaButtons buttons={hero.buttons} ctx={ctx} page={blockPage} className="contents" />
          ) : null
        }
        indentActions
        actionsGap="tight"
      />

      <section
        aria-label={LOCATIONS_LABEL}
        className="mx-auto flex w-full max-w-[1920px] flex-col gap-12 px-(--ig-gutter) pt-6 pb-16 max-md:gap-8 max-md:pb-12 max-sm:gap-6 max-sm:pt-2 max-sm:pb-8"
        data-section="contacts"
      >
        <ContactCards contacts={contacts} />
        {points.length > 0 ? <YandexMap points={points} /> : null}
        <RequisitesPanel
          requisites={requisites}
          contacts={contacts}
          id={REQUISITES_ANCHOR}
          headingId={`${REQUISITES_ANCHOR}-title`}
        />
      </section>

      {rest.length > 0 ? (
        <RenderBlocks blocks={withExplicitBackgrounds(rest)} ctx={ctx} page={blockPage} />
      ) : null}

      <CreamBlock>
        <DrawingPanel
          formKey="contacts"
          heading={fill(form?.heading, ctx) || FORM_TEXTS.section.contactsHeading}
          sub={fill(form?.sub, ctx) || FORM_TEXTS.section.contactsSub}
          headingId={FORM_HEADING_ID}
          params={contactsFormParams(form ?? null, ctx)}
          anchorId={form?.anchorId?.trim() || FORM_ANCHOR}
        />
      </CreamBlock>
    </PageShell>
  );
}
