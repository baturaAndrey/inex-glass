import { array as validateArray } from "payload/shared";
import type { ArrayFieldValidation, DateField, Option } from "payload";

/** `admin.date` for calendar dates (no time of day). */
export const DAY_ONLY = {
  pickerAppearance: "dayOnly",
  displayFormat: "dd.MM.yyyy",
} satisfies NonNullable<NonNullable<DateField["admin"]>["date"]>;

export const GROUP_REFERENCES = "Справочники";
export const GROUP_SETTINGS = "Настройки";

/** Lowercase Latin key, digits, `-` and `_` (quiz ids such as `low-iron`, `in_production`). */
export const KEY_PATTERN = /^[a-z0-9_-]+$/;

type Row = Record<string, unknown>;

const rowsOf = (value: unknown): Row[] =>
  Array.isArray(value)
    ? value.filter((row): row is Row => typeof row === "object" && row !== null)
    : [];

/**
 * Array validation that keeps Payload's built-in checks (required, minRows, maxRows) and adds
 * a row-level rule. A custom `validate` replaces the default one, so the default is called first.
 */
export const arrayValidator =
  (check: (rows: Row[]) => string | true): ArrayFieldValidation =>
  async (value, options) => {
    const base = await validateArray(value, options);
    if (base !== true) return base;
    return check(rowsOf(value));
  };

/** Rejects arrays in which two rows share the same (non-empty) value of `key`. */
export const uniqueBy =
  (key: string, message: string) =>
  (rows: Row[]): string | true => {
    const seen = new Set<string>();
    for (const row of rows) {
      const raw = row[key];
      if (raw === undefined || raw === null || raw === "") continue;
      const normalized = String(raw);
      if (seen.has(normalized)) return `${message}: ${normalized}`;
      seen.add(normalized);
    }
    return true;
  };

/** Validates the format of a developer-managed key (`KEY_PATTERN`). */
export const validateKey = (value: unknown): string | true => {
  if (typeof value !== "string" || value === "") return "Укажите ключ";
  return KEY_PATTERN.test(value) ? true : "Только строчная латиница, цифры, «-» и «_»";
};

/** Default rows for `{ text }` arrays. */
export const textRows = (texts: readonly string[]) => texts.map((text) => ({ text }));

/**
 * Minimal Lexical document (one paragraph per string) for rich-text defaults.
 * Shape matches `SerializedEditorState` produced by `@payloadcms/richtext-lexical`.
 */
export const lexicalParagraphs = (paragraphs: readonly string[]) => ({
  root: {
    type: "root",
    format: "",
    indent: 0,
    version: 1,
    direction: "ltr",
    children: paragraphs.map((text) => ({
      type: "paragraph",
      format: "",
      indent: 0,
      version: 1,
      direction: "ltr",
      textFormat: 0,
      textStyle: "",
      children: [
        { type: "text", text, format: 0, detail: 0, mode: "normal", style: "", version: 1 },
      ],
    })),
  },
});

/** Builds select options from `[value, label]` pairs. */
export const options = (pairs: ReadonlyArray<readonly [string, string]>): Option[] =>
  pairs.map(([value, label]) => ({ value, label }));

/** Shared admin description for developer-managed keys. */
export const KEY_DESCRIPTION =
  "Ключ (латиница) меняет только разработчик: он совпадает с id в коде квиза, URL и заявках.";
