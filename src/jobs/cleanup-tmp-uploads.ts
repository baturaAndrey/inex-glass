import { readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { getEnv } from "@/lib/env";
import { CLEANUP_BATCH_LIMIT, MAINTENANCE_QUEUE, MAINTENANCE_RETRIES } from "./shared";
import type { TaskConfig } from "payload";

/**
 * `cleanup-tmp-uploads` (hourly): removes abandoned uploads older than 24 h from
 * `${UPLOADS_DIR}/tmp` (task 17 writes `<uuid>.part` while streaming and `<uuid>.<ext>` until the
 * lead is created; a lead moves its files out of `tmp`). Idempotent; a missing directory is fine.
 */

export const CLEANUP_TMP_UPLOADS = "cleanup-tmp-uploads";

export const TMP_UPLOAD_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type CleanupTmpUploadsOutput = { deleted: number };

const isMissing = (error: unknown) =>
  typeof error === "object" && error !== null && (error as { code?: unknown }).code === "ENOENT";

/**
 * Deletes entries of `dir` whose mtime is older than `maxAgeMs`, at most `limit` per call.
 * Entries that vanish concurrently (the intake just consumed them) are ignored.
 */
export async function cleanupTmpDir(
  dir: string,
  now: Date = new Date(),
  maxAgeMs: number = TMP_UPLOAD_MAX_AGE_MS,
  limit: number = CLEANUP_BATCH_LIMIT
): Promise<number> {
  let names: string[];
  try {
    names = await readdir(dir);
  } catch (error) {
    if (isMissing(error)) return 0;
    throw error;
  }

  const cutoff = now.getTime() - maxAgeMs;
  let deleted = 0;
  for (const name of names) {
    if (deleted >= limit) break;
    const entry = path.join(dir, name);
    try {
      const info = await stat(entry);
      if (info.mtimeMs >= cutoff) continue;
      await rm(entry, { recursive: true, force: true });
      deleted += 1;
    } catch (error) {
      if (!isMissing(error)) throw error;
    }
  }
  return deleted;
}

export const tmpUploadsDir = () => path.resolve(getEnv().UPLOADS_DIR, "tmp");

export const cleanupTmpUploadsTask: TaskConfig<{
  input: object;
  output: CleanupTmpUploadsOutput;
}> = {
  slug: CLEANUP_TMP_UPLOADS,
  label: "Очистка временных загрузок",
  outputSchema: [{ name: "deleted", type: "number" }],
  retries: MAINTENANCE_RETRIES,
  schedule: [{ cron: "0 * * * *", queue: MAINTENANCE_QUEUE }],
  handler: async ({ req }) => {
    const deleted = await cleanupTmpDir(tmpUploadsDir());
    if (deleted > 0) req.payload.logger.info({ msg: "cleanup-tmp-uploads", deleted });
    return { output: { deleted } };
  },
};
