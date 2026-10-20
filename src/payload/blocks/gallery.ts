import { scopedDbName } from "../fields/db-name";
import { rel } from "../slugs";
import { sectionFields } from "./_section";
import type { Block } from "payload";

export const GalleryBlock: Block = {
  slug: "gallery",
  dbName: scopedDbName("blk_gallery"),
  interfaceName: "GalleryBlock",
  labels: { singular: "Галерея", plural: "Галереи" },
  fields: [
    ...sectionFields(),
    {
      name: "layout",
      type: "select",
      label: "Вид",
      defaultValue: "grid",
      options: [
        { label: "Сетка", value: "grid" },
        { label: "Слайдер", value: "slider" },
      ],
    },
    {
      name: "images",
      type: "array",
      label: "Изображения",
      labels: { singular: "Изображение", plural: "Изображения" },
      fields: [
        {
          name: "image",
          type: "upload",
          label: "Изображение",
          relationTo: rel("media"),
          required: true,
        },
        {
          type: "row",
          fields: [
            { name: "alt", type: "text", label: "Alt", required: true },
            { name: "caption", type: "text", label: "Подпись" },
          ],
        },
      ],
    },
  ],
};
