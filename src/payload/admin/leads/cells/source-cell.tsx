import { formTypeLabel } from "../constants";
import { MUTED_CLASS, Stack } from "../ui";
import type { DefaultServerCellComponentProps } from "payload";

/**
 * List cell on `leads.formType`: the form («Квиз», «Отправить чертёж» …), the source label
 * when it adds something, and the entry page below.
 */
export function SourceCell({ cellData, rowData }: DefaultServerCellComponentProps) {
  const form = formTypeLabel(cellData);
  const label = typeof rowData.sourceLabel === "string" ? rowData.sourceLabel.trim() : "";
  const entryPage = typeof rowData.entryPage === "string" ? rowData.entryPage.trim() : "";
  return (
    <Stack>
      <span>{form}</span>
      {label && label !== form ? <span className={MUTED_CLASS}>{label}</span> : null}
      {entryPage ? (
        <span className={`${MUTED_CLASS} iga-screens-break`} title={entryPage}>
          {entryPage}
        </span>
      ) : null}
    </Stack>
  );
}
