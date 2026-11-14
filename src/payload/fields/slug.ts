import { text as validateText } from "payload/shared";
import { SLUG_PATTERN, transliterate } from "./transliterate";
import type { FieldHook, TextField, TextFieldSingleValidation } from "payload";

export { SLUG_PATTERN, transliterate };

type SlugFieldOptions = {
  /** Source field (sibling) to transliterate when the slug is left empty, e.g. `title`. */
  from?: string;
  /** Overrides the default admin description. */
  description?: string;
};

const validateSlug: TextFieldSingleValidation = async (value, options) => {
  // A custom validator replaces Payload's built-in one (required, length) — run it first.
  const base = await validateText(value, options);
  if (base !== true) return base;
  if (!value) return true;
  return SLUG_PATTERN.test(value)
    ? true
    : "Только строчная латиница, цифры и дефисы между словами: osteklenie-verand";
};

/** Kebab-case `slug`: required, unique, auto-filled from `from` when empty. */
export function slugField(opts: SlugFieldOptions = {}): TextField {
  const { from, description } = opts;

  const fillFromSource: FieldHook = ({ value, siblingData, originalDoc }) => {
    if (typeof value === "string" && value.trim() !== "") return value.trim();
    // A partial update that does not touch the slug must not regenerate it from the title.
    const existing = (originalDoc as { slug?: unknown } | undefined)?.slug;
    if (value === undefined && typeof existing === "string" && existing !== "") return value;
    if (!from) return value;
    const source = (siblingData as Record<string, unknown> | undefined)?.[from];
    if (typeof source !== "string" || source.trim() === "") return value;
    return transliterate(source);
  };

  return {
    name: "slug",
    type: "text",
    label: "Слаг (часть адреса)",
    required: true,
    index: true,
    unique: true,
    validate: validateSlug,
    hooks: { beforeValidate: [fillFromSource] },
    admin: {
      position: "sidebar",
      description:
        description ??
        (from
          ? "Латиница в kebab-case. Если оставить пустым — сформируется из названия."
          : "Латиница в kebab-case."),
    },
  };
}
