import type { GroupField, OptionObject } from "payload";

/**
 * Quiz option ids. They must stay identical to the domain dictionaries of task 11
 * (`QUIZ_TYPES`, `QUIZ_KINDS`) and to the quiz URL (`?type=tempered&vid=low-iron`):
 * there is no mapping layer between the CMS, the domain and the URL.
 */
export const QUIZ_TYPE_OPTIONS = [
  { label: "Закалённое стекло", value: "tempered" },
  { label: "Триплекс", value: "triplex" },
  { label: "Перегородки", value: "partitions" },
  { label: "Ограждения", value: "railings" },
  { label: "Душевые перегородки", value: "shower" },
  { label: "Козырьки", value: "canopies" },
  { label: "Стеклянный фасад", value: "facade" },
  { label: "Торговые витрины", value: "shopfronts" },
  { label: "Остекление веранд и террас", value: "verandas" },
  { label: "Зеркала", value: "mirrors" },
  { label: "Другое", value: "other" },
] as const satisfies readonly OptionObject[];

export const QUIZ_KIND_OPTIONS = [
  { label: "Прозрачное", value: "clear" },
  { label: "Осветлённое", value: "low-iron" },
  { label: "Матовое", value: "matte" },
  { label: "Тонированное", value: "tinted" },
  { label: "Крашеное по RAL", value: "painted" },
  { label: "Рифлёное", value: "ribbed" },
  { label: "Гнутое", value: "bent" },
] as const satisfies readonly OptionObject[];

/** Glass thicknesses sold by Inex Glass, mm (SSoT §2). */
export const THICKNESS_VALUES = [4, 5, 6, 8, 10, 12, 15, 19] as const;
export type Thickness = (typeof THICKNESS_VALUES)[number];

/** Select options for thickness (select values are strings in Payload). */
export const THICKNESS_OPTIONS: OptionObject[] = THICKNESS_VALUES.map((n) => ({
  label: `${n} мм`,
  value: String(n),
}));

export const SECONDARY_FORM_OPTIONS = [
  { label: "Отправить чертёж / проект / размеры", value: "drawing" },
  { label: "Подобрать под нагрузку", value: "load" },
  { label: "Заказать образец", value: "sample" },
  { label: "Без второй кнопки", value: "none" },
] as const satisfies readonly OptionObject[];

export const DEFAULT_QUIZ_CTA_LABEL = "Рассчитать стоимость";
export const DEFAULT_SECONDARY_LABEL = "Отправить чертёж";

type QuizPrefillOptions = {
  /** Field name; `quizPrefill` on documents, `prefill` inside the `quizCta` block. */
  name?: string;
};

/** Quiz pre-fill from the page context plus labels of the two hero/CTA buttons. */
export function quizPrefillField(opts: QuizPrefillOptions = {}): GroupField {
  const { name = "quizPrefill" } = opts;
  return {
    name,
    type: "group",
    label: "Предзаполнение квиза",
    admin: {
      description:
        "Значения подставляются в квиз «Расчёт стоимости» при переходе с этой страницы (?type=…&vid=…).",
    },
    fields: [
      {
        type: "row",
        fields: [
          {
            name: "type",
            type: "select",
            label: "Тип изделия",
            options: [...QUIZ_TYPE_OPTIONS],
          },
          {
            name: "thickness",
            type: "select",
            label: "Толщина",
            options: THICKNESS_OPTIONS,
          },
          {
            name: "kind",
            type: "select",
            label: "Вид стекла",
            options: [...QUIZ_KIND_OPTIONS],
          },
        ],
      },
      {
        type: "row",
        fields: [
          {
            name: "ctaLabel",
            type: "text",
            label: "Текст главной кнопки",
            defaultValue: DEFAULT_QUIZ_CTA_LABEL,
          },
          {
            name: "secondaryForm",
            type: "select",
            label: "Вторая кнопка — форма",
            defaultValue: "drawing",
            options: [...SECONDARY_FORM_OPTIONS],
          },
          {
            name: "secondaryLabel",
            type: "text",
            label: "Текст второй кнопки",
            defaultValue: DEFAULT_SECONDARY_LABEL,
            admin: {
              description: "Напр. «Отправить проект», «Отправить планировку».",
              condition: (_, sibling) => sibling?.secondaryForm !== "none",
            },
          },
        ],
      },
    ],
  };
}
