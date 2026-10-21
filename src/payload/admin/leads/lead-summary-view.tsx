import type { CSSProperties, ReactNode } from "react";
import { Gutter } from "@payloadcms/ui";
import { formatFileSize, summarizeAnswers, telHref } from "@/emails/format-answers";
import { formatNumber } from "@/lib/domain/format";
import { QUIZ_FLAG_LABELS } from "@/lib/domain/quiz-flags";
import type { QuizFlag } from "@/lib/domain/quiz-flags";
import { formatDateTime, relationIdOf } from "@/lib/leads-admin/export-rows";
import { getRole } from "@/payload/access";
import { LEAD_PRODUCT_TYPES, LEAD_ROLES } from "@/payload/collections/crm/constants";
import type { ConsentLog, Lead, LeadFile } from "@/payload-types";
import {
  DUPLICATE_BADGE_COLORS,
  formTypeLabel,
  leadAdminPath,
  leadFileDownloadPath,
  statusBadgeColors,
} from "./constants";
import { loadLeadStatuses, loadStaffNames } from "./data";
import { Badge, EMPTY, mutedText, Wrap } from "./ui";
import type { DocumentViewServerProps, Payload, TypedUser, Where } from "payload";

/**
 * «Сводка» tab of a lead (`/admin/collections/leads/<id>/summary/`): everything a manager needs
 * on one screen — contacts with `tel:`/`mailto:`, the request with readable answers, flags,
 * attribution, files with download links, comments, repeat requests and the consent record.
 *
 * Data is read with the viewer's access (`overrideAccess: false`). The consent IP and
 * User-Agent are shown to admins only.
 */

type Row = { label: string; value: ReactNode };

const REPEATS_LIMIT = 20;
/** Service keys of raw form payloads never shown to the manager. */
const HIDDEN_ANSWER_KEYS = /token|consent|captcha|honeypot|hp_|upload|files?$/i;

const ROLE_LABELS = new Map<string, string>(LEAD_ROLES.map((o) => [o.value, o.label]));
const PRODUCT_LABELS = new Map<string, string>(LEAD_PRODUCT_TYPES.map((o) => [o.value, o.label]));

const sectionStyle: CSSProperties = {
  border: "1px solid var(--theme-elevation-150)",
  borderRadius: "var(--style-radius-m, 4px)",
  padding: "16px",
  background: "var(--theme-elevation-0)",
  minWidth: 0,
};

const tableStyle: CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: "13px" };
const thStyle: CSSProperties = {
  textAlign: "left",
  verticalAlign: "top",
  fontWeight: 400,
  color: "var(--theme-elevation-500)",
  padding: "4px 12px 4px 0",
  width: "40%",
};
const tdStyle: CSSProperties = {
  verticalAlign: "top",
  padding: "4px 0",
  overflowWrap: "anywhere",
  whiteSpace: "pre-wrap",
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={sectionStyle} aria-label={title}>
      <h3 style={{ margin: "0 0 12px", fontSize: "16px" }}>{title}</h3>
      {children}
    </section>
  );
}

function Rows({ rows, empty = "Нет данных" }: { rows: Row[]; empty?: string }) {
  const visible = rows.filter(
    (row) => row.value !== null && row.value !== undefined && row.value !== ""
  );
  if (visible.length === 0) return <p style={mutedText}>{empty}</p>;
  return (
    <table style={tableStyle}>
      <tbody>
        {visible.map((row) => (
          <tr key={row.label}>
            <th scope="row" style={thStyle}>
              {row.label}
            </th>
            <td style={tdStyle}>{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() !== "" ? value.trim() : null;

/** Readable value of a raw answer (primitives, lists, small objects as compact JSON). */
function answerValue(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "boolean") return value ? "да" : "нет";
  if (typeof value === "number") return Number.isFinite(value) ? formatNumber(value) : null;
  if (typeof value === "string") return text(value);
  if (Array.isArray(value)) {
    const parts = value.map(answerValue).filter((part): part is string => part !== null);
    return parts.length > 0 ? parts.join(", ") : null;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

/** Quiz answers in the e-mail wording; any other payload as a key/value table. */
function answerRows(answers: unknown): Row[] {
  const known = summarizeAnswers(answers);
  if (known.length > 0) return known;
  if (typeof answers !== "object" || answers === null || Array.isArray(answers)) return [];
  return Object.entries(answers as Record<string, unknown>)
    .filter(([key]) => !HIDDEN_ANSWER_KEYS.test(key))
    .map(([key, value]) => ({ label: key, value: answerValue(value) }));
}

function nameOf(names: ReadonlyMap<string, string>, value: unknown): string | null {
  const id = relationIdOf(value);
  return id ? (names.get(id) ?? id) : null;
}

async function loadRepeats(payload: Payload, user: TypedUser | null, lead: Lead) {
  const or: Where[] = [];
  if (text(lead.phone)) or.push({ phone: { equals: lead.phone } });
  if (text(lead.email)) or.push({ email: { equals: lead.email } });
  if (or.length === 0) return { docs: [] as Lead[], totalDocs: 0 };
  const result = await payload.find({
    collection: "leads",
    where: { and: [{ or }, { id: { not_equals: lead.id } }] },
    sort: "-createdAt",
    limit: REPEATS_LIMIT,
    depth: 0,
    overrideAccess: false,
    user,
    select: { createdAt: true, status: true, formType: true, isDuplicate: true },
  });
  return { docs: result.docs as Lead[], totalDocs: result.totalDocs };
}

async function loadConsents(payload: Payload, user: TypedUser | null, lead: Lead) {
  const or: Where[] = [{ lead: { equals: lead.id } }];
  const consentId = relationIdOf(lead.consent);
  if (consentId) or.push({ id: { equals: consentId } });
  const result = await payload.find({
    collection: "consent-log",
    where: { or },
    sort: "-givenAt",
    depth: 0,
    limit: 10,
    overrideAccess: false,
    user,
  });
  return result.docs as ConsentLog[];
}

export async function LeadSummaryView({ doc, initPageResult }: DocumentViewServerProps) {
  const { req } = initPageResult;
  const { payload } = req;
  const user = (req.user ?? null) as TypedUser | null;
  const isAdmin = getRole(user) === "admin";
  const leadId = relationIdOf(doc);
  if (!leadId) return <Gutter>Заявка не найдена</Gutter>;

  const lead = (await payload.findByID({
    collection: "leads",
    id: leadId,
    depth: 1,
    overrideAccess: false,
    user,
    disableErrors: true,
  })) as Lead | null;
  if (!lead) return <Gutter>Заявка не найдена или нет доступа</Gutter>;

  const [statuses, staff, repeats, consents] = await Promise.all([
    loadLeadStatuses(payload),
    loadStaffNames(payload),
    loadRepeats(payload, user, lead),
    loadConsents(payload, user, lead),
  ]);
  const statusById = new Map(statuses.map((status) => [status.id, status]));
  const statusBadge = (value: unknown) => {
    const status = statusById.get(relationIdOf(value) ?? "");
    if (!status) return EMPTY;
    const colors = statusBadgeColors(status.color);
    return (
      <Badge color={colors.color} background={colors.background}>
        {status.name}
      </Badge>
    );
  };

  const phone = text(lead.phone);
  const email = text(lead.email);
  const files = (lead.files ?? []).filter(
    (file): file is LeadFile => typeof file === "object" && file !== null
  );
  const flags = (lead.flags ?? [])
    .map((flag) => QUIZ_FLAG_LABELS[flag as QuizFlag] as string | undefined)
    .filter((label): label is string => label !== undefined);
  const utm = Object.entries(lead.utm ?? {}).map(([key, value]) => ({
    label: ["source", "medium", "campaign", "term", "content"].includes(key) ? `utm_${key}` : key,
    value: text(value),
  }));
  const originalId = relationIdOf(lead.duplicateOf);
  const comments = lead.internalComments ?? [];

  return (
    <Gutter>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))",
          gap: "16px",
          padding: "24px 0 48px",
        }}
      >
        <Section title="Контакты">
          <Rows
            rows={[
              { label: "Имя", value: text(lead.name) },
              { label: "Компания", value: text(lead.company) },
              { label: "ИНН", value: text(lead.inn) },
              {
                label: "Роль",
                value: lead.role ? (ROLE_LABELS.get(lead.role) ?? lead.role) : null,
              },
              { label: "Телефон", value: phone ? <a href={telHref(phone)}>{phone}</a> : null },
              {
                label: "Телефон (как ввёл)",
                value: text(lead.phoneRaw) !== phone ? text(lead.phoneRaw) : null,
              },
              { label: "E-mail", value: email ? <a href={`mailto:${email}`}>{email}</a> : null },
              { label: "Город", value: text(lead.city) },
            ]}
          />
        </Section>

        <Section title="Обработка">
          <Rows
            rows={[
              { label: "Создана", value: formatDateTime(lead.createdAt) },
              { label: "Статус", value: statusBadge(lead.status) },
              {
                label: "Статус изменён",
                value: lead.statusChangedAt ? formatDateTime(lead.statusChangedAt) : null,
              },
              { label: "Причина отказа", value: text(lead.refuseReason) },
              { label: "Ответственный", value: nameOf(staff, lead.assignee) ?? "Не назначен" },
            ]}
          />
        </Section>

        <Section title="Заявка">
          <Rows
            rows={[
              { label: "Форма", value: formTypeLabel(lead.formType) },
              { label: "Источник", value: text(lead.sourceLabel) },
              {
                label: "Площадь",
                value: typeof lead.area === "number" ? `${formatNumber(lead.area)} м²` : null,
              },
              {
                label: "Изделие",
                value: lead.productType
                  ? (PRODUCT_LABELS.get(lead.productType) ?? lead.productType)
                  : null,
              },
              { label: "Комментарий", value: text(lead.comment) },
              ...answerRows(lead.answers),
            ]}
          />
          {answerRows(lead.answers).length === 0 && text(lead.answersSummary) ? (
            <p style={{ ...tdStyle, marginTop: 8 }}>{text(lead.answersSummary)}</p>
          ) : null}
        </Section>

        <Section title="Флаги">
          {flags.length > 0 ? (
            <Wrap>
              {flags.map((label) => (
                <Badge key={label}>{label}</Badge>
              ))}
            </Wrap>
          ) : (
            <p style={mutedText}>Флагов нет</p>
          )}
        </Section>

        <Section title="Атрибуция">
          <Rows
            rows={[
              { label: "Страница входа", value: text(lead.entryPage) },
              { label: "Страница отправки", value: text(lead.pageUrl) },
              { label: "Referrer", value: text(lead.referrer) },
              ...utm,
              { label: "Client ID Метрики", value: text(lead.metrikaClientId) },
            ]}
          />
        </Section>

        <Section title="Файлы">
          {files.length > 0 ? (
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: "8px" }}>
              {files.map((file) => (
                <li
                  key={file.id}
                  style={{ display: "flex", gap: "8px", alignItems: "baseline", flexWrap: "wrap" }}
                >
                  <span style={{ overflowWrap: "anywhere" }}>
                    {text(file.originalName) ?? text(file.filename) ?? "файл"}
                  </span>
                  <span style={mutedText}>
                    {formatFileSize(file.sizeBytes ?? file.filesize) ?? ""}
                  </span>
                  <a href={leadFileDownloadPath(file.id)} download>
                    Скачать
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p style={mutedText}>Файлов нет</p>
          )}
        </Section>

        <Section title="Повторные обращения">
          {lead.isDuplicate ? (
            <p style={{ margin: "0 0 8px" }}>
              <Badge
                color={DUPLICATE_BADGE_COLORS.color}
                background={DUPLICATE_BADGE_COLORS.background}
              >
                Повтор
              </Badge>{" "}
              {originalId ? (
                <a href={leadAdminPath(originalId)}>Исходная заявка</a>
              ) : (
                "Исходная заявка удалена"
              )}
            </p>
          ) : null}
          {repeats.totalDocs > 0 ? (
            <>
              <p style={{ margin: "0 0 8px" }}>Есть повторы: {formatNumber(repeats.totalDocs)}</p>
              <table style={tableStyle}>
                <tbody>
                  {repeats.docs.map((repeat) => (
                    <tr key={repeat.id}>
                      <td style={{ ...tdStyle, paddingRight: 12 }}>
                        <a href={leadAdminPath(repeat.id)}>{formatDateTime(repeat.createdAt)}</a>
                      </td>
                      <td style={{ ...tdStyle, paddingRight: 12 }}>
                        {formTypeLabel(repeat.formType)}
                      </td>
                      <td style={tdStyle}>{statusBadge(repeat.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p style={mutedText}>Других заявок с этим телефоном или e-mail нет</p>
          )}
        </Section>

        <Section title="Внутренние комментарии">
          {comments.length > 0 ? (
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: "12px" }}>
              {comments.map((comment, index) => (
                <li key={comment.id ?? index}>
                  <div style={mutedText}>
                    {nameOf(staff, comment.author) ?? "Система"}
                    {comment.date ? ` · ${formatDateTime(comment.date)}` : ""}
                  </div>
                  <div style={tdStyle}>{comment.text}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p style={mutedText}>Комментариев нет</p>
          )}
        </Section>

        <Section title="Согласие на обработку ПДн">
          {consents.length > 0 ? (
            consents.map((consent) => (
              <Rows
                key={consent.id}
                rows={[
                  {
                    label: "Дата",
                    value: consent.givenAt ? formatDateTime(consent.givenAt) : null,
                  },
                  { label: "Версия согласия", value: text(consent.consentVersion) },
                  { label: "Версия политики", value: text(consent.policyVersion) },
                  ...(isAdmin
                    ? [
                        { label: "IP", value: text(consent.ip) },
                        { label: "User-Agent", value: text(consent.userAgent) },
                      ]
                    : []),
                ]}
              />
            ))
          ) : (
            <p style={mutedText}>Запись о согласии не найдена</p>
          )}
        </Section>
      </div>
    </Gutter>
  );
}
