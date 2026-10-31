import { richTextEditor } from "../editor";
import { scopedDbName } from "../fields/db-name";
import { rel } from "../slugs";
import { ctaFields } from "./_cta";
import type { Block } from "payload";

/** First screen. Without section chrome: the hero is always the top of the page. */
export const HeroBlock: Block = {
  slug: "hero",
  dbName: scopedDbName("blk_hero"),
  interfaceName: "HeroBlock",
  labels: { singular: "Первый экран", plural: "Первые экраны" },
  fields: [
    {
      name: "variant",
      type: "select",
      label: "Вариант",
      required: true,
      defaultValue: "ctHero",
      options: [
        { label: "Каталог / конструкции (ct-hero)", value: "ctHero" },
        { label: "Карточка толщины (p5-top)", value: "p5Top" },
        { label: "Главная", value: "home" },
      ],
    },
    {
      name: "eyebrow",
      type: "array",
      label: "Надзаголовок (метки)",
      labels: { singular: "Метка", plural: "Метки" },
      fields: [{ name: "text", type: "text", label: "Текст", required: true }],
    },
    {
      name: "titleOverride",
      type: "text",
      label: "Заголовок",
      admin: { description: "Если пусто — H1 документа." },
    },
    { name: "lead", type: "richText", label: "Вводный текст", editor: richTextEditor },
    {
      name: "facts",
      type: "textarea",
      label: "Строка фактов (ct-facts)",
      admin: { description: "Допускает метки, напр. {условия}." },
    },
    { name: "strong", type: "text", label: "Выделенная строка (ct-strong)" },
    ctaFields(),
    {
      type: "row",
      fields: [
        { name: "showTerms", type: "checkbox", label: "Показывать условия", defaultValue: true },
        {
          name: "termsMode",
          type: "select",
          label: "Условия",
          defaultValue: "full",
          options: [
            { label: "Полностью", value: "full" },
            { label: "Кратко", value: "short" },
          ],
          admin: { condition: (_, sibling) => Boolean(sibling?.showTerms) },
        },
      ],
    },
    {
      type: "row",
      fields: [
        { name: "image", type: "upload", label: "Изображение", relationTo: rel("media") },
        { name: "imageAlt", type: "text", label: "Alt изображения" },
      ],
    },
    {
      name: "photos",
      type: "array",
      label: "Фото",
      labels: { singular: "Фото", plural: "Фото" },
      fields: [
        {
          name: "image",
          type: "upload",
          label: "Изображение",
          relationTo: rel("media"),
          required: true,
        },
        { name: "caption", type: "text", label: "Подпись" },
      ],
    },
    {
      name: "bigNumber",
      type: "text",
      label: "Крупное число (th-big)",
      admin: { description: "Напр. «10» — единица «мм» добавляется при выводе." },
    },
    {
      name: "stats",
      type: "array",
      label: "Плитки статистики (главная)",
      labels: { singular: "Плитка", plural: "Плитки" },
      fields: [
        {
          type: "row",
          fields: [
            { name: "value", type: "text", label: "Значение", required: true },
            { name: "text", type: "text", label: "Подпись" },
          ],
        },
      ],
    },
  ],
};
