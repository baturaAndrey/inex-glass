/**
 * Select options of the CRM module (ТЗ §6.1, §6.2).
 *
 * Values are part of the DB schema (Postgres enums) and are frozen by task 10. The quiz role and
 * product-type ids must stay identical to `QUIZ_ROLES` / `QUIZ_TYPES` of the domain (task 11):
 * task 17 writes quiz answers into `leads` without any mapping.
 */

type Option<T extends string> = { readonly label: string; readonly value: T };

export const LEAD_FORM_TYPES = [
  { label: "Квиз", value: "quiz" },
  { label: "Отправить чертёж", value: "drawing" },
  { label: "Заказать звонок", value: "callback" },
  { label: "Заказать образец", value: "sample" },
  { label: "Подобрать под нагрузку", value: "load" },
  { label: "Контакты", value: "contacts" },
  { label: "Полная форма", value: "full" },
] as const satisfies readonly Option<string>[];

export const LEAD_ROLES = [
  { label: "Подрядчик", value: "contractor" },
  { label: "Производитель мебели или изделий", value: "manufacturer" },
  { label: "Застройщик или генподрядчик", value: "developer" },
  { label: "Дизайнер или архитектор", value: "designer" },
  { label: "Другое", value: "other" },
] as const satisfies readonly Option<string>[];

export const LEAD_PRODUCT_TYPES = [
  { label: "Закалённое стекло", value: "tempered" },
  { label: "Триплекс", value: "triplex" },
  { label: "Перегородки", value: "partitions" },
  { label: "Ограждения", value: "railings" },
  { label: "Душевые", value: "shower" },
  { label: "Козырьки", value: "canopies" },
  { label: "Фасады", value: "facade" },
  { label: "Витрины", value: "shopfronts" },
  { label: "Веранды", value: "verandas" },
  { label: "Зеркала", value: "mirrors" },
  { label: "Другое", value: "other" },
] as const satisfies readonly Option<string>[];

export const LEAD_FLAGS = [
  { label: "Малый объём", value: "small_volume" },
  { label: "Нестандартный размер", value: "nonstandard_size" },
  { label: "Срочно", value: "urgent" },
  { label: "Без файла", value: "no_file" },
  { label: "Нужны документы", value: "needs_docs" },
] as const satisfies readonly Option<string>[];

export const DUPLICATE_REASONS = [
  { label: "Телефон", value: "phone" },
  { label: "E-mail", value: "email" },
  { label: "Телефон и e-mail", value: "both" },
] as const satisfies readonly Option<string>[];

export type DuplicateReason = (typeof DUPLICATE_REASONS)[number]["value"];

export const LEAD_FILE_KINDS = [
  { label: "DWG", value: "dwg" },
  { label: "DXF", value: "dxf" },
  { label: "PDF", value: "pdf" },
  { label: "PNG", value: "png" },
  { label: "JPEG", value: "jpeg" },
] as const satisfies readonly Option<string>[];

export const LEAD_FILE_SOURCES = [
  { label: "Квиз", value: "quiz" },
  { label: "Форма", value: "form" },
] as const satisfies readonly Option<string>[];

/**
 * Order stages in their natural sequence: the index is the stage rank, so the current status
 * is the history entry with the highest index.
 */
export const ORDER_STATUSES = [
  { label: "Спецификация согласована", value: "spec_agreed" },
  { label: "В производстве", value: "in_production" },
  { label: "Упаковано", value: "packed" },
  { label: "Отгружено", value: "shipped" },
  { label: "Получено", value: "received" },
] as const satisfies readonly Option<string>[];

export type OrderStatus = (typeof ORDER_STATUSES)[number]["value"];

export const ORDER_DOCUMENT_KINDS = [
  { label: "Спецификация", value: "spec" },
  { label: "Паспорт", value: "passport" },
  { label: "Сертификат", value: "certificate" },
  { label: "Другое", value: "other" },
] as const satisfies readonly Option<string>[];

export const ORDER_FILE_KINDS = [
  { label: "Фото", value: "photo" },
  { label: "Документ", value: "document" },
] as const satisfies readonly Option<string>[];

export const MESSENGER_TYPES = [
  { label: "Telegram", value: "telegram" },
  { label: "WhatsApp", value: "whatsapp" },
  { label: "MAX", value: "max" },
  { label: "Viber", value: "viber" },
  { label: "Другой", value: "other" },
] as const satisfies readonly Option<string>[];

export const REDIRECT_CODES = [
  { label: "301 — постоянный", value: "301" },
  { label: "308 — постоянный (с сохранением метода)", value: "308" },
] as const satisfies readonly Option<string>[];

/** Refusal reason of a lead (admin redesign): drives the funnel breakdown on the dashboard. */
export const LEAD_REFUSE_REASON_CODES = [
  { label: "Дорого", value: "expensive" },
  { label: "Выбрали другого поставщика", value: "other_supplier" },
  { label: "Нужен монтаж", value: "needs_installation" },
  { label: "Не дозвонились", value: "no_contact" },
  { label: "Другое", value: "other" },
] as const satisfies readonly Option<string>[];

export type LeadRefuseReasonCode = (typeof LEAD_REFUSE_REASON_CODES)[number]["value"];

/** `notification-log.channel`: the MAX group chat or a staff member's direct chat. */
export const NOTIFICATION_CHANNELS = [
  { label: "Групповой чат", value: "group" },
  { label: "Личные сообщения", value: "user" },
] as const satisfies readonly Option<string>[];

/** `notification-log.event`. */
export const NOTIFICATION_EVENTS = [
  { label: "Новая заявка", value: "new_lead" },
  { label: "Смена статуса", value: "status_change" },
  { label: "Назначение ответственного", value: "assigned" },
  { label: "Событие заказа", value: "order_event" },
  { label: "Напоминание: без ответственного", value: "unassigned_reminder" },
] as const satisfies readonly Option<string>[];

/** `notification-log.status`. */
export const NOTIFICATION_STATUSES = [
  { label: "Отправляется", value: "pending" },
  { label: "Отправлено", value: "sent" },
  { label: "Ошибка", value: "failed" },
  { label: "Пропущено", value: "skipped" },
] as const satisfies readonly Option<string>[];

/** Staff roles allowed as lead assignee / order manager. */
export const STAFF_ROLES = ["admin", "manager"] as const;

/** Mutable copy for Payload `options` (its type is not readonly). */
export const toOptions = <T extends string>(options: readonly Option<T>[]) =>
  options.map(({ label, value }) => ({ label, value }));
