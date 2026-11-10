import { CtaButtons } from "@/components/blocks/cta-buttons";
import { RenderBlocks } from "@/components/blocks/render-blocks";
import { asMedia, fill, hasText, mediaSrc } from "@/components/blocks/shared";
import type { BlockOf, LayoutBlock } from "@/components/blocks/types";
import { drawingPanelParams } from "@/components/clients/drawing-params";
import { MontagePanel } from "@/components/clients/montage-panel";
import {
  ChipsPanel,
  PhotoPanels,
  PillsPanel,
  RolesTable,
} from "@/components/company/company-pieces";
import { fixedPageMetadata } from "@/components/company/fixed-page";
import { REQUISITES_ANCHOR, RequisitesPanel } from "@/components/company/requisites-card";
import { TeamTeaser } from "@/components/company/team-teaser";
import { DrawingPanel } from "@/components/forms/drawing-panel";
import { UPLOAD_ANCHOR } from "@/components/how-to-order/copy";
import { NotFoundResponse } from "@/components/page/not-found-response";
import { pageBlockContext } from "@/components/page/page-context";
import { PageShell } from "@/components/page/page-shell";
import { ProcessingHero } from "@/components/processing/processing-hero";
import { RichText } from "@/components/rich-text/rich-text";
import { CreamBlock } from "@/components/zak-hub/zak-info";
import { getContacts, getPlaceholderContext, getRequisites } from "@/lib/cms/globals";
import { getPageByPath, redirectIfExists } from "@/lib/cms/queries";
import { organizationLd, JsonLd } from "@/lib/seo/jsonld";
import { resolveSeoText } from "@/lib/seo/metadata";
import { pickFirst, withExplicitBackgrounds } from "@/lib/service/page-compose";
import type { Metadata } from "next";

/**
 * «О компании» (task 29), restyled to the Paper mockup `2560_o-kompanii` (2026-11). The `pages`
 * document `/o-kompanii/` supplies the copy (teksty/06 §1); its blocks are placed by role:
 *
 * - `hero` → photo hero: H1, lead, the experience line (`strong`), both buttons;
 * - first `table` → «Что делаем мы, а что — заводы-партнёры»;
 * - first `cards` with photos → «Как мы выбираем заводы» / «Где работаем» photo panels;
 * - first `linkList` → «С кем работаем» (pills linking the segment pages);
 * - first light `cta` → «Объекты» (pills + «Все объекты →»);
 * - first `cta` with `tone: primaryDark` → the dark «Двери, лестницы и монтаж» panel;
 * - first `form` (optional) → lead params of the drawing-form panel in the cream block.
 *
 * The route appends what blocks cannot express conditionally: «Команда» — only while the `team`
 * collection has visible members; «Реквизиты» — the `requisites` global (`#rekvizity`, the PDF
 * button only when the company card is uploaded). Any other block renders after the panels.
 * JSON-LD: BreadcrumbList (PageShell) + Organization. ISR: data comes from tagged loaders
 * (`collection:pages`, `collection:team`, `global:requisites`, `global:contacts`).
 */

const PATH = "/o-kompanii/";
const SECTION_LABEL = "О компании";
const IDS = {
  roles: "company-roles-title",
  clients: "company-clients-title",
  objects: "company-objects-title",
  team: "company-team-title",
  requisites: `${REQUISITES_ANCHOR}-title`,
  form: "company-form-title",
} as const;

export function generateMetadata(): Promise<Metadata> {
  return fixedPageMetadata(PATH);
}

const isBlock =
  <T extends LayoutBlock["blockType"]>(type: T) =>
  (block: LayoutBlock): block is BlockOf<T> =>
    block.blockType === type;

/** The photo panels: the first `cards` block whose items carry images. */
function findPhotoCards(layout: LayoutBlock[]): BlockOf<"cards"> | null {
  return (
    layout
      .filter(isBlock("cards"))
      .find((block) => (block.items ?? []).some((item) => asMedia(item.image) !== null)) ?? null
  );
}

export default async function CompanyPage() {
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
  const layout = page.layout ?? [];

  const hero = pickFirst(layout, "hero");
  const table = pickFirst(layout, "table");
  const photos = findPhotoCards(layout);
  const clients = pickFirst(layout, "linkList");
  const ctas = layout.filter(isBlock("cta"));
  const montage = ctas.find((block) => block.tone === "primaryDark") ?? null;
  const objects = ctas.find((block) => block.tone !== "primaryDark") ?? null;
  const form = pickFirst(layout, "form");
  const used = new Set<unknown>([hero, table, photos, clients, montage, objects, form]);
  const rest = layout.filter((block) => !used.has(block));

  const media = hero ? asMedia(hero.image) : null;
  const src = media ? mediaSrc(media) : null;
  const strong = hero ? fill(hero.strong, ctx) : "";

  return (
    <PageShell path={PATH} breadcrumbLabel={label} showConditions={false} quiz={false}>
      <JsonLd data={organizationLd(contacts)} />
      <ProcessingHero
        title={(hero ? fill(hero.titleOverride, ctx) : "") || blockPage.title}
        lead={
          hero?.lead || hasText(strong) ? (
            <>
              {hero?.lead ? <RichText data={hero.lead} ctx={ctx} disableContainer /> : null}
              {hasText(strong) ? (
                <div className="text-primary-dark mt-6 font-semibold max-sm:mt-4">{strong}</div>
              ) : null}
            </>
          ) : undefined
        }
        actions={
          hero ? (
            <CtaButtons buttons={hero.buttons} ctx={ctx} page={blockPage} className="contents" />
          ) : null
        }
        media={media && src ? { src, alt: media.alt?.trim() ?? "" } : null}
        indentActions
      />

      <section
        aria-label={SECTION_LABEL}
        className="mx-auto flex w-full max-w-[1920px] flex-col gap-12 px-(--ig-gutter) py-16 max-md:gap-8 max-md:py-12 max-sm:gap-6 max-sm:py-8"
        data-section="company"
      >
        {table ? <RolesTable block={table} ctx={ctx} headingId={IDS.roles} /> : null}
        {photos ? <PhotoPanels block={photos} ctx={ctx} /> : null}
        {clients || objects ? (
          <div className="grid grid-cols-2 items-stretch gap-6 max-md:grid-cols-1 max-sm:gap-4">
            {clients ? <ChipsPanel block={clients} ctx={ctx} headingId={IDS.clients} /> : null}
            {objects ? <PillsPanel block={objects} ctx={ctx} headingId={IDS.objects} /> : null}
          </div>
        ) : null}
        {montage ? <MontagePanel block={montage} ctx={ctx} page={blockPage} /> : null}
        <div className="flex items-stretch gap-6 max-md:flex-col max-sm:gap-4">
          <TeamTeaser
            headingId={IDS.team}
            className="w-[578px] shrink-0 max-lg:w-[420px] max-md:w-auto"
          />
          <RequisitesPanel
            requisites={requisites}
            contacts={contacts}
            id={REQUISITES_ANCHOR}
            headingId={IDS.requisites}
            className="flex-1"
          />
        </div>
      </section>

      {rest.length > 0 ? (
        <RenderBlocks blocks={withExplicitBackgrounds(rest)} ctx={ctx} page={blockPage} />
      ) : null}

      <CreamBlock>
        <DrawingPanel
          heading={(form && fill(form.heading, ctx)) || undefined}
          headingId={IDS.form}
          params={drawingPanelParams(form, PATH, ctx)}
          anchorId={UPLOAD_ANCHOR}
        />
      </CreamBlock>
    </PageShell>
  );
}
