import {
  Button,
  Chip,
  DetailsTable,
  EmailLayout,
  Heading,
  linkStyle,
  Paragraph,
  SectionTitle,
} from "./layout";
import type { LeadEmailData } from "./format-answers";
import type { DetailRow, FooterContacts } from "./layout";

/** Manager e-mail about a new lead (ТЗ §6.1). Contains the client's contacts: staff only. */

export type NewLeadEmailProps = {
  siteUrl: string;
  footer: FooterContacts;
  lead: LeadEmailData;
};

export const newLeadSubject = (lead: Pick<LeadEmailData, "sourceLabel" | "subjectTarget">) =>
  `Новая заявка: ${lead.sourceLabel} — ${lead.subjectTarget}`;

/** Contact/request rows; phone and e-mail become `tel:` / `mailto:` links. */
export function leadFieldRows(lead: LeadEmailData): DetailRow[] {
  return lead.fields.map((field) => ({
    label: field.label,
    value: field.href ? (
      <a href={field.href} style={linkStyle}>
        {field.value}
      </a>
    ) : (
      field.value
    ),
  }));
}

function SourceBlock({ lead }: { lead: LeadEmailData }) {
  const rows: DetailRow[] = [{ label: "Источник", value: lead.sourceLabel }];
  if (lead.entryPage) rows.push({ label: "Страница входа", value: lead.entryPage });
  if (lead.pageUrl && lead.pageUrl !== lead.entryPage) {
    rows.push({ label: "Страница отправки", value: lead.pageUrl });
  }
  return (
    <>
      <SectionTitle>Источник и страница входа</SectionTitle>
      <DetailsTable rows={rows} />
    </>
  );
}

function FlagsBlock({ lead }: { lead: LeadEmailData }) {
  if (lead.flags.length === 0 && !lead.isDuplicate) return null;
  return (
    <>
      <SectionTitle>Флаги</SectionTitle>
      <p style={{ margin: "0 0 14px" }}>
        {lead.isDuplicate ? <Chip tone="dup">Повторная заявка</Chip> : null}
        {lead.flags.map((flag) => (
          <Chip key={flag}>{flag}</Chip>
        ))}
      </p>
    </>
  );
}

function AnswersBlock({ lead }: { lead: LeadEmailData }) {
  if (lead.answers.length > 0) {
    return (
      <>
        <SectionTitle>Ответы</SectionTitle>
        <DetailsTable rows={lead.answers} />
      </>
    );
  }
  if (!lead.answersSummary) return null;
  return (
    <>
      <SectionTitle>Ответы</SectionTitle>
      <Paragraph>{lead.answersSummary}</Paragraph>
    </>
  );
}

function FilesBlock({ lead }: { lead: LeadEmailData }) {
  if (lead.files.length === 0) return null;
  return (
    <>
      <SectionTitle>Файлы</SectionTitle>
      <DetailsTable
        rows={lead.files.map((file, index) => ({
          label: `${index + 1}. ${file.size ?? ""}`.trim(),
          value: (
            <a href={file.url} style={linkStyle}>
              {file.name}
            </a>
          ),
        }))}
      />
      <Paragraph muted>Файлы открываются после входа в админку.</Paragraph>
    </>
  );
}

export function NewLeadEmail({ siteUrl, footer, lead }: NewLeadEmailProps) {
  const title = newLeadSubject(lead);
  return (
    <EmailLayout preview={title} siteUrl={siteUrl} footer={footer} eyebrow="Новая заявка">
      <Heading>{title}</Heading>
      <FlagsBlock lead={lead} />
      <SourceBlock lead={lead} />
      <SectionTitle>Данные заявки</SectionTitle>
      <DetailsTable rows={leadFieldRows(lead)} />
      <AnswersBlock lead={lead} />
      <FilesBlock lead={lead} />
      {lead.utm.length > 0 ? (
        <>
          <SectionTitle>UTM</SectionTitle>
          <DetailsTable rows={lead.utm} />
        </>
      ) : null}
      <Button href={lead.adminUrl}>Открыть заявку в админке</Button>
    </EmailLayout>
  );
}
