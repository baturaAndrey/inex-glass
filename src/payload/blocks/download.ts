import { scopedDbName } from "../fields/db-name";
import { rel } from "../slugs";
import { sectionFields } from "./_section";
import type { Block } from "payload";

export const DownloadBlock: Block = {
  slug: "download",
  dbName: scopedDbName("blk_download"),
  interfaceName: "DownloadBlock",
  labels: { singular: "Файлы для скачивания", plural: "Файлы для скачивания" },
  fields: [
    ...sectionFields(),
    {
      name: "variant",
      type: "select",
      label: "Вид",
      defaultValue: "list",
      options: [
        { label: "Список", value: "list" },
        { label: "Карточки", value: "card" },
      ],
    },
    {
      name: "items",
      type: "array",
      label: "Файлы",
      labels: { singular: "Файл", plural: "Файлы" },
      fields: [
        { name: "title", type: "text", label: "Название", required: true },
        { name: "description", type: "textarea", label: "Описание" },
        {
          type: "row",
          fields: [
            { name: "file", type: "upload", label: "Файл", relationTo: rel("media") },
            {
              name: "fileMissing",
              type: "checkbox",
              label: "Файл будет добавлен",
              admin: { description: "Показывать «файл будет добавлен» вместо ссылки." },
            },
          ],
        },
      ],
    },
  ],
};
