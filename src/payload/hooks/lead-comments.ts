import { ValidationError } from "payload";
import { getRole } from "@/payload/access";
import { relationId } from "@/payload/hooks/lead-hooks";
import { FOREIGN_COMMENT_MESSAGE } from "@/payload/hooks/lead-messages";
import type { CollectionBeforeChangeHook } from "payload";

/**
 * `leads.beforeChange`: internal comments (`internalComments[] { author, text, date }`).
 *
 * - A new row (no id, or an id the stored document does not have — the admin UI generates row
 *   ids on the client) gets `author = current user` and `date = now`, whatever was sent.
 * - Existing rows always keep their stored `author` and `date`.
 * - A manager may edit or remove only their own comments; changing or removing someone else's
 *   raises «Чужие комментарии менять нельзя». Admins may do anything.
 * - Writes without a user (Local API: jobs, intake) are trusted and only get the stamps.
 *
 * Field access (`systemOnly` on author/date) already strips forged values on REST/admin
 * writes; this hook is the authoritative rule and also covers ownership.
 */

type CommentRow = {
  id?: unknown;
  author?: unknown;
  text?: unknown;
  date?: unknown;
  [key: string]: unknown;
};

const asRows = (value: unknown): CommentRow[] =>
  Array.isArray(value)
    ? value.filter((row): row is CommentRow => typeof row === "object" && row !== null)
    : [];

const rowId = (row: CommentRow): string | null =>
  typeof row.id === "string" && row.id !== "" ? row.id : null;

const sameText = (a: unknown, b: unknown): boolean =>
  (typeof a === "string" ? a : "") === (typeof b === "string" ? b : "");

export const stampInternalComments: CollectionBeforeChangeHook = ({ data, originalDoc, req }) => {
  if (!data || !Array.isArray(data.internalComments)) return data;

  const user = req.user;
  const userId = relationId(user);
  // No user: a trusted internal write. Admins may moderate every comment.
  const mayEditAll = !user || getRole(user) === "admin";
  const now = new Date().toISOString();

  const storedRows = asRows(
    (originalDoc as { internalComments?: unknown } | undefined)?.internalComments
  );
  const storedById = new Map<string, CommentRow>();
  for (const row of storedRows) {
    const id = rowId(row);
    if (id) storedById.set(id, row);
  }

  const isForeign = (row: CommentRow) => !mayEditAll && relationId(row.author) !== userId;
  let violation = false;
  const seen = new Set<string>();

  const rows = asRows(data.internalComments).map((row) => {
    const id = rowId(row);
    const stored = id ? storedById.get(id) : undefined;
    if (!stored) {
      return {
        ...row,
        author: userId ?? relationId(row.author),
        date: user ? now : typeof row.date === "string" && row.date !== "" ? row.date : now,
      };
    }
    seen.add(id as string);
    if (isForeign(stored) && !sameText(row.text, stored.text)) violation = true;
    return { ...row, author: relationId(stored.author), date: stored.date ?? null };
  });

  const removedForeign = storedRows.some((row) => {
    const id = rowId(row);
    return id !== null && !seen.has(id) && isForeign(row);
  });

  if (violation || removedForeign) {
    throw new ValidationError({
      collection: "leads",
      errors: [{ message: FOREIGN_COMMENT_MESSAGE, path: "internalComments" }],
      req,
    });
  }
  return { ...data, internalComments: rows };
};
