/**
 * Report helpers shared by the audit scripts (task 40): findings, Markdown tables, file output.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

export type Severity = "error" | "warn" | "info";

export interface Finding {
  severity: Severity;
  /** Rule / check id (`stop-words`, `h1`, `jsonld`…). */
  rule: string;
  /** URL path or document reference (`pages/<id> /path/`). */
  target: string;
  /** Field / place: `main`, `title`, `layout[2].text`… */
  field: string;
  message: string;
  /** Text fragment (±40 characters around the match) or «expected / actual». */
  fragment?: string;
}

export const SEVERITY_ORDER: Record<Severity, number> = { error: 0, warn: 1, info: 2 };

export function countBySeverity(findings: readonly Finding[]): Record<Severity, number> {
  const counts: Record<Severity, number> = { error: 0, warn: 0, info: 0 };
  for (const finding of findings) counts[finding.severity] += 1;
  return counts;
}

export function sortFindings(findings: readonly Finding[]): Finding[] {
  return [...findings].sort(
    (a, b) =>
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
      a.target.localeCompare(b.target) ||
      a.rule.localeCompare(b.rule)
  );
}

/** Escapes a value for a Markdown table cell. */
export function cell(value: unknown): string {
  const raw = value === null || value === undefined ? "" : String(value);
  return raw.replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim();
}

export function mdTable(
  headers: readonly string[],
  rows: ReadonlyArray<readonly unknown[]>
): string {
  if (rows.length === 0) return "_нет_\n";
  const head = `| ${headers.map(cell).join(" | ")} |`;
  const sep = `|${headers.map(() => "---").join("|")}|`;
  const body = rows.map((row) => `| ${row.map(cell).join(" | ")} |`);
  return [head, sep, ...body].join("\n") + "\n";
}

/** ±`radius` characters around a match, single-line. */
export function fragmentAround(text: string, index: number, length: number, radius = 40): string {
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + length + radius);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";
  return `${prefix}${text.slice(start, end)}${suffix}`.replace(/\s+/g, " ");
}

export function writeText(file: string, content: string): void {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content.endsWith("\n") ? content : `${content}\n`, "utf8");
}

export function writeJson(file: string, value: unknown): void {
  writeText(file, JSON.stringify(value, null, 2));
}

/** «21.10.2026 14:05» in the site's time zone (reports are read by the Russian team). */
export function reportTimestamp(date = new Date()): string {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Asia/Yekaterinburg",
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function findingsTable(findings: readonly Finding[]): string {
  return mdTable(
    ["Severity", "URL / документ", "Поле", "Правило", "Сообщение", "Фрагмент"],
    sortFindings(findings).map((f) => [
      f.severity,
      f.target,
      f.field,
      f.rule,
      f.message,
      f.fragment ?? "",
    ])
  );
}

/** `--flag` / `--key=value` from argv (works under `payload run`, which passes args after `--`). */
export function argFlag(name: string, argv: readonly string[] = process.argv): boolean {
  return argv.includes(`--${name}`);
}

export function argValue(name: string, argv: readonly string[] = process.argv): string | null {
  const prefix = `--${name}=`;
  return argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? null;
}
