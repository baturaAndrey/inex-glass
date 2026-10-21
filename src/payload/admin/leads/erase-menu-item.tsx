"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { Button, Modal, PopupList, useAuth, useDocumentInfo, useModal } from "@payloadcms/ui";
import { ERASE_CONFIRM_WORD, leadEraseApiPath, LEADS_LIST_PATH } from "./constants";

/**
 * «Удалить персональные данные…» in the document «⋯» menu of a lead (152-ФЗ erasure request).
 * Rendered for admins only; the endpoint re-checks the role, the origin and the confirmation.
 * On success the browser goes to the leads list; a 409 (lead with an order) shows the server's
 * explanation in the dialog.
 */

const MODAL_SLUG = "lead-erase-personal-data";

const dialogStyle: CSSProperties = {
  maxWidth: "520px",
  margin: "15vh auto 0",
  padding: "24px",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  background: "var(--theme-elevation-0)",
  color: "var(--theme-elevation-800)",
  border: "1px solid var(--theme-elevation-150)",
  borderRadius: "var(--style-radius-m, 4px)",
  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.2)",
};

const inputStyle: CSSProperties = {
  height: "36px",
  padding: "0 10px",
  border: "1px solid var(--theme-elevation-150)",
  borderRadius: "var(--style-radius-s, 4px)",
  background: "var(--theme-input-bg, var(--theme-elevation-0))",
  color: "var(--theme-elevation-800)",
  fontSize: "14px",
};

export function EraseMenuItem() {
  const { user } = useAuth();
  const { id } = useDocumentInfo();
  const { openModal, closeModal } = useModal();
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if ((user as { role?: unknown } | null)?.role !== "admin" || !id) return null;

  const close = () => {
    if (pending) return;
    setConfirm("");
    setError(null);
    closeModal(MODAL_SLUG);
  };

  const erase = async () => {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(leadEraseApiPath(String(id)), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: ERASE_CONFIRM_WORD }),
      });
      if (response.ok) {
        window.location.assign(LEADS_LIST_PATH);
        return;
      }
      const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
      setError(typeof body?.error === "string" ? body.error : `Ошибка ${response.status}`);
    } catch {
      setError("Сервер недоступен, попробуйте ещё раз");
    }
    setPending(false);
  };

  return (
    <>
      <PopupList.Button id="action-erase-personal-data" onClick={() => openModal(MODAL_SLUG)}>
        Удалить персональные данные…
      </PopupList.Button>
      <Modal slug={MODAL_SLUG} closeOnBlur={!pending}>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${MODAL_SLUG}-title`}
          style={dialogStyle}
        >
          <h2 id={`${MODAL_SLUG}-title`} style={{ margin: 0, fontSize: "20px" }}>
            Удалить персональные данные
          </h2>
          <p style={{ margin: 0 }}>
            Заявка, все её версии и файлы будут удалены без возможности восстановления. Запись
            журнала согласий останется без IP и User-Agent как подтверждение факта согласия.
            Повторные обращения этого клиента удаляются отдельно.
          </p>
          <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            Для подтверждения введите «{ERASE_CONFIRM_WORD}»
            <input
              style={inputStyle}
              value={confirm}
              autoComplete="off"
              disabled={pending}
              onChange={(event) => setConfirm(event.target.value)}
            />
          </label>
          {error ? (
            <p role="alert" style={{ margin: 0, color: "var(--theme-error-500)" }}>
              {error}
            </p>
          ) : null}
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <Button buttonStyle="secondary" margin={false} disabled={pending} onClick={close}>
              Отмена
            </Button>
            <Button
              buttonStyle="error"
              margin={false}
              disabled={pending || confirm.trim() !== ERASE_CONFIRM_WORD}
              onClick={() => void erase()}
            >
              {pending ? "Удаление…" : "Удалить данные"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
