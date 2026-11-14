import { getEnv } from "@/lib/env";
import { submitToIndexNow } from "@/lib/seo/indexnow";
import type { TaskConfig } from "payload";

/**
 * `indexnow-submit` `{ urls }` — sends changed URLs to IndexNow (task 36).
 *
 * Queued by the IndexNow plugin (`src/payload/plugins/indexnow.ts`) with `waitUntil` ≈ now + 60 s,
 * so the HTTP call never runs inside an admin save. The slug and the input/output shapes are
 * frozen (task 18: task slugs are part of the `payload_jobs` enums).
 *
 * Outcome handling (see `@/lib/seo/indexnow`):
 * - 200 / 202 → done;
 * - 400 / 403 / 422 → configuration error (bad key, foreign host): logged, NOT retried — the job
 *   completes, retrying the same request cannot succeed;
 * - 429 / 5xx / network error → the handler throws and Payload retries the job: at most 3 retries
 *   with exponential backoff (1 min, 2 min, 4 min).
 */

export const INDEXNOW_SUBMIT = "indexnow-submit";

export type IndexNowSubmitInput = { urls: string[] };
export type IndexNowSubmitOutput = { submitted: number };

const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 60_000;

export const indexNowSubmitTask: TaskConfig<{
  input: IndexNowSubmitInput;
  output: IndexNowSubmitOutput;
}> = {
  slug: INDEXNOW_SUBMIT,
  label: "Отправка URL в IndexNow",
  inputSchema: [{ name: "urls", type: "text", hasMany: true, required: true }],
  outputSchema: [{ name: "submitted", type: "number" }],
  retries: { attempts: RETRY_ATTEMPTS, backoff: { type: "exponential", delay: RETRY_DELAY_MS } },
  handler: async ({ input, req }) => {
    const { INDEXNOW_KEY, SITE_ENV, SITE_URL } = getEnv();
    const urls = Array.isArray(input.urls) ? input.urls : [];

    // Defence in depth: the plugin queues only on production, but a job row may be copied over
    // (DB restore on staging) or queued by hand.
    if (SITE_ENV !== "production" || !INDEXNOW_KEY) {
      req.payload.logger.warn({
        msg: "IndexNow: пропуск (не production или нет INDEXNOW_KEY)",
        urls: urls.length,
      });
      return { output: { submitted: 0 } };
    }

    const result = await submitToIndexNow(urls, { siteUrl: SITE_URL, key: INDEXNOW_KEY });

    if (result.outcome === "retryable") {
      // Thrown → Payload marks the attempt failed and retries with backoff.
      throw new Error(
        `IndexNow: временная ошибка (${result.status ?? result.reason ?? "network"}) ${result.endpoint ?? ""}`.trim()
      );
    }
    if (result.outcome === "config-error") {
      req.payload.logger.error({
        msg: "IndexNow: ошибка конфигурации, повтор не выполняется",
        status: result.status,
        endpoint: result.endpoint,
        reason: result.reason,
        urls: urls.length,
      });
      return { output: { submitted: result.submitted } };
    }

    req.payload.logger.info({ msg: "IndexNow: URL отправлены", submitted: result.submitted });
    return { output: { submitted: result.submitted } };
  },
};
