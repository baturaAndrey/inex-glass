import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { getPayload } from "payload";
import { getEnv } from "@/lib/env";
import { extensionOf, sanitizeFilename } from "@/lib/uploads/stream";
import { getRole } from "@/payload/access";
import { setDownloadOnlyHeaders } from "@/payload/collections/crm/upload-policy";
import config from "@payload-config";

/**
 * `GET /api/lead-files/<id>/download/` — protected download of a lead attachment.
 *
 * Only signed-in staff (`admin` / `manager`, Payload session cookie or `Authorization` header):
 * anonymous → 401, other roles → 403. The file is streamed from `${UPLOADS_DIR}/leads` (never
 * buffered), always as an attachment with `nosniff` and a sandbox CSP, never cached.
 * The stored file name comes from the database, but the resolved path must still stay inside
 * the storage directory (defense in depth against `../` in a tampered record).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  dwg: "application/acad",
  dxf: "application/dxf",
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};
const FALLBACK_CONTENT_TYPE = "application/octet-stream";

const NO_STORE = { "Cache-Control": "private, no-store" } as const;

const status = (code: number, message: string) =>
  Response.json({ ok: false, message }, { status: code, headers: NO_STORE });

/** RFC 6266/5987: ASCII fallback plus the exact UTF-8 name. */
function contentDisposition(displayName: string): string {
  const ascii = sanitizeFilename(displayName);
  const encoded = encodeURIComponent(displayName).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

/** Absolute path of `filename` inside `root`, or `null` if it would escape it. */
function resolveInside(root: string, filename: string): string | null {
  const resolved = path.resolve(root, filename);
  return resolved.startsWith(root + path.sep) ? resolved : null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const payload = await getPayload({ config });
    const { user } = await payload.auth({ headers: request.headers });
    if (!user) return status(401, "Требуется вход");
    if (getRole(user) === null) return status(403, "Недостаточно прав");

    const { id } = await params;
    if (!UUID_PATTERN.test(id)) return status(404, "Файл не найден");

    const doc = await payload.findByID({
      collection: "lead-files",
      id,
      depth: 0,
      overrideAccess: true,
      disableErrors: true,
    });
    if (!doc?.filename) return status(404, "Файл не найден");

    const root = path.resolve(getEnv().UPLOADS_DIR, "leads");
    const filePath = resolveInside(root, doc.filename);
    if (!filePath) return status(404, "Файл не найден");

    const info = await stat(filePath).catch(() => null);
    if (!info?.isFile()) return status(404, "Файл не найден");

    const headers = setDownloadOnlyHeaders(new Headers());
    headers.set("Content-Type", CONTENT_TYPES[extensionOf(doc.filename)] ?? FALLBACK_CONTENT_TYPE);
    headers.set("Content-Length", String(info.size));
    headers.set("Content-Disposition", contentDisposition(doc.originalName || doc.filename));

    const stream = Readable.toWeb(
      createReadStream(filePath)
    ) as unknown as ReadableStream<Uint8Array>;
    return new Response(stream, { status: 200, headers });
  } catch (error) {
    console.error("[lead-files/download] failed:", error instanceof Error ? error.name : "unknown");
    return status(500, "Не удалось отдать файл");
  }
}
