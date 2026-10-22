"use client";

import { useState } from "react";
import { PopupList, useAuth, useDocumentInfo } from "@payloadcms/ui";
import { EraseDialog } from "./card/erase-dialog";

/**
 * «Удалить персональные данные…» in the document «⋯» menu of a lead (152-ФЗ erasure request).
 * Rendered for admins only; the endpoint re-checks the role, the origin and the confirmation.
 * The dialog itself is shared with the lead card (`card/erase-dialog.tsx`).
 */
export function EraseMenuItem() {
  const { user } = useAuth();
  const { id } = useDocumentInfo();
  const [open, setOpen] = useState(false);

  if ((user as { role?: unknown } | null)?.role !== "admin" || !id) return null;

  return (
    <>
      <PopupList.Button id="action-erase-personal-data" onClick={() => setOpen(true)}>
        Удалить персональные данные…
      </PopupList.Button>
      <EraseDialog leadId={String(id)} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
