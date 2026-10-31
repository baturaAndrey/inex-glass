"use client";

import { useState } from "react";
import { toast, useAuth, useDocumentInfo } from "@payloadcms/ui";
import { getRole } from "@/payload/access";
import { formatMaxDate, postMaxJson, useMaxStatus } from "./use-max-status";

/**
 * ui-field `users.maxConnect` — «MAX» card of the user form (task 06), on `/admin/account/` and
 * `/admin/collections/users/<id>/`.
 *
 * - Own profile: «Подключить MAX» issues a one-time deep link (`/api/max/link-token/`), opens it
 *   in a new tab and polls the status until the webhook reports the link.
 * - Linked (own profile, or an admin on someone else's): «Отключить».
 * - An admin cannot link someone else (the token is issued for the caller only): status only.
 */

const LINK_POLL = { intervalMs: 3_000, timeoutMs: 2 * 60_000 } as const;

export function MaxConnectButton() {
  const { id } = useDocumentInfo();
  const { user } = useAuth();
  const docId = id === undefined || id === null ? null : String(id);
  const isOwn = docId !== null && user ? String(user.id) === docId : false;
  const isAdmin = getRole(user) === "admin";
  const canView = docId !== null && (isOwn || isAdmin);

  const { status, error, loading, refresh, poll } = useMaxStatus(docId, canView);
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<{ url: string; opened: boolean } | null>(null);

  if (docId === null) {
    return (
      <div className="iga-card iga-max" data-testid="max-connect">
        <h2>MAX</h2>
        <p className="iga-max__hint">Сохраните пользователя, чтобы подключить MAX</p>
      </div>
    );
  }
  if (!canView) return null;

  const connect = async () => {
    // Opened synchronously in the click handler, otherwise the popup blocker closes it.
    const tab = window.open("", "_blank");
    setBusy(true);
    try {
      const { url } = await postMaxJson<{ url: string; expiresAt: string }>(
        "/api/max/link-token/",
        { target: "user" }
      );
      if (tab) {
        tab.opener = null;
        tab.location.href = url;
      }
      setLink({ url, opened: tab !== null });
      void refresh();
      const linked = await poll({ ...LINK_POLL, until: (next) => next.user.linked });
      if (linked) {
        setLink(null);
        toast.success("MAX подключён");
      }
    } catch (caught) {
      tab?.close();
      toast.error(caught instanceof Error ? caught.message : "Не удалось подключить MAX");
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    if (!window.confirm("Отключить уведомления MAX?")) return;
    setBusy(true);
    try {
      await postMaxJson("/api/max/unlink/", { target: "user", userId: docId });
      setLink(null);
      await refresh();
      toast.success("MAX отключён");
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Не удалось отключить MAX");
    } finally {
      setBusy(false);
    }
  };

  const linkedAt = formatMaxDate(status?.user.linkedAt);

  return (
    <div className="iga-card iga-max" data-testid="max-connect">
      <h2>MAX</h2>
      {loading && !status ? <p className="iga-max__hint">Загрузка…</p> : null}
      {error && !status ? <p className="iga-max__error">{error}</p> : null}

      {status && !status.configured ? (
        <p className="iga-max__hint">Подключение MAX недоступно: не настроен бот на сервере</p>
      ) : null}

      {status?.configured ? (
        <>
          <div className="iga-max__status">
            {status.user.linked ? (
              <span className="iga-badge iga-badge--ok">
                {linkedAt ? `Подключено ${linkedAt}` : "Подключено"}
              </span>
            ) : (
              <span className="iga-badge iga-badge--new">Не подключено</span>
            )}
            {status.user.linked && status.user.botStopped ? (
              <span className="iga-badge iga-badge--work">Бот остановлен</span>
            ) : null}
          </div>

          {status.user.linked && status.user.botStopped ? (
            <p className="iga-max__hint">
              Откройте чат с ботом и нажмите «Начать», чтобы снова получать уведомления
            </p>
          ) : null}

          {link ? (
            <p className="iga-max__hint" aria-live="polite">
              Откройте ссылку и нажмите «Начать» в чате с ботом. Ссылка действует 30 минут.
              {link.opened ? null : (
                <>
                  {" "}
                  <a href={link.url} target="_blank" rel="noopener noreferrer">
                    Открыть MAX
                  </a>
                </>
              )}
            </p>
          ) : null}

          <div className="iga-max__actions">
            {isOwn && !status.user.linked ? (
              <button
                type="button"
                className="iga-btn iga-btn--primary"
                onClick={connect}
                disabled={busy}
              >
                Подключить MAX
              </button>
            ) : null}
            {status.user.linked && (isOwn || isAdmin) ? (
              <button
                type="button"
                className="iga-btn iga-btn--ghost"
                onClick={disconnect}
                disabled={busy}
              >
                Отключить
              </button>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
