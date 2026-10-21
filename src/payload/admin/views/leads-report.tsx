import type { CSSProperties, ReactNode } from "react";
import { redirect } from "next/navigation";
import { DefaultTemplate } from "@payloadcms/next/templates";
import { Gutter } from "@payloadcms/ui";
import { formatNumber } from "@/lib/domain/format";
import {
  createdAtWhere,
  formatDateKeyRu,
  PERIOD_PRESET_LABELS,
  PERIOD_PRESETS,
  resolvePeriod,
} from "@/lib/leads-admin/period";
import type { DateRange } from "@/lib/leads-admin/period";
import { buildLeadsReport, formatPercent, tallyLeads } from "@/lib/leads-admin/report";
import type { LeadsReport, ReportCounts, TallyLead } from "@/lib/leads-admin/report";
import { getRole } from "@/payload/access";
import { LEADS_EXPORT_API_PATH, LEADS_REPORT_PATH, statusBadgeColors } from "../leads/constants";
import { loadLeadStatuses } from "../leads/data";
import type { AdminViewServerProps, Payload, TypedUser } from "payload";

/**
 * «Отчёт по заявкам» (`/admin/leads-report/`, ТЗ §6.1 / §10): leads of a period by source and
 * status, the funnel «Новая → КП отправлено → Договор», flags and top UTM sources.
 *
 * The period's leads are read once (paged `find` with `select` and the viewer's access) and
 * tallied / aggregated by the pure `tallyLeads` + `buildLeadsReport`. Staff only.
 */

/** Leads read per page of the report scan (only five small columns are selected). */
const SCAN_PAGE_SIZE = 2000;
/** Above this many leads in the period the report shows a warning instead of partial numbers. */
const SCAN_LIMIT = 100_000;

const single = (value: string | string[] | undefined): string | null =>
  typeof value === "string" ? value : Array.isArray(value) ? (value[0] ?? null) : null;

type Collected = { counts: ReportCounts; truncated: boolean };

/**
 * One paged `find` over the period with `select` of the report fields and the viewer's access;
 * the tally is pure (`tallyLeads`). Pages are read sequentially, so the report never holds
 * more than one DB connection.
 */
async function collectCounts(
  payload: Payload,
  user: TypedUser,
  range: DateRange
): Promise<Collected> {
  const where = createdAtWhere(range);
  const leads: TallyLead[] = [];
  for (let page = 1; ; page += 1) {
    const result = await payload.find({
      collection: "leads",
      where,
      select: {
        formType: true,
        status: true,
        isDuplicate: true,
        flags: true,
        utm: { source: true },
      },
      sort: "createdAt",
      limit: SCAN_PAGE_SIZE,
      page,
      depth: 0,
      overrideAccess: false,
      user,
    });
    leads.push(...(result.docs as TallyLead[]));
    if (!result.hasNextPage) return { counts: tallyLeads(leads), truncated: false };
    if (leads.length >= SCAN_LIMIT) return { counts: tallyLeads(leads), truncated: true };
  }
}

// ---------------------------------------------------------------------------------------------
// Presentation
// ---------------------------------------------------------------------------------------------

const cardStyle: CSSProperties = {
  border: "1px solid var(--theme-elevation-150)",
  borderRadius: "var(--style-radius-m, 4px)",
  padding: "16px",
  background: "var(--theme-elevation-0)",
  minWidth: 0,
};
const numCell: CSSProperties = {
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
  padding: "6px 8px",
  whiteSpace: "nowrap",
};
const headCell: CSSProperties = {
  ...numCell,
  fontWeight: 500,
  color: "var(--theme-elevation-500)",
  borderBottom: "1px solid var(--theme-elevation-150)",
};
const labelCell: CSSProperties = { textAlign: "left", padding: "6px 8px 6px 0" };
const inputStyle: CSSProperties = {
  height: "32px",
  padding: "0 8px",
  border: "1px solid var(--theme-elevation-150)",
  borderRadius: "var(--style-radius-s, 4px)",
  background: "var(--theme-input-bg, var(--theme-elevation-0))",
  color: "var(--theme-elevation-800)",
};

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={cardStyle} aria-label={title}>
      <h2 style={{ margin: "0 0 12px", fontSize: "16px" }}>{title}</h2>
      {children}
    </section>
  );
}

function Bar({ share, color }: { share: number; color?: string | null | undefined }) {
  const width = Math.max(0, Math.min(100, share));
  return (
    <span
      aria-hidden="true"
      style={{
        display: "block",
        height: "8px",
        borderRadius: "4px",
        background: "var(--theme-elevation-100)",
        overflow: "hidden",
      }}
    >
      <span
        style={{
          display: "block",
          height: "100%",
          width: `${width}%`,
          background: color ? statusBadgeColors(color).color : "var(--theme-elevation-500)",
        }}
      />
    </span>
  );
}

function ShareTable({
  rows,
  empty,
}: {
  rows: {
    key: string;
    label: string;
    count: number;
    share: number;
    color?: string | null | undefined;
  }[];
  empty: string;
}) {
  if (rows.length === 0) return <p style={{ color: "var(--theme-elevation-500)" }}>{empty}</p>;
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key} data-row={row.key}>
            <th scope="row" style={{ ...labelCell, fontWeight: 400, width: "40%" }}>
              {row.label}
            </th>
            <td style={{ width: "35%", padding: "6px 8px" }}>
              <Bar share={row.share} color={row.color} />
            </td>
            <td style={numCell} data-count>
              {formatNumber(row.count)}
            </td>
            <td style={{ ...numCell, color: "var(--theme-elevation-500)" }}>
              {formatPercent(row.share)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Tiles({ report }: { report: LeadsReport }) {
  const tiles = [
    ["total", "Всего заявок", report.tiles.total],
    ["new", "Новые", report.tiles.newLeads],
    ["contracts", "Договор", report.tiles.contracts],
    ["refusals", "Отказ", report.tiles.refusals],
    ["duplicates", "Дубли", report.tiles.duplicates],
  ] as const;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: "12px",
      }}
    >
      {tiles.map(([key, label, value]) => (
        <div key={key} style={cardStyle} data-tile={key}>
          <div style={{ color: "var(--theme-elevation-500)", fontSize: "13px" }}>{label}</div>
          <div style={{ fontSize: "28px", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
            {formatNumber(value)}
          </div>
        </div>
      ))}
    </div>
  );
}

function SourcesTable({ report }: { report: LeadsReport }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}
        data-report="by-source"
      >
        <thead>
          <tr>
            <th scope="col" style={{ ...headCell, textAlign: "left" }}>
              Источник
            </th>
            {report.columns.map((column) => (
              <th key={column.key} scope="col" style={headCell} data-status={column.key}>
                {column.label}
              </th>
            ))}
            <th scope="col" style={headCell}>
              Всего
            </th>
            <th scope="col" style={headCell}>
              Доля
            </th>
          </tr>
        </thead>
        <tbody>
          {report.bySource.map((row) => (
            <tr key={row.formType} data-source={row.formType}>
              <th scope="row" style={{ ...labelCell, fontWeight: 400 }}>
                {row.label}
              </th>
              {row.cells.map((value, index) => (
                <td key={report.columns[index]?.key ?? index} style={numCell}>
                  {formatNumber(value)}
                </td>
              ))}
              <td style={{ ...numCell, fontWeight: 600 }} data-total>
                {formatNumber(row.count)}
              </td>
              <td style={{ ...numCell, color: "var(--theme-elevation-500)" }}>
                {formatPercent(row.share)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" style={{ ...labelCell, fontWeight: 600 }}>
              Итого
            </th>
            {report.columnTotals.map((value, index) => (
              <td key={report.columns[index]?.key ?? index} style={{ ...numCell, fontWeight: 600 }}>
                {formatNumber(value)}
              </td>
            ))}
            <td style={{ ...numCell, fontWeight: 600 }} data-grand-total>
              {formatNumber(report.total)}
            </td>
            <td style={numCell}>{report.total > 0 ? formatPercent(100) : formatPercent(0)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function PeriodForm({
  preset,
  range,
  exportHref,
}: {
  preset: string;
  range: DateRange;
  exportHref: string;
}) {
  return (
    <form
      method="get"
      action={LEADS_REPORT_PATH}
      style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "flex-end" }}
    >
      <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px" }}>
        Период
        <select name="period" defaultValue={preset} style={inputStyle}>
          {PERIOD_PRESETS.map((value) => (
            <option key={value} value={value}>
              {PERIOD_PRESET_LABELS[value]}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px" }}>
        С (для «Свой период»)
        <input type="date" name="from" defaultValue={range.fromKey} style={inputStyle} />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px" }}>
        По
        <input type="date" name="to" defaultValue={range.toKey} style={inputStyle} />
      </label>
      <button
        type="submit"
        className="btn btn--style-primary btn--size-small"
        style={{ margin: 0 }}
      >
        Показать
      </button>
      <a
        href={exportHref}
        className="btn btn--style-secondary btn--size-small"
        style={{ margin: 0 }}
        data-export-link
      >
        Выгрузить эти заявки
      </a>
    </form>
  );
}

export async function LeadsReportView({
  initPageResult,
  params,
  searchParams,
}: AdminViewServerProps) {
  const { req, permissions, visibleEntities, locale } = initPageResult;
  const user = req.user as TypedUser | null;
  if (!user) redirect(`/admin/login/?redirect=${encodeURIComponent(LEADS_REPORT_PATH)}`);

  const template = (children: ReactNode) => (
    <DefaultTemplate
      i18n={req.i18n}
      payload={req.payload}
      permissions={permissions}
      user={user}
      visibleEntities={visibleEntities}
      {...(locale ? { locale } : {})}
      {...(params ? { params } : {})}
      {...(searchParams ? { searchParams } : {})}
    >
      <Gutter>
        <h1 style={{ margin: "24px 0 16px" }}>Отчёт по заявкам</h1>
        {children}
      </Gutter>
    </DefaultTemplate>
  );

  if (getRole(user) === null) return template(<p>Недостаточно прав для просмотра отчёта.</p>);

  const resolved = resolvePeriod({
    period: single(searchParams?.period),
    from: single(searchParams?.from),
    to: single(searchParams?.to),
  });
  const period = resolved.ok ? resolved : resolvePeriod({});
  if (!period.ok) return template(<p>Не удалось определить период.</p>);

  const statuses = await loadLeadStatuses(req.payload);
  const { counts, truncated } = await collectCounts(req.payload, user, period.range);
  const report = buildLeadsReport(statuses, counts);
  const exportHref = `${LEADS_EXPORT_API_PATH}?${new URLSearchParams({
    format: "xlsx",
    from: period.range.fromKey,
    to: period.range.toKey,
  }).toString()}`;

  return template(
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", paddingBottom: "48px" }}>
      <PeriodForm preset={period.preset} range={period.range} exportHref={exportHref} />
      {!resolved.ok ? (
        <p role="alert" style={{ color: "var(--theme-error-500)", margin: 0 }}>
          {resolved.error}. Показаны последние 30 дней.
        </p>
      ) : null}
      {truncated ? (
        <p role="alert" style={{ color: "var(--theme-error-500)", margin: 0 }}>
          В периоде больше {formatNumber(SCAN_LIMIT)} заявок: числа неполные, сузьте период.
        </p>
      ) : null}
      <p style={{ margin: 0, color: "var(--theme-elevation-500)" }} data-period>
        {formatDateKeyRu(period.range.fromKey)} — {formatDateKeyRu(period.range.toKey)}
      </p>
      <Tiles report={report} />
      <Card title="По источникам">
        <SourcesTable report={report} />
      </Card>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))",
          gap: "16px",
        }}
      >
        <Card title="По статусам">
          <ShareTable rows={report.byStatus} empty="Заявок нет" />
        </Card>
        <Card title="Воронка">
          <ShareTable rows={report.funnel} empty="Статусы не настроены" />
          <p style={{ margin: "8px 0 0", fontSize: "12px", color: "var(--theme-elevation-500)" }}>
            По текущему статусу заявок; доля — от всех заявок периода.
          </p>
        </Card>
        <Card title="Флаги">
          <ShareTable
            rows={report.flags.map((flag) => ({ ...flag, key: flag.flag }))}
            empty="Флагов нет"
          />
        </Card>
        <Card title="UTM source — топ-10">
          <ShareTable
            rows={report.utm.map((entry) => ({ ...entry, key: entry.source, label: entry.source }))}
            empty="Заявок с UTM-метками нет"
          />
        </Card>
      </div>
    </div>
  );
}
