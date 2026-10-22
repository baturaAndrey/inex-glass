"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@payloadcms/ui";
import { cn } from "@/lib/utils";
import {
  buildLeadPatch,
  needsContractConfirm,
  OTHER_REASON_CODE,
  parseKpAmount,
  parsePayloadErrors,
  reasonError,
  rebaseForm,
  requiresReason,
} from "./processing";
import type { LeadPatch, ProcessingForm, ProcessingPanelProps } from "./processing";

export type { ProcessingPanelProps } from "./processing";

/**
 * «Обработка» panel of the lead card: status, assignee («Назначить себя» saves at once), flags,
 * refusal reason and the commercial-offer amount. Saves through Payload's REST
 * `PATCH /api/leads/<id>/` with the admin session, so every collection hook runs (refusal
 * validation, `statusChangedAt`, the order of a contract, notifications, versions). Only the
 * changed keys are sent (`buildLeadPatch`). After a save the server view is refreshed and the
 * new values are merged into the form (`rebaseForm`).
 */

const FALLBACK_ERROR = "Не удалось сохранить";
const NETWORK_ERROR = "Не удалось сохранить, попробуйте ещё раз";

type SaveOutcome = { ok: true } | { ok: false; fields: Record<string, string> };

async function patchLead(leadId: string, body: LeadPatch): Promise<SaveOutcome> {
  let response: Response;
  try {
    response = await fetch(`/api/leads/${encodeURIComponent(leadId)}/?depth=0`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    toast.error(NETWORK_ERROR);
    return { ok: false, fields: {} };
  }
  if (response.ok) return { ok: true };
  if (response.status >= 500) {
    toast.error(NETWORK_ERROR);
    return { ok: false, fields: {} };
  }
  const { fields, message } = parsePayloadErrors(await response.json().catch(() => null));
  toast.error(message ?? FALLBACK_ERROR);
  return { ok: false, fields };
}

/** Same-shape comparison of two baselines (they are small plain objects). */
const sameBase = (a: ProcessingForm, b: ProcessingForm) => JSON.stringify(a) === JSON.stringify(b);

export function ProcessingPanel({
  leadId,
  currentUserId,
  statuses,
  staff,
  reasons,
  flags,
  initial,
}: ProcessingPanelProps) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const ids = {
    status: useId(),
    assignee: useId(),
    flags: useId(),
    reasonCode: useId(),
    reason: useId(),
    reasonHint: useId(),
    kp: useId(),
    error: useId(),
  };
  const errorId = (field: string) => `${ids.error}-${field}`;

  const [base, setBase] = useState(initial);
  const [form, setForm] = useState(initial);
  const [kpText, setKpText] = useState(initial.kpAmount === null ? "" : String(initial.kpAmount));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // New server values after `router.refresh()`: merge them during render (no effect round-trip).
  if (!sameBase(base, initial)) {
    const next = rebaseForm(base, initial, form);
    setBase(initial);
    setForm(next);
    if (parseKpAmount(kpText) !== next.kpAmount) {
      setKpText(next.kpAmount === null ? "" : String(next.kpAmount));
    }
  }

  const patch = buildLeadPatch(base, form, statuses);
  const dirty = Object.keys(patch).length > 0;
  const busy = saving || refreshing;
  const showReason = requiresReason(form.status, statuses);

  const update = (changes: Partial<ProcessingForm>) => {
    setForm((prev) => ({ ...prev, ...changes }));
    // Editing a field clears its error (and the shared refusal error).
    setErrors((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(changes)) delete next[key];
      if ("refuseReasonCode" in changes || "status" in changes) delete next.refuseReason;
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    const result = await patchLead(leadId, patch);
    setSaving(false);
    if (result.ok) {
      setErrors({});
      toast.success("Сохранено");
      startRefresh(() => router.refresh());
    } else {
      setErrors(result.fields);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || !dirty) return;
    const clientError = reasonError(form, statuses);
    if (clientError) {
      setErrors((prev) => ({ ...prev, refuseReason: clientError }));
      return;
    }
    if (needsContractConfirm(base.status, form.status, statuses)) {
      setConfirming(true);
      return;
    }
    void save();
  };

  const assignSelf = async () => {
    if (busy) return;
    setSaving(true);
    const result = await patchLead(leadId, { assignee: currentUserId });
    setSaving(false);
    if (result.ok) {
      toast.success("Заявка назначена на вас");
      startRefresh(() => router.refresh());
    } else {
      const assigneeError = result.fields.assignee;
      if (assigneeError) setErrors((prev) => ({ ...prev, assignee: assigneeError }));
    }
  };

  /** `aria-*` and class of a control with an optional error. */
  const invalid = (field: string) =>
    errors[field]
      ? {
          "aria-invalid": true as const,
          "aria-describedby": errorId(field),
          className: "is-error",
        }
      : { className: undefined };

  const errorText = (field: string) =>
    errors[field] ? (
      <p id={errorId(field)} className="iga-lead__error" role="alert">
        {errors[field]}
      </p>
    ) : null;

  const statusInvalid = invalid("status");
  const assigneeInvalid = invalid("assignee");
  const reasonInvalid = invalid("refuseReason");
  const kpInvalid = invalid("kpAmount");
  // The server reports the refusal on `refuseReason`; the code select is highlighted too.
  const codeError = errors.refuseReasonCode ?? errors.refuseReason;
  const reasonDescribedBy =
    [
      form.refuseReasonCode === OTHER_REASON_CODE ? ids.reasonHint : null,
      errors.refuseReason ? errorId("refuseReason") : null,
    ]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <form className="iga-lead-processing" onSubmit={submit} noValidate>
      <div className="iga-field">
        <label htmlFor={ids.status} className="iga-field__label">
          Статус
        </label>
        <select
          id={ids.status}
          className={cn("iga-select", statusInvalid.className)}
          aria-invalid={statusInvalid["aria-invalid"]}
          aria-describedby={statusInvalid["aria-describedby"]}
          value={form.status ?? ""}
          disabled={busy}
          onChange={(event) => update({ status: event.target.value || null })}
        >
          {form.status === null ? <option value="">Не выбран</option> : null}
          {statuses.map((status) => (
            <option key={status.id} value={status.id}>
              {status.name}
            </option>
          ))}
        </select>
        {errorText("status")}
      </div>

      <div className="iga-field">
        <label htmlFor={ids.assignee} className="iga-field__label">
          Ответственный
        </label>
        <select
          id={ids.assignee}
          className={cn("iga-select", assigneeInvalid.className)}
          aria-invalid={assigneeInvalid["aria-invalid"]}
          aria-describedby={assigneeInvalid["aria-describedby"]}
          value={form.assignee ?? ""}
          disabled={busy}
          onChange={(event) => update({ assignee: event.target.value || null })}
        >
          <option value="">Не назначен</option>
          {staff.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
        {errorText("assignee")}
        {base.assignee !== currentUserId ? (
          <button
            type="button"
            className="iga-lead-processing__self"
            disabled={busy}
            onClick={() => void assignSelf()}
          >
            Назначить себя
          </button>
        ) : null}
      </div>

      <div className="iga-field">
        <span id={ids.flags} className="iga-field__label">
          Флаги
        </span>
        <div
          role="region"
          aria-label="Флаги"
          className="iga-lead-processing__flags"
          aria-describedby={errors.flags ? errorId("flags") : undefined}
        >
          {flags.map((flag) => {
            const selected = form.flags.includes(flag.value);
            return (
              <button
                key={flag.value}
                type="button"
                className="iga-chip"
                aria-pressed={selected}
                disabled={busy}
                onClick={() =>
                  update({
                    // Kept in the `LEAD_FLAGS` order.
                    flags: flags
                      .map((option) => option.value)
                      .filter((value) =>
                        value === flag.value ? !selected : form.flags.includes(value)
                      ),
                  })
                }
              >
                {flag.label}
              </button>
            );
          })}
        </div>
        {errorText("flags")}
      </div>

      {showReason ? (
        <>
          <div className="iga-field">
            <label htmlFor={ids.reasonCode} className="iga-field__label">
              Причина отказа
            </label>
            <select
              id={ids.reasonCode}
              className={cn("iga-select", codeError && "is-error")}
              aria-invalid={codeError ? true : undefined}
              aria-describedby={
                errors.refuseReasonCode
                  ? errorId("refuseReasonCode")
                  : errors.refuseReason
                    ? errorId("refuseReason")
                    : undefined
              }
              value={form.refuseReasonCode ?? ""}
              disabled={busy}
              onChange={(event) => update({ refuseReasonCode: event.target.value || null })}
            >
              <option value="">Не выбрана</option>
              {reasons.map((reason) => (
                <option key={reason.value} value={reason.value}>
                  {reason.label}
                </option>
              ))}
            </select>
            {errorText("refuseReasonCode")}
          </div>
          <div className="iga-field">
            <label htmlFor={ids.reason} className="iga-field__label">
              Комментарий к отказу
            </label>
            <textarea
              id={ids.reason}
              className={cn("iga-input", reasonInvalid.className)}
              rows={3}
              aria-invalid={reasonInvalid["aria-invalid"]}
              aria-describedby={reasonDescribedBy}
              value={form.refuseReason}
              disabled={busy}
              onChange={(event) => update({ refuseReason: event.target.value })}
            />
            {form.refuseReasonCode === OTHER_REASON_CODE ? (
              <span id={ids.reasonHint} className="iga-field__hint">
                При «Другое» комментарий обязателен
              </span>
            ) : null}
            {errorText("refuseReason")}
          </div>
        </>
      ) : null}

      <div className="iga-field">
        <label htmlFor={ids.kp} className="iga-field__label">
          Сумма КП, ₽
        </label>
        <input
          id={ids.kp}
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          className={cn("iga-input", kpInvalid.className)}
          aria-invalid={kpInvalid["aria-invalid"]}
          aria-describedby={kpInvalid["aria-describedby"]}
          value={kpText}
          disabled={busy}
          onChange={(event) => {
            setKpText(event.target.value);
            update({ kpAmount: parseKpAmount(event.target.value) });
          }}
        />
        {errorText("kpAmount")}
      </div>

      <button
        type="submit"
        className="iga-btn iga-btn--primary iga-lead-processing__save"
        disabled={busy || !dirty}
        aria-busy={busy || undefined}
      >
        {saving ? "Сохранение…" : "Сохранить"}
      </button>
      <p className="iga-lead__hint">
        При статусе «Договор» автоматически создаётся заказ и ссылка для клиента.
      </p>

      {confirming ? (
        <ContractConfirmDialog
          onConfirm={() => {
            setConfirming(false);
            void save();
          }}
          onClose={() => setConfirming(false)}
        />
      ) : null}
    </form>
  );
}

/**
 * «Перевести в «Договор»?» as a native modal `<dialog>` (focus trap, Escape and the backdrop come
 * from the browser). Mounted only while open; closing by any means calls `onClose`.
 */
function ContractConfirmDialog({
  onConfirm,
  onClose,
}: {
  onConfirm: () => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const textId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="iga-lead-dialog"
      aria-labelledby={titleId}
      aria-describedby={textId}
      onClose={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <h2 id={titleId} className="iga-lead-dialog__title">
        Перевести в «Договор»?
      </h2>
      <p id={textId} className="iga-lead-dialog__text">
        Будет создан заказ и ссылка для клиента. Отменить это из карточки нельзя.
      </p>
      <div className="iga-lead-dialog__actions">
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
    </dialog>
  );
}
