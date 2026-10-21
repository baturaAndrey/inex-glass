import { DUPLICATE_BADGE_COLORS, leadAdminPath } from "../constants";
import { Badge } from "../ui";
import type { DefaultServerCellComponentProps } from "payload";

const DUPLICATE_REASON_TEXT: Readonly<Record<string, string>> = {
  phone: "совпал телефон",
  email: "совпал e-mail",
  both: "совпали телефон и e-mail",
};

/** List cell on `leads.isDuplicate`: amber «Повтор» badge linking to the original lead. */
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
    <Badge
      color={DUPLICATE_BADGE_COLORS.color}
      background={DUPLICATE_BADGE_COLORS.background}
      title={reason ? `Повтор: ${reason}` : "Повторное обращение"}
    >
      Повтор
    </Badge>
  );
  if (!original) return badge;
  return (
    <a href={leadAdminPath(original)} aria-label="Открыть исходную заявку">
      {badge}
    </a>
  );
}
