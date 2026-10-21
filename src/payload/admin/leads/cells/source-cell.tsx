import { formTypeLabel } from "../constants";
import { mutedText, Stack } from "../ui";
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
      {label && label !== form ? <span style={mutedText}>{label}</span> : null}
      {entryPage ? (
        <span style={{ ...mutedText, wordBreak: "break-all" }} title={entryPage}>
          {entryPage}
        </span>
      ) : null}
    </Stack>
  );
}
