import { statusBadgeColors } from "../constants";
import { loadLeadStatuses } from "../data";
import { Badge, EMPTY } from "../ui";
import type { DefaultServerCellComponentProps } from "payload";

/** List cell of `leads.status`: a badge in the status colour (`lead-statuses.color`). */
export async function StatusCell({ cellData, payload }: DefaultServerCellComponentProps) {
  const id =
    typeof cellData === "object" && cellData !== null
      ? String((cellData as { id?: unknown }).id ?? "")
      : typeof cellData === "string"
        ? cellData
        : "";
  if (!id) return <span>{EMPTY}</span>;

  const status = (await loadLeadStatuses(payload)).find((option) => option.id === id);
  if (!status) return <span>{EMPTY}</span>;
  const colors = statusBadgeColors(status.color);
  return (
    <Badge color={colors.color} background={colors.background}>
      {status.name}
    </Badge>
  );
}
