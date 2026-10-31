import { Button, Chip, DetailsTable, EmailLayout, Heading, Paragraph } from "./layout";
import { leadFieldRows } from "./new-lead";
import type { LeadEmailData } from "./format-answers";
import type { FooterContacts } from "./layout";

/** E-mail to the staff member a lead was assigned to (ТЗ §6.1 «ответственный и уведомление»). */

export type LeadAssignedEmailProps = {
  siteUrl: string;
  footer: FooterContacts;
  lead: LeadEmailData;
  assigneeName?: string | null;
};

/** Rows of the short summary: who, how to reach, what. */
const SUMMARY_LABELS: ReadonlySet<string> = new Set([
  "Дата",
  "Компания",
  "Имя",
  "Телефон",
  "E-mail",
  "Город",
  "Площадь",
  "Тип изделия",
]);

export const leadAssignedSubject = (lead: Pick<LeadEmailData, "sourceLabel" | "subjectTarget">) =>
  `Вам назначена заявка: ${lead.sourceLabel} — ${lead.subjectTarget}`;

export function LeadAssignedEmail({ siteUrl, footer, lead, assigneeName }: LeadAssignedEmailProps) {
  const title = leadAssignedSubject(lead);
  const rows = leadFieldRows(lead).filter((row) => SUMMARY_LABELS.has(row.label));
  const greeting = assigneeName?.trim() ? `${assigneeName.trim()}, вы` : "Вы";
  return (
    <EmailLayout preview={title} siteUrl={siteUrl} footer={footer} eyebrow="Назначение заявки">
      <Heading>{title}</Heading>
      <Paragraph>{`${greeting} назначены ответственным за эту заявку.`}</Paragraph>
      {lead.isDuplicate || lead.flags.length > 0 ? (
        <p style={{ margin: "0 0 14px" }}>
          {lead.isDuplicate ? <Chip tone="dup">Повторная заявка</Chip> : null}
          {lead.flags.map((flag) => (
            <Chip key={flag}>{flag}</Chip>
          ))}
        </p>
      ) : null}
      <DetailsTable rows={[{ label: "Источник", value: lead.sourceLabel }, ...rows]} />
      <Button href={lead.adminUrl}>Открыть заявку</Button>
    </EmailLayout>
  );
}
