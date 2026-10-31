import { formatDateRu, tryDateKey } from "@/lib/domain";
import { ORDER_STATUSES } from "@/payload/collections/crm/constants";
import type { OrderStatus } from "@/payload/collections/crm/constants";
import { Button, DetailsTable, EmailLayout, Heading, NoteBox, Paragraph } from "./layout";
import type { DetailRow, FooterContacts, Signature } from "./layout";

/** Client e-mail on every order status change (ТЗ §6.2, prototype `Email.dc.html`). */

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = Object.fromEntries(
  ORDER_STATUSES.map(({ value, label }) => [value, label])
) as Record<OrderStatus, string>;

export const ORDER_EMAIL_DEFAULTS = {
  subject: "Статус заказа № {номер}: {статус}",
  button: "Открыть страницу заказа",
  signatureTitle: "Менеджер по заказам Inex Glass",
  footerReason: "Вы получили это письмо, потому что оформили заказ в Inex Glass.",
  paragraphWithPhotos:
    "Фото упаковки, документы на партию и ссылка на отслеживание — на странице заказа.",
  paragraphDefault: "Все этапы заказа и документы — на странице заказа.",
} as const;

/** Statuses after which packing photos / documents / tracking exist on the order page. */
const STATUSES_WITH_PHOTOS: ReadonlySet<OrderStatus> = new Set(["packed", "shipped"]);

export type OrderStatusEmailProps = {
  siteUrl: string;
  footer: FooterContacts;
  orderNumber: string;
  status: OrderStatus;
  /** From `site-settings.orderStatuses[].label`; falls back to the canonical label. */
  statusLabel?: string | null;
  /** Date of the status entry and its planned date (calendar dates). */
  date?: string | null;
  plannedDate?: string | null;
  carrier?: string | null;
  waybill?: string | null;
  clientComment?: string | null;
  /** From `site-settings.orderStatuses[].emailText`; replaces the default paragraph. */
  statusText?: string | null;
  orderUrl: string;
  signature: Signature;
  buttonLabel?: string | null;
  footerReason?: string | null;
};

const clean = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const dateRu = (value: string | null | undefined) => {
  const key = tryDateKey(value ?? null);
  return key === null ? null : formatDateRu(key);
};

export const orderStatusLabel = (status: OrderStatus, custom?: string | null) =>
  clean(custom) ?? ORDER_STATUS_LABELS[status];

/** Subject from the settings template: `{номер}` and `{статус}` placeholders. */
export function orderStatusSubject(
  template: string | null | undefined,
  orderNumber: string,
  statusLabel: string
): string {
  return (clean(template) ?? ORDER_EMAIL_DEFAULTS.subject)
    .replaceAll("{номер}", orderNumber)
    .replaceAll("{статус}", statusLabel);
}

/** Rows of the details table; rows without data are omitted. */
export function orderStatusRows(props: OrderStatusEmailProps): DetailRow[] {
  const rows: DetailRow[] = [];
  const add = (label: string, value: string | null) => {
    if (value) rows.push({ label, value });
  };
  if (props.status === "shipped") {
    add("Дата отгрузки", dateRu(props.date));
    add("Транспортная компания", clean(props.carrier));
    add("Номер накладной", clean(props.waybill));
  } else {
    add("Дата", dateRu(props.date));
    add("Плановая дата", dateRu(props.plannedDate));
  }
  return rows;
}

export function OrderStatusEmail(props: OrderStatusEmailProps) {
  const label = orderStatusLabel(props.status, props.statusLabel);
  const title = `Статус заказа № ${props.orderNumber}: ${label}`;
  const paragraph =
    clean(props.statusText) ??
    (STATUSES_WITH_PHOTOS.has(props.status)
      ? ORDER_EMAIL_DEFAULTS.paragraphWithPhotos
      : ORDER_EMAIL_DEFAULTS.paragraphDefault);
  const comment = clean(props.clientComment);

  return (
    <EmailLayout
      preview={title}
      siteUrl={props.siteUrl}
      footer={props.footer}
      eyebrow="Статус заказа"
      signature={props.signature}
      footerReason={clean(props.footerReason) ?? ORDER_EMAIL_DEFAULTS.footerReason}
    >
      <Heading>{title}</Heading>
      <DetailsTable rows={orderStatusRows(props)} />
      {comment ? <NoteBox>{comment}</NoteBox> : null}
      <Paragraph>{paragraph}</Paragraph>
      <Button href={props.orderUrl}>
        {clean(props.buttonLabel) ?? ORDER_EMAIL_DEFAULTS.button}
      </Button>
    </EmailLayout>
  );
}
