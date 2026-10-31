"use client";

import { useState } from "react";
import { toast, useAuth, useFormFields } from "@payloadcms/ui";
import { getRole } from "@/payload/access";
import { formatMaxDate, postMaxJson, useMaxStatus } from "./use-max-status";
import type { MaxStatus } from "./use-max-status";

/**
 * ui-field `site-settings.notifications.max.maxGroupLink` — group chat binding (task 06), above
 * the MAX toggles of «Настройки сайта → Уведомления и заказы».
 *
 * - Admin: status from `/api/max/status/`; «Привязать чат» issues a one-time code that is sent
 *   into the group with the bot (the webhook links the chat), the panel polls until linked;
 *   «Отвязать» removes the binding.
 * - Manager: read-only status from the form values, no buttons.
 *
 * Every button is `type="button"`: the panel lives inside the global's form.
 */

const GROUP_POLL = { intervalMs: 5_000, timeoutMs: 30 * 60_000 } as const;

type GroupStatus = NonNullable<MaxStatus["group"]>;

const fieldPath = (name: string) => `notifications.max.${name}`;

const asText = (value: unknown): string | null =>
  typeof value === "string" && value !== "" ? value : null;

function chatLabel(group: Pick<GroupStatus, "title" | "chatId">): string {
  return group.title ? `«${group.title}»` : `ID ${group.chatId ?? "—"}`;
}

/** Read-only status for managers: the stored values of the form. */
function ReadOnlyGroupStatus() {
  // Primitive selectors: an object result would re-render on every form change.
  const chatId = useFormFields(([fields]) => asText(fields[fieldPath("groupChatId")]?.value));
  const title = useFormFields(([fields]) => asText(fields[fieldPath("groupChatTitle")]?.value));
  return (
    <div className="iga-card iga-max" data-testid="max-group-link">
      <h2>Групповой чат</h2>
      <p className="iga-max__hint">
        {chatId ? `Подключён чат ${chatLabel({ chatId, title })}` : "Групповой чат не привязан"}
      </p>
    </div>
  );
}

export function MaxGroupLinkPanel() {
  const { user } = useAuth();
  const isAdmin = getRole(user) === "admin";
  if (!isAdmin) return <ReadOnlyGroupStatus />;
  return <AdminGroupPanel />;
}

function AdminGroupPanel() {
  const { status, error, loading, refresh, poll, stopPolling } = useMaxStatus(null);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState<{ value: string; botName: string | null } | null>(null);

  const group = status?.group;

  const issueCode = async () => {
    setBusy(true);
    try {
      const result = await postMaxJson<{ code: string; expiresAt: string; botName: string | null }>(
        "/api/max/link-token/",
        { target: "group" }
      );
      setCode({ value: result.code, botName: result.botName });
      setBusy(false);
      const linked = await poll({ ...GROUP_POLL, until: (next) => Boolean(next.group?.linked) });
      if (linked) {
        setCode(null);
        toast.success("Групповой чат привязан");
      }
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Не удалось получить код");
    } finally {
      setBusy(false);
    }
  };

  const copyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code.value);
      toast.success("Код скопирован");
    } catch {
      toast.error("Не удалось скопировать код");
    }
  };

  const unlink = async () => {
    if (
      !window.confirm("Отвязать групповой чат? Уведомления о новых заявках перестанут приходить.")
    ) {
      return;
    }
    setBusy(true);
    try {
      stopPolling();
      await postMaxJson("/api/max/unlink/", { target: "group" });
      setCode(null);
      await refresh();
      toast.success("Групповой чат отвязан");
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Не удалось отвязать чат");
    } finally {
      setBusy(false);
    }
  };

  const linkedAt = formatMaxDate(group?.linkedAt);
  const botName = code?.botName ?? status?.botName ?? null;

  return (
    <div className="iga-card iga-max" data-testid="max-group-link">
      <h2>Групповой чат</h2>
      {loading && !status ? <p className="iga-max__hint">Загрузка…</p> : null}
      {error && !status ? <p className="iga-max__error">{error}</p> : null}

      {status && !status.configured ? (
        <p className="iga-max__hint">
          MAX не настроен на сервере: задайте MAX_BOT_NAME и MAX_WEBHOOK_SECRET
        </p>
      ) : null}

      {status?.configured && group?.linked ? (
        <>
          <div className="iga-max__status">
            <span className="iga-badge iga-badge--ok">Подключён</span>
            <span>
              Чат {chatLabel(group)}
              {linkedAt ? ` с ${linkedAt}` : null}
            </span>
          </div>
          <div className="iga-max__actions">
            <button
              type="button"
              className="iga-btn iga-btn--danger iga-btn--sm"
              onClick={unlink}
              disabled={busy}
            >
              Отвязать
            </button>
          </div>
        </>
      ) : null}

      {status?.configured && !group?.linked ? (
        <>
          <div className="iga-max__status">
            <span className="iga-badge iga-badge--new">Не привязан</span>
            <span>Групповой чат не привязан</span>
          </div>
          {code ? (
            <div className="iga-max__code" aria-live="polite">
              <div className="iga-max__code-row">
                <code className="iga-max__code-value" data-testid="max-group-code">
                  {code.value}
                </code>
                <button
                  type="button"
                  className="iga-btn iga-btn--ghost iga-btn--sm"
                  onClick={copyCode}
                >
                  Скопировать
                </button>
              </div>
              <ol className="iga-max__steps">
                <li>
                  Добавьте бота @{botName ?? "…"} в групповой чат менеджеров и назначьте его
                  администратором (нужно право читать сообщения).
                </li>
                <li>
                  Отправьте в этот чат код отдельным сообщением, без другого текста.
                </li>
                <li>Код действует 30 минут. После привязки статус обновится сам.</li>
              </ol>
            </div>
          ) : null}
          <div className="iga-max__actions">
            <button
              type="button"
              className="iga-btn iga-btn--secondary"
              onClick={issueCode}
              disabled={busy}
            >
              {code ? "Новый код" : "Привязать чат"}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
