import { adminOrManagerFieldAccess, isAdmin, isAdminOrManager } from "../access";
import { revalidateGlobal } from "../hooks/revalidate";
import { rel } from "../slugs";
import { arrayValidator, DAY_ONLY, GROUP_SETTINGS, options, uniqueBy } from "./shared";
import type { Field, GlobalConfig, TextFieldSingleValidation } from "payload";

/** The only allowed wording of the experience claim (ТЗ, 16-tz-razrabotka). */
export const CANONICAL_EXPERIENCE_TEXT = "За 21 год специалисты Inex выполнили более 1500 проектов";

/** Order statuses (ТЗ §6.2) in display order; keys are shared with the `orders` collection. */
export const ORDER_STATUSES = [
  ["spec_agreed", "Спецификация согласована"],
  ["in_production", "В производстве"],
  ["packed", "Упаковано"],
  ["shipped", "Отгружено"],
  ["received", "Получено"],
] as const;

const validateMetrikaId: TextFieldSingleValidation = (value) =>
  !value || /^\d+$/.test(value) ? true : "Номер счётчика — только цифры";

/** Optional text field with a default value. */
const text = (name: string, label: string, defaultValue?: string): Field => ({
  name,
  type: "text",
  label,
  ...(defaultValue === undefined ? {} : { defaultValue }),
});

const media = (name: string, label: string, description?: string): Field => ({
  name,
  type: "upload",
  label,
  relationTo: rel("media"),
  ...(description ? { admin: { description } } : {}),
});

export const SiteSettings: GlobalConfig = {
  slug: "site-settings",
  label: "Настройки сайта",
  admin: { group: GROUP_SETTINGS },
  // Contains notification e-mails, so it is not publicly readable; the site reads it via Local API.
  access: { read: isAdminOrManager, update: isAdmin },
  hooks: { afterChange: [revalidateGlobal("site-settings")] },
  fields: [
    {
      type: "tabs",
      tabs: [
        {
          label: "Общее",
          fields: [
            {
              name: "experienceText",
              type: "text",
              label: "Формулировка опыта",
              required: true,
              defaultValue: CANONICAL_EXPERIENCE_TEXT,
              admin: {
                description: `Единственно допустимая формулировка: «${CANONICAL_EXPERIENCE_TEXT}». Меняйте только по согласованию с Inex.`,
              },
            },
            {
              name: "experienceYears",
              type: "number",
              label: "Лет опыта",
              required: true,
              defaultValue: 21,
              min: 0,
            },
            {
              name: "orderLinkTtlDays",
              type: "number",
              label: "Срок жизни ссылки на заказ, дней",
              required: true,
              defaultValue: 90,
              min: 1,
              admin: { description: "Отсчитывается от статуса «Получено»." },
            },
            {
              name: "holidays",
              type: "array",
              label: "Производственный календарь",
              labels: { singular: "День", plural: "Дни" },
              validate: arrayValidator(uniqueBy("date", "Дата повторяется")),
              admin: {
                initCollapsed: true,
                description:
                  "Праздники РФ для расчёта рабочих дней. «Рабочий день» — перенесённый рабочий день (выходной, ставший рабочим).",
              },
              fields: [
                {
                  type: "row",
                  fields: [
                    {
                      name: "date",
                      type: "date",
                      label: "Дата",
                      required: true,
                      admin: { date: DAY_ONLY },
                    },
                    { name: "name", type: "text", label: "Название" },
                    {
                      name: "isWorkday",
                      type: "checkbox",
                      label: "Рабочий день",
                      defaultValue: false,
                    },
                  ],
                },
              ],
            },
            {
              name: "stopWords",
              type: "array",
              label: "Стоп-слова",
              labels: { singular: "Стоп-слово", plural: "Стоп-слова" },
              admin: {
                initCollapsed: true,
                description:
                  "Для аудита контента (ТЗ §11). «Завод» — названия заводов-партнёров (задаёт заказчик).",
              },
              fields: [
                {
                  type: "row",
                  fields: [
                    { name: "word", type: "text", label: "Слово / фраза", required: true },
                    {
                      name: "kind",
                      type: "select",
                      label: "Тип",
                      required: true,
                      defaultValue: "stem",
                      options: options([
                        ["stem", "Основа слова"],
                        ["phrase", "Фраза"],
                        ["factory", "Завод"],
                      ]),
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: "Аналитика и брендинг",
          fields: [
            {
              name: "analytics",
              type: "group",
              label: "Аналитика",
              fields: [
                {
                  type: "row",
                  fields: [
                    {
                      name: "metrikaId",
                      type: "text",
                      label: "Номер счётчика Яндекс.Метрики",
                      validate: validateMetrikaId,
                    },
                    {
                      name: "webvisor",
                      type: "checkbox",
                      label: "Вебвизор",
                      defaultValue: true,
                    },
                  ],
                },
                {
                  type: "row",
                  fields: [
                    text("yandexVerification", "Код подтверждения Яндекс.Вебмастера"),
                    text("googleVerification", "Код подтверждения Google Search Console"),
                  ],
                },
              ],
            },
            {
              name: "indexNow",
              type: "group",
              label: "IndexNow",
              fields: [
                {
                  name: "enabled",
                  type: "checkbox",
                  label: "Отправлять изменения в IndexNow",
                  defaultValue: false,
                },
              ],
            },
            {
              name: "branding",
              type: "group",
              label: "Брендинг",
              fields: [
                {
                  type: "row",
                  fields: [
                    media("logoDark", "Логотип (тёмный)"),
                    media("logoLight", "Логотип (светлый)"),
                  ],
                },
                {
                  type: "row",
                  fields: [
                    media("logoPng", "Логотип PNG для писем", "@2x"),
                    media("favicon", "Favicon"),
                  ],
                },
                media("defaultOgImage", "OG-изображение по умолчанию"),
              ],
            },
          ],
        },
        {
          label: "Уведомления и заказы",
          fields: [
            {
              name: "notifications",
              type: "group",
              label: "Уведомления",
              access: { read: adminOrManagerFieldAccess },
              fields: [
                {
                  name: "leadNotifyEmails",
                  // Keeps index names well below the 63-char Postgres identifier limit.
                  dbName: "site_settings_lead_emails",
                  type: "array",
                  label: "E-mail для уведомлений о заявках",
                  labels: { singular: "E-mail", plural: "E-mail" },
                  admin: { description: "Общий ящик (несколько адресов)." },
                  fields: [{ name: "email", type: "email", label: "E-mail", required: true }],
                },
                {
                  type: "row",
                  fields: [
                    text("fromName", "Имя отправителя", "Inex Glass"),
                    { name: "replyTo", type: "email", label: "Адрес для ответа (Reply-To)" },
                  ],
                },
                {
                  name: "ccAssignee",
                  type: "checkbox",
                  label: "Копия ответственному менеджеру",
                  defaultValue: false,
                },
              ],
            },
            {
              name: "orderStatuses",
              type: "array",
              label: "Статусы заказа",
              labels: { singular: "Статус", plural: "Статусы" },
              required: true,
              minRows: ORDER_STATUSES.length,
              maxRows: ORDER_STATUSES.length,
              defaultValue: ORDER_STATUSES.map(([key, label]) => ({ key, label })),
              validate: arrayValidator(uniqueBy("key", "Статус повторяется")),
              admin: { description: "Ровно 5 статусов. Тексты писем задаёт seed." },
              fields: [
                {
                  type: "row",
                  fields: [
                    {
                      name: "key",
                      type: "select",
                      label: "Статус",
                      required: true,
                      options: options(ORDER_STATUSES),
                    },
                    { name: "label", type: "text", label: "Название", required: true },
                  ],
                },
                {
                  name: "emailText",
                  type: "textarea",
                  label: "Абзац письма",
                },
              ],
            },
            {
              name: "orderPage",
              type: "group",
              label: "Страница и письма заказа",
              fields: [
                text(
                  "expiredTitle",
                  "Ссылка недействительна",
                  "Ссылка больше не действует — свяжитесь с менеджером"
                ),
                text("emptyPhotosText", "Нет фото", "Фото появятся при отгрузке"),
                {
                  type: "row",
                  fields: [
                    text("copyLabel", "Кнопка «Скопировать»", "Скопировать"),
                    text("copiedLabel", "Скопировано", "Скопировано"),
                  ],
                },
                {
                  name: "emailSubject",
                  type: "text",
                  label: "Тема письма",
                  defaultValue: "Статус заказа № {номер}: {статус}",
                  admin: { description: "Метки: {номер}, {статус}." },
                },
                text("emailButton", "Кнопка в письме", "Открыть страницу заказа"),
                text("emailSignatureTitle", "Подпись в письме", "Менеджер по заказам Inex Glass"),
                text(
                  "emailFooterNote",
                  "Примечание в подвале письма",
                  "Вы получили это письмо, потому что оформили заказ в Inex Glass."
                ),
              ],
            },
          ],
        },
        {
          label: "Формы и согласия",
          fields: [
            {
              name: "forms",
              type: "group",
              label: "Формы",
              fields: [
                text("thankYouTitle", "Заголовок «Спасибо»", "Спасибо, заявка принята"),
                {
                  name: "thankYouText",
                  type: "textarea",
                  label: "Текст «Спасибо»",
                  defaultValue:
                    "Менеджер проверит данные и пришлёт КП — в среднем за 2–3 рабочих дня. Связь — звонком и по e-mail",
                },
                {
                  name: "submitErrorText",
                  type: "textarea",
                  label: "Ошибка отправки",
                  defaultValue:
                    "Не удалось отправить заявку. Попробуйте ещё раз или позвоните: {телефон}",
                },
                {
                  type: "row",
                  fields: [
                    {
                      name: "antispamMinSeconds",
                      type: "number",
                      label: "Антиспам: мин. время заполнения, с",
                      required: true,
                      defaultValue: 3,
                      min: 0,
                    },
                    {
                      name: "antispamMaxHours",
                      type: "number",
                      label: "Антиспам: макс. возраст формы, ч",
                      required: true,
                      defaultValue: 2,
                      min: 1,
                    },
                  ],
                },
              ],
            },
            {
              name: "consent",
              type: "group",
              label: "Согласие на обработку ПДн",
              fields: [
                {
                  type: "row",
                  fields: [
                    {
                      name: "consentVersion",
                      type: "text",
                      label: "Версия согласия",
                      admin: { description: "Например: 2026-10-20. Пишется в журнал согласий." },
                    },
                    text("policyVersion", "Версия политики"),
                  ],
                },
                text(
                  "errorText",
                  "Ошибка без согласия",
                  "Чтобы отправить заявку, отметьте согласие на обработку персональных данных"
                ),
              ],
            },
            {
              name: "cookieBanner",
              type: "group",
              label: "Cookie-баннер",
              fields: [
                {
                  name: "text",
                  type: "textarea",
                  label: "Текст",
                  defaultValue:
                    "Мы используем файлы cookie и Яндекс.Метрику, чтобы сайт работал удобнее, а мы понимали, какие разделы полезны. Подробнее — в {политике обработки персональных данных}.",
                  admin: { description: "Слова в {фигурных скобках} — ссылка на политику." },
                },
                {
                  type: "row",
                  fields: [
                    text("acceptLabel", "Кнопка «Принять»", "Принять"),
                    text("necessaryLabel", "Кнопка «Только необходимые»", "Только необходимые"),
                  ],
                },
              ],
            },
            {
              name: "notFound",
              type: "group",
              label: "Страница 404",
              fields: [
                text("title", "Заголовок", "Страница не найдена"),
                { name: "text", type: "textarea", label: "Текст" },
                text("linksTitle", "Заголовок ссылок", "Разделы сайта"),
              ],
            },
          ],
        },
      ],
    },
  ],
};
