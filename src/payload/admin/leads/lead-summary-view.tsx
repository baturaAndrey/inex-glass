import type { CSSProperties, ReactNode } from "react";
import { Gutter } from "@payloadcms/ui";
import { ArrowLeft, Mail, Phone } from "lucide-react";
import { formatFileSize, telHref } from "@/emails/format-answers";
import { formatDateRu, formatNumber, formatRub } from "@/lib/domain/format";
import { QUIZ_FLAG_LABELS } from "@/lib/domain/quiz-flags";
import type { QuizFlag } from "@/lib/domain/quiz-flags";
import { formatDateTime, relationIdOf } from "@/lib/leads-admin/export-rows";
import { safeInternalPath } from "@/lib/preview/safe-path";
import { getRole } from "@/payload/access";
import {
  LEAD_FLAGS,
  LEAD_PRODUCT_TYPES,
  LEAD_REFUSE_REASON_CODES,
  LEAD_ROLES,
} from "@/payload/collections/crm/constants";
import type { ConsentLog, Lead, LeadFile } from "@/payload-types";
import { answerRows, fileExtension, text } from "./card/answers";
import { EraseButton } from "./card/erase-button";
import { ProcessingPanel } from "./card/processing-panel";
import {
  formTypeLabel,
  LEADS_KANBAN_PATH,
  leadFileDownloadPath,
  leadSummaryPath,
  statusBadgeColors,
} from "./constants";
import { loadLeadStatuses, loadStaffNames } from "./data";
import { LeadComments } from "./history/lead-comments";
import { LeadHistory } from "./history/lead-history";
import { formatPhoneDisplay } from "./kanban/format";
import type { ProcessingPanelProps } from "./card/processing";
import type { StatusOption } from "./data";
import type { DocumentViewServerProps, Payload, TypedUser, Where } from "payload";

/**
 * «Сводка» tab of a lead (`/admin/collections/leads/<id>/summary/`), the lead card of the admin
 * redesign (mockup `res/admin-mockup/Lead.dc.html`): head with «Позвонить» / «Написать»; main
 * column — contacts, the request, files, comments and history, the folded attribution; side
 * column — the «Обработка» panel (saved through REST PATCH, so every lead hook runs), repeat
 * requests and the consent record (with the erasure button for admins).
 *
 * Data is read with the viewer's access (`overrideAccess: false`). The consent IP and
 * User-Agent and the erasure are for admins only.
 */

type Row = { label: string; value: ReactNode };

const REPEATS_LIMIT = 20;
const CONSENTS_LIMIT = 10;
const URGENT_FLAG = "urgent";

const ROLE_LABELS = new Map<string, string>(LEAD_ROLES.map((o) => [o.value, o.label]));
const PRODUCT_LABELS = new Map<string, string>(LEAD_PRODUCT_TYPES.map((o) => [o.value, o.label]));
/** UTM keys in display order; the standard five are shown as `utm_<key>`. */
const UTM_KEYS = [
  "source",
  "medium",
  "campaign",
  "term",
  "content",
  "yclid",
  "gclid",
  "openstat",
] as const;
const UTM_PREFIXED = new Set<string>(["source", "medium", "campaign", "term", "content"]);

const FLAG_OPTIONS = LEAD_FLAGS.map((flag) => ({
  value: flag.value,
  label: (QUIZ_FLAG_LABELS[flag.value as QuizFlag] as string | undefined) ?? flag.label,
}));
const REASON_OPTIONS = LEAD_REFUSE_REASON_CODES.map((reason) => ({
  value: reason.value,
  label: reason.label,
}));

const flagLabel = (value: string) =>
  FLAG_OPTIONS.find((flag) => flag.value === value)?.label ?? null;

/** `.iga-badge` in a status colour from the `lead-statuses` directory. */
function StatusBadge({ status }: { status: StatusOption | undefined }) {
  if (!status) return null;
  const style = { "--iga-badge-color": statusBadgeColors(status.color).color } as CSSProperties;
  return (
    <span className="iga-badge" style={style}>
      {status.name}
    </span>
  );
}

/** `.iga-dl` without empty rows; `null` when nothing is left (the caller picks the fallback). */
function detailRows({ rows, numeric = [] }: { rows: Row[]; numeric?: string[] }) {
  const visible = rows.filter(
    (row) => row.value !== null && row.value !== undefined && row.value !== ""
  );
  if (visible.length === 0) return null;
  return (
    <dl className="iga-dl">
      {visible.map((row) => (
        <div key={row.label}>
          <dt>{row.label}</dt>
          <dd className={numeric.includes(row.label) ? "iga-lead__num" : undefined}>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Card with a `<h2>` that names its region. */
function Card({
  id,
  title,
  children,
  className,
}: {
  id: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={className ? `iga-card ${className}` : "iga-card"} aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      {children}
    </section>
  );
}

const Empty = ({ children }: { children: ReactNode }) => (
  <p className="iga-lead__empty">{children}</p>
);

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
    limit: CONSENTS_LIMIT,
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
  if (!leadId || !user) return <Gutter>Заявка не найдена</Gutter>;

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
  const statusOf = (value: unknown) => statusById.get(relationIdOf(value) ?? "");

  const phone = text(lead.phone);
  const phoneRaw = text(lead.phoneRaw);
  const email = text(lead.email);
  const entryPage = text(lead.entryPage);
  // `entryPage` comes from the public form, so it is untrusted: only a path `safeInternalPath`
  // accepts (no `//host`, `/\host`, scheme, encoded slash or control char) becomes a link;
  // anything else is shown as plain text.
  const entryPageHref = entryPage ? safeInternalPath(entryPage) : null;
  const title = text(lead.company) ?? text(lead.name) ?? "Заявка";
  const flags = lead.flags ?? [];
  const files = (lead.files ?? []).filter(
    (file): file is LeadFile => typeof file === "object" && file !== null
  );
  const answers = answerRows(lead.answers);
  const estimateFrom =
    typeof lead.estimate?.from === "number" && Number.isFinite(lead.estimate.from)
      ? lead.estimate.from
      : null;
  const kpAmount =
    typeof lead.kpAmount === "number" && Number.isFinite(lead.kpAmount) ? lead.kpAmount : null;
  const originalId = relationIdOf(lead.duplicateOf);

  const commentRows = (lead.internalComments ?? [])
    .map((row, index) => ({
      id: row.id ?? String(index),
      author: nameOf(staff, row.author),
      text: row.text,
      date: row.date ?? lead.createdAt,
    }))
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));

  const utmRows: Row[] = UTM_KEYS.map((key) => ({
    label: UTM_PREFIXED.has(key) ? `utm_${key}` : key,
    value: text(lead.utm?.[key]),
  }));
  const sourceRows: Row[] = [
    { label: "Источник", value: text(lead.sourceLabel) },
    { label: "Страница входа", value: entryPage },
    { label: "Страница отправки", value: text(lead.pageUrl) },
    { label: "Реферер", value: text(lead.referrer) },
    ...utmRows,
    { label: "ClientID Метрики", value: text(lead.metrikaClientId) },
  ];

  const processing: ProcessingPanelProps = {
    leadId: lead.id,
    currentUserId: String(user.id),
    statuses: statuses.map(({ id, name, isContract, requiresReason }) => ({
      id,
      name,
      isContract,
      requiresReason,
    })),
    staff: [...staff.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "ru")),
    reasons: REASON_OPTIONS,
    flags: FLAG_OPTIONS,
    initial: {
      status: relationIdOf(lead.status),
      assignee: relationIdOf(lead.assignee),
      flags: [...flags],
      refuseReasonCode: lead.refuseReasonCode ?? null,
      refuseReason: lead.refuseReason ?? "",
      kpAmount,
    },
  };

  return (
    <Gutter>
      <div className="iga-lead">
        <header className="iga-lead__head">
          <div className="iga-lead__title">
            <a href={LEADS_KANBAN_PATH} className="iga-lead__back">
              <ArrowLeft aria-hidden="true" size={14} />
              Заявки
            </a>
            <div className="iga-lead__badges">
              <h1>{title}</h1>
              <StatusBadge status={statusOf(lead.status)} />
              <span className="iga-tag">{formTypeLabel(lead.formType)}</span>
              {flags.map((flag) => {
                const label = flagLabel(flag);
                if (!label) return null;
                return flag === URGENT_FLAG ? (
                  <span key={flag} className="iga-badge iga-badge--no">
                    {label}
                  </span>
                ) : (
                  <span key={flag} className="iga-tag">
                    {label}
                  </span>
                );
              })}
              {lead.isDuplicate ? <span className="iga-badge iga-badge--work">Повтор</span> : null}
            </div>
            <p className="iga-lead__meta">
              Заявка от {formatDateTime(lead.createdAt)}
              {entryPage ? (
                <>
                  {" · со страницы "}
                  {entryPageHref ? (
                    <a href={entryPageHref} target="_blank" rel="noopener noreferrer">
                      {entryPage}
                    </a>
                  ) : (
                    entryPage
                  )}
                </>
              ) : null}
            </p>
          </div>
          {phone || email ? (
            <div className="iga-lead__actions">
              {phone ? (
                <a className="iga-btn iga-btn--primary" href={telHref(phone)}>
                  <Phone aria-hidden="true" />
                  Позвонить
                </a>
              ) : null}
              {email ? (
                <a className="iga-btn iga-btn--secondary" href={`mailto:${email}`}>
                  <Mail aria-hidden="true" />
                  Написать
                </a>
              ) : null}
            </div>
          ) : null}
        </header>

        <div className="iga-lead__cols">
          <div className="iga-lead__main">
            <Card id="lead-contacts" title="Контакты">
              {detailRows({
                numeric: ["ИНН", "Телефон"],
                rows: [
                  { label: "Компания", value: text(lead.company) },
                  { label: "ИНН", value: text(lead.inn) },
                  { label: "Контактное лицо", value: text(lead.name) },
                  {
                    label: "Роль",
                    value: lead.role ? (ROLE_LABELS.get(lead.role) ?? lead.role) : null,
                  },
                  {
                    label: "Телефон",
                    // Shown as on the kanban card («+7 925 859-38-73»); `tel:` keeps the stored number.
                    value: phone ? <a href={telHref(phone)}>{formatPhoneDisplay(phone)}</a> : null,
                  },
                  {
                    label: "Телефон (как ввёл)",
                    value: phoneRaw !== phone ? phoneRaw : null,
                  },
                  {
                    label: "E-mail",
                    value: email ? <a href={`mailto:${email}`}>{email}</a> : null,
                  },
                  { label: "Город", value: text(lead.city) },
                ],
              }) ?? <Empty>Нет данных</Empty>}
            </Card>

            <section className="iga-card" aria-labelledby="lead-request">
              <div className="iga-lead__request-head">
                <h2 id="lead-request">Что нужно клиенту</h2>
                {estimateFrom !== null ? (
                  <p className="iga-lead__estimate">
                    <span className="iga-lead__price">от&nbsp;{formatRub(estimateFrom)}</span>
                    {lead.estimate?.priceDate ? (
                      <span className="iga-lead__note">
                        ориентировочная цена на {formatDateRu(lead.estimate.priceDate)}
                        {lead.estimate.shown === false ? " (клиенту не показан)" : ""}
                      </span>
                    ) : null}
                  </p>
                ) : null}
              </div>
              {lead.productType || typeof lead.area === "number" ? (
                <div className="iga-lead__tags">
                  {lead.productType ? (
                    <span className="iga-tag">
                      {PRODUCT_LABELS.get(lead.productType) ?? lead.productType}
                    </span>
                  ) : null}
                  {typeof lead.area === "number" ? (
                    <span className="iga-tag iga-lead__num">{formatNumber(lead.area)} м²</span>
                  ) : null}
                </div>
              ) : null}
              {answers.length > 0 ? (
                <dl className="iga-lead__qa">
                  {answers.map((row, index) => (
                    <div key={`${row.label}-${index}`} className="iga-lead__qa-row">
                      <dt>{row.label}</dt>
                      <dd>{row.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : text(lead.answersSummary) ? (
                <p className="iga-lead__summary">{text(lead.answersSummary)}</p>
              ) : null}
              {text(lead.comment) ? (
                <div className="iga-lead__comment">
                  <span className="iga-lead__note">Комментарий клиента</span>
                  {text(lead.comment)}
                </div>
              ) : null}
              {kpAmount !== null ? (
                <p className="iga-lead__kp">
                  Сумма КП: <span className="iga-lead__num">{formatRub(kpAmount)}</span>
                </p>
              ) : null}
            </section>

            <Card id="lead-files" title="Файлы">
              {files.length > 0 ? (
                <div className="iga-lead__files">
                  {files.map((file) => {
                    const name = text(file.originalName) ?? text(file.filename) ?? "файл";
                    const size = formatFileSize(file.sizeBytes ?? file.filesize);
                    return (
                      <a
                        key={file.id}
                        className="iga-lead-file"
                        href={leadFileDownloadPath(file.id)}
                        download
                        aria-label={`Скачать ${name}`}
                      >
                        <span className="iga-lead-file__ext" aria-hidden="true">
                          {fileExtension(name) ?? "ФАЙЛ"}
                        </span>
                        <span className="iga-lead-file__body">
                          <span className="iga-lead-file__name">{name}</span>
                          {size ? <span className="iga-lead__note">{size}</span> : null}
                        </span>
                      </a>
                    );
                  })}
                </div>
              ) : (
                <Empty>Файлов нет</Empty>
              )}
            </Card>

            <Card id="lead-history" title="Комментарии и история">
              <LeadComments
                leadId={lead.id}
                comments={commentRows}
                currentUserId={String(user.id)}
              />
              <LeadHistory leadId={lead.id} />
            </Card>

            <section className="iga-card iga-lead__source" aria-label="Откуда пришёл клиент">
              <details>
                <summary>Откуда пришёл клиент</summary>
                {detailRows({ rows: sourceRows }) ?? <Empty>Нет данных</Empty>}
              </details>
            </section>
          </div>

          <div className="iga-lead__side">
            <Card id="lead-processing" title="Обработка">
              <ProcessingPanel {...processing} />
            </Card>

            <Card id="lead-repeats" title="Повторные обращения">
              {lead.isDuplicate ? (
                <p className="iga-lead__line">
                  <span className="iga-badge iga-badge--work">Повтор</span>
                  {originalId ? (
                    <a href={leadSummaryPath(originalId)}>Исходная заявка</a>
                  ) : (
                    "Исходная заявка удалена"
                  )}
                </p>
              ) : null}
              {repeats.totalDocs > 0 ? (
                <>
                  <p className="iga-lead__line">Есть повторы: {formatNumber(repeats.totalDocs)}</p>
                  <ul className="iga-lead__repeats">
                    {repeats.docs.map((repeat) => (
                      <li key={repeat.id}>
                        <a href={leadSummaryPath(repeat.id)} className="iga-lead__num">
                          {formatDateTime(repeat.createdAt)}
                        </a>
                        <span className="iga-lead__note">{formTypeLabel(repeat.formType)}</span>
                        <StatusBadge status={statusOf(repeat.status)} />
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <Empty>Других заявок с этим телефоном или e-mail нет</Empty>
              )}
            </Card>

            <Card id="lead-consent" title="Согласие на обработку ПДн">
              {consents.length > 0 ? (
                consents.map((consent) => (
                  <div key={consent.id} className="iga-lead__consent">
                    <p className="iga-lead__line">
                      <span className="iga-badge iga-badge--ok">Получено</span>
                      <span className="iga-lead__note iga-lead__num">
                        {[
                          consent.givenAt ? formatDateTime(consent.givenAt) : null,
                          text(consent.consentVersion)
                            ? `версия ${text(consent.consentVersion)}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </p>
                    {detailRows({
                      rows: [
                        { label: "Версия политики", value: text(consent.policyVersion) },
                        ...(isAdmin
                          ? [
                              { label: "IP", value: text(consent.ip) },
                              { label: "User-Agent", value: text(consent.userAgent) },
                            ]
                          : []),
                      ],
                    })}
                  </div>
                ))
              ) : (
                <Empty>Запись о согласии не найдена</Empty>
              )}
              {isAdmin ? <EraseButton leadId={lead.id} /> : null}
            </Card>
          </div>
        </div>
      </div>
    </Gutter>
  );
}
