"use client";

import { useState } from "react";
import { EraseDialog } from "./erase-dialog";

/**
 * «Удалить персональные данные» in the consent block of the lead card. The server view renders it
 * for admins only; the erase endpoint re-checks the role.
 */
export function EraseButton({ leadId }: { leadId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="iga-btn iga-btn--danger iga-btn--sm iga-lead__erase"
        onClick={() => setOpen(true)}
      >
        Удалить персональные данные
      </button>
      <EraseDialog leadId={leadId} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
