import { rel } from "../slugs";
import type { GroupField } from "payload";

/** Card shown in hubs, the mega menu and "Читать также". Empty values fall back to the document. */
export function cardField(): GroupField {
  return {
    name: "card",
    type: "group",
    label: "Карточка",
    admin: {
      description: "Как документ выглядит в хабах, мега-меню и блоке «Читать также».",
    },
    fields: [
      {
        name: "title",
        type: "text",
        label: "Заголовок карточки",
        admin: { description: "Если пусто — заголовок документа." },
      },
      {
        name: "text",
        type: "textarea",
        label: "Подпись",
        admin: { description: "Напр. «приватность без потери света»." },
      },
      {
        type: "row",
        fields: [
          { name: "image", type: "upload", label: "Изображение", relationTo: rel("media") },
          {
            name: "icon",
            type: "text",
            label: "Иконка",
            admin: { description: "Имя иконки Lucide, напр. Layers." },
          },
          {
            name: "priceHint",
            type: "text",
            label: "Подсказка о цене",
            admin: {
              description:
                "Статичная подсказка, напр. «от 700 ₽/м²*». Цены толщин берутся из справочника «Цены».",
            },
          },
        ],
      },
    ],
  };
}
