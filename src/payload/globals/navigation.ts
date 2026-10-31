import { isAdmin, isAnyone } from "../access";
import { arrayValidator, GROUP_SETTINGS, options, uniqueBy } from "./shared";
import { linkField } from "../fields/link";
import { revalidateGlobal } from "../hooks/revalidate";
import type { ArrayField, Field, GlobalConfig } from "payload";

/*
 * Header and footer menus. Source: res/inex-glass-handoff/zadaniya/02-shapka-podval.md, ТЗ §3.2.
 * The mega-menu contents are seeded by task 16; only simple rows have schema defaults here.
 */

/** Default row of a `{ link }` array pointing to a custom path. */
const customLink = (label: string, url: string) => ({
  link: { type: "custom", url, label, newTab: false },
});

/** Array of `{ link }` rows (every link goes through the shared `linkField()`). */
const linkArray = (
  name: string,
  label: string,
  extra: Partial<Omit<ArrayField, "type" | "name" | "fields">> = {}
): ArrayField => ({
  name,
  type: "array",
  label,
  labels: { singular: "Ссылка", plural: "Ссылки" },
  ...extra,
  fields: [linkField({ required: true })],
});

const text = (name: string, label: string, defaultValue: string): Field => ({
  name,
  type: "text",
  label,
  required: true,
  defaultValue,
});

const checkbox = (name: string, label: string, defaultValue: boolean): Field => ({
  name,
  type: "checkbox",
  label,
  defaultValue,
});

const MEGA_MENU_KEYS = options([
  ["catalog", "Каталог"],
  ["services", "Услуги"],
]);

const megaMenus: ArrayField = {
  name: "megaMenus",
  // Shortens nested table/index names (navigation_mega_menus_columns_links_sub_links_…).
  dbName: "nav_mega",
  type: "array",
  label: "Мега-меню",
  labels: { singular: "Мега-меню", plural: "Мега-меню" },
  maxRows: MEGA_MENU_KEYS.length,
  validate: arrayValidator(uniqueBy("key", "Мега-меню с таким ключом уже есть")),
  admin: { initCollapsed: true },
  fields: [
    {
      type: "row",
      fields: [
        {
          name: "key",
          type: "select",
          label: "Пункт меню",
          required: true,
          options: MEGA_MENU_KEYS,
        },
        { name: "label", type: "text", label: "Заголовок", required: true },
      ],
    },
    {
      name: "columns",
      type: "array",
      label: "Колонки",
      labels: { singular: "Колонка", plural: "Колонки" },
      admin: { initCollapsed: true },
      fields: [
        { name: "title", type: "text", label: "Заголовок колонки", required: true },
        {
          name: "links",
          type: "array",
          label: "Ссылки",
          labels: { singular: "Ссылка", plural: "Ссылки" },
          fields: [
            linkField({ required: true }),
            { name: "hint", type: "text", label: "Подсказка" },
            {
              name: "subLinks",
              type: "array",
              label: "Подссылки (чипсы)",
              labels: { singular: "Подссылка", plural: "Подссылки" },
              admin: { description: "Например, толщины: 4, 6, 8, 10, 12 мм." },
              fields: [
                {
                  type: "row",
                  fields: [
                    { name: "label", type: "text", label: "Текст", required: true },
                    { name: "url", type: "text", label: "Адрес", required: true },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: "promoCard",
      type: "group",
      label: "Карточка «Рассчитать стоимость»",
      fields: [
        checkbox("enabled", "Показывать", true),
        text("title", "Заголовок", "Рассчитать стоимость по чертежу"),
        { name: "text", type: "textarea", label: "Текст" },
        {
          type: "row",
          fields: [
            text("buttonLabel", "Текст кнопки", "Рассчитать стоимость"),
            {
              name: "buttonKind",
              type: "select",
              label: "Действие кнопки",
              required: true,
              defaultValue: "quiz",
              options: options([
                ["quiz", "Открыть квиз"],
                ["link", "Ссылка"],
              ]),
            },
            {
              name: "url",
              type: "text",
              label: "Адрес",
              admin: { condition: (_, sibling) => sibling?.buttonKind === "link" },
            },
          ],
        },
      ],
    },
  ],
};

export const Navigation: GlobalConfig = {
  slug: "navigation",
  label: "Навигация",
  admin: { group: GROUP_SETTINGS, description: "Меню шапки и подвала." },
  access: { read: isAnyone, update: isAdmin },
  hooks: { afterChange: [revalidateGlobal("navigation")] },
  fields: [
    {
      type: "tabs",
      tabs: [
        {
          label: "Верхняя строка",
          fields: [
            {
              name: "topBar",
              type: "group",
              label: "Верхняя строка шапки",
              fields: [
                text("companyLabel", "Пункт «Компания»", "Компания"),
                linkArray("companyItems", "Выпадающий список «Компания»", {
                  defaultValue: [
                    customLink("О компании", "/o-kompanii/"),
                    customLink("Объекты", "/obekty/"),
                    customLink("Контакты", "/kontakty/"),
                    customLink("Реквизиты", "/kontakty/#rekvizity"),
                  ],
                }),
                text("contactLabel", "Пункт «Связаться с нами»", "Связаться с нами"),
                {
                  type: "row",
                  fields: [
                    checkbox("showPhone", "Показывать телефон", true),
                    checkbox("showEmail", "Показывать e-mail", true),
                    checkbox("showMessengers", "Показывать мессенджеры", true),
                  ],
                },
                text("callbackLabel", "Кнопка обратного звонка", "Заказать звонок"),
                linkArray("segments", "Сегменты («Для кого»)", {
                  maxRows: 6,
                  defaultValue: [
                    customLink("Застройщикам", "/klientam/zastrojshchikam/"),
                    customLink("Подрядчикам", "/klientam/podryadchikam/"),
                    customLink("Дизайнерам и архитекторам", "/klientam/dizajneram-i-arhitektoram/"),
                    customLink("Производителям мебели", "/klientam/proizvoditelyam-mebeli/"),
                  ],
                }),
              ],
            },
            {
              name: "actionsLink",
              type: "group",
              label: "Пункт «Акции»",
              admin: { description: "Показывается только при активной акции." },
              fields: [
                {
                  type: "row",
                  fields: [
                    text("label", "Текст", "Акции"),
                    text("url", "Адрес", "/zakalennoe-steklo/#ceny"),
                  ],
                },
              ],
            },
          ],
        },
        {
          label: "Основная строка",
          fields: [
            {
              name: "mainRow",
              type: "group",
              label: "Основная строка шапки",
              fields: [
                {
                  name: "pills",
                  type: "array",
                  label: "Кнопки мега-меню",
                  labels: { singular: "Кнопка", plural: "Кнопки" },
                  maxRows: MEGA_MENU_KEYS.length,
                  validate: arrayValidator(uniqueBy("key", "Кнопка с таким ключом уже есть")),
                  defaultValue: [
                    { key: "services", label: "Услуги" },
                    { key: "catalog", label: "Каталог" },
                  ],
                  fields: [
                    {
                      type: "row",
                      fields: [
                        {
                          name: "key",
                          type: "select",
                          label: "Мега-меню",
                          required: true,
                          options: MEGA_MENU_KEYS,
                        },
                        { name: "label", type: "text", label: "Текст", required: true },
                      ],
                    },
                  ],
                },
                linkArray("links", "Ссылки", {
                  defaultValue: [customLink("Блог", "/blog/")],
                }),
                {
                  type: "row",
                  fields: [
                    text("searchLabel", "Поиск: подпись", "Поиск по сайту"),
                    text("searchPlaceholder", "Поиск: подсказка в поле", "Введите запрос"),
                  ],
                },
                {
                  type: "row",
                  fields: [
                    text("ctaLabel", "Главная кнопка", "Рассчитать стоимость"),
                    text("callbackLabel", "Кнопка обратного звонка", "Заказать звонок"),
                  ],
                },
                {
                  type: "row",
                  fields: [
                    text("myCalcLabel", "«Мой расчёт»: текст", "Мой расчёт"),
                    text("myCalcUrl", "«Мой расчёт»: адрес", "/raschet-stoimosti/?resume=1"),
                  ],
                },
              ],
            },
            {
              name: "sectionRow",
              type: "group",
              label: "Строка разделов",
              fields: [
                linkArray("items", "Разделы", {
                  maxRows: 12,
                  defaultValue: [
                    customLink("Закалённое стекло", "/zakalennoe-steklo/"),
                    customLink("Триплекс", "/tripleks/"),
                    customLink("Обработка стекла", "/obrabotka-stekla/"),
                    customLink("Стеклянные перегородки", "/steklyannye-peregorodki/"),
                    customLink("Ограждения", "/steklyannye-ograzhdeniya/"),
                    customLink("Козырьки", "/steklyannye-kozyrki/"),
                    customLink("Остекление зданий", "/osteklenie/"),
                    customLink("Стекло для мебели", "/zakalennoe-steklo/dlya-mebeli/"),
                    customLink("Зеркала", "/zerkala/"),
                  ],
                }),
                {
                  type: "row",
                  fields: [
                    {
                      name: "laptopVisibleCount",
                      type: "number",
                      label: "Видно на ноутбуке (1280–1365 px)",
                      required: true,
                      defaultValue: 5,
                      min: 1,
                      max: 12,
                      admin: { description: "Остальные разделы — под «Ещё»." },
                    },
                    text("moreLabel", "Пункт «Ещё»", "Ещё"),
                  ],
                },
              ],
            },
          ],
        },
        {
          label: "Мега-меню",
          fields: [megaMenus],
        },
        {
          label: "Подвал",
          fields: [
            {
              name: "footer",
              type: "group",
              label: "Подвал",
              fields: [
                {
                  name: "columns",
                  type: "array",
                  label: "Колонки",
                  labels: { singular: "Колонка", plural: "Колонки" },
                  admin: {
                    initCollapsed: true,
                    description:
                      "«Каталог», «Услуги», «Компания». Колонка «Контакты» строится из справочника «Контакты».",
                  },
                  fields: [
                    { name: "title", type: "text", label: "Заголовок", required: true },
                    linkArray("links", "Ссылки"),
                  ],
                },
                linkArray("bottomLinks", "Ссылки внизу подвала", {
                  defaultValue: [
                    customLink(
                      "Политика обработки персональных данных",
                      "/politika-konfidencialnosti/"
                    ),
                    customLink(
                      "Согласие на обработку персональных данных",
                      "/soglasie-na-obrabotku-personalnyh-dannyh/"
                    ),
                  ],
                }),
                checkbox("showContactsColumn", "Показывать колонку «Контакты»", true),
              ],
            },
          ],
        },
      ],
    },
  ],
};
