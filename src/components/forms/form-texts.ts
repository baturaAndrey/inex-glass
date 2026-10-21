import type { FormKey } from "./form-dialog-provider";

/**
 * Every user-facing string of the site forms (task 21) in one place.
 *
 * Sources: teksty/05-kviz.md («Ошибки формы», the screen after sending), teksty/01 (final form),
 * teksty/03 (load), teksty/06 (contacts), teksty/08 («Образцы и цветопроба»), Home.dc.html /
 * Contacts.dc.html (labels, placeholders). Field error messages come from the domain schemas
 * (`@/lib/domain`), not from here.
 *
 * `thankYouTitle` / `thankYouText` / `submitErrorText` are the defaults of `site-settings.forms`:
 * the CMS values win when they are filled (`useFormsConfig()`, `FormSection`).
 */

/** Placeholder of the primary phone in `submitErrorText`. */
export const PHONE_PLACEHOLDER = "{телефон}";

export const FORM_TEXTS = {
  thankYouTitle: "Спасибо, заявка принята",
  thankYouText:
    "Менеджер проверит данные и пришлёт КП — в среднем за 2–3 рабочих дня, для больших объёмов дольше. Связь — звонком и по e-mail.",
  submitErrorText: `Не удалось отправить заявку. Попробуйте ещё раз или позвоните: ${PHONE_PLACEHOLDER}`,
  /** Network/server failure of a file upload (no dedicated text in teksty; same as the quiz). */
  uploadErrorText: "Не удалось загрузить файл. Попробуйте ещё раз",
  closeLabel: "Закрыть",
  /** Small print under the submit button of the drawing / full / contacts forms. */
  kpNote: "КП — в среднем за 2–3 рабочих дня. Работаем с заказами от 50 м².",

  labels: {
    company: "Компания",
    name: "Имя",
    phone: "Телефон",
    email: "E-mail",
    file: "Файл",
    city: "Город доставки",
    area: "Площадь, м²",
    comment: "Комментарий",
    glassKind: "Вид стекла",
    /** Added minimally (not in teksty), approved by the coordinator. */
    address: "Адрес или город",
    description: "Опишите конструкцию: размер стекла, как крепится, где стоит",
    /** Added minimally (not in teksty), approved by the coordinator. */
    sizes: "Размеры, мм",
    /** Added minimally (not in teksty), approved by the coordinator. */
    mounting: "Способ крепления",
  },

  placeholders: {
    company: "ООО «Название»",
    name: "Как к вам обращаться",
    email: "name@company.ru",
    city: "Например, Екатеринбург",
    area: "от 50",
  },

  /** Submit button per form. */
  submit: {
    drawing: "Отправить",
    full: "Получить расчёт",
    callback: "Заказать звонок",
    sample: "Заказать образец",
    load: "Отправить",
    contacts: "Отправить",
  } satisfies Record<FormKey, string>,

  sample: {
    intro: "Образцы — бесплатно, изготовление — около недели.",
    glassKindPlaceholder: "Выберите вид стекла",
  },

  load: {
    intro:
      "Опишите конструкцию — размер стекла, способ крепления, назначение, — и мы подберём толщину или схему триплекса.",
    /** `{N}` — the thickness in mm. Added minimally (not in teksty). */
    thickness: "Толщина: {N} мм",
  },

  /** Default `sourceLabel` of the lead when the trigger passes no `label`. */
  defaultSourceLabel: {
    drawing: "Отправить чертёж",
  } as Partial<Record<FormKey, string>>,

  section: {
    fullHeading: "Отправьте чертёж — посчитаем стоимость и срок",
    fullBullets: ["КП — в среднем за 2–3 рабочих дня.", "Работаем с заказами от 50 м²."],
    contactsHeading: "Отправьте чертёж",
    contactsSub: "КП — в среднем за 2–3 рабочих дня. Работаем с заказами от 50 м².",
  },
} as const;

/**
 * «Вид стекла» options of the sample form, and the `?vid=` ids of the glass-type pages that
 * pre-select them (`params.vid`).
 */
export const SAMPLE_GLASS_KINDS = [
  { value: "Матовое", vid: "matte" },
  { value: "Тонированное", vid: "tinted" },
  { value: "Крашеное по RAL", vid: "painted" },
  { value: "Осветлённое", vid: "low-iron" },
  { value: "Рифлёное", vid: "ribbed" },
  { value: "Другое", vid: null },
] as const;

/** Option label for a glass-type page id, or `''` for an unknown id. */
export function glassKindForVid(vid: unknown): string {
  if (typeof vid !== "string") return "";
  return SAMPLE_GLASS_KINDS.find((kind) => kind.vid === vid)?.value ?? "";
}
