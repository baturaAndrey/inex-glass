"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ConfirmationModal, toast, useModal } from "@payloadcms/ui";
import { HINT_CLASS, INPUT_CLASS, Panel, ROW_CLASS } from "./panel";

/**
 * «Ссылка» panel of the «Управление» tab (task 33): the client's order page URL with copy /
 * open, reissue (confirmation: the old link stops working), revoke / restore, and «send the
 * e-mail again». Talks to `/api/admin/orders/<id>/token/` (the URL is derived on the server,
 * never stored on the client beyond this component's state).
 */

type TokenAction = "reissue" | "revoke" | "restore" | "resend";

type TokenResponse = {
  ok: boolean;
  url?: string | null;
  revoked?: boolean;
  active?: boolean;
  message?: string;
};

const REISSUE_MODAL = "order-link-reissue";

const SUCCESS_TEXT: Record<TokenAction, string> = {
  reissue: "Ссылка перевыпущена. Старая ссылка больше не работает.",
  revoke: "Ссылка отозвана.",
  restore: "Доступ по ссылке возвращён.",
  resend: "Письмо клиенту поставлено в очередь.",
};

const endpoint = (orderId: string) => `/api/admin/orders/${orderId}/token/`;

async function readJson(response: Response): Promise<TokenResponse> {
  const body = (await response.json().catch(() => null)) as TokenResponse | null;
  return body ?? { ok: false, message: `Ошибка ${response.status}` };
}

export function TokenPanel({
  orderId,
  hasClientEmail,
}: {
  orderId: string;
  hasClientEmail: boolean;
}) {
  const router = useRouter();
  const { openModal } = useModal();
  const [url, setUrl] = useState<string | null>(null);
  const [revoked, setRevoked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<TokenAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(endpoint(orderId), { credentials: "same-origin", cache: "no-store" })
      .then(readJson)
      .then((body) => {
        if (cancelled) return;
        if (body.ok) {
          setUrl(body.url ?? null);
          setRevoked(body.revoked === true);
        } else {
          setError(body.message ?? "Не удалось получить ссылку");
        }
      })
      .catch(() => !cancelled && setError("Не удалось получить ссылку"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const run = useCallback(
    async (action: TokenAction) => {
      setBusy(action);
      try {
        const body = await readJson(
          await fetch(endpoint(orderId), {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action }),
          })
        );
        if (!body.ok) {
          toast.error(body.message ?? "Не удалось выполнить действие");
          return;
        }
        if (body.url !== undefined) setUrl(body.url ?? null);
        if (body.revoked !== undefined) setRevoked(body.revoked);
        toast.success(SUCCESS_TEXT[action]);
        // Warnings and the sidebar fields of the document come from the server.
        router.refresh();
      } catch {
        toast.error("Не удалось выполнить действие");
      } finally {
        setBusy(null);
      }
    },
    [orderId, router]
  );

  const copy = useCallback(async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Ссылка скопирована");
    } catch {
      toast.error("Не удалось скопировать — выделите ссылку вручную");
    }
  }, [url]);

  return (
    <Panel title="Ссылка для клиента" testId="order-token-panel">
      {loading ? <p className={HINT_CLASS}>Загрузка…</p> : null}
      {error ? (
        <p role="alert" className="iga-orders-error">
          {error}
        </p>
      ) : null}
      {!loading && !error ? (
        <>
          <input
            aria-label="Ссылка на страницу заказа"
            readOnly
            value={url ?? "Ссылка ещё не выпущена"}
            onFocus={(event) => event.currentTarget.select()}
            className={`${INPUT_CLASS} iga-orders-link`}
          />
          <p className={HINT_CLASS} data-testid="order-link-state">
            {revoked
              ? "Ссылка отозвана: клиент видит «Ссылка больше не действует»."
              : "Ссылка действует. Её получает клиент в каждом письме о смене статуса."}
          </p>
          <div className={ROW_CLASS}>
            <Button
              buttonStyle="primary"
              size="medium"
              margin={false}
              disabled={!url}
              onClick={copy}
            >
              Скопировать ссылку
            </Button>
            {url ? (
              <a
                className="btn btn--style-secondary btn--size-medium ym-disable-tracklink"
                href={url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Открыть
              </a>
            ) : null}
            <Button
              buttonStyle="secondary"
              size="medium"
              margin={false}
              disabled={busy !== null}
              onClick={() => openModal(REISSUE_MODAL)}
            >
              Перевыпустить
            </Button>
            {revoked ? (
              <Button
                buttonStyle="secondary"
                size="medium"
                margin={false}
                disabled={busy !== null}
                onClick={() => void run("restore")}
              >
                Вернуть доступ
              </Button>
            ) : (
              <Button
                buttonStyle="error"
                size="medium"
                margin={false}
                disabled={busy !== null || !url}
                onClick={() => void run("revoke")}
              >
                Отозвать
              </Button>
            )}
            <Button
              buttonStyle="subtle"
              size="medium"
              margin={false}
              disabled={busy !== null || !hasClientEmail}
              {...(hasClientEmail ? {} : { tooltip: "У заказа нет e-mail клиента" })}
              onClick={() => void run("resend")}
            >
              Отправить письмо клиенту ещё раз
            </Button>
          </div>
        </>
      ) : null}

      <ConfirmationModal
        modalSlug={REISSUE_MODAL}
        heading="Перевыпустить ссылку?"
        body="Старая ссылка сразу перестанет работать. Новую ссылку клиент получит в следующем письме — или скопируйте её и отправьте сами."
        confirmLabel="Перевыпустить"
        cancelLabel="Отмена"
        onConfirm={() => run("reissue")}
      />
    </Panel>
  );
}
