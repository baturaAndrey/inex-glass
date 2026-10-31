"use client";

import { useEffect, useState } from "react";
import { useConfig, useDocumentInfo, useFormFields } from "@payloadcms/ui";
import { COMPANY_TZ } from "@/lib/domain/types";

/**
 * `admin.components.Field` of `pages.updatedBy` (sidebar, task 07): rows «Изменена ДД.ММ.ГГГГ,
 * ЧЧ:ММ» and «Кем» in the look of the mockup's «Публикация» card. `updatedBy` is stored with
 * `maxDepth: 0` (an id), so the author's name is fetched separately from `/api/users/<id>/`;
 * `null` means the last write came from the system (public forms, jobs, scripts) → «Система».
 *
 * Values come from the last saved document (`savedDocumentData`, refreshed by Payload after every
 * save) and fall back to the form state on the first render.
 */

const SYSTEM_AUTHOR = "Система";
const UNKNOWN_AUTHOR = "—";
const LOADING_AUTHOR = "…";

/** «21.10.2026, 18:05» in the company time zone, like every other admin date. */
const dateTimeFormatter = new Intl.DateTimeFormat("ru-RU", {
  timeZone: COMPANY_TZ,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDateTime(value: unknown): string | null {
  if (typeof value !== "string" && !(value instanceof Date)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : dateTimeFormatter.format(date);
}

type AuthorRef = { id: string; name: string | null } | null;

/** A relationship value at depth 0 (`"<uuid>"`) or populated (`{ id, name }`). */
function authorRef(value: unknown): AuthorRef {
  if (typeof value === "string" && value !== "") return { id: value, name: null };
  if (value && typeof value === "object" && "id" in value) {
    const { id, name } = value as { id?: unknown; name?: unknown };
    if (typeof id === "string" && id !== "") {
      return { id, name: typeof name === "string" && name !== "" ? name : null };
    }
  }
  return null;
}

/** Name of a staff user by id; `null` while loading, `UNKNOWN_AUTHOR` when unavailable. */
function useAuthorName(author: AuthorRef, apiRoute: string): string | null {
  const id = author?.name ? null : (author?.id ?? null);
  const [loaded, setLoaded] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    fetch(`${apiRoute}/users/${encodeURIComponent(id)}/?depth=0`, {
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = response.ok ? ((await response.json()) as { name?: unknown }) : null;
        const name = typeof body?.name === "string" && body.name !== "" ? body.name : null;
        setLoaded({ id, name: name ?? UNKNOWN_AUTHOR });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setLoaded({ id, name: UNKNOWN_AUTHOR });
      });
    return () => controller.abort();
  }, [id, apiRoute]);

  if (!author) return SYSTEM_AUTHOR;
  if (author.name) return author.name;
  return loaded?.id === author.id ? loaded.name : null;
}

export function UpdatedByField({ path = "updatedBy" }: { path?: string | undefined }) {
  const { config } = useConfig();
  const { id: docId, savedDocumentData } = useDocumentInfo();
  const formUpdatedBy = useFormFields(([fields]) => fields[path]?.value);
  const formUpdatedAt = useFormFields(([fields]) => fields.updatedAt?.value);

  const saved = savedDocumentData as { updatedAt?: unknown; updatedBy?: unknown } | undefined;
  const author = authorRef(saved && "updatedBy" in saved ? saved.updatedBy : formUpdatedBy);
  const authorName = useAuthorName(author, config.routes.api);
  const updatedAt = formatDateTime(saved?.updatedAt ?? formUpdatedAt);

  // A document that was never saved has neither a date nor an author yet.
  if (docId === undefined || docId === null) return null;

  return (
    <div className="field-type iga-updated-by" data-testid="updated-by">
      <dl className="iga-updated-by__list">
        <div className="iga-updated-by__row">
          <dt>Изменена</dt>
          <dd className="iga-updated-by__date">{updatedAt ?? UNKNOWN_AUTHOR}</dd>
        </div>
        <div className="iga-updated-by__row">
          <dt>Кем</dt>
          <dd aria-busy={authorName === null}>{authorName ?? LOADING_AUTHOR}</dd>
        </div>
      </dl>
    </div>
  );
}
