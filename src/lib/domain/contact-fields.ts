import { z } from "zod";
import { parseNumber } from "./format";

/**
 * Contact normalizers, form messages and zod field builders shared by the quiz schema and the
 * lead schemas. Kept in a separate module so `quiz-schema.ts` and `lead-schemas.ts` do not
 * import each other. Client-safe: no Node APIs (unlike `src/payload/utils/normalize.ts`, whose
 * phone rules are mirrored here and checked for equality in `ids-consistency.test.ts`).
 */

export const REQUIRED_MESSAGE = "Заполните поле, чтобы мы могли связаться с вами";
export const CONSENT_MESSAGE =
  "Чтобы отправить заявку, отметьте согласие на обработку персональных данных";
export const PHONE_MESSAGE = "Укажите телефон в формате +7 (900) 000-00-00";
export const EMAIL_MESSAGE = "Проверьте адрес электронной почты";
export const INN_MESSAGE = "ИНН — 10 или 12 цифр";

const RU_NATIONAL_DIGITS = 10;
const RU_FULL_DIGITS = RU_NATIONAL_DIGITS + 1;
/** Leading digits accepted as the Russian country/trunk prefix (`+7…`, `7…`, `8…`). */
const RU_PREFIXES: ReadonlySet<string> = new Set(["7", "8"]);
/** First digit of a mobile number typed without a prefix (`9001234567`). */
const RU_MOBILE_PREFIX = "9";

/** Field length caps: protect the CRM from megabyte-long strings. */
export const MAX_SHORT_TEXT = 200;
export const MAX_LONG_TEXT = 5000;

/**
 * Normalizes a Russian phone to `+7XXXXXXXXXX`: «8 (900) 123-45-67», «+7 900 123 45 67»,
 * «9001234567» → «+79001234567». Any formatting is accepted as long as the digits are 11 starting
 * with 7/8 or 10 starting with 9; anything else → `null`.
 */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length === RU_NATIONAL_DIGITS && digits.startsWith(RU_MOBILE_PREFIX)) {
    return `+7${digits}`;
  }
  if (digits.length !== RU_FULL_DIGITS || !RU_PREFIXES.has(digits.charAt(0))) return null;
  return `+7${digits.slice(1)}`;
}

/** Trim + lower-case. Format is validated by the schema, not here. */
export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

/** `''`, whitespace-only strings and `null` become `undefined` (an empty optional field). */
const blankToUndefined = (value: unknown): unknown => {
  if (value === null) return undefined;
  if (typeof value === "string" && value.trim() === "") return undefined;
  return value;
};

/** Required trimmed text with the «Заполните поле…» message for missing/empty values. */
export const requiredText = (max = MAX_SHORT_TEXT) =>
  z.string({ error: REQUIRED_MESSAGE }).trim().min(1, { error: REQUIRED_MESSAGE }).max(max);

/** Optional trimmed text; an empty string is treated as absent. */
export const optionalText = (max = MAX_SHORT_TEXT) =>
  z.preprocess(blankToUndefined, z.string().trim().max(max).optional()).optional();

/** Required phone, normalized to `+7XXXXXXXXXX`. */
export const phoneField = () =>
  requiredText(50).transform((value, ctx) => {
    const phone = normalizePhone(value);
    if (phone === null) {
      ctx.addIssue({ code: "custom", message: PHONE_MESSAGE, input: value });
      return z.NEVER;
    }
    return phone;
  });

/** Optional e-mail, trimmed and lower-cased. */
export const emailField = () =>
  z
    .preprocess(
      (value) => {
        const blank = blankToUndefined(value);
        return typeof blank === "string" ? normalizeEmail(blank) : blank;
      },
      z.email({ error: EMAIL_MESSAGE }).max(254).optional()
    )
    .optional();

/** Optional INN: spaces are dropped, then exactly 10 or 12 digits. */
export const innField = () =>
  z
    .preprocess(
      (value) => {
        const blank = blankToUndefined(value);
        return typeof blank === "string" ? blank.replace(/\s/g, "") : blank;
      },
      z
        .string()
        .regex(/^(?:\d{10}|\d{12})$/, { error: INN_MESSAGE })
        .optional()
    )
    .optional();

export const consentField = () => z.literal(true, { error: CONSENT_MESSAGE });

/**
 * Lenient optional number for non-blocking fields: accepts numbers and strings with a comma
 * («49,5»); anything unparsable or below `min` is dropped instead of blocking the lead.
 */
export const softNumber = (opts: { min?: number; integer?: boolean } = {}) =>
  z
    .preprocess((value) => {
      const n = parseNumber(typeof value === "number" || typeof value === "string" ? value : null);
      if (n === null) return undefined;
      if (opts.min !== undefined && n < opts.min) return undefined;
      return opts.integer ? Math.round(n) : n;
    }, z.number().optional())
    .optional();

/** Lenient optional enum: unknown values (e.g. an option removed since a draft was saved) are dropped. */
export const softEnum = <const T extends readonly [string, ...string[]]>(values: T) =>
  z
    .preprocess(
      (value) => (typeof value === "string" && values.includes(value) ? value : undefined),
      z.enum(values).optional()
    )
    .optional();

/** Lenient multi-select: keeps known values once each, drops the rest; `[]` by default. */
export const softEnumArray = <const T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess(
    (value) =>
      Array.isArray(value)
        ? [
            ...new Set(
              value.filter((v): v is string => typeof v === "string" && values.includes(v))
            ),
          ]
        : [],
    z.array(z.enum(values))
  );

/** Lenient optional boolean: only real booleans survive. */
export const softBoolean = () =>
  z
    .preprocess((value) => (typeof value === "boolean" ? value : undefined), z.boolean().optional())
    .optional();
