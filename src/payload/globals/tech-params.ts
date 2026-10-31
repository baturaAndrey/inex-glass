import { isAdmin, isAnyone } from "../access";
import {
  arrayValidator,
  GROUP_REFERENCES,
  KEY_DESCRIPTION,
  options,
  uniqueBy,
  validateKey,
} from "./shared";
import { revalidateGlobal } from "../hooks/revalidate";
import type { ArrayField, Field, GlobalConfig, NumberField } from "payload";

/*
 * Single source of technological limits for the quiz, calculators and page templates.
 * Values: docs/inex/15-ssot-tehnologiya.md §1–§4, §8, §11 and ТЗ §4.5. Lengths are in mm.
 */

/** Required number with a default; `min: 0` unless overridden. */
const num = (
  name: string,
  label: string,
  defaultValue: number,
  extra: { min?: number; max?: number; admin?: NonNullable<NumberField["admin"]> } = {}
): Field => ({
  name,
  type: "number",
  label,
  required: true,
  defaultValue,
  min: 0,
  ...extra,
});

/** Required `hasMany` number list with a default. */
const numList = (name: string, label: string, defaultValue: number[]): Field => ({
  name,
  type: "number",
  label,
  hasMany: true,
  required: true,
  defaultValue,
});

/** Lays fields out in one admin row. */
const row = (...fields: Field[]): Field => ({ type: "row", fields });

/** Width/height limits shared by several glass kinds. */
const sizeFields = (minW: number, minH: number, maxW: number, maxH: number): Field[] => [
  row(num("minW", "Мин. ширина", minW), num("minH", "Мин. высота", minH)),
  row(num("maxW", "Макс. ширина", maxW), num("maxH", "Макс. высота", maxH)),
];

const thicknessRange = (min: number, max: number): Field =>
  row(num("thickMin", "Толщина от, мм", min), num("thickMax", "Толщина до, мм", max));

/** Quiz product type keys — identical to `QUIZ_TYPES` in `src/lib/domain/quiz-schema.ts` (task 11). */
const PRODUCT_TYPES = [
  ["tempered", "Закалённое стекло", "square"],
  ["triplex", "Триплекс", "layers"],
  ["partitions", "Перегородки", "columns-2"],
  ["railings", "Ограждения", "fence"],
  ["shower", "Душевые перегородки", "shower-head"],
  ["canopies", "Козырьки", "umbrella"],
  ["facade", "Стеклянный фасад", "building-2"],
  ["shopfronts", "Торговые витрины", "store"],
  ["verandas", "Остекление веранд и террас", "trees"],
  ["mirrors", "Зеркала", "flip-horizontal"],
  ["other", "Другое", "ellipsis"],
] as const;

const PRODUCT_TYPE_OPTIONS = options(PRODUCT_TYPES.map(([key, label]) => [key, label] as const));

/** Tint colour ids — identical to `TINT_COLORS` / `TintColorId` in the domain library (task 11). */
const TINT_COLORS = [
  ["bronze", "бронза"],
  ["graphite", "графит"],
  ["grey", "серое"],
] as const;

const TINT_COLOR_OPTIONS = options(TINT_COLORS);

const keyLabelRows = (pairs: ReadonlyArray<readonly [string, string]>) =>
  pairs.map(([key, label]) => ({ key, label }));

/**
 * `{ key, label }` option list for the quiz. Keys are developer-managed ids shared with the domain
 * library, quiz URLs and leads — there is no mapping between dictionaries.
 */
const quizOptionList = (
  name: string,
  label: string,
  defaultValue: Record<string, unknown>[],
  extraFields: Field[] = []
): ArrayField => ({
  name,
  type: "array",
  label,
  labels: { singular: "Вариант", plural: "Варианты" },
  required: true,
  minRows: 1,
  defaultValue,
  validate: arrayValidator(uniqueBy("key", "Ключ повторяется")),
  admin: { description: KEY_DESCRIPTION, initCollapsed: true },
  fields: [
    row(
      { name: "key", type: "text", label: "Ключ", required: true, validate: validateKey },
      { name: "label", type: "text", label: "Подпись", required: true }
    ),
    ...extraFields,
  ],
});

const DELIVERY_CITIES = [
  "Челябинск",
  "Екатеринбург",
  "Тюмень",
  "Омск",
  "Новосибирск",
  "Кемерово",
  "Красноярск",
  "Уфа",
  "Пермь",
  "Самара",
  "Казань",
  "Сыктывкар",
  "Волгоград",
];

export const TechParams: GlobalConfig = {
  slug: "tech-params",
  label: "Технические параметры",
  admin: {
    group: GROUP_REFERENCES,
    description:
      "Единый источник ограничений для квиза, калькуляторов и шаблонов страниц. Размеры — в мм.",
  },
  access: { read: isAnyone, update: isAdmin },
  hooks: { afterChange: [revalidateGlobal("tech-params")] },
  fields: [
    {
      type: "tabs",
      tabs: [
        {
          label: "Размеры и виды",
          fields: [
            numList("thicknesses", "Толщины, мм", [4, 5, 6, 8, 10, 12, 15, 19]),
            {
              name: "flat",
              type: "group",
              label: "Плоское стекло",
              admin: {
                description:
                  "Нестандартный размер: меньшая сторона < мин. ширины, большая < мин. высоты, большая > макс. ширины или меньшая > макс. высоты.",
              },
              fields: sizeFields(150, 300, 3000, 2000),
            },
            {
              name: "painted",
              type: "group",
              label: "Крашеное по RAL",
              fields: [thicknessRange(4, 15), ...sizeFields(350, 150, 3000, 1600)],
            },
            {
              name: "bent",
              type: "group",
              label: "Гнутое",
              fields: [
                thicknessRange(4, 12),
                ...sizeFields(150, 350, 1200, 2000),
                {
                  name: "radius",
                  type: "array",
                  label: "Минимальный радиус гиба",
                  labels: { singular: "Диапазон", plural: "Диапазоны" },
                  required: true,
                  minRows: 1,
                  defaultValue: [
                    { thicknessFrom: 4, thicknessTo: 6, minRadius: 1000 },
                    { thicknessFrom: 8, thicknessTo: 12, minRadius: 1500 },
                  ],
                  fields: [
                    row(
                      num("thicknessFrom", "Толщина от, мм", 4),
                      num("thicknessTo", "Толщина до, мм", 6),
                      num("minRadius", "Мин. радиус, мм", 1000)
                    ),
                  ],
                },
              ],
            },
            {
              name: "print",
              type: "group",
              label: "Печать",
              fields: [
                thicknessRange(4, 15),
                row(num("maxW", "Макс. ширина", 1100), num("maxH", "Макс. высота", 700)),
              ],
            },
            {
              name: "tintColors",
              type: "array",
              label: "Цвета тонировки",
              labels: { singular: "Цвет", plural: "Цвета" },
              required: true,
              minRows: 1,
              defaultValue: TINT_COLORS.map(([key, name]) => ({ key, name })),
              validate: arrayValidator(uniqueBy("key", "Ключ повторяется")),
              admin: { description: KEY_DESCRIPTION },
              fields: [
                row(
                  {
                    name: "key",
                    type: "select",
                    label: "Ключ",
                    required: true,
                    options: TINT_COLOR_OPTIONS,
                  },
                  { name: "name", type: "text", label: "Цвет", required: true }
                ),
              ],
            },
            {
              name: "ribbed",
              type: "group",
              label: "Рифлёное",
              fields: [numList("thicknesses", "Толщины, мм", [4, 6, 8])],
            },
            {
              name: "facet",
              type: "group",
              label: "Фацет",
              fields: [
                {
                  name: "mirrorsOnly",
                  type: "checkbox",
                  label: "Только для зеркал",
                  required: true,
                  defaultValue: true,
                },
                numList("widths", "Ширина фацета, мм", [30, 50]),
                num("minGlassThickness", "Мин. толщина стекла, мм", 4),
              ],
            },
            {
              name: "mirrors",
              type: "group",
              label: "Зеркала",
              fields: [
                num("maxSizeMm", "Макс. размер, мм", 2800, {
                  admin: { description: "Зеркала для залов — максимум 2,8 м." },
                }),
              ],
            },
            {
              name: "triplex",
              type: "group",
              label: "Триплекс",
              fields: [
                row(
                  num("rawMaxW", "Макс. ширина (сырое)", 3500),
                  num("rawMaxH", "Макс. высота (сырое)", 2500)
                ),
                row(
                  num("temperedMaxW", "Макс. ширина (закалённое)", 3000),
                  num("temperedMaxH", "Макс. высота (закалённое)", 2000)
                ),
              ],
            },
            numList(
              "clampProfileThicknesses",
              "Толщины под зажимной профиль, мм",
              [10, 12, 16, 20]
            ),
          ],
        },
        {
          label: "Отверстия",
          fields: [
            {
              name: "holes",
              type: "group",
              label: "Отверстия и вырезы",
              fields: [
                row(
                  num("diameterMin", "Мин. диаметр", 4),
                  num("diameterMax", "Макс. диаметр", 130),
                  num("diameterMaxOneSide", "Макс. диаметр (сверление с одной стороны)", 220)
                ),
                row(
                  num("glassMinW", "Мин. ширина стекла", 250),
                  num("glassMinH", "Мин. высота стекла", 100)
                ),
                row(
                  num("glassMaxW", "Макс. ширина стекла", 3000),
                  num("glassMaxH", "Макс. высота стекла", 1600)
                ),
                row(
                  num("glassThicknessMin", "Мин. толщина стекла", 4),
                  num("glassThicknessMaxTwoSides", "Макс. толщина (с двух сторон)", 25),
                  num("glassThicknessMaxOneSide", "Макс. толщина (с одной стороны)", 50)
                ),
                row(
                  num("edgeFactor", "До края, × толщины", 2),
                  num("betweenFactor", "Между отверстиями, × толщины", 2),
                  num("cornerFactor", "До угла, × толщины", 6)
                ),
                row(
                  num("minDiameterFactor", "Мин. диаметр, × толщины", 1),
                  num("cutoutInnerRadiusMin", "Мин. внутренний радиус выреза", 10)
                ),
                {
                  name: "toleranceRanges",
                  type: "array",
                  label: "Допуск диаметра",
                  labels: { singular: "Диапазон", plural: "Диапазоны" },
                  required: true,
                  minRows: 1,
                  defaultValue: [
                    { from: 4, to: 20, tolerance: 1.0 },
                    { from: 20, to: 100, tolerance: 2.0 },
                    { from: 100, label: "по согласованию" },
                  ],
                  fields: [
                    row(
                      num("from", "Диаметр от", 0),
                      {
                        name: "to",
                        type: "number",
                        label: "Диаметр до",
                        min: 0,
                        admin: { description: "Пусто — без верхней границы." },
                      },
                      {
                        name: "tolerance",
                        type: "number",
                        label: "Допуск, ± мм",
                        min: 0,
                        admin: { description: "Пусто — «по согласованию»." },
                      },
                      { name: "label", type: "text", label: "Подпись" }
                    ),
                  ],
                },
              ],
            },
          ],
        },
        {
          label: "Вес",
          fields: [
            {
              name: "weight",
              type: "group",
              label: "Вес стекла",
              fields: [
                row(
                  num("kgPerM2PerMm", "кг/м² на 1 мм толщины", 2.5),
                  num("filmUnitThickness", "Толщина слоя плёнки, мм", 0.38),
                  num("filmUnitWeight", "Вес слоя плёнки, кг/м²", 0.36)
                ),
                numList("filmLayers", "Толщины плёнки, мм", [0.38, 0.76, 1.14, 1.52]),
              ],
            },
            {
              name: "carryHints",
              type: "array",
              label: "Подсказки по переноске",
              labels: { singular: "Подсказка", plural: "Подсказки" },
              admin: {
                description:
                  "По весу одного стекла. Тексты — дословно из teksty/10-blog-kalkulyator.md §1.",
              },
              defaultValue: [
                { upToKg: 20, text: "можно нести одному, в перчатках с покрытием" },
                { upToKg: 40, text: "один или вдвоём, с ручными присосками" },
                { upToKg: 80, text: "только вдвоём, по одной-две присоски на человека" },
                { text: "бригада 3–5 человек или вакуумный подъёмник" },
              ],
              fields: [
                row(
                  {
                    name: "upToKg",
                    type: "number",
                    label: "До, кг",
                    min: 0,
                    admin: { description: "Пусто — «больше»." },
                  },
                  { name: "text", type: "text", label: "Текст", required: true }
                ),
              ],
            },
          ],
        },
        {
          label: "ГОСТ",
          fields: [
            {
              name: "gost",
              type: "group",
              label: "ГОСТ",
              admin: {
                description:
                  "Значения таблицы 2 ГОСТ 30698-2014 (плоскостность) сверить с оригиналом стандарта.",
              },
              fields: [
                row(
                  {
                    name: "tempered",
                    type: "text",
                    label: "Закалённое стекло",
                    required: true,
                    defaultValue: "ГОСТ 30698-2014",
                  },
                  {
                    name: "triplex",
                    type: "text",
                    label: "Триплекс",
                    required: true,
                    defaultValue: "ГОСТ 30826-2014",
                  }
                ),
                {
                  name: "sizeTolerance",
                  type: "array",
                  label: "Допуски размеров",
                  labels: { singular: "Строка", plural: "Строки" },
                  required: true,
                  minRows: 1,
                  defaultValue: [
                    { sizeRange: "до 2000 мм", upTo12: "±2,0", over12: "±3,0" },
                    { sizeRange: "2000–3000 мм", upTo12: "±3,0", over12: "±4,0" },
                    { sizeRange: "свыше 3000 мм", upTo12: "±4,0", over12: "±5,0" },
                  ],
                  fields: [
                    row(
                      { name: "sizeRange", type: "text", label: "Размер", required: true },
                      { name: "upTo12", type: "text", label: "Толщина до 12 мм", required: true },
                      { name: "over12", type: "text", label: "Толщина свыше 12 мм", required: true }
                    ),
                  ],
                },
                {
                  name: "flatness",
                  type: "array",
                  label: "Плоскостность",
                  labels: { singular: "Строка", plural: "Строки" },
                  required: true,
                  minRows: 1,
                  defaultValue: [
                    { thicknessRange: "3–5 мм", general: "3 / 4", local: "0,5" },
                    { thicknessRange: "6–25 мм", general: "2 / 3", local: "0,4" },
                  ],
                  fields: [
                    row(
                      { name: "thicknessRange", type: "text", label: "Толщина", required: true },
                      { name: "general", type: "text", label: "Общая", required: true },
                      { name: "local", type: "text", label: "Местная", required: true }
                    ),
                  ],
                },
              ],
            },
          ],
        },
        {
          label: "Доставка",
          fields: [
            {
              name: "deliveryCities",
              type: "array",
              label: "Города доставки",
              labels: { singular: "Город", plural: "Города" },
              required: true,
              minRows: 1,
              defaultValue: [
                ...DELIVERY_CITIES.map((name) => ({ name, kind: "city" })),
                { name: "Другой", kind: "other" },
                { name: "Самовывоз (Челябинск)", kind: "pickup" },
              ],
              fields: [
                row(
                  { name: "name", type: "text", label: "Название", required: true },
                  {
                    name: "kind",
                    type: "select",
                    label: "Тип",
                    required: true,
                    defaultValue: "city",
                    options: options([
                      ["city", "Город"],
                      ["other", "Другой (поле ввода в квизе)"],
                      ["pickup", "Самовывоз"],
                    ]),
                  }
                ),
              ],
            },
          ],
        },
        {
          label: "Варианты квиза",
          fields: [
            {
              name: "quizOptions",
              type: "group",
              label: "Варианты ответов квиза",
              admin: { description: KEY_DESCRIPTION },
              fields: [
                quizOptionList(
                  "productTypes",
                  "Что нужно изготовить",
                  PRODUCT_TYPES.map(([key, label, icon]) => ({ key, label, icon })),
                  [
                    {
                      name: "icon",
                      type: "text",
                      label: "Иконка",
                      admin: { description: "Имя иконки Lucide." },
                    },
                  ]
                ),
                quizOptionList(
                  "kinds",
                  "Вид стекла",
                  keyLabelRows([
                    ["clear", "Прозрачное"],
                    ["low-iron", "Осветлённое"],
                    ["matte", "Матовое"],
                    ["tinted", "Тонированное"],
                    ["painted", "Крашеное по RAL"],
                    ["ribbed", "Рифлёное"],
                    ["bent", "Гнутое"],
                  ])
                ),
                quizOptionList(
                  "edges",
                  "Обработка кромки",
                  [
                    { key: "ground", label: "шлифованная" },
                    { key: "polished", label: "полированная" },
                    { key: "trapezoid", label: "«трапеция»" },
                    { key: "euro", label: "«еврокромка»" },
                    { key: "facet30", label: "фацет 30 мм", onlyForTypes: ["mirrors"] },
                    { key: "facet50", label: "фацет 50 мм", onlyForTypes: ["mirrors"] },
                    { key: "unknown", label: "не знаю — подскажите" },
                  ],
                  [
                    {
                      name: "onlyForTypes",
                      type: "select",
                      label: "Только для типов",
                      hasMany: true,
                      options: PRODUCT_TYPE_OPTIONS,
                      admin: { description: "Пусто — для всех типов." },
                    },
                  ]
                ),
                quizOptionList(
                  "decor",
                  "Декор",
                  keyLabelRows([
                    ["matting", "матирование"],
                    ["print", "печать (до 1100 × 700)"],
                    ["film", "плёнка"],
                  ])
                ),
                quizOptionList(
                  "stamp",
                  "Клеймо",
                  keyLabelRows([
                    ["standard", "стандартное место"],
                    ["custom", "укажу место"],
                    ["none", "без клейма"],
                  ])
                ),
                quizOptionList(
                  "packaging",
                  "Упаковка",
                  keyLabelRows([
                    ["film", "плёнка"],
                    ["cardboard", "картон"],
                    ["crate", "ящик под кран или погрузчик"],
                    ["carrier", "требования перевозчика"],
                  ])
                ),
                quizOptionList(
                  "roles",
                  "Кто вы",
                  keyLabelRows([
                    ["contractor", "подрядчик"],
                    ["manufacturer", "производитель мебели или изделий"],
                    ["developer", "застройщик или генподрядчик"],
                    ["designer", "дизайнер или архитектор"],
                    ["other", "другое"],
                  ])
                ),
              ],
            },
          ],
        },
      ],
    },
  ],
};
