import { array as validateArray } from "payload/shared";
import { scopedDbName } from "./db-name";
import type { ArrayField, ArrayFieldValidation, Field, OptionObject, SelectField } from "payload";

export const TABLE_ROLE_OPTIONS = [
  { label: "Параметры", value: "parameters" },
  { label: "Сравнение", value: "comparison" },
  { label: "Схемы", value: "schemes" },
  { label: "Другое", value: "other" },
] as const satisfies readonly OptionObject[];

const MIN_COLUMNS = 2;

type Row = { cells?: unknown };

const asRows = (value: unknown, fallback: unknown): Row[] => {
  const source = Array.isArray(value) ? value : fallback;
  return Array.isArray(source)
    ? source.filter((row): row is Row => typeof row === "object" && row !== null)
    : [];
};

/**
 * Number of cells in every row must match the number of columns. Runs after Payload's built-in
 * array checks (a custom `validate` replaces the default one).
 */
const validateRows: ArrayFieldValidation = async (value, options) => {
  const base = await validateArray(value, options);
  if (base !== true) return base;

  const sibling = options.siblingData as { columns?: unknown; rows?: unknown } | undefined;
  const columns = Array.isArray(sibling?.columns) ? sibling.columns.length : 0;
  if (columns === 0) return true;

  const rows = asRows(value, sibling?.rows);
  const broken = rows.findIndex(
    (row) => (Array.isArray(row.cells) ? row.cells.length : 0) !== columns
  );
  if (broken === -1) return true;
  return `Строка ${broken + 1}: число ячеек должно совпадать с числом столбцов (${columns})`;
};

/** Table columns: header label, alignment, numeric flag. */
export function tableColumnsField(): ArrayField {
  return {
    name: "columns",
    type: "array",
    label: "Столбцы",
    labels: { singular: "Столбец", plural: "Столбцы" },
    dbName: scopedDbName("cols"),
    minRows: MIN_COLUMNS,
    fields: [
      {
        type: "row",
        fields: [
          { name: "label", type: "text", label: "Заголовок", required: true },
          {
            name: "align",
            type: "select",
            label: "Выравнивание",
            defaultValue: "left",
            options: [
              { label: "Слева", value: "left" },
              { label: "По центру", value: "center" },
              { label: "Справа", value: "right" },
            ],
          },
          { name: "numeric", type: "checkbox", label: "Числовой" },
        ],
      },
    ],
  };
}

/** Table rows: cells (value, highlight, link) plus an optional link for the whole row. */
export function tableRowsField(): ArrayField {
  return {
    name: "rows",
    type: "array",
    label: "Строки",
    labels: { singular: "Строка", plural: "Строки" },
    dbName: scopedDbName("rows"),
    validate: validateRows,
    admin: { initCollapsed: true },
    fields: [
      {
        name: "cells",
        type: "array",
        label: "Ячейки",
        labels: { singular: "Ячейка", plural: "Ячейки" },
        dbName: scopedDbName("cells"),
        fields: [
          { name: "value", type: "textarea", label: "Значение" },
          {
            type: "row",
            fields: [
              {
                name: "positive",
                type: "checkbox",
                label: "Выгодное значение",
                admin: { description: "Подсветка ct-pos." },
              },
              {
                name: "href",
                type: "text",
                label: "Ссылка",
                admin: { description: "/путь/ или https://…" },
              },
            ],
          },
        ],
      },
      {
        name: "rowHref",
        type: "text",
        label: "Ссылка строки",
        admin: { description: "Вся строка ведёт по этой ссылке (напр. на карточку толщины)." },
      },
    ],
  };
}

/** How a table collapses on screens ≤ 599 px: `.ig-mcard` cards or `.ig-pair` pairs. */
export function mobileModeField(): SelectField {
  return {
    name: "mobileMode",
    type: "select",
    label: "На телефоне",
    defaultValue: "cards",
    options: [
      { label: "Карточки (ig-mcard)", value: "cards" },
      { label: "Пары «параметр — значение» (ig-pair)", value: "pairs" },
    ],
  };
}

/** Fields of one table (shared by `tablesField` rows and the `table` block). */
export function tableFields(): Field[] {
  return [
    {
      type: "row",
      fields: [
        {
          name: "role",
          type: "select",
          label: "Назначение",
          defaultValue: "parameters",
          options: [...TABLE_ROLE_OPTIONS],
        },
        mobileModeField(),
      ],
    },
    tableColumnsField(),
    tableRowsField(),
    { name: "footnote", type: "text", label: "Сноска" },
  ];
}

/** Universal tables for glass types, processing and constructions. */
export function tablesField(): ArrayField {
  return {
    name: "tables",
    type: "array",
    label: "Таблицы",
    labels: { singular: "Таблица", plural: "Таблицы" },
    admin: { initCollapsed: true },
    fields: [
      { name: "heading", type: "text", label: "Заголовок" },
      { name: "lead", type: "textarea", label: "Вводный абзац" },
      ...tableFields(),
    ],
  };
}
