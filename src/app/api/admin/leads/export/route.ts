import ExcelJS from "exceljs";
import { jsonError, NO_STORE_HEADERS, requireStaff } from "@/lib/leads-admin/auth";
import { buildCsv } from "@/lib/leads-admin/csv";
import {
  EXPORT_COLUMN_INDEX,
  EXPORT_COLUMNS,
  EXPORT_HEADERS,
  exportFileName,
  toCsvValues,
  toExportRow,
} from "@/lib/leads-admin/export-rows";
import type { ExportLead, ExportLookups, ExportValue } from "@/lib/leads-admin/export-rows";
import { createdAtWhere, resolvePeriod, toWallClockDate } from "@/lib/leads-admin/period";
import type { DateRange } from "@/lib/leads-admin/period";
import { isLeadFormType, LEAD_EXPORT_MAX_ROWS } from "@/payload/admin/leads/constants";
import type { Payload, TypedUser, Where } from "payload";

/**
 * `GET /api/admin/leads/export/` — leads of a period as CSV (default) or XLSX (ТЗ §6.1).
 *
 * Query: `format=csv|xlsx`, `from`/`to` (`YYYY-MM-DD`, inclusive, company time zone; none →
 * last 30 days), `period` (report presets), `status` (id), `source` (formType), `assignee`
 * (id or `me`), `duplicates=1`. Bad values → 400 `{ error }`.
 *
 * Staff only (401/403). Leads are read with the caller's access (`overrideAccess: false`), in
 * pages of 500 sorted by `createdAt`; more than `LEAD_EXPORT_MAX_ROWS` → 413. Attachments are
 * not exported, only their number. The server log gets one line without personal data.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 500;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FORMATS = ["csv", "xlsx"] as const;
type ExportFormat = (typeof FORMATS)[number];

const CONTENT_TYPES: Readonly<Record<ExportFormat, string>> = {
  csv: "text/csv; charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

const SHEET_NAME = "Заявки";
const XLSX_DATE_FORMAT = "dd.mm.yyyy hh:mm";
const XLSX_TEXT_FORMAT = "@";

type ExportQuery = { format: ExportFormat; range: DateRange; where: Where };

/** Parses and validates the query; returns the error message for a 400 otherwise. */
function parseQuery(params: URLSearchParams, user: TypedUser): ExportQuery | string {
  const format = (params.get("format")?.trim() || "csv") as ExportFormat;
  if (!FORMATS.includes(format)) return "Неизвестный формат: допустимы csv и xlsx";

  const period = resolvePeriod({
    period: params.get("period"),
    from: params.get("from"),
    to: params.get("to"),
  });
  if (!period.ok) return period.error;

  const and: Where[] = [createdAtWhere(period.range)];

  const status = params.get("status")?.trim();
  if (status) {
    if (!UUID.test(status)) return "Некорректный статус";
    and.push({ status: { equals: status } });
  }
  const source = params.get("source")?.trim();
  if (source) {
    if (!isLeadFormType(source)) return "Некорректный источник";
    and.push({ formType: { equals: source } });
  }
  const assignee = params.get("assignee")?.trim();
  if (assignee) {
    const id = assignee === "me" ? String(user.id) : assignee;
    if (!UUID.test(id)) return "Некорректный ответственный";
    and.push({ assignee: { equals: id } });
  }
  const duplicates = params.get("duplicates")?.trim();
  if (duplicates) {
    if (duplicates !== "1") return "Параметр duplicates допускает только 1";
    and.push({ isDuplicate: { equals: true } });
  }
  return { format, range: period.range, where: { and } };
}

/** Status and user names for the rows (users: names only, staff may not read each other). */
async function loadLookups(payload: Payload, user: TypedUser): Promise<ExportLookups> {
  const [statuses, users] = await Promise.all([
    payload.find({
      collection: "lead-statuses",
      depth: 0,
      pagination: false,
      overrideAccess: false,
      user,
      select: { name: true },
    }),
    payload.find({
      collection: "users",
      depth: 0,
      pagination: false,
      overrideAccess: true,
      select: { name: true },
    }),
  ]);
  return {
    statusNames: new Map(statuses.docs.map((doc) => [String(doc.id), doc.name])),
    userNames: new Map(
      users.docs.map((doc) => [String(doc.id), doc.name?.trim() || String(doc.id)])
    ),
  };
}

async function loadRows(
  payload: Payload,
  user: TypedUser,
  where: Where,
  lookups: ExportLookups
): Promise<ExportValue[][]> {
  const rows: ExportValue[][] = [];
  for (let page = 1; ; page += 1) {
    const result = await payload.find({
      collection: "leads",
      where,
      sort: "createdAt",
      limit: PAGE_SIZE,
      page,
      depth: 0,
      overrideAccess: false,
      user,
    });
    for (const lead of result.docs) rows.push(toExportRow(lead as ExportLead, lookups));
    if (!result.hasNextPage) return rows;
  }
}

async function buildXlsx(rows: readonly ExportValue[][]): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(SHEET_NAME, {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  sheet.columns = EXPORT_COLUMNS.map((column) => ({
    header: column.header,
    width: column.width,
  }));
  sheet.getRow(1).font = { bold: true };

  for (const row of rows) {
    sheet.addRow(
      row.map((value, index) =>
        value instanceof Date && index === EXPORT_COLUMN_INDEX.createdAt
          ? toWallClockDate(value)
          : value
      )
    );
  }
  sheet.getColumn(EXPORT_COLUMN_INDEX.createdAt + 1).numFmt = XLSX_DATE_FORMAT;
  // Phones and INNs stay text: Excel would drop the «+» or turn an INN into 7,45E+09.
  sheet.getColumn(EXPORT_COLUMN_INDEX.phone + 1).numFmt = XLSX_TEXT_FORMAT;
  sheet.getColumn(EXPORT_COLUMN_INDEX.inn + 1).numFmt = XLSX_TEXT_FORMAT;
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: EXPORT_COLUMNS.length },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer as ArrayBuffer);
}

function fileResponse(body: string | Uint8Array, format: ExportFormat, range: DateRange) {
  const name = exportFileName(range.fromKey, range.toKey, format);
  return new Response(body as BodyInit, {
    status: 200,
    headers: {
      ...NO_STORE_HEADERS,
      "Content-Type": CONTENT_TYPES[format],
      "Content-Disposition": `attachment; filename="${name}"`,
    },
  });
}

export async function GET(request: Request): Promise<Response> {
  try {
    const auth = await requireStaff(request);
    if (!auth.ok) return auth.response;
    const { payload, user } = auth;

    const query = parseQuery(new URL(request.url).searchParams, user);
    if (typeof query === "string") return jsonError(400, query);

    const { totalDocs } = await payload.count({
      collection: "leads",
      where: query.where,
      overrideAccess: false,
      user,
    });
    if (totalDocs > LEAD_EXPORT_MAX_ROWS) {
      return jsonError(413, "Слишком много строк, сузьте период");
    }

    const lookups = await loadLookups(payload, user);
    const rows = await loadRows(payload, user, query.where, lookups);
    payload.logger.info({
      event: "leads-export",
      user: String(user.id),
      format: query.format,
      from: query.range.fromKey,
      to: query.range.toKey,
      rows: rows.length,
    });

    if (query.format === "xlsx") {
      return fileResponse(await buildXlsx(rows), "xlsx", query.range);
    }
    return fileResponse(buildCsv(EXPORT_HEADERS, rows.map(toCsvValues)), "csv", query.range);
  } catch (error) {
    console.error("[leads/export] failed:", error instanceof Error ? error.name : "unknown");
    return jsonError(500, "Не удалось сформировать выгрузку");
  }
}
