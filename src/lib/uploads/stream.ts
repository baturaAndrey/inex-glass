import { createHash, randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import busboy from "busboy";
import { getEnv } from "@/lib/env";
import { SIGNATURE_HEAD_LENGTH, SIGNATURE_TAIL_LENGTH } from "./signature";
import type { ReadableStream as NodeWebReadableStream } from "node:stream/web";

/**
 * Streaming multipart intake of `POST /api/upload/` (task 17).
 *
 * The file goes straight from the request stream to `${tmpDir}/<uuid>.part` on disk: the process
 * keeps only the current chunk, the first and last kilobyte (content checks) and a
 * running SHA-256 — a 50 MB drawing never sits in RAM. When the size limit is hit the request
 * stream is torn down at once, the partial file is deleted and the caller answers 413.
 *
 * Pure Node + busboy (no Payload): file-name helpers are unit-tested.
 */

// ---------------------------------------------------------------------------------------------
// Locations
// ---------------------------------------------------------------------------------------------

/** Accepted but not yet attached uploads (`cleanup-tmp-uploads`, task 18, purges > 24 h). */
export const uploadTmpDir = (): string => path.resolve(getEnv().UPLOADS_DIR, "tmp");

/** Temp file of a finished upload. `id` is a UUID and `ext` an allow-listed extension. */
export const tmpUploadPath = (id: string, ext: string): string =>
  path.join(uploadTmpDir(), `${id}.${ext}`);

/**
 * Server-side facts of a finished upload that do not fit into the 200-character upload token:
 * written by `/api/upload/` next to the temp file, read when the lead is created. Only the server
 * writes it, so it is trusted (the token itself proves which upload the client refers to).
 */
export interface UploadSidecar {
  /** Display name (`cleanOriginalName`). */
  originalName: string;
  /** Hex SHA-256 of the content. */
  sha256: string;
}

const SHA256_HEX = /^[0-9a-f]{64}$/;

/** `<id>.meta.json` — `json` is not an upload extension, so it never collides with a file. */
export const uploadSidecarPath = (id: string): string =>
  path.join(uploadTmpDir(), `${id}.meta.json`);

export async function writeUploadSidecar(id: string, sidecar: UploadSidecar): Promise<void> {
  await writeFile(uploadSidecarPath(id), JSON.stringify(sidecar), {
    flag: "wx",
    mode: TMP_FILE_MODE,
  });
}

/** The sidecar of an upload, or `null` when it is missing or unreadable. */
export async function readUploadSidecar(id: string): Promise<UploadSidecar | null> {
  try {
    const raw = JSON.parse(await readFile(uploadSidecarPath(id), "utf8")) as Partial<UploadSidecar>;
    if (typeof raw.originalName !== "string" || raw.originalName === "") return null;
    if (typeof raw.sha256 !== "string" || !SHA256_HEX.test(raw.sha256)) return null;
    return { originalName: cleanOriginalName(raw.originalName), sha256: raw.sha256 };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------------------------
// File names
// ---------------------------------------------------------------------------------------------

/** Whole sanitized name, extension included. */
export const MAX_SANITIZED_NAME_LENGTH = 100;
/** Display name kept in `lead-files.originalName`. */
export const MAX_ORIGINAL_NAME_LENGTH = 200;
const FALLBACK_NAME = "file";
const EXTENSION_PATTERN = /^[a-z0-9]{1,10}$/;

/**
 * Cyrillic → Latin, GOST 7.79-2000 system B, simplified for file names: no apostrophes or
 * diacritics, `ё` → `e`, `х` → `x`, `ц` → `c`, `щ` → `shh`, hard/soft signs dropped.
 */
const TRANSLIT: Readonly<Record<string, string>> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "j",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "x",
  ц: "c",
  ч: "ch",
  ш: "sh",
  щ: "shh",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
  // Ukrainian/Belarusian letters that show up in real file names.
  і: "i",
  ї: "yi",
  є: "ye",
  ґ: "g",
  ў: "u",
};

const transliterate = (text: string): string =>
  Array.from(text, (char) => TRANSLIT[char] ?? char).join("");

/** Characters outside the safe set become `-`; runs of separators collapse; edges are trimmed. */
const toSafeSegment = (text: string): string =>
  text
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/\.{2,}/g, ".")
    .replace(/[-.]*([._-])[-.]*/g, "$1")
    .replace(/^[-._]+|[-._]+$/g, "");

/**
 * Safe ASCII file name: transliterated Cyrillic, lower case, only `[a-z0-9._-]`, at most
 * `MAX_SANITIZED_NAME_LENGTH` characters including the lower-case extension; never empty,
 * never starts with a dot. Example: «Чертёж перегородки №3 (v2).DWG» → `chertezh-peregorodki-3-v2.dwg`.
 */
export function sanitizeFilename(original: string): string {
  const base = (original.split(/[\\/]/).pop() ?? "").normalize("NFC").toLowerCase();
  const dot = base.lastIndexOf(".");
  const rawExt = dot > 0 ? base.slice(dot + 1) : "";
  const ext = EXTENSION_PATTERN.test(rawExt) ? rawExt : "";
  const stem = ext ? base.slice(0, dot) : base;

  const suffix = ext ? `.${ext}` : "";
  const maxStem = MAX_SANITIZED_NAME_LENGTH - suffix.length;
  let safeStem = toSafeSegment(transliterate(stem));
  if (safeStem.length > maxStem) {
    safeStem = safeStem.slice(0, maxStem).replace(/[-._]+$/, "");
  }
  return `${safeStem || FALLBACK_NAME}${suffix}`;
}

/** C0/C1 controls and bidi overrides/isolates (filename spoofing like `gpj.exe`). */
const UNSAFE_DISPLAY_CHARS = /[\u0000-\u001f\u007f-\u009f‎‏‪-‮⁦-⁩]/g;

/** Display name: base name only, unsafe characters removed, ≤ 200 code points, never empty. */
export function cleanOriginalName(original: string): string {
  const base = (original.split(/[\\/]/).pop() ?? "").replace(UNSAFE_DISPLAY_CHARS, "").trim();
  const clipped = Array.from(base.normalize("NFC")).slice(0, MAX_ORIGINAL_NAME_LENGTH).join("");
  return clipped.trim() || FALLBACK_NAME;
}

/** Lower-case extension of a file name without the dot, `""` when there is none. */
export function extensionOf(filename: string): string {
  const base = filename.split(/[\\/]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  return dot > 0
    ? base
        .slice(dot + 1)
        .trim()
        .toLowerCase()
    : "";
}

// ---------------------------------------------------------------------------------------------
// Streaming receive
// ---------------------------------------------------------------------------------------------

/** Multipart limits: one `file` part plus a few small text fields (`purpose`). */
const MAX_FIELDS = 4;
const MAX_PARTS = 6;
const MAX_FIELD_BYTES = 1024;
const FILE_FIELD = "file";
const TMP_DIR_MODE = 0o700;
const TMP_FILE_MODE = 0o600;

export interface ReceivedUpload {
  /** UUID of the temp file. */
  id: string;
  /** `${tmpDir}/<id>.part` — the caller renames or deletes it. */
  partPath: string;
  /** Name as sent by the browser, cleaned for display (`cleanOriginalName`). */
  originalName: string;
  size: number;
  /** First `SIGNATURE_HEAD_LENGTH` bytes (fewer for tiny files). */
  head: Buffer;
  /** Last `SIGNATURE_TAIL_LENGTH` bytes (the whole file when smaller). */
  tail: Buffer;
  /** Hex SHA-256 of the whole content. */
  sha256: string;
  /** Text fields of the form (first value of each name). */
  fields: Record<string, string>;
}

export type ReceiveFailure = "size" | "no_file" | "bad_request";
export type ReceiveResult =
  { ok: true; file: ReceivedUpload } | { ok: false; reason: ReceiveFailure };

export interface ReceiveOptions {
  tmpDir: string;
  /** Max file bytes (inclusive); one more byte gives `size`. */
  maxFileSize: number;
}

/** Deletes a file, ignoring "already gone". */
export async function removeQuietly(filePath: string): Promise<void> {
  try {
    await unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

type FileOutcome =
  { ok: true; file: Omit<ReceivedUpload, "fields"> } | { ok: false; reason: ReceiveFailure };

/** Writes one busboy file stream to disk while hashing it and keeping its first bytes. */
async function writePart(
  input: Readable & { truncated?: boolean },
  filename: string,
  tmpDir: string
): Promise<FileOutcome> {
  const id = randomUUID();
  const partPath = path.join(tmpDir, `${id}.part`);
  const hash = createHash("sha256");
  const headChunks: Buffer[] = [];
  let headLength = 0;
  let tail = Buffer.alloc(0);
  let size = 0;

  const meter = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      size += chunk.length;
      hash.update(chunk);
      if (headLength < SIGNATURE_HEAD_LENGTH) {
        const take = chunk.subarray(0, SIGNATURE_HEAD_LENGTH - headLength);
        headChunks.push(Buffer.from(take));
        headLength += take.length;
      }
      // Rolling window: at most SIGNATURE_TAIL_LENGTH + one chunk in memory.
      tail = Buffer.concat([tail, chunk]);
      if (tail.length > SIGNATURE_TAIL_LENGTH)
        tail = tail.subarray(tail.length - SIGNATURE_TAIL_LENGTH);
      callback(null, chunk);
    },
  });

  try {
    await pipeline(input, meter, createWriteStream(partPath, { flags: "wx", mode: TMP_FILE_MODE }));
  } catch {
    await removeQuietly(partPath);
    // An aborted request after the size limit is still a size error, not a broken request.
    return { ok: false, reason: input.truncated ? "size" : "bad_request" };
  }

  if (input.truncated) {
    await removeQuietly(partPath);
    return { ok: false, reason: "size" };
  }
  return {
    ok: true,
    file: {
      id,
      partPath,
      originalName: cleanOriginalName(filename),
      size,
      head: Buffer.concat(headChunks),
      tail: Buffer.from(tail),
      sha256: hash.digest("hex"),
    },
  };
}

/**
 * Streams the single `file` part of a multipart request to a temp file. Extra files and unknown
 * parts are drained and ignored. Never throws for client errors: returns `size` (limit hit),
 * `no_file` or `bad_request` (not multipart, malformed body, aborted upload).
 */
export async function receiveUpload(
  request: Request,
  options: ReceiveOptions
): Promise<ReceiveResult> {
  const contentType = request.headers.get("content-type");
  if (!request.body || !contentType?.toLowerCase().startsWith("multipart/form-data")) {
    return { ok: false, reason: "bad_request" };
  }

  let parser: busboy.Busboy;
  try {
    parser = busboy({
      headers: { "content-type": contentType },
      // Browsers send UTF-8 file names; busboy's default is latin1.
      defParamCharset: "utf8",
      limits: {
        files: 1,
        // busboy flags a file that REACHES the limit as truncated: +1 lets exactly
        // `maxFileSize` bytes through, and `truncated` then means "larger than allowed".
        fileSize: options.maxFileSize + 1,
        fields: MAX_FIELDS,
        parts: MAX_PARTS,
        fieldSize: MAX_FIELD_BYTES,
      },
    });
  } catch {
    // Missing/invalid boundary.
    return { ok: false, reason: "bad_request" };
  }

  const signal = request.signal as AbortSignal | undefined;
  // The client may already be gone (e.g. while the rate limit was checked).
  if (signal?.aborted) return { ok: false, reason: "bad_request" };

  await mkdir(options.tmpDir, { recursive: true, mode: TMP_DIR_MODE });
  const hasDeclaredLength = Number(request.headers.get("content-length")) > 0;
  const source = Readable.fromWeb(request.body as unknown as NodeWebReadableStream<Uint8Array>);

  return new Promise<ReceiveResult>((resolve) => {
    const fields: Record<string, string> = {};
    let fileTask: Promise<FileOutcome> | null = null;
    /** Busboy stream of the `file` part while it is being written to disk. */
    let activeFile: Readable | null = null;
    let settled = false;
    /** Set by `fail()`: from then on only `fail()` decides the result. */
    let failing = false;

    const onSignalAbort = () => void fail("bad_request");

    const settle = async (result: ReceiveResult) => {
      if (settled) {
        // A late success after an abort must not leave its temp file behind.
        if (result.ok) await removeQuietly(result.file.partPath);
        return;
      }
      settled = true;
      signal?.removeEventListener("abort", onSignalAbort);
      resolve(result);
    };

    /** Stops reading the request body (limit hit or broken stream). */
    const abort = () => {
      source.unpipe(parser);
      source.destroy();
    };

    /**
     * Tears everything down — request body, busboy, the file part (its `pipeline` then rejects,
     * closes the write stream and deletes `<uuid>.part`) — and always settles the promise.
     * Called on a client disconnect, a broken body or a parser error.
     */
    const fail = async (reason: ReceiveFailure) => {
      if (failing || settled) return;
      failing = true;
      abort();
      activeFile?.destroy(new Error("Upload aborted"));
      parser.destroy();
      let outcome: FileOutcome | null = null;
      try {
        outcome = fileTask ? await fileTask : null;
        if (outcome?.ok) await removeQuietly(outcome.file.partPath);
      } catch {
        // `writePart` handles its own errors; a failed cleanup must not leave the request hanging.
      }
      await settle({ ok: false, reason: outcome && !outcome.ok ? outcome.reason : reason });
    };

    parser.on("field", (name, value, info) => {
      if (!info.nameTruncated && !info.valueTruncated && !(name in fields)) fields[name] = value;
    });

    parser.on("file", (name, stream, info) => {
      if (name !== FILE_FIELD || fileTask) {
        stream.resume();
        return;
      }
      stream.once("limit", () => {
        // With a declared length (capped by the caller) busboy simply drains the rest and the
        // client reads the 413 normally. A body without a length is unbounded: tear it down.
        // The file stream is destroyed too — without more input it would never end.
        if (!hasDeclaredLength) {
          abort();
          stream.destroy();
        }
      });
      activeFile = stream;
      fileTask = writePart(stream, info.filename ?? "", options.tmpDir);
      void fileTask.then((outcome) => {
        activeFile = null;
        if (!outcome.ok && outcome.reason === "size") void settle(outcome);
      });
    });

    parser.on("close", async () => {
      // `parser.destroy()` in `fail()` also emits `close`: the result is `fail()`'s then.
      if (failing) return;
      if (!fileTask) {
        await settle({ ok: false, reason: "no_file" });
        return;
      }
      const outcome = await fileTask;
      await settle(outcome.ok ? { ok: true, file: { ...outcome.file, fields } } : outcome);
    });

    parser.on("error", () => void fail("bad_request"));
    source.on("error", () => void fail("bad_request"));
    // A client disconnect does not always surface as a body stream error (the body may simply
    // stall): the request signal is the reliable "client gone" notification.
    signal?.addEventListener("abort", onSignalAbort, { once: true });
    source.pipe(parser);
  });
}
