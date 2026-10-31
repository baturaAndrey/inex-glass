import { select as validateSelect, upload as validateUpload } from "payload/shared";
import { linkField } from "../fields/link";
import { isEmptyValue } from "../fields/validators";
import { rel } from "../slugs";
import type {
  ArrayField,
  OptionObject,
  SelectFieldSingleValidation,
  UploadFieldSingleValidation,
} from "payload";

/** Site forms (task 21 registry keys). */
export const FORM_KEY_OPTIONS = [
  { label: "Отправить чертёж / проект / размеры", value: "drawing" },
  { label: "Заказать звонок", value: "callback" },
  { label: "Заказать образец", value: "sample" },
  { label: "Подобрать под нагрузку", value: "load" },
  { label: "Контакты", value: "contacts" },
  { label: "Полная форма", value: "full" },
] as const satisfies readonly OptionObject[];

export const BUTTON_VARIANT_OPTIONS = [
  { label: "Основная", value: "primary" },
  { label: "Вторичная", value: "secondary" },
  { label: "Текстовая", value: "ghost" },
] as const satisfies readonly OptionObject[];

const MAX_BUTTONS = 3;

type ButtonKindSibling = { kind?: unknown } | undefined;
const kindIs = (kind: string) => (_: unknown, sibling: ButtonKindSibling) => sibling?.kind === kind;

type ButtonLink = { type?: unknown; doc?: unknown; url?: unknown } | null | undefined;

/** A link group points somewhere: a custom URL, or a document (polymorphic `{ relationTo, value }`). */
function hasLinkTarget(link: ButtonLink): boolean {
  if (link?.type === "custom") return !isEmptyValue(link.url);
  const doc = link?.doc;
  if (typeof doc === "object" && doc !== null && "value" in doc) {
    return !isEmptyValue((doc as { value?: unknown }).value);
  }
  return !isEmptyValue(doc);
}

/**
 * Each action needs its target: a form key, a link, or a file. Custom validators replace
 * Payload's built-in ones, so those run first (option membership, upload existence).
 */
const validateKind: SelectFieldSingleValidation = async (value, options) => {
  const base = await validateSelect(value, options);
  if (base !== true) return base;
  const link = (options.siblingData as { link?: ButtonLink } | undefined)?.link;
  if (value === "link" && !hasLinkTarget(link)) return "Укажите страницу или адрес ссылки";
  return true;
};

const validateFormKey: SelectFieldSingleValidation = async (value, options) => {
  const kind = (options.siblingData as ButtonKindSibling)?.kind;
  if (kind === "form" && isEmptyValue(value)) return "Выберите форму";
  return validateSelect(value, options);
};

const validateFile: UploadFieldSingleValidation = async (value, options) => {
  const kind = (options.siblingData as ButtonKindSibling)?.kind;
  if (kind === "download" && isEmptyValue(value)) return "Выберите файл для скачивания";
  return validateUpload(value, options);
};

/**
 * Up to three buttons: open the quiz, open a form modal, follow a link or download a file.
 * `formParams` configures the parametrized drawing form: `{ label, sourceLabel, accept }`.
 */
export function ctaFields(): ArrayField {
  return {
    name: "buttons",
    type: "array",
    label: "Кнопки",
    labels: { singular: "Кнопка", plural: "Кнопки" },
    maxRows: MAX_BUTTONS,
    fields: [
      {
        type: "row",
        fields: [
          { name: "label", type: "text", label: "Текст", required: true },
          {
            name: "kind",
            type: "select",
            label: "Действие",
            defaultValue: "quiz",
            validate: validateKind,
            options: [
              { label: "Открыть квиз", value: "quiz" },
              { label: "Открыть форму", value: "form" },
              { label: "Перейти по ссылке", value: "link" },
              { label: "Скачать файл", value: "download" },
            ],
          },
          {
            name: "variant",
            type: "select",
            label: "Вид",
            defaultValue: "primary",
            options: [...BUTTON_VARIANT_OPTIONS],
          },
          {
            name: "icon",
            type: "text",
            label: "Иконка",
            admin: { description: "Имя иконки Lucide." },
          },
        ],
      },
      {
        name: "formKey",
        type: "select",
        label: "Форма",
        options: [...FORM_KEY_OPTIONS],
        validate: validateFormKey,
        admin: { condition: kindIs("form") },
      },
      {
        name: "formParams",
        type: "json",
        label: "Параметры формы",
        admin: {
          condition: kindIs("form"),
          description:
            'Для формы чертежа: { "label": "Отправить проект", "sourceLabel": "…", "accept": ".dwg,.pdf" }',
        },
      },
      {
        ...linkField({ withLabel: false }),
        admin: { condition: kindIs("link") },
      },
      {
        name: "file",
        type: "upload",
        label: "Файл",
        relationTo: rel("media"),
        validate: validateFile,
        admin: { condition: kindIs("download") },
      },
    ],
  };
}
