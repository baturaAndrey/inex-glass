import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import sharp from "sharp";
import { getPayloadClient } from "@/lib/cms/payload";
import {
  contentDisposition,
  downloadName,
  findOrderFile,
  isDisplayableImage,
  isUuid,
  parseThumbnailWidth,
  safeContentType,
  storedFileName,
} from "@/lib/orders/files";
import { getOrderByToken } from "@/lib/orders/lookup";

/**
 * `GET /zakaz/<token>/docs/<id>/` — a packing photo or a document of the order, for the client
 * who holds the link (ТЗ §6.2). `order-files` is a private collection; this route is the only
 * public way to its files.
 *
 * - The token is checked exactly like the page (`getOrderByToken`); the file must belong to
 *   THAT order. Every failure answers the same bare 404.
 * - The file is read from the collection's `staticDir` by its base name only (no traversal)
 *   and streamed; `?w=320|480|960|1920` on a photo returns a resized WebP (sharp).
 * - Never cached, never indexed, `nosniff`, no Referer: the URL contains the token.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Decompression-bomb guard for sharp (≈ 50 MP; phone photos are 12–48 MP). */
const MAX_INPUT_PIXELS = 50_000_000;
const WEBP_QUALITY = 80;

const BASE_HEADERS = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow",
  "Referrer-Policy": "no-referrer",
} as const;

const notFound = () =>
  new Response("Not found", {
    status: 404,
    headers: { ...BASE_HEADERS, "Content-Type": "text/plain; charset=utf-8" },
  });

type Params = { params: Promise<{ token: string; id: string }> };

async function staticDir(): Promise<string | null> {
  const payload = await getPayloadClient();
  const dir = payload.collections["order-files"]?.config.upload?.staticDir;
  return typeof dir === "string" && dir !== "" ? path.resolve(dir) : null;
}

export async function GET(request: Request, { params }: Params): Promise<Response> {
  try {
    const { token, id } = await params;
    if (!isUuid(id)) return notFound();

    const order = await getOrderByToken(token);
    if (!order) return notFound();
    const resolved = findOrderFile(order, id);
    if (!resolved) return notFound();

    const dir = await staticDir();
    const name = storedFileName(resolved.file.filename);
    if (!dir || !name) return notFound();
    const filePath = path.join(dir, name);
    const info = await stat(filePath).catch(() => null);
    if (!info?.isFile()) return notFound();

    const headers = new Headers(BASE_HEADERS);
    const isPhoto = resolved.role === "photo" && isDisplayableImage(resolved.file.mimeType);
    const width = isPhoto ? parseThumbnailWidth(new URL(request.url).searchParams.get("w")) : null;

    if (isPhoto && width !== null) {
      const body = await sharp(filePath, { limitInputPixels: MAX_INPUT_PIXELS })
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();
      headers.set("Content-Type", "image/webp");
      headers.set("Content-Length", String(body.byteLength));
      headers.set("Content-Disposition", "inline");
      return new Response(new Uint8Array(body), { status: 200, headers });
    }

    headers.set("Content-Type", safeContentType(resolved.file.mimeType));
    headers.set("Content-Length", String(info.size));
    if (isPhoto) {
      headers.set("Content-Disposition", contentDisposition("inline", name));
    } else {
      const title = resolved.role === "document" ? resolved.title : (resolved.caption ?? name);
      headers.set(
        "Content-Disposition",
        contentDisposition("attachment", downloadName(title, resolved.file.filename))
      );
    }
    const stream = Readable.toWeb(
      createReadStream(filePath)
    ) as unknown as ReadableStream<Uint8Array>;
    return new Response(stream, { status: 200, headers });
  } catch (error) {
    // Never log the URL (it contains the token).
    console.error("[zakaz/docs] failed:", error instanceof Error ? error.name : "unknown");
    return new Response("Error", { status: 500, headers: BASE_HEADERS });
  }
}
