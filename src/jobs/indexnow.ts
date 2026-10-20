import type { TaskConfig } from "payload";

/**
 * `indexnow-submit` `{ urls }` — STUB. Registered now because task slugs are part of the
 * `payload_jobs` enums: adding the task later would need another migration. Task 36 (wave 6)
 * replaces the handler body only; the slug, input and output shapes stay as they are.
 */

export const INDEXNOW_SUBMIT = "indexnow-submit";

export type IndexNowSubmitInput = { urls: string[] };
export type IndexNowSubmitOutput = { submitted: number };

export const indexNowSubmitTask: TaskConfig<{
  input: IndexNowSubmitInput;
  output: IndexNowSubmitOutput;
}> = {
  slug: INDEXNOW_SUBMIT,
  label: "Отправка URL в IndexNow",
  inputSchema: [{ name: "urls", type: "text", hasMany: true, required: true }],
  outputSchema: [{ name: "submitted", type: "number" }],
  retries: 3,
  handler: async ({ input, req }) => {
    req.payload.logger.info({
      msg: "IndexNow ещё не реализован",
      urls: Array.isArray(input.urls) ? input.urls.length : 0,
    });
    return { output: { submitted: 0 } };
  },
};
