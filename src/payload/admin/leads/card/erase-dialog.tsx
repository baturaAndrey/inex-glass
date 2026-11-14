"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Modal, useModal } from "@payloadcms/ui";
import { ERASE_CONFIRM_WORD, leadEraseApiPath, LEADS_LIST_PATH } from "../constants";

/**
 * Confirmation of the personal-data erasure of a lead (152-ФЗ), shared by the «⋯» menu item
 * (`erase-menu-item.tsx`) and the button of the consent block (`erase-button.tsx`). The admin types
 * «УДАЛИТЬ»; the endpoint re-checks the role, the origin and the word. On success the browser goes
 * to the leads list; a 409 (lead with an order) shows the server's explanation in the dialog.
 *
 * Built on Payload's `Modal` (portalled by the admin's modal container), so it keeps working when
 * its opener lives inside a closing popup menu. `open` drives the modal; any close (Escape, click
 * outside, «Отмена») calls `onClose`.
 */

export interface EraseDialogProps {
  leadId: string;
  open: boolean;
  onClose: () => void;
}

export function EraseDialog({ leadId, open, onClose }: EraseDialogProps) {
  // One modal per instance: the card button and the menu item may both be on the page.
  const slug = `lead-erase-${useId().replace(/[^a-z0-9]/gi, "")}`;
  const titleId = `${slug}-title`;
  const inputId = `${slug}-confirm`;
  const { openModal, closeModal, isModalOpen } = useModal();
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const modalOpen = isModalOpen(slug);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (open) openModal(slug);
    else closeModal(slug);
  }, [open, slug, openModal, closeModal]);

  // The modal was closed by Payload itself (Escape, click outside): report it to the opener.
  useEffect(() => {
    if (modalOpen) {
      wasOpen.current = true;
    } else if (wasOpen.current) {
      wasOpen.current = false;
      setConfirm("");
      setError(null);
      if (open) onClose();
    }
  }, [modalOpen, open, onClose]);

  const close = () => {
    if (pending) return;
    closeModal(slug);
  };

  const erase = async () => {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(leadEraseApiPath(leadId), {
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
    <Modal slug={slug} closeOnBlur={!pending}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="iga-card iga-lead-erase"
      >
        <h2 id={titleId} className="iga-lead-erase__title">
          Удалить персональные данные
        </h2>
        <p className="iga-lead-erase__text">
          Заявка, все её версии и файлы будут удалены без возможности восстановления. Запись журнала
          согласий останется без IP и User-Agent как подтверждение факта согласия. Повторные
          обращения этого клиента удаляются отдельно.
        </p>
        <div className="iga-field">
          <label htmlFor={inputId} className="iga-field__label">
            Для подтверждения введите «{ERASE_CONFIRM_WORD}»
          </label>
          <input
            id={inputId}
            className="iga-input"
            value={confirm}
            autoComplete="off"
            disabled={pending}
            onChange={(event) => setConfirm(event.target.value)}
          />
        </div>
        {error ? (
          <p role="alert" className="iga-lead__error">
            {error}
          </p>
        ) : null}
        <div className="iga-lead-erase__actions">
          <button
            type="button"
            className="iga-btn iga-btn--ghost"
            disabled={pending}
            onClick={close}
          >
            Отмена
          </button>
          <button
            type="button"
            className="iga-btn iga-btn--danger iga-lead-erase__submit"
            disabled={pending || confirm.trim() !== ERASE_CONFIRM_WORD}
            onClick={() => void erase()}
          >
            {pending ? "Удаление…" : "Удалить данные"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
