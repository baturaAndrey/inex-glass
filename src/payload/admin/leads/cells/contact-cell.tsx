import { EMPTY, MUTED_CLASS, Stack } from "../ui";
import type { DefaultServerCellComponentProps } from "payload";

/** List cell on `leads.name`: name, phone and e-mail of the client in one cell. */
export function ContactCell({ cellData, rowData }: DefaultServerCellComponentProps) {
  const name = typeof cellData === "string" && cellData.trim() !== "" ? cellData : EMPTY;
  const phone = typeof rowData.phone === "string" ? rowData.phone : null;
  const email = typeof rowData.email === "string" ? rowData.email : null;
  return (
    <Stack>
      <span>{name}</span>
      {phone ? <span className={MUTED_CLASS}>{phone}</span> : null}
      {email ? <span className={MUTED_CLASS}>{email}</span> : null}
    </Stack>
  );
}
