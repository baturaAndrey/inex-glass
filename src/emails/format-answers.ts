import {
  COMPANY_TZ,
  formatDateRu,
  formatNumber,
  formatSizeMm,
  NBSP,
  QUIZ_CUSTOM_THICKNESS,
  QUIZ_CUSTOM_THICKNESS_LABEL,
  QUIZ_DECOR,
  QUIZ_EDGES,
  QUIZ_FLAG_LABELS,
  QUIZ_KINDS,
  QUIZ_PACKING,
  QUIZ_STAMP,
  QUIZ_TYPES,
  TINT_COLORS,
  tryDateKey,
} from "@/lib/domain";
import type { QuizFlag } from "@/lib/domain";
import {
  LEAD_FORM_TYPES,
  LEAD_PRODUCT_TYPES,
  LEAD_ROLES,
} from "@/payload/collections/crm/constants";
import type { Lead, LeadFile } from "@/payload-types";

/**
 * Human-readable lead data for the manager e-mails (pure; no Payload calls).
 *
 * `answers` is stored «as is» (quiz answers or the raw form payload), so every reader here is
 * defensive: unknown or malformed values are skipped, never thrown on. Only known keys are
 * rendered, which also keeps service fields (upload tokens, consent) out of the e-mail.
 */

export type Row = { label: string; value: string };
export type LinkRow = Row & { href?: string };

export type LeadFileItem = { name: string; size: string | null; url: string };

export type LeadEmailData = {
  id: string;
  subjectTarget: string;
  sourceLabel: string;
  entryPage: string | null;
  pageUrl: string | null;
  fields: LinkRow[];
  flags: string[];
  isDuplicate: boolean;
  answers: Row[];
  /** Used when `answers` gives no rows (e.g. the summary was precomputed by intake). */
  answersSummary: string | null;
  files: LeadFileItem[];
  utm: Row[];
  adminUrl: string;
};

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const text = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) return formatNumber(value);
  return null;
};

const positive = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;

function labelOf(options: readonly { id: string; label: string }[], id: unknown): string | null {
  if (typeof id !== "string") return null;
  return options.find((option) => option.id === id)?.label ?? null;
}

function optionLabel(options: readonly { value: string; label: string }[], value: unknown) {
  if (typeof value !== "string") return null;
  return options.find((option) => option.value === value)?.label ?? null;
}

function labelsOf(options: readonly { id: string; label: string }[], ids: unknown): string | null {
  if (!Array.isArray(ids)) return null;
  const labels = ids.map((id) => labelOf(options, id)).filter((l): l is string => l !== null);
  return labels.length > 0 ? labels.join(", ") : null;
}

const mm = (n: number) => `${formatNumber(n)}${NBSP}мм`;

/** «10 мм», «Подберите под нагрузку (комментарий)» or the triplex formula «5 + 5 мм, плёнка 0,76 мм». */
function thicknessText(answers: UnknownRecord): string | null {
  const triplex = answers.triplex;
  if (answers.type === "triplex" && isRecord(triplex)) {
    const g1 = positive(triplex.glass1);
    const g2 = positive(triplex.glass2);
    const film = positive(triplex.film);
    if (g1 !== null && g2 !== null) {
      const glasses = `${formatNumber(g1)} + ${formatNumber(g2)}${NBSP}мм`;
      return film === null ? glasses : `${glasses}, плёнка ${mm(film)}`;
    }
  }
  if (answers.thickness === QUIZ_CUSTOM_THICKNESS) {
    const note = text(answers.customNote);
    return note ? `${QUIZ_CUSTOM_THICKNESS_LABEL} (${note})` : QUIZ_CUSTOM_THICKNESS_LABEL;
  }
  const t = positive(answers.thickness);
  return t === null ? null : mm(t);
}

function kindText(answers: UnknownRecord): string | null {
  const kind = labelOf(QUIZ_KINDS, answers.kind);
  if (kind === null) return null;
  const ral = text(answers.ral);
  const radius = positive(answers.bendRadius);
  const extra = [
    labelOf(TINT_COLORS, answers.tint),
    ral === null ? null : `RAL ${ral}`,
    radius === null ? null : `радиус ${mm(radius)}`,
  ].filter((part): part is string => part !== null);
  return extra.length > 0 ? `${kind} (${extra.join(", ")})` : kind;
}

function sizesText(answers: UnknownRecord): string | null {
  const parts: string[] = [];
  const area = positive(answers.area);
  if (area !== null) parts.push(`${formatNumber(area)}${NBSP}м²`);
  const positions = positive(answers.positions);
  if (positions !== null) parts.push(`${formatNumber(positions)} поз.`);
  const w = positive(answers.maxW);
  const h = positive(answers.maxH);
  if (w !== null && h !== null) parts.push(`макс. ${formatSizeMm(w, h)}`);
  return parts.length > 0 ? parts.join(", ") : null;
}

function holesText(holes: unknown): string | null {
  if (!isRecord(holes) || holes.has !== true) return null;
  const parts = ["отверстия"];
  const count = positive(holes.count);
  if (count !== null) parts.push(`${formatNumber(count)} шт.`);
  if (Array.isArray(holes.diameters)) {
    const diameters = holes.diameters.map(positive).filter((d): d is number => d !== null);
    if (diameters.length > 0)
      parts.push(`⌀ ${diameters.map((d) => formatNumber(d)).join(", ")}${NBSP}мм`);
  }
  return parts.join(" ");
}

function processingText(answers: UnknownRecord): string | null {
  const parts = [
    labelsOf(QUIZ_EDGES, answers.edges) ? `кромка: ${labelsOf(QUIZ_EDGES, answers.edges)}` : null,
    holesText(answers.holes),
    answers.holeInnerEdge === true ? "обработка кромки отверстий" : null,
    answers.cutouts === true ? "вырезы" : null,
    labelsOf(QUIZ_DECOR, answers.decor) ? `декор: ${labelsOf(QUIZ_DECOR, answers.decor)}` : null,
    labelOf(QUIZ_STAMP, answers.stamp) ? `клеймо ${labelOf(QUIZ_STAMP, answers.stamp)}` : null,
    text(answers.stampNote),
  ].filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join("; ") : null;
}

function deliveryText(answers: UnknownRecord): string | null {
  const city = text(answers.cityOther) ?? text(answers.city);
  const packing = labelsOf(QUIZ_PACKING, answers.packing);
  const parts = [city, packing ? `упаковка: ${packing}` : null, text(answers.packingNote)].filter(
    (part): part is string => part !== null
  );
  return parts.length > 0 ? parts.join("; ") : null;
}

function dateText(value: unknown): string | null {
  const key = typeof value === "string" ? tryDateKey(value) : null;
  return key === null ? null : formatDateRu(key);
}

/** Extra fields of the non-quiz forms (sample, load, drawing parameters). */
function formRows(answers: UnknownRecord): Row[] {
  const rows: Row[] = [];
  const add = (label: string, value: string | null) => {
    if (value) rows.push({ label, value });
  };
  add("Вид стекла", text(answers.glassKind));
  add("Адрес доставки образца", text(answers.address));
  add("Задача", text(answers.description));
  add("Размеры", text(answers.sizes));
  add("Крепление", text(answers.mounting));
  if (isRecord(answers.params)) {
    const params = Object.entries(answers.params)
      .map(([key, value]) => {
        const shown = typeof value === "boolean" ? (value ? "да" : "нет") : text(value);
        return shown === null ? null : `${key}: ${shown}`;
      })
      .filter((entry): entry is string => entry !== null);
    add("Параметры страницы", params.length > 0 ? params.join(", ") : null);
  }
  return rows;
}

/** Quiz summary in step order: type, thickness, kind, sizes, processing, date, delivery. */
export function summarizeAnswers(answers: unknown): Row[] {
  if (!isRecord(answers)) return [];
  const rows: Row[] = [];
  const add = (label: string, value: string | null) => {
    if (value) rows.push({ label, value });
  };
  add("Тип", labelOf(QUIZ_TYPES, answers.type));
  add(answers.type === "triplex" ? "Формула триплекса" : "Толщина", thicknessText(answers));
  add("Вид", kindText(answers));
  add("Объём и размеры", sizesText(answers));
  add("Обработка", processingText(answers));
  add("Желаемая дата", dateText(answers.desiredDate));
  add("Доставка", deliveryText(answers));
  add("Документы", answers.needDocs === true ? "нужны" : null);
  add("Чертёж", answers.noFile === true ? "нет чертежа" : null);
  return [...rows, ...formRows(answers)];
}

/** Russian labels of `leads.flags` (unknown ids are skipped). */
export function flagLabels(flags: readonly string[] | null | undefined): string[] {
  return (flags ?? [])
    .map((flag) => QUIZ_FLAG_LABELS[flag as QuizFlag] as string | undefined)
    .filter((label): label is string => label !== undefined);
}

const BYTES_IN_KB = 1024;

/** «512 КБ», «12,4 МБ». */
export function formatFileSize(bytes: number | null | undefined): string | null {
  if (typeof bytes !== "number" || !Number.isFinite(bytes) || bytes < 0) return null;
  if (bytes < BYTES_IN_KB * BYTES_IN_KB) {
    return `${formatNumber(Math.max(1, Math.round(bytes / BYTES_IN_KB)))}${NBSP}КБ`;
  }
  return `${formatNumber(bytes / BYTES_IN_KB / BYTES_IN_KB, { decimals: 1, trim: true })}${NBSP}МБ`;
}

const dateTimeFormatter = new Intl.DateTimeFormat("ru-RU", {
  timeZone: COMPANY_TZ,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** «20.10.2026, 15:42» in the company time zone. */
export function formatDateTimeRu(value: string | Date): string | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : dateTimeFormatter.format(date);
}

const absoluteUrl = (path: string, siteUrl: string) => new URL(path, siteUrl).toString();

/** `tel:` link from a stored phone (`+7XXXXXXXXXX`) or from any human format. */
export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

/** «Компания» or, without it, the contact name: the tail of the e-mail subjects. */
export function leadSubjectTarget(lead: Pick<Lead, "company" | "name">): string {
  return text(lead.company) ?? text(lead.name) ?? "без имени";
}

export function leadSourceLabel(lead: Pick<Lead, "sourceLabel" | "formType">): string {
  return text(lead.sourceLabel) ?? optionLabel(LEAD_FORM_TYPES, lead.formType) ?? "Заявка с сайта";
}

function fileItems(files: Lead["files"], siteUrl: string): LeadFileItem[] {
  return (files ?? [])
    .filter((file): file is LeadFile => typeof file === "object" && file !== null)
    .map((file) => ({
      name: text(file.originalName) ?? text(file.filename) ?? "файл",
      size: formatFileSize(file.sizeBytes ?? file.filesize),
      // Protected route of task 17: works after signing in to the admin.
      url: absoluteUrl(`/api/lead-files/${encodeURIComponent(file.id)}/download/`, siteUrl),
    }));
}

/** Keys stored without the `utm_` prefix that keep their own name (click ids). */
const UTM_PREFIXED: ReadonlySet<string> = new Set([
  "source",
  "medium",
  "campaign",
  "term",
  "content",
]);

function utmRows(utm: Lead["utm"]): Row[] {
  if (!utm) return [];
  const rows: Row[] = [];
  for (const [key, raw] of Object.entries(utm)) {
    const value = text(raw);
    if (value !== null) rows.push({ label: UTM_PREFIXED.has(key) ? `utm_${key}` : key, value });
  }
  return rows;
}

/**
 * Everything the lead e-mails show. `lead` must be loaded with `depth >= 1` for file names; with
 * `depth: 0` files are simply omitted.
 */
export function buildLeadEmailData(lead: Lead, siteUrl: string): LeadEmailData {
  const fields: LinkRow[] = [];
  const add = (label: string, value: string | null, href?: string) => {
    if (value) fields.push(href ? { label, value, href } : { label, value });
  };
  add("Дата", formatDateTimeRu(lead.createdAt));
  add("Компания", text(lead.company));
  add("ИНН", text(lead.inn));
  add("Имя", text(lead.name));
  const phone = text(lead.phone);
  add("Телефон", phone, phone ? telHref(phone) : undefined);
  const email = text(lead.email);
  add("E-mail", email, email ? `mailto:${email}` : undefined);
  add("Город", text(lead.city));
  const area = positive(lead.area);
  add("Площадь", area === null ? null : `${formatNumber(area)}${NBSP}м²`);
  add("Тип изделия", optionLabel(LEAD_PRODUCT_TYPES, lead.productType));
  add("Роль", optionLabel(LEAD_ROLES, lead.role));
  add("Комментарий", text(lead.comment));

  return {
    id: lead.id,
    subjectTarget: leadSubjectTarget(lead),
    sourceLabel: leadSourceLabel(lead),
    entryPage: text(lead.entryPage),
    pageUrl: text(lead.pageUrl),
    fields,
    flags: flagLabels(lead.flags),
    isDuplicate: lead.isDuplicate === true,
    answers: summarizeAnswers(lead.answers),
    answersSummary: text(lead.answersSummary),
    files: fileItems(lead.files, siteUrl),
    utm: utmRows(lead.utm),
    adminUrl: absoluteUrl(`/admin/collections/leads/${encodeURIComponent(lead.id)}`, siteUrl),
  };
}
