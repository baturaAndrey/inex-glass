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
import { FIELD_STYLE, HINT_STYLE, INPUT_STYLE, Panel, ROW_STYLE } from "./panel";

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
      <ol style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 4 }}>
        {history.map((row) => (
          <li key={row.status}>
            {ORDER_STATUS_META[row.status].label} — {row.date ?? "без даты"}
            {row.status === currentStatus ? " (текущий)" : null}
          </li>
        ))}
      </ol>

      <form onSubmit={submit} style={{ display: "grid", gap: 16 }}>
        <div style={{ ...ROW_STYLE, alignItems: "flex-end", gap: 16 }}>
          <label htmlFor={ids.status} style={FIELD_STYLE}>
            Новый статус
            <select
              id={ids.status}
              name="status"
              value={status}
              onChange={(event) => changeStatus(event.target.value as OrderStatus)}
              style={INPUT_STYLE}
            >
              {ORDER_STATUS_IDS.map((id) => (
                <option key={id} value={id}>
                  {ORDER_STATUS_META[id].label}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor={ids.date} style={FIELD_STYLE}>
            Дата
            <input
              id={ids.date}
              name="date"
              type="date"
              required
              value={date}
              max={maxStatusDateKey()}
              onChange={(event) => setDate(event.target.value)}
              style={INPUT_STYLE}
            />
          </label>
          <label htmlFor={ids.planned} style={FIELD_STYLE}>
            Плановая дата следующего этапа
            <input
              id={ids.planned}
              name="plannedDate"
              type="date"
              value={plannedDate}
              min={date || undefined}
              onChange={(event) => setPlannedDate(event.target.value)}
              style={INPUT_STYLE}
            />
          </label>
        </div>

        <label htmlFor={ids.comment} style={FIELD_STYLE}>
          Комментарий клиенту
          <textarea
            id={ids.comment}
            name="comment"
            rows={3}
            maxLength={2000}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            style={{ ...INPUT_STYLE, height: "auto", padding: 12, resize: "vertical" }}
          />
          <span style={HINT_STYLE}>
            Виден на странице заказа (например, перенос срока). Пустое поле убирает комментарий.
          </span>
        </label>

        <label style={{ ...ROW_STYLE, gap: 8 }}>
          <input
            type="checkbox"
            name="notify"
            checked={notify}
            onChange={(event) => setNotify(event.target.checked)}
          />
          Отправить письмо клиенту
        </label>

        {isRollback ? (
          <label style={{ ...ROW_STYLE, gap: 8, color: "var(--theme-error-500)" }}>
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

        <div style={ROW_STYLE}>
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
        <p style={HINT_STYLE}>
          Статус можно менять и в форме заказа (история статусов): тогда письмо клиенту уходит
          всегда, если у заказа есть e-mail и уведомления включены.
        </p>
      </form>
    </Panel>
  );
}
