import { CtaButtons, toFormParams } from "@/components/blocks/cta-buttons";
import { fill, hasText } from "@/components/blocks/shared";
import type { BlockOf } from "@/components/blocks/types";
import { Callout } from "@/components/ig/callout";
import { DataTable, type DataTableColumn, type DataTableRow } from "@/components/ig/data-table";
import { Section, SectionHead } from "@/components/ig/section";
import { NotFoundResponse } from "@/components/page/not-found-response";
import { PageShell } from "@/components/page/page-shell";
import { RichText } from "@/components/rich-text/rich-text";
import { FileKinds } from "@/components/service/file-kinds";
import { OrderedChecks } from "@/components/service/ordered-checks";
import { ServiceHero } from "@/components/service/service-hero";
import { UploadCard } from "@/components/service/upload-card";
import { redirectIfExists } from "@/lib/cms/queries";
import type { PlaceholderContext } from "@/lib/domain";
import { pickFirst, pickNth } from "@/lib/service/page-compose";
import { loadServicePage, servicePageMetadata } from "@/lib/service/service-page";
import { lexicalToPlainText } from "@/payload/utils/lexical-text";
import type { Metadata } from "next";

/**
 * «Требования к чертежам» (`Drawings.dc.html`, teksty 04 §2). Reads the `pages` document and
 * places its blocks by role (`@/lib/service/page-compose`):
 * - `hero` → white first screen, the «Загрузить чертёж» button jumps to `#dr-up`;
 * - file formats → `FileKinds` (approved design cards);
 * - 1st `table` → «Что указать в чертеже»; 2nd `table` + 1st `callout` → «Технологические
 *   ограничения» with the GOST holes note beside it;
 * - 1st `steps` + 1st `richText` + `form` → «Как мы проверяем файл» with the upload card.
 * The quiz CTA of the frame is off: the page's action is the drawing form.
 */

const PATH = "/kak-zakazat/trebovaniya-k-chertezham/";
const IDS = {
  files: "dr-files",
  what: "dr-what",
  limits: "dr-lim",
  check: "dr-check",
} as const;

/** The section rhythm and teksty never change with the date; the header does (promo): hourly. */
export const revalidate = 3600;

export function generateMetadata(): Promise<Metadata> {
  return servicePageMetadata(PATH);
}

/** Two-column facts table: bold first column (34 %), values with tabular figures. */
function factsTable(block: BlockOf<"table">, ctx: PlaceholderContext, numericValues: boolean) {
  const [first, second] = block.table?.columns ?? [];
  const columns: DataTableColumn[] = [
    { key: "name", label: fill(first?.label, ctx), width: "34%" },
    { key: "value", label: fill(second?.label, ctx) },
  ];
  const rows: DataTableRow[] = (block.table?.rows ?? []).map((row) => ({
    name: <b>{fill(row.cells?.[0]?.value, ctx)}</b>,
    value: numericValues ? (
      <span className="tabular-nums">{fill(row.cells?.[1]?.value, ctx)}</span>
    ) : (
      fill(row.cells?.[1]?.value, ctx)
    ),
  }));
  const caption = fill(block.heading, ctx);
  return <DataTable columns={columns} rows={rows} {...(caption ? { caption } : {})} />;
}

function GostCallout({ block, ctx }: { block: BlockOf<"callout">; ctx: PlaceholderContext }) {
  const items = (block.items ?? []).map((item, index) => (
    <div key={item.id ?? index} className="[&>p]:inline">
      {hasText(item.lead) ? <strong>{fill(item.lead, ctx)} </strong> : null}
      <RichText data={item.text} ctx={ctx} disableContainer />
    </div>
  ));
  const title = fill(block.title, ctx);
  return (
    <Callout
      variant={block.tone === "info" ? "info" : "warning"}
      // Aligned with the table, below the section heading on the left (`.dr-gost`).
      className="mt-[72px] max-md:mt-0"
      {...(title ? { title } : {})}
      {...(items.length > 0 ? { items } : {})}
    >
      <RichText data={block.body} ctx={ctx} disableContainer />
    </Callout>
  );
}

export default async function DrawingRequirementsPage() {
  const data = await loadServicePage(PATH);
  if (!data) {
    await redirectIfExists(PATH);
    return <NotFoundResponse />;
  }
  const { page, path, placeholders: ctx, blockPage, title, breadcrumbLabel, crumbs } = data;
  const layout = page.layout;
  const hero = pickFirst(layout, "hero");
  const what = pickNth(layout, "table", 0);
  const limits = pickNth(layout, "table", 1);
  const gost = pickFirst(layout, "callout");
  const checks = pickFirst(layout, "steps");
  const responsibility = pickFirst(layout, "richText");
  const form = pickFirst(layout, "form");

  const lead = hero ? fill(lexicalToPlainText(hero.lead), ctx) : "";
  const checksHeading = checks ? fill(checks.heading, ctx) : "";
  const checkItems = (checks?.items ?? []).map((item) => fill(item.title, ctx)).filter(Boolean);
  const formParams = form ? toFormParams(form.params, fill(form.sourceLabel, ctx) || path) : null;

  return (
    <PageShell path={path} breadcrumbLabel={breadcrumbLabel} hideBreadcrumbs quiz={false}>
      <ServiceHero
        title={title}
        crumbs={crumbs}
        lead={lead || undefined}
        actions={hero ? <CtaButtons buttons={hero.buttons} ctx={ctx} page={blockPage} /> : null}
      />

      <Section variant="bg" aria-labelledby={IDS.files}>
        <FileKinds headingId={IDS.files} />
      </Section>

      {what ? (
        <Section variant="sf" aria-labelledby={IDS.what}>
          <SectionHead title={fill(what.heading, ctx)} headingId={IDS.what} />
          <div className="max-w-[1200px]">{factsTable(what, ctx, false)}</div>
        </Section>
      ) : null}

      {limits || gost ? (
        <Section variant="bg" {...(limits ? { "aria-labelledby": IDS.limits } : {})}>
          <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] items-start gap-14 max-md:grid-cols-1 max-md:gap-8">
            {limits ? (
              <div>
                <SectionHead title={fill(limits.heading, ctx)} headingId={IDS.limits} />
                {factsTable(limits, ctx, true)}
              </div>
            ) : null}
            {gost ? <GostCallout block={gost} ctx={ctx} /> : null}
          </div>
        </Section>
      ) : null}

      {checks || responsibility || formParams ? (
        <Section variant="sf" {...(hasText(checksHeading) ? { "aria-labelledby": IDS.check } : {})}>
          <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] items-start gap-14 max-md:grid-cols-1 max-md:gap-8">
            <div className="flex flex-col gap-6">
              {hasText(checksHeading) ? (
                <h2 id={IDS.check} className="ig-h2 m-0">
                  {checksHeading}
                </h2>
              ) : null}
              <OrderedChecks items={checkItems} />
              {responsibility ? (
                <div className="bg-bg rounded-lg px-6 py-5 max-sm:px-5 max-sm:py-4">
                  <RichText data={responsibility.content} ctx={ctx} />
                </div>
              ) : null}
            </div>
            {formParams ? <UploadCard params={formParams} /> : null}
          </div>
        </Section>
      ) : null}
    </PageShell>
  );
}
