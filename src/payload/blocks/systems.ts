import { scopedDbName } from "../fields/db-name";
import { rel } from "../slugs";
import { sectionFields } from "./_section";
import type { Block, Field, SelectField } from "payload";

/** Fields of one system (shared by `constructions.systems` and the `systems` block). */
export function systemFields(): Field[] {
  return [
    {
      type: "row",
      fields: [
        { name: "name", type: "text", label: "Название", required: true },
        { name: "subtitle", type: "text", label: "Подзаголовок" },
      ],
    },
    { name: "whereFits", type: "textarea", label: "Где уместна" },
    { name: "important", type: "textarea", label: "Что важно знать" },
    { name: "howHeld", type: "textarea", label: "Как держится стекло" },
    { name: "requiresInGlass", type: "textarea", label: "Что нужно в стекле" },
    { name: "image", type: "upload", label: "Изображение", relationTo: rel("media") },
    {
      name: "schemeSvg",
      type: "textarea",
      label: "Схема (inline SVG)",
      admin: { description: "Код <svg>…</svg>; выводится после санитизации." },
    },
  ];
}

export function systemsLayoutField(name = "layout"): SelectField {
  return {
    name,
    type: "select",
    label: "Вид",
    defaultValue: "cards",
    options: [
      { label: "Карточки", value: "cards" },
      { label: "Таблица", value: "table" },
    ],
  };
}

/** "Какую систему выбрать": systems of the document or inline ones. */
export const SystemsBlock: Block = {
  slug: "systems",
  dbName: scopedDbName("blk_systems"),
  interfaceName: "SystemsBlock",
  labels: { singular: "Системы", plural: "Системы" },
  fields: [
    ...sectionFields(),
    {
      type: "row",
      fields: [
        {
          name: "source",
          type: "select",
          label: "Источник",
          defaultValue: "doc",
          options: [
            { label: "Системы документа", value: "doc" },
            { label: "Свои", value: "inline" },
          ],
        },
        systemsLayoutField(),
      ],
    },
    {
      name: "items",
      type: "array",
      label: "Системы",
      labels: { singular: "Система", plural: "Системы" },
      admin: { condition: (_, sibling) => sibling?.source === "inline" },
      fields: systemFields(),
    },
  ],
};
