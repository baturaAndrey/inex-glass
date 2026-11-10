import { Download } from "lucide-react";
import { asMedia, mediaSrc } from "@/components/blocks/shared";
import { Button } from "@/components/ig/button";
import { Section, type SectionVariant } from "@/components/ig/section";
import { primaryEmail, primaryPhone } from "@/lib/cms/globals";
import { cn } from "@/lib/utils";
import type { Contact, Requisite } from "@/payload-types";

/** Anchor of the requisites section: the footer and the header menu link to `/kontakty/#rekvizity`. */
export const REQUISITES_ANCHOR = "rekvizity";
/** Section heading (teksty/06, «## Реквизиты»). */
export const REQUISITES_TITLE = "Реквизиты";
/** Download button label when the global has none (teksty/06, «[Скачать карточку предприятия]»). */
const DEFAULT_CARD_LABEL = "Скачать карточку предприятия";

export interface RequisiteRow {
  label: string;
  value: string;
}

const text = (value: string | null | undefined): string => value?.trim() ?? "";

/**
 * Rows of the requisites card, only the filled fields. The global is read as an anonymous
 * visitor, so the legal address appears only after Inex publishes it (`publishLegalAddress`)
 * and the bank group never reaches the site. Phone and e-mail fall back to the `contacts` global
 * (as the admin hints for these fields say).
 */
export function requisiteRows(
  requisites: Requisite | null | undefined,
  contacts?: Contact | null
): RequisiteRow[] {
  if (!requisites) return [];
  const rows: Array<[string, string]> = [
    ["Наименование", text(requisites.legalName) || text(requisites.shortName)],
    ["ИНН", text(requisites.inn)],
    ["ОГРНИП", text(requisites.ogrnip)],
    ["ОГРН", text(requisites.ogrn)],
    ["КПП", text(requisites.kpp)],
    ["Фактический адрес", text(requisites.actualAddress)],
    ["Юридический адрес", text(requisites.legalAddress)],
    ["Телефон", text(requisites.phone) || primaryPhone(contacts ?? null)],
    ["E-mail", text(requisites.email) || primaryEmail(contacts ?? null)],
  ];
  return rows.filter(([, value]) => value !== "").map(([label, value]) => ({ label, value }));
}

/** The company card PDF, when one is uploaded: `{ href, label }`, otherwise `null`. */
export function requisitesDownload(
  requisites: Requisite | null | undefined
): { href: string; label: string } | null {
  const media = asMedia(requisites?.cardPdf);
  const href = media ? mediaSrc(media) : null;
  if (!href) return null;
  return { href, label: text(requisites?.cardLabel) || DEFAULT_CARD_LABEL };
}

/** Whether the requisites panel has anything to show (rows, or the PDF button). */
export function hasRequisites(
  requisites: Requisite | null | undefined,
  contacts?: Contact | null,
  showDownload = true
): boolean {
  return (
    requisiteRows(requisites, contacts).length > 0 ||
    (showDownload && requisitesDownload(requisites) !== null)
  );
}

export interface RequisitesPanelProps {
  requisites: Requisite | null;
  contacts?: Contact | null | undefined;
  /** Anchor id of the panel (`rekvizity`); none when the wrapping section carries it. */
  id?: string | undefined;
  /** Id of the heading (the panel is labelled by it). */
  headingId?: string | undefined;
  title?: string | undefined;
  headingLevel?: "h2" | "h3" | undefined;
  /** `requisites.showDownload` of the block (default `true`); the button needs an uploaded PDF. */
  showDownload?: boolean | undefined;
  /** Panel on a dark section: the page colour instead of white. */
  onDarkSection?: boolean | undefined;
  className?: string | undefined;
}

/**
 * The «Реквизиты» panel of the Paper mockups `2560_o-kompanii` / `2560_kontakty` (2026-11): a
 * white 24 px card, the heading with «Скачать карточку предприятия» on the right (only when the
 * PDF exists), then the filled requisites as label → value rows split by hairlines. ≤599 px the
 * label sits above its value and the button goes full width under the heading.
 * Returns `null` when the global has no data.
 */
export function RequisitesPanel({
  requisites,
  contacts,
  id,
  headingId = `${REQUISITES_ANCHOR}-title`,
  title = REQUISITES_TITLE,
  headingLevel = "h2",
  showDownload = true,
  onDarkSection = false,
  className,
}: RequisitesPanelProps) {
  const rows = requisiteRows(requisites, contacts);
  const download = showDownload ? requisitesDownload(requisites) : null;
  if (rows.length === 0 && !download) return null;
  const Heading = headingLevel;

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn(
        // ≥ 96 px: the anchor stays clear of the fixed header after `/kontakty/#rekvizity`.
        "border-hairline flex min-w-0 scroll-mt-24 flex-col gap-7 rounded-xl border p-12 max-lg:p-10 max-md:p-8 max-sm:gap-5 max-sm:p-5",
        onDarkSection ? "bg-bg" : "bg-surface",
        className
      )}
      data-testid="requisites"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Heading id={headingId} className="ig-h3 m-0">
          {title}
        </Heading>
        {download ? (
          <Button
            asChild
            variant="secondary"
            className="max-sm:w-full"
            leftIcon={<Download aria-hidden="true" />}
          >
            <a href={download.href} download rel="noopener">
              {download.label}
            </a>
          </Button>
        ) : null}
      </div>
      {rows.length > 0 ? (
        <dl className="m-0 flex flex-col">
          {rows.map((row) => (
            <div
              key={row.label}
              className="border-hairline flex gap-6 border-0 border-b py-3.5 last:border-b-0 max-sm:flex-col max-sm:gap-1 max-sm:py-3"
            >
              <dt className="text-text-2 w-55 shrink-0 text-[15px] leading-5 max-sm:w-auto max-sm:text-sm">
                {row.label}
              </dt>
              <dd className="m-0 min-w-0 text-base leading-5 break-words tabular-nums">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </section>
  );
}

export interface RequisitesCardProps extends Omit<RequisitesPanelProps, "onDarkSection" | "id"> {
  /** Section background (continues the page rhythm). */
  variant?: SectionVariant | undefined;
  /** Anchor id of the section (`rekvizity`). */
  id?: string | undefined;
}

/**
 * «Реквизиты» as a page section (the `requisites` block, any `pages` document): the
 * `RequisitesPanel` inside a `Section`; the section carries the anchor.
 * Implements the `{реквизиты}` marker of teksty/06. Renders nothing when the global has no data.
 */
export function RequisitesCard({
  variant = "sf",
  id = REQUISITES_ANCHOR,
  className,
  ...panel
}: RequisitesCardProps) {
  if (!hasRequisites(panel.requisites, panel.contacts, panel.showDownload)) return null;
  return (
    // The panel is the labelled region; the section only frames it and carries the anchor.
    <Section as="div" variant={variant} id={id} className={cn("scroll-mt-24", className)}>
      <RequisitesPanel
        {...panel}
        onDarkSection={variant === "dark" || variant === "primary-dark"}
      />
    </Section>
  );
}
