"use client";

import { useId, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, toast } from "@payloadcms/ui";
import { todayKey } from "@/lib/domain/dates";
import {
  maxStatusDateKey,
  ORDER_STATUS_IDS,
  ORDER_STATUS_META,
  orderDateKey,
  statusIndex,
} from "@/lib/orders/status";
import type { OrderStatus } from "@/lib/orders/status";
import { FIELD_CLASS, HINT_CLASS, INPUT_CLASS, Panel, ROW_CLASS } from "./panel";

/**
 * «Статус» panel of the «Управление» tab (task 33): stage (next one by default), its date
 * (today by default, at most a year ahead), the planned date of the next stage, the comment for
 * the client and «send the e-mail». Moving back needs an explicit confirmation checkbox.
 * Posts to `/api/admin/orders/<id>/status/`, then refreshes the document.
 */

export interface StatusPanelProps {
  orderId: string;
  currentStatus: OrderStatus | null;
  suggestedStatus: OrderStatus;
  history: { status: OrderStatus; date: string | null }[];
  clientComment: string;
  /** Planned date stored on the current stage (prefilled when that stage is selected). */
  currentPlannedDate: string | null;
}

export function StatusPanel({
  orderId,
  currentStatus,
  suggestedStatus,
  history,
  clientComment,
  currentPlannedDate,
}: StatusPanelProps) {
  const router = useRouter();
  const ids = {
    status: useId(),
    date: useId(),
    planned: useId(),
    comment: useId(),
  };
  const today = useMemo(() => todayKey(), []);
  const [status, setStatus] = useState<OrderStatus>(suggestedStatus);
  const [date, setDate] = useState(today);
  const [plannedDate, setPlannedDate] = useState(
    suggestedStatus === currentStatus ? (orderDateKey(currentPlannedDate) ?? "") : ""
  );
  const [comment, setComment] = useState(clientComment);
  const [notify, setNotify] = useState(true);
  const [confirmRollback, setConfirmRollback] = useState(false);
  const [saving, setSaving] = useState(false);

  const isRollback = statusIndex(status) < statusIndex(currentStatus);

  const changeStatus = (next: OrderStatus) => {
    setStatus(next);
    setConfirmRollback(false);
    setPlannedDate(next === currentStatus ? (orderDateKey(currentPlannedDate) ?? "") : "");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isRollback && !confirmRollback) {
      toast.error("Подтвердите возврат на более ранний статус");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/status/`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          date,
          plannedDate,
          comment,
          notify,
          confirmRollback,
        }),
      });
      const body = (await response.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
      } | null;
      if (!body?.ok) {
        toast.error(body?.message ?? "Не удалось сменить статус");
        return;
      }
      toast.success(
        notify ? "Статус сохранён, письмо клиенту поставлено в очередь" : "Статус сохранён"
      );
      router.refresh();
    } catch {
      toast.error("Не удалось сменить статус");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel title="Статус заказа" testId="order-status-panel">
      <ol className="iga-orders-history">
        {history.map((row) => (
          <li key={row.status} data-current={row.status === currentStatus ? "true" : undefined}>
            {ORDER_STATUS_META[row.status].label} — {row.date ?? "без даты"}
            {row.status === currentStatus ? " (текущий)" : null}
          </li>
        ))}
      </ol>

      <form onSubmit={submit} className="iga-orders-form">
        <div className="iga-orders-fields">
          <label htmlFor={ids.status} className={FIELD_CLASS}>
            Новый статус
            <select
              id={ids.status}
              name="status"
              value={status}
              onChange={(event) => changeStatus(event.target.value as OrderStatus)}
              className="iga-select"
            >
              {ORDER_STATUS_IDS.map((id) => (
                <option key={id} value={id}>
                  {ORDER_STATUS_META[id].label}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor={ids.date} className={FIELD_CLASS}>
            Дата
            <input
              id={ids.date}
              name="date"
              type="date"
              required
              value={date}
              max={maxStatusDateKey()}
              onChange={(event) => setDate(event.target.value)}
              className={INPUT_CLASS}
            />
          </label>
          <label htmlFor={ids.planned} className={FIELD_CLASS}>
            Плановая дата следующего этапа
            <input
              id={ids.planned}
              name="plannedDate"
              type="date"
              value={plannedDate}
              min={date || undefined}
              onChange={(event) => setPlannedDate(event.target.value)}
              className={INPUT_CLASS}
            />
          </label>
        </div>

        <label htmlFor={ids.comment} className={FIELD_CLASS}>
          Комментарий клиенту
          <textarea
            id={ids.comment}
            name="comment"
            rows={3}
            maxLength={2000}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            className={INPUT_CLASS}
          />
          <span className={HINT_CLASS}>
            Виден на странице заказа (например, перенос срока). Пустое поле убирает комментарий.
          </span>
        </label>

        <label className="iga-orders-check">
          <input
            type="checkbox"
            name="notify"
            checked={notify}
            onChange={(event) => setNotify(event.target.checked)}
          />
          Отправить письмо клиенту
        </label>

        {isRollback ? (
          <label className="iga-orders-check iga-orders-check--danger">
            <input
              type="checkbox"
              name="confirmRollback"
              checked={confirmRollback}
              onChange={(event) => setConfirmRollback(event.target.checked)}
            />
            Подтверждаю возврат на более ранний статус (более поздние этапы будут удалены из
            истории)
          </label>
        ) : null}

        <div className={ROW_CLASS}>
          <Button
            type="submit"
            buttonStyle="primary"
            size="medium"
            margin={false}
            disabled={saving || (isRollback && !confirmRollback)}
          >
            {saving ? "Сохранение…" : "Сохранить статус"}
          </Button>
        </div>
        <p className={HINT_CLASS}>
          Статус можно менять и в форме заказа (история статусов): тогда письмо клиенту уходит
          всегда, если у заказа есть e-mail и уведомления включены.
        </p>
      </form>
    </Panel>
  );
}
