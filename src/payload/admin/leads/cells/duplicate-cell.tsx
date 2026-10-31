import { leadAdminPath } from "../constants";
import type { DefaultServerCellComponentProps } from "payload";

const DUPLICATE_REASON_TEXT: Readonly<Record<string, string>> = {
  phone: "совпал телефон",
  email: "совпал e-mail",
  both: "совпали телефон и e-mail",
};

/** List cell on `leads.isDuplicate`: amber «Повтор» badge (`.iga-badge--work`) linking to the original lead. */
export function DuplicateCell({ cellData, rowData }: DefaultServerCellComponentProps) {
  if (cellData !== true) return null;
  const original =
    typeof rowData.duplicateOf === "string"
      ? rowData.duplicateOf
      : typeof rowData.duplicateOf === "object" && rowData.duplicateOf !== null
        ? String((rowData.duplicateOf as { id?: unknown }).id ?? "")
        : "";
  const reason =
    typeof rowData.duplicateReason === "string"
      ? DUPLICATE_REASON_TEXT[rowData.duplicateReason]
      : undefined;
  const badge = (
    <span
      className="iga-badge iga-badge--work"
      title={reason ? `Повтор: ${reason}` : "Повторное обращение"}
    >
      Повтор
    </span>
  );
  if (!original) return badge;
  return (
    <a href={leadAdminPath(original)} aria-label="Открыть исходную заявку">
      {badge}
    </a>
  );
}
