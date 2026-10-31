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

export interface RequisitesCardProps {
  requisites: Requisite | null;
  contacts?: Contact | null | undefined;
  /** Section background (continues the page rhythm). */
  variant?: SectionVariant | undefined;
  /** Anchor id of the section (`rekvizity`). */
  id?: string | undefined;
  /** Id of the heading (the section is labelled by it). */
  headingId?: string | undefined;
  title?: string | undefined;
  headingLevel?: "h2" | "h3" | undefined;
  /** `requisites.showDownload` of the block (default `true`); the button needs an uploaded PDF. */
  showDownload?: boolean | undefined;
  className?: string | undefined;
}

/**
 * «Реквизиты» (`Contacts.dc.html`, `.ct-req`): a framed card with the filled requisites of the
 * `requisites` global and «Скачать карточку предприятия» — the button only when the PDF exists.
 * Implements the `{реквизиты}` marker of teksty/06 on `/o-kompanii/` and `/kontakty/`.
 * Renders nothing when the global has no data.
 */
export function RequisitesCard({
  requisites,
  contacts,
  variant = "sf",
  id = REQUISITES_ANCHOR,
  headingId = `${REQUISITES_ANCHOR}-title`,
  title = REQUISITES_TITLE,
  headingLevel = "h2",
  showDownload = true,
  className,
}: RequisitesCardProps) {
  const rows = requisiteRows(requisites, contacts);
  const download = showDownload ? requisitesDownload(requisites) : null;
  if (rows.length === 0 && !download) return null;
  const Heading = headingLevel;

  return (
    <Section
      variant={variant}
      id={id}
      aria-labelledby={headingId}
      // ≥ 96 px: the section stays clear of the fixed header after `/kontakty/#rekvizity`.
      className={cn("scroll-mt-24", className)}
    >
      <div
        className={cn(
          "flex flex-wrap items-start justify-between gap-6 rounded-xl p-8 max-sm:p-5",
          variant === "bg" ? "bg-surface shadow-card" : "bg-bg"
        )}
      >
        <div className="flex min-w-0 flex-col gap-4">
          <Heading id={headingId} className="ig-h4 m-0">
            {title}
          </Heading>
          {rows.length > 0 ? (
            <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2 text-base leading-normal max-sm:grid-cols-1 max-sm:gap-y-0.5">
              {rows.map((row) => (
                <div key={row.label} className="contents">
                  <dt className="text-text-2 max-sm:mt-2 max-sm:text-sm">{row.label}</dt>
                  <dd className="m-0 break-words">{row.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
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
    </Section>
  );
}
