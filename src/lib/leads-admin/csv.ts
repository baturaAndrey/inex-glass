/**
 * CSV for Russian Excel: UTF-8 with BOM (otherwise Excel decodes it as cp1251), `;` separator
 * (the list separator of the ru-RU locale), CRLF line ends, every value double-quoted.
 *
 * Formula (CSV) injection: a cell starting with `=`, `+`, `-`, `@`, TAB or CR is executed by
 * spreadsheet apps, so it is prefixed with `'`. The only exemption is an international phone
 * (`+7 (351) 247-05-57`): `+`, then a digit, then digits/spaces/brackets/dashes only. Without
 * letters it cannot call a function or reference a cell, and guarding it would make every
 * phone read `'+7…` in Excel. Everything else starting with a trigger — including `-…` — is
 * guarded.
 */

export const CSV_BOM = "﻿";
export const CSV_SEPARATOR = ";";
export const CSV_EOL = "\r\n";

const FORMULA_TRIGGERS = new Set(["=", "+", "-", "@", "\t", "\r"]);
/**
 * `+`, a digit, then only digits, plain spaces, brackets and dashes. Only the plain space:
 * TAB/CR are formula triggers themselves. Checked only for values that start with a trigger.
 */
const PHONE_LIKE = /^\+\d[\d ()-]*$/;

/** Adds the `'` guard to a value that a spreadsheet would evaluate as a formula. */
export function neutralizeFormula(value: string): string {
  if (value === "" || !FORMULA_TRIGGERS.has(value.charAt(0))) return value;
  if (PHONE_LIKE.test(value)) return value;
  return `'${value}`;
}

/** One quoted CSV cell: guards formulas and doubles inner quotes. */
export function csvCell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${neutralizeFormula(text).replace(/"/g, '""')}"`;
}

export function csvLine(values: readonly (string | number | null | undefined)[]): string {
  return values.map(csvCell).join(CSV_SEPARATOR);
}

/** Whole document: BOM, header line, data lines, trailing CRLF. */
export function buildCsv(
  header: readonly string[],
  rows: readonly (readonly (string | number | null | undefined)[])[]
): string {
  const lines = [csvLine(header), ...rows.map(csvLine)];
  return `${CSV_BOM}${lines.join(CSV_EOL)}${CSV_EOL}`;
}
