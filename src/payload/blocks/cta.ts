import { richTextEditor } from "../editor";
import { ctaFields } from "./_cta";
import { sectionFields } from "./_section";
import { scopedDbName } from "../fields/db-name";
import { linkField } from "../fields/link";
import type { Block } from "payload";

/** Call to action. `split` is "Расчёт под снег": text on the left, a card with a button right. */
export const CtaBlock: Block = {
  slug: "cta",
  dbName: scopedDbName("blk_cta"),
  interfaceName: "CtaBlock",
  labels: { singular: "Призыв к действию", plural: "Призывы к действию" },
  fields: [
    ...sectionFields(),
    {
      type: "row",
      fields: [
        {
          name: "variant",
          type: "select",
          label: "Вид",
          defaultValue: "buttons",
          options: [
            { label: "Кнопки", value: "buttons" },
            { label: "Баннер", value: "banner" },
            { label: "Полоса со ссылкой", value: "strip" },
            { label: "Две колонки (split)", value: "split" },
          ],
        },
        {
          name: "tone",
          type: "select",
          label: "Тон",
          defaultValue: "light",
          options: [
            { label: "Светлый", value: "light" },
            { label: "Тёмный фирменный", value: "primaryDark" },
          ],
        },
      ],
    },
    { name: "title", type: "text", label: "Заголовок" },
    { name: "body", type: "richText", label: "Текст", editor: richTextEditor },
    {
      name: "sideText",
      type: "textarea",
      label: "Текст в плашке справа",
      admin: { condition: (_, sibling) => sibling?.variant === "split" },
    },
    ctaFields(),
    {
      ...linkField(),
      admin: {
        condition: (_, sibling) => sibling?.variant === "strip",
        description: "Напр. «inex.su».",
      },
    },
  ],
};
