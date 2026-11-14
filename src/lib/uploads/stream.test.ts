import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  cleanOriginalName,
  extensionOf,
  MAX_ORIGINAL_NAME_LENGTH,
  MAX_SANITIZED_NAME_LENGTH,
  receiveUpload,
  sanitizeFilename,
} from "./stream";

describe("sanitizeFilename", () => {
  it("transliterates Cyrillic and keeps only safe characters", () => {
    expect(sanitizeFilename("Чертёж перегородки №3 (v2).DWG")).toBe(
      "chertezh-peregorodki-3-v2.dwg"
    );
    expect(sanitizeFilename("Щит_Ящик Юг.pdf")).toBe("shhit_yashhik-yug.pdf");
  });

  it("lower-cases the extension and drops path components", () => {
    expect(sanitizeFilename("C:\\Users\\me\\Plan.PDF")).toBe("plan.pdf");
    expect(sanitizeFilename("../../etc/passwd")).toBe("passwd");
  });

  it("never starts with a dot and never returns an empty name", () => {
    expect(sanitizeFilename(".htaccess")).toBe("htaccess");
    expect(sanitizeFilename("")).toBe("file");
    expect(sanitizeFilename("№№№.pdf")).toBe("file.pdf");
    expect(sanitizeFilename("???")).toBe("file");
  });

  it("collapses separator runs", () => {
    expect(sanitizeFilename("a  --  b...c.dxf")).toBe("a-b.c.dxf");
  });

  it("truncates long names to 100 characters including the extension", () => {
    const result = sanitizeFilename(`${"очень длинное имя ".repeat(20)}.dwg`);
    expect(result.length).toBeLessThanOrEqual(MAX_SANITIZED_NAME_LENGTH);
    expect(result.endsWith(".dwg")).toBe(true);
    expect(result).not.toMatch(/-\.dwg$/);
  });

  it("decomposed (NFD) letters give the same result", () => {
    expect(sanitizeFilename("Чертёж.pdf".normalize("NFD"))).toBe("chertezh.pdf");
  });
});

describe("cleanOriginalName", () => {
  it("removes control and bidi characters, keeps Cyrillic", () => {
    expect(cleanOriginalName("Чертёж\u0000\u202e.pdf")).toBe("Чертёж.pdf");
  });

  it("caps the length and falls back to `file`", () => {
    expect(Array.from(cleanOriginalName("я".repeat(500))).length).toBe(MAX_ORIGINAL_NAME_LENGTH);
    expect(cleanOriginalName("  \u0001 ")).toBe("file");
  });
});

describe("extensionOf", () => {
  it("returns the lower-case extension", () => {
    expect(extensionOf("Plan.DWG")).toBe("dwg");
    expect(extensionOf("archive.tar.gz")).toBe("gz");
    expect(extensionOf(".env")).toBe("");
    expect(extensionOf("noext")).toBe("");
  });
});

describe("receiveUpload", () => {
  const BOUNDARY = "----ig-test-boundary";
  const PART_HEAD = Buffer.from(
    `--${BOUNDARY}\r\n` +
      'Content-Disposition: form-data; name="file"; filename="plan.pdf"\r\n' +
      "Content-Type: application/pdf\r\n\r\n",
    "latin1"
  );
  const CHUNK = Buffer.alloc(64 * 1024, 0x41);
  const MAX_FILE_SIZE = 50 * 1024 * 1024;

  let tmpDir: string;
  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(tmpdir(), "ig-upload-"));
  });
  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  const multipartRequest = (body: ReadableStream<Uint8Array>, signal?: AbortSignal) =>
    new Request("http://localhost/api/upload/", {
      method: "POST",
      headers: { "content-type": `multipart/form-data; boundary=${BOUNDARY}` },
      body,
      signal,
      duplex: "half",
    } as RequestInit);

  /** Resolves once the receiver has written something into `tmpDir`. */
  async function waitForPartFile(): Promise<void> {
    for (let attempt = 0; attempt < 200; attempt += 1) {
      const entries = await readdir(tmpDir);
      if (entries.some((entry) => entry.endsWith(".part"))) return;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    throw new Error("no .part file was created");
  }

  it("stores a complete upload", async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(PART_HEAD);
        controller.enqueue(Buffer.from("%PDF-1.7\n", "latin1"));
        controller.enqueue(Buffer.from(`\r\n--${BOUNDARY}--\r\n`, "latin1"));
        controller.close();
      },
    });
    const result = await receiveUpload(multipartRequest(body), {
      tmpDir,
      maxFileSize: MAX_FILE_SIZE,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.file.size).toBe(9);
      expect(result.file.originalName).toBe("plan.pdf");
      expect(await readdir(tmpDir)).toEqual([path.basename(result.file.partPath)]);
    }
  });

  it("settles and deletes the partial file when the body errors mid-upload", async () => {
    let sent = 0;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(PART_HEAD);
      },
      async pull(controller) {
        if (sent === 8) {
          await waitForPartFile();
          controller.error(new Error("socket hang up"));
          return;
        }
        sent += 1;
        controller.enqueue(CHUNK);
      },
    });
    const result = await receiveUpload(multipartRequest(body), {
      tmpDir,
      maxFileSize: MAX_FILE_SIZE,
    });
    expect(result).toEqual({ ok: false, reason: "bad_request" });
    expect(await readdir(tmpDir)).toEqual([]);
  });

  it("settles and deletes the partial file when the client aborts a stalled body", async () => {
    const controller = new AbortController();
    let sent = 0;
    const body = new ReadableStream<Uint8Array>({
      start(stream) {
        stream.enqueue(PART_HEAD);
      },
      async pull(stream) {
        if (sent === 8) {
          // The body neither ends nor errors — only the request signal reports the disconnect.
          await waitForPartFile();
          controller.abort();
          return new Promise<void>(() => undefined);
        }
        sent += 1;
        stream.enqueue(CHUNK);
      },
    });
    const result = await receiveUpload(multipartRequest(body, controller.signal), {
      tmpDir,
      maxFileSize: MAX_FILE_SIZE,
    });
    expect(result).toEqual({ ok: false, reason: "bad_request" });
    expect(await readdir(tmpDir)).toEqual([]);
  });

  it("rejects an already aborted request without touching the disk", async () => {
    const controller = new AbortController();
    controller.abort();
    const body = new ReadableStream<Uint8Array>({ start: (stream) => stream.enqueue(PART_HEAD) });
    const result = await receiveUpload(multipartRequest(body, controller.signal), {
      tmpDir,
      maxFileSize: MAX_FILE_SIZE,
    });
    expect(result).toEqual({ ok: false, reason: "bad_request" });
    expect(await readdir(tmpDir)).toEqual([]);
  });
});
