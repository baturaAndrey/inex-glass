import { isAdmin, isAnyone } from "../access";
import { richTextEditor } from "../editor";
import { arrayValidator, GROUP_SETTINGS, options, uniqueBy } from "./shared";
import { revalidateGlobal } from "../hooks/revalidate";
import type { GlobalConfig, TextFieldSingleValidation } from "payload";

/** Snippet keys are kebab-case ids referenced from pages and blocks. */
const SNIPPET_KEY = /^[a-z0-9-]+$/;

const validateSnippetKey: TextFieldSingleValidation = (value) => {
  if (!value) return "Укажите ключ";
  return SNIPPET_KEY.test(value) ? true : "Только строчная латиница, цифры и «-»";
};

export const Snippets: GlobalConfig = {
  slug: "snippets",
  label: "Сниппеты",
  admin: {
    group: GROUP_SETTINGS,
    description: "Переиспользуемые блоки, которые вставляются на страницы по ключу.",
  },
  access: { read: isAnyone, update: isAdmin },
  hooks: { afterChange: [revalidateGlobal("snippets")] },
  fields: [
    {
      name: "items",
      type: "array",
      label: "Сниппеты",
      labels: { singular: "Сниппет", plural: "Сниппеты" },
      validate: arrayValidator(uniqueBy("key", "Ключ сниппета повторяется")),
      admin: { initCollapsed: true },
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "key",
              type: "text",
              label: "Ключ",
              required: true,
              validate: validateSnippetKey,
              admin: { description: "kebab-case, например samples. Меняет разработчик." },
            },
            { name: "title", type: "text", label: "Заголовок" },
          ],
        },
        { name: "content", type: "richText", label: "Текст", editor: richTextEditor },
        {
          type: "row",
          fields: [
            { name: "ctaLabel", type: "text", label: "Текст кнопки" },
            {
              name: "ctaFormKey",
              type: "select",
              label: "Форма кнопки",
              defaultValue: "none",
              options: options([
                ["sample", "Заказать образец"],
                ["drawing", "Отправить чертёж"],
                ["callback", "Заказать звонок"],
                ["load", "Подобрать под нагрузку"],
                ["contacts", "Контакты"],
                ["none", "Без формы"],
              ]),
            },
          ],
        },
        {
          name: "ctaFormParams",
          type: "json",
          label: "Параметры формы",
          admin: {
            description:
              'Для параметризуемой формы чертежа, например { "label": "Отправить проект" }.',
          },
        },
        { name: "usageNote", type: "textarea", label: "Внутренняя заметка" },
      ],
    },
  ],
};
