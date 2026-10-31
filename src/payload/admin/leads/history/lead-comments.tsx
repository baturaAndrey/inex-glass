"use client";

import { useId, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { toast, useAuth } from "@payloadcms/ui";
import { formatDateTime } from "@/lib/leads-admin/export-rows";
import { extractPayloadError, PATCH_FALLBACK_MESSAGE } from "../kanban/api";
import { initials } from "../kanban/format";

/**
 * «Комментарии» of the lead card (client component, admin redesign task 09): the form «Добавить»
 * and the internal comments under it. The card (task 08) passes the rows newest first.
 *
 * A comment is added through REST so that `stampInternalComments` (`leads.beforeChange`) sets the
 * author and the date on the server and a lead version is written:
 * 1. `GET` the current `internalComments` — fresh, not the rows of the rendered page, so a
 *    comment added by a colleague since then is not wiped out by our array;
 * 2. `PATCH` the fresh rows as `{ id, text }` (the hook keeps their stored author and date; a
 *    foreign text is unchanged, so «Чужие комментарии менять нельзя» cannot fire) plus the new
 *    `{ text }`.
 * A race window between 1 and 2 remains (milliseconds between two requests of one click); it is
 * accepted: Payload has no array-append operation over REST.
 */

export interface LeadCommentsProps {
  leadId: string;
  /** Newest first; `author` is a display name or `null` (a system write). */
  comments: { id: string; author: string | null; text: string; date: string }[];
  currentUserId: string;
}

const COMMENT_MAX_LENGTH = 5000;
const ADD_FAILED_MESSAGE = "Не удалось добавить комментарий";

type CommentRow = { id?: unknown; text?: unknown };

const leadApiPath = (leadId: string) => `/api/leads/${encodeURIComponent(leadId)}/`;

/** Current comment rows of the lead as `{ id, text }`; throws on any failure. */
async function fetchFreshComments(leadId: string): Promise<{ id: string; text: string }[]> {
  const response = await fetch(`${leadApiPath(leadId)}?depth=0&select[internalComments]=true`, {
    credentials: "same-origin",
  });
  if (!response.ok) throw new Error(`GET lead: HTTP ${response.status}`);
  const body = (await response.json()) as { internalComments?: unknown };
  const rows = Array.isArray(body.internalComments) ? (body.internalComments as CommentRow[]) : [];
  return rows
    .filter((row) => typeof row?.id === "string" && row.id !== "")
    .map((row) => ({ id: row.id as string, text: typeof row.text === "string" ? row.text : "" }));
}

/** Adds the comment; resolves to an error message or `null` on success. */
async function addComment(leadId: string, text: string): Promise<string | null> {
  try {
    const fresh = await fetchFreshComments(leadId);
    const response = await fetch(`${leadApiPath(leadId)}?depth=0`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ internalComments: [...fresh, { text }] }),
    });
    if (response.ok) return null;
    if (response.status === 400) {
      const { message } = extractPayloadError(await response.json().catch(() => null));
      return message === PATCH_FALLBACK_MESSAGE ? ADD_FAILED_MESSAGE : message;
    }
    return ADD_FAILED_MESSAGE;
  } catch {
    // Network failure or an unreadable lead: the text stays in the field for another try.
    return ADD_FAILED_MESSAGE;
  }
}

export function LeadComments({ leadId, comments, currentUserId }: LeadCommentsProps) {
  const router = useRouter();
  const { user } = useAuth();
  const fieldId = useId();
  const errorId = `${fieldId}-error`;
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userName = (user as { name?: unknown } | null | undefined)?.name;
  const avatar = initials(typeof userName === "string" ? userName : "");
  const canSubmit = text.trim() !== "" && !busy && currentUserId !== "";

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    const failure = await addComment(leadId, text.trim());
    setBusy(false);
    if (failure) {
      setError(failure);
      return;
    }
    setText("");
    toast.success("Комментарий добавлен");
    router.refresh();
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submit();
  };

  // Ctrl+Enter / Cmd+Enter sends, like in messengers; a plain Enter is a new line.
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      void submit();
    }
  };

  return (
    <div role="region" aria-label="Комментарии" className="iga-lead-comments">
      <form className="iga-lead-comments__form" onSubmit={onSubmit} noValidate>
        <span className="iga-avatar iga-avatar--sm iga-lead-comments__avatar" aria-hidden="true">
          {avatar}
        </span>
        <div className="iga-lead-comments__fields">
          <label htmlFor={fieldId} className="iga-lead-comments__label">
            Внутренний комментарий (клиент его не видит)
          </label>
          <textarea
            id={fieldId}
            className={error ? "iga-input is-error" : "iga-input"}
            rows={3}
            maxLength={COMMENT_MAX_LENGTH}
            placeholder="Например: перезвонить после 14:00, уточнить крепление"
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={onKeyDown}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
          />
          {error ? (
            <p id={errorId} className="iga-lead-comments__error" role="alert">
              {error}
            </p>
          ) : null}
          <div>
            <button
              type="submit"
              className="iga-btn iga-btn--ghost iga-lead-comments__submit"
              disabled={!canSubmit}
              aria-busy={busy || undefined}
            >
              Добавить
            </button>
          </div>
        </div>
      </form>

      {comments.length > 0 ? (
        <ul className="iga-lead-comments__list">
          {comments.map((comment) => (
            <li key={comment.id} className="iga-lead-comments__item">
              <span className="iga-lead-comments__meta">
                <time dateTime={comment.date}>{formatDateTime(comment.date)}</time> ·{" "}
                {comment.author ?? "Система"}
              </span>
              <span className="iga-lead-comments__text">{comment.text}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
