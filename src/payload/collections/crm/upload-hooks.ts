import { open } from "node:fs/promises";
import { ValidationError } from "payload";
import { checkUpload, SIGNATURE_HEAD_BYTES } from "./upload-policy";
import type { UploadPolicy } from "./upload-policy";
import type { CollectionBeforeValidateHook, PayloadRequest } from "payload";

type RequestFile = NonNullable<PayloadRequest["file"]>;

/** First bytes of the uploaded file: in memory, or in the temp file when `useTempFiles` is on. */
async function readHead(file: RequestFile): Promise<Uint8Array | null> {
  if (file.data && file.data.length > 0) return file.data.subarray(0, SIGNATURE_HEAD_BYTES);
  if (!file.tempFilePath) return null;

  const handle = await open(file.tempFilePath, "r");
  try {
    const buffer = Buffer.alloc(SIGNATURE_HEAD_BYTES);
    const { bytesRead } = await handle.read(buffer, 0, SIGNATURE_HEAD_BYTES, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

/**
 * `beforeValidate` of an upload collection: enforces the extension/MIME/signature policy for a
 * newly attached file and stores the canonical MIME type. Runs after Payload generated the file
 * data (`filename`, `mimeType`) and before field validation (incl. Payload's `mimeType` check),
 * for every caller — admin, REST and Local API (`overrideAccess` does not skip it).
 */
export function enforceUploadPolicy(policy: UploadPolicy): CollectionBeforeValidateHook {
  return async ({ collection, data, req }) => {
    const file = req.file;
    if (!file || !data) return data;

    const filename = typeof data.filename === "string" && data.filename ? data.filename : file.name;
    const reported = typeof data.mimeType === "string" ? data.mimeType : file.mimetype;
    const result = checkUpload(policy, {
      filename,
      mimeType: reported,
      head: await readHead(file),
    });

    if (!result.ok) {
      throw new ValidationError({
        collection: collection.slug,
        errors: [{ message: result.message, path: "file" }],
        req,
      });
    }
    return { ...data, mimeType: result.mimeType };
  };
}
