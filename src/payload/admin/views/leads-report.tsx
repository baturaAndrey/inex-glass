import type { CSSProperties, ReactNode } from "react";
import { redirect } from "next/navigation";
import { DefaultTemplate } from "@payloadcms/next/templates";
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
// Presentation: classes `.iga-report*` in `src/app/(payload)/styles/_screens.scss`; the only
// inline values are a bar width and a status colour (`--iga-badge-color`).
// ---------------------------------------------------------------------------------------------

/** Presets of the period switch; «Свой период» is the date form next to it. */
const SWITCH_PRESETS = PERIOD_PRESETS.filter((preset) => preset !== "custom");

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="iga-card iga-report__card" aria-label={title}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Bar({ share, color }: { share: number; color?: string | null | undefined }) {
  const width = Math.max(0, Math.min(100, share));
  const style: CSSProperties & { "--iga-badge-color"?: string } = { width: `${width}%` };
  if (color) style["--iga-badge-color"] = statusBadgeColors(color).color;
  return (
    <span aria-hidden="true" className="iga-bar iga-report__bar">
      <span style={style} />
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
  if (rows.length === 0) return <p className="iga-muted iga-report__empty">{empty}</p>;
  return (
    <table className="iga-report__table iga-report__table--share">
      <tbody>
        {rows.map((row) => (
          <tr key={row.key} data-row={row.key}>
            <th scope="row">{row.label}</th>
            <td className="iga-report__bar-cell">
              <Bar share={row.share} color={row.color} />
            </td>
            <td className="iga-report__num" data-count>
              {formatNumber(row.count)}
            </td>
            <td className="iga-report__num iga-report__share">{formatPercent(row.share)}</td>
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
  // e2e reads the value as the second `div` of a tile: keep label + value as two divs.
  return (
    <div className="iga-report__tiles">
      {tiles.map(([key, label, value]) => (
        <div key={key} className="iga-card iga-report__tile" data-tile={key}>
          <div className="iga-report__tile-label">{label}</div>
          <div className="iga-report__tile-value">{formatNumber(value)}</div>
        </div>
      ))}
    </div>
  );
}

function SourcesTable({ report }: { report: LeadsReport }) {
  return (
    <div className="iga-report__scroll">
      <table className="iga-report__table" data-report="by-source">
        <thead>
          <tr>
            <th scope="col">Источник</th>
            {report.columns.map((column) => (
              <th key={column.key} scope="col" className="iga-report__num" data-status={column.key}>
                {column.label}
              </th>
            ))}
            <th scope="col" className="iga-report__num">
              Всего
            </th>
            <th scope="col" className="iga-report__num">
              Доля
            </th>
          </tr>
        </thead>
        <tbody>
          {report.bySource.map((row) => (
            <tr key={row.formType} data-source={row.formType}>
              <th scope="row">{row.label}</th>
              {row.cells.map((value, index) => (
                <td key={report.columns[index]?.key ?? index} className="iga-report__num">
                  {formatNumber(value)}
                </td>
              ))}
              <td className="iga-report__num iga-report__strong" data-total>
                {formatNumber(row.count)}
              </td>
              <td className="iga-report__num iga-report__share">{formatPercent(row.share)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Итого</th>
            {report.columnTotals.map((value, index) => (
              <td key={report.columns[index]?.key ?? index} className="iga-report__num">
                {formatNumber(value)}
              </td>
            ))}
            <td className="iga-report__num" data-grand-total>
              {formatNumber(report.total)}
            </td>
            <td className="iga-report__num">
              {report.total > 0 ? formatPercent(100) : formatPercent(0)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/** Link of a preset of the period switch (plain GET, like the dashboard period switch). */
function presetHref(preset: string): string {
  return `${LEADS_REPORT_PATH}?${new URLSearchParams({ period: preset }).toString()}`;
}

/** Period: a segment of presets (links) and the «Свой период» date form (GET, same query). */
function PeriodForm({ preset, range }: { preset: string; range: DateRange }) {
  return (
    <div className="iga-report__period">
      <nav className="iga-seg iga-report__seg" aria-label="Период">
        {SWITCH_PRESETS.map((value) => (
          <a
            key={value}
            href={presetHref(value)}
            aria-current={value === preset ? "page" : undefined}
          >
            {PERIOD_PRESET_LABELS[value]}
          </a>
        ))}
      </nav>
      <form
        method="get"
        action={LEADS_REPORT_PATH}
        className="iga-report__dates"
        aria-label={PERIOD_PRESET_LABELS.custom}
      >
        <input type="hidden" name="period" value="custom" />
        <label className="iga-field">
          <span className="iga-field__label">С</span>
          <input type="date" name="from" defaultValue={range.fromKey} className="iga-input" />
        </label>
        <label className="iga-field">
          <span className="iga-field__label">По</span>
          <input type="date" name="to" defaultValue={range.toKey} className="iga-input" />
        </label>
        <button type="submit" className="iga-btn iga-btn--secondary">
          Показать
        </button>
      </form>
    </div>
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

  const template = (children: ReactNode, actions?: ReactNode) => (
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
      <div className="iga-report-page">
        <header className="iga-page-head iga-report-head">
          <div>
            <span className="iga-page-head__eyebrow">Работа</span>
            <h1 className="iga-page-head__title">Отчёт по заявкам</h1>
          </div>
          {actions ? <div className="iga-page-head__actions">{actions}</div> : null}
        </header>
        <div className="iga-report">{children}</div>
      </div>
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
    <>
      <PeriodForm preset={period.preset} range={period.range} />
      {!resolved.ok ? (
        <p role="alert" className="iga-report__alert">
          {resolved.error}. Показаны последние 30 дней.
        </p>
      ) : null}
      {truncated ? (
        <p role="alert" className="iga-report__alert">
          В периоде больше {formatNumber(SCAN_LIMIT)} заявок: числа неполные, сузьте период.
        </p>
      ) : null}
      <p className="iga-muted iga-report__range" data-period>
        {formatDateKeyRu(period.range.fromKey)} — {formatDateKeyRu(period.range.toKey)}
      </p>
      <Tiles report={report} />
      <Card title="По источникам">
        <SourcesTable report={report} />
      </Card>
      <div className="iga-report__grid">
        <Card title="По статусам">
          <ShareTable rows={report.byStatus} empty="Заявок нет" />
        </Card>
        <Card title="Воронка">
          <ShareTable rows={report.funnel} empty="Статусы не настроены" />
          <p className="iga-muted iga-report__note">
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
    </>,
    <a href={exportHref} className="iga-btn iga-btn--secondary" data-export-link>
      Выгрузить эти заявки
    </a>
  );
}
