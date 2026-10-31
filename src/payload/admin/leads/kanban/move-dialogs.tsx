"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent, RefObject, SyntheticEvent } from "react";
import { REFUSE_REASON_REQUIRED_MESSAGE } from "@/payload/hooks/lead-messages";
import type { PatchResult } from "./api";

/**
 * Confirmations of the kanban moves, as native modal `<dialog>`s (focus trap, Escape and the
 * backdrop come from the browser):
 * - `RefuseDialog` — closing a lead needs a reason code (and a text for «Другое»); the lead is
 *   saved from the dialog, which stays open with the server's message on a 400;
 * - `ContractDialog` — «Договор» creates an order and a client link, so it is confirmed first.
 *
 * Both are mounted only while open; closing (Escape, «Отмена», success) calls `onClose`, and the
 * board returns the focus to the card.
 */

/** Value of `refuseReasonCode` whose text is mandatory (`validateLeadStatusReason`). */
const OTHER_REASON = "other";
const COMMENT_MAX_LENGTH = 2000;

/** Opens the dialog modally on mount; closes it if the component unmounts while open. */
function useShowModal(ref: RefObject<HTMLDialogElement | null>) {
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, [ref]);
}

/**
 * `close` handler: fires after Escape, `dialog.close()` and a `method="dialog"` form alike
 * (events of nested elements are ignored).
 *
 * A `close` that arrives while the dialog is open again is stale and ignored: the browser queues
 * the event as a task, and React's Strict Mode (development) runs `useShowModal` as
 * showModal → cleanup `close()` → showModal, so the cleanup's event lands on the reopened dialog
 * and would unmount it right away.
 */
const closeHandler = (onClose: () => void) => (event: SyntheticEvent<HTMLDialogElement>) => {
  if (event.target === event.currentTarget && !event.currentTarget.open) onClose();
};

export interface RefuseDialogProps {
  cardTitle: string;
  reasonOptions: { value: string; label: string }[];
  /** Saves the lead; the dialog shows the error of a failed result. */
  onSubmit: (body: { refuseReasonCode: string; refuseReason?: string }) => Promise<PatchResult>;
  onClose: () => void;
}

export function RefuseDialog({ cardTitle, reasonOptions, onSubmit, onClose }: RefuseDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useShowModal(dialogRef);
  const ids = { title: useId(), reason: useId(), comment: useId(), hint: useId(), error: useId() };
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const needsComment = reason === OTHER_REASON;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    const text = comment.trim();
    if (needsComment && !text) {
      setError(REFUSE_REASON_REQUIRED_MESSAGE);
      return;
    }
    setError(null);
    setSaving(true);
    const result = await onSubmit({
      refuseReasonCode: reason,
      ...(text ? { refuseReason: text } : {}),
    });
    // On success the board unmounts the dialog; only a failure keeps it open.
    if (!result.ok) {
      setSaving(false);
      const fieldError = result.fieldErrors.find((entry) => entry.path === "refuseReason");
      setError(fieldError?.message ?? result.message);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="iga-kdialog"
      aria-labelledby={ids.title}
      onClose={closeHandler(onClose)}
      onCancel={(event) => {
        if (saving) event.preventDefault();
      }}
    >
      <form className="iga-kdialog__form" onSubmit={submit}>
        <h2 id={ids.title} className="iga-kdialog__title">
          Закрыть заявку «{cardTitle}»
        </h2>
        <div className="iga-field">
          <label htmlFor={ids.reason} className="iga-field__label">
            Причина
          </label>
          <select
            id={ids.reason}
            name="refuseReasonCode"
            className="iga-select"
            required
            autoFocus
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              setError(null);
            }}
          >
            <option value="">Выберите причину</option>
            {reasonOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="iga-field">
          <label htmlFor={ids.comment} className="iga-field__label">
            Комментарий
          </label>
          <textarea
            id={ids.comment}
            name="refuseReason"
            className="iga-input"
            rows={3}
            maxLength={COMMENT_MAX_LENGTH}
            value={comment}
            aria-invalid={error ? true : undefined}
            aria-describedby={
              [needsComment ? ids.hint : null, error ? ids.error : null]
                .filter(Boolean)
                .join(" ") || undefined
            }
            onChange={(event) => {
              setComment(event.target.value);
              setError(null);
            }}
          />
          {needsComment ? (
            <span id={ids.hint} className="iga-field__hint">
              Обязательно для «Другое»
            </span>
          ) : null}
          {error ? (
            <span id={ids.error} className="iga-field__error" role="alert">
              {error}
            </span>
          ) : null}
        </div>
        <div className="iga-kdialog__actions">
          <button
            type="submit"
            className="iga-btn iga-btn--danger iga-kdialog__danger"
            disabled={saving}
          >
            Закрыть заявку
          </button>
          <button
            type="button"
            className="iga-btn iga-btn--ghost"
            disabled={saving}
            onClick={() => dialogRef.current?.close()}
          >
            Отмена
          </button>
        </div>
      </form>
    </dialog>
  );
}

export interface ContractDialogProps {
  cardTitle: string;
  statusName: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function ContractDialog({ cardTitle, statusName, onConfirm, onClose }: ContractDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useShowModal(dialogRef);
  const titleId = useId();
  const textId = useId();
  return (
    <dialog
      ref={dialogRef}
      className="iga-kdialog"
      aria-labelledby={titleId}
      aria-describedby={textId}
      onClose={closeHandler(onClose)}
    >
      <div className="iga-kdialog__form">
        <h2 id={titleId} className="iga-kdialog__title">
          Перевести «{cardTitle}» в «{statusName}»?
        </h2>
        <p id={textId} className="iga-kdialog__text">
          Будет создан заказ и ссылка для клиента. Отменить это из канбана нельзя.
        </p>
        <div className="iga-kdialog__actions">
          <button type="button" className="iga-btn iga-btn--primary" autoFocus onClick={onConfirm}>
            Перевести
          </button>
          <button
            type="button"
            className="iga-btn iga-btn--ghost"
            onClick={() => dialogRef.current?.close()}
          >
            Отмена
          </button>
        </div>
      </div>
    </dialog>
  );
}
