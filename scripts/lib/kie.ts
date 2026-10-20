/**
 * Minimal kie.ai Market API client used by `scripts/gen-images.ts` (dev-only tooling).
 *
 * Docs (checked 2026-10-20):
 * - https://docs.kie.ai/market/google/nano-banana            (createTask input)
 * - https://docs.kie.ai/market/google/pro-image-to-image     (nano-banana-pro input)
 * - https://docs.kie.ai/market/common/get-task-detail        (recordInfo polling)
 * - https://docs.kie.ai/common-api/get-account-credits       (credit balance)
 *
 * Important API quirks:
 * - The HTTP status is 200 even for errors — the real status lives in the body `code` field.
 * - `data.resultJson` is a JSON *string* (`{"resultUrls":[...]}`) that must be parsed again.
 * - Result files are kept ~14 days, so callers download them right away.
 *
 * The API key is only ever placed in the Authorization header; it is never logged and never
 * included in error messages.
 */

const KIE_BASE_URL = "https://api.kie.ai";

const POLL_INTERVAL_MS = 5_000;
/** Overall per-task timeout (matches kie.ai's own 408 "no result for > 10 min"). */
const TASK_TIMEOUT_MS = 10 * 60_000;
const REQUEST_TIMEOUT_MS = 60_000;
const DOWNLOAD_TIMEOUT_MS = 120_000;
const MAX_REQUEST_ATTEMPTS = 5;
const BASE_BACKOFF_MS = 2_000;
const MAX_BACKOFF_MS = 60_000;

/** Body `code` values documented by kie.ai. */
const CODE_OK = 200;
const CODE_UNAUTHORIZED = 401;
const CODE_INSUFFICIENT_CREDITS = 402;
const CODE_RATE_LIMITED = 429;

export type AspectRatio =
  "1:1" | "9:16" | "16:9" | "3:4" | "4:3" | "3:2" | "2:3" | "5:4" | "4:5" | "21:9" | "auto";

interface ModelDefinition {
  /** Builds the documented `input` object for this model. */
  buildInput: (prompt: string, aspect: AspectRatio) => Record<string, unknown>;
  /**
   * Rough per-image price used only for `--dry-run` estimates. kie.ai does not publish a
   * price list in the API docs; the real value is read from `creditsConsumed` per task.
   */
  estimatedCredits: number;
}

/**
 * Text-to-image models whose input schema has been verified against the docs.
 * Add new entries only after checking https://docs.kie.ai/market/… — never guess params.
 */
export const KIE_MODELS: Readonly<Record<string, ModelDefinition>> = {
  // Fixed output size; for 16:9 the maximum is 1344x768, so backgrounds cannot reach 1920 px.
  "google/nano-banana": {
    buildInput: (prompt, aspect) => ({ prompt, output_format: "png", aspect_ratio: aspect }),
    estimatedCredits: 4,
  },
  // `resolution` accepts "1K" (API default) | "2K" | "4K" per the docs (pixel sizes are not
  // documented; "2K" is ~2048 px on the long side). This is the option for true 1920 px
  // backgrounds: `--model nano-banana-pro --only backgrounds` (higher price per image).
  "nano-banana-pro": {
    buildInput: (prompt, aspect) => ({
      prompt,
      image_input: [],
      output_format: "png",
      aspect_ratio: aspect,
      resolution: "2K",
    }),
    estimatedCredits: 18,
  },
};

export const DEFAULT_MODEL = "google/nano-banana";

/** Unrecoverable for the whole run (bad key, no credits) — the CLI stops all workers. */
export class KieFatalError extends Error {
  constructor(
    message: string,
    readonly code: number
  ) {
    super(message);
    this.name = "KieFatalError";
  }
}

/** The task itself failed or timed out — the caller may retry the task once. */
export class KieTaskError extends Error {
  constructor(
    message: string,
    readonly creditsConsumed: number
  ) {
    super(message);
    this.name = "KieTaskError";
  }
}

/**
 * Transient failure that is worth retrying with backoff. `rejectedBeforeProcessing` is true
 * only when the server demonstrably did not act on the request (429 rate limit), which makes
 * it safe to retry even a non-idempotent call such as createTask.
 */
class RetryableError extends Error {
  constructor(
    message: string,
    readonly rejectedBeforeProcessing = false
  ) {
    super(message);
    this.name = "RetryableError";
  }
}

/**
 * Retry policy: `idempotent` calls (GET polling, downloads) retry every transient failure;
 * non-idempotent calls (createTask POST) retry only failures where the request provably
 * never created anything — a 429 rejection or a connection that was never established.
 * Timeouts, resets and 5xx after the body was sent are ambiguous (the task may exist and be
 * billed), so they surface immediately instead of risking a duplicate paid task.
 */
type RetryPolicy = "idempotent" | "non-idempotent";

/** undici error codes raised before any byte of the request reached the server. */
const PRE_SEND_CONNECTION_CODES = new Set([
  "ECONNREFUSED",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ENETUNREACH",
  "EHOSTUNREACH",
  "UND_ERR_CONNECT_TIMEOUT",
]);

/** fetch() rejects with `TypeError("fetch failed", { cause })`; the cause carries the code. */
function isPreSendConnectionError(error: unknown): boolean {
  if (!(error instanceof TypeError)) return false;
  const cause = (error as { cause?: { code?: unknown } }).cause;
  return typeof cause?.code === "string" && PRE_SEND_CONNECTION_CODES.has(cause.code);
}

function isTransientError(error: unknown): boolean {
  return (
    error instanceof RetryableError ||
    // fetch() rejects with TypeError on network failures and DOMException on timeout.
    error instanceof TypeError ||
    (error instanceof DOMException && error.name === "TimeoutError")
  );
}

function isRetryable(error: unknown, policy: RetryPolicy): boolean {
  if (policy === "idempotent") return isTransientError(error);
  return (
    (error instanceof RetryableError && error.rejectedBeforeProcessing) ||
    isPreSendConnectionError(error)
  );
}

interface KieEnvelope<T> {
  code: number;
  msg?: string;
  data?: T | null;
}

interface RecordInfo {
  taskId: string;
  state: "waiting" | "queuing" | "generating" | "success" | "fail";
  resultJson?: string | null;
  failCode?: string | null;
  failMsg?: string | null;
  creditsConsumed?: number | null;
}

export interface TaskResult {
  taskId: string;
  resultUrls: string[];
  creditsConsumed: number;
}

export interface KieClientOptions {
  apiKey: string;
  /** Logger for progress lines; must never receive secrets. */
  log?: (line: string) => void;
  /** Lets the CLI abort in-flight polling when another worker hits a fatal error. */
  signal?: AbortSignal;
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });

const backoffDelay = (attempt: number) =>
  Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** attempt) + Math.floor(Math.random() * 500);

const isServerErrorCode = (code: number) => code >= 500;

export class KieClient {
  private readonly apiKey: string;
  private readonly log: (line: string) => void;
  private readonly signal: AbortSignal | undefined;

  constructor(options: KieClientOptions) {
    if (!options.apiKey) {
      throw new Error("KIE_AI_API_KEY is not set (expected in the root .env file)");
    }
    this.apiKey = options.apiKey;
    this.log = options.log ?? (() => {});
    this.signal = options.signal;
  }

  /** Remaining credit balance (`GET /api/v1/chat/credit`). */
  async getCredits(): Promise<number> {
    const data = await this.request<number>("GET", "/api/v1/chat/credit");
    if (typeof data !== "number") throw new Error("kie.ai: unexpected credit response");
    return data;
  }

  /** Creates a task and returns its id (`POST /api/v1/jobs/createTask`). */
  async createTask(model: string, prompt: string, aspect: AspectRatio): Promise<string> {
    const definition = KIE_MODELS[model];
    if (!definition) throw new Error(`kie.ai: model "${model}" is not in KIE_MODELS`);
    let data: { taskId?: string } | null;
    try {
      data = await this.request<{ taskId?: string }>(
        "POST",
        "/api/v1/jobs/createTask",
        { model, input: definition.buildInput(prompt, aspect) },
        "non-idempotent"
      );
    } catch (error) {
      if (error instanceof KieFatalError || !isTransientError(error)) throw error;
      // Ambiguous outcome: the POST may have created (and billed) a task we never saw.
      throw new Error(
        `kie.ai: createTask outcome unknown (${(error as Error).message}); not retried to ` +
          `avoid a duplicate paid task — check the kie.ai dashboard before re-running`,
        { cause: error }
      );
    }
    if (!data?.taskId) throw new Error("kie.ai: createTask returned no taskId");
    return data.taskId;
  }

  /** Polls `recordInfo` every 5 s until the task succeeds, fails or times out. */
  async waitForTask(taskId: string): Promise<TaskResult> {
    const deadline = Date.now() + TASK_TIMEOUT_MS;
    let lastState = "";
    while (Date.now() < deadline) {
      await sleep(POLL_INTERVAL_MS, this.signal);
      const info = await this.request<RecordInfo>(
        "GET",
        `/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`
      );
      if (!info) throw new Error("kie.ai: recordInfo returned no data");
      if (info.state !== lastState) {
        this.log(`  ${taskId}: ${info.state}`);
        lastState = info.state;
      }
      const credits = info.creditsConsumed ?? 0;
      if (info.state === "fail") {
        throw new KieTaskError(
          `task ${taskId} failed (${info.failCode || "?"}): ${info.failMsg || "no message"}`,
          credits
        );
      }
      if (info.state === "success") {
        return { taskId, resultUrls: parseResultUrls(info.resultJson), creditsConsumed: credits };
      }
    }
    throw new KieTaskError(`task ${taskId} timed out after ${TASK_TIMEOUT_MS / 60_000} min`, 0);
  }

  /** Creates a task and waits for its result. */
  async generate(model: string, prompt: string, aspect: AspectRatio): Promise<TaskResult> {
    const taskId = await this.createTask(model, prompt, aspect);
    this.log(`  task created: ${taskId}`);
    return this.waitForTask(taskId);
  }

  /** Downloads a result file (the URL is public and contains no credentials). */
  async download(url: string): Promise<Buffer> {
    return this.withRetries(`download ${url}`, "idempotent", async () => {
      const response = await fetch(url, { signal: this.timeoutSignal(DOWNLOAD_TIMEOUT_MS) });
      if (!response.ok) {
        const error = `download failed: HTTP ${response.status}`;
        if (response.status === 429 || response.status >= 500) throw new RetryableError(error);
        throw new Error(error);
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length === 0) throw new RetryableError("download returned an empty body");
      return buffer;
    });
  }

  private timeoutSignal(ms: number): AbortSignal {
    const timeout = AbortSignal.timeout(ms);
    return this.signal ? AbortSignal.any([timeout, this.signal]) : timeout;
  }

  private async request<T>(
    method: "GET" | "POST",
    path: string,
    body?: unknown,
    policy: RetryPolicy = "idempotent"
  ) {
    return this.withRetries(`${method} ${path.split("?")[0]}`, policy, async () => {
      const init: RequestInit = {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        signal: this.timeoutSignal(REQUEST_TIMEOUT_MS),
      };
      if (body !== undefined) init.body = JSON.stringify(body);

      const response = await fetch(`${KIE_BASE_URL}${path}`, init);
      // kie.ai normally answers HTTP 200 and reports errors in `code`, but proxies/gateways
      // in front of it may still return real HTTP errors.
      if (response.status === CODE_RATE_LIMITED) {
        throw new RetryableError(`HTTP ${response.status}`, true);
      }
      if (response.status >= 500) throw new RetryableError(`HTTP ${response.status}`);
      let envelope: KieEnvelope<T>;
      try {
        envelope = (await response.json()) as KieEnvelope<T>;
      } catch {
        throw new RetryableError(`non-JSON response (HTTP ${response.status})`);
      }
      const { code, msg = "" } = envelope;
      if (code === CODE_OK) return envelope.data ?? null;
      if (code === CODE_INSUFFICIENT_CREDITS) {
        throw new KieFatalError(`kie.ai: insufficient credits (402) — top up the balance`, code);
      }
      if (code === CODE_UNAUTHORIZED) {
        throw new KieFatalError(`kie.ai: invalid or missing API key (401)`, code);
      }
      if (code === CODE_RATE_LIMITED) throw new RetryableError(`code ${code}: ${msg}`, true);
      if (isServerErrorCode(code)) throw new RetryableError(`code ${code}: ${msg}`);
      throw new Error(`kie.ai: code ${code}: ${msg}`);
    });
  }

  /** Retries per `policy` (see RetryPolicy) with exponential backoff + jitter. */
  private async withRetries<T>(
    label: string,
    policy: RetryPolicy,
    fn: () => Promise<T>
  ): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (this.signal?.aborted) throw error;
        if (!isRetryable(error, policy) || attempt + 1 >= MAX_REQUEST_ATTEMPTS) throw error;
        const delay = backoffDelay(attempt);
        this.log(`  ${label}: ${(error as Error).message}; retry in ${Math.round(delay / 1000)} s`);
        await sleep(delay, this.signal);
      }
    }
  }
}

function parseResultUrls(resultJson: string | null | undefined): string[] {
  if (!resultJson) throw new Error("kie.ai: success without resultJson");
  let parsed: unknown;
  try {
    parsed = JSON.parse(resultJson);
  } catch {
    throw new Error("kie.ai: resultJson is not valid JSON");
  }
  const urls = (parsed as { resultUrls?: unknown }).resultUrls;
  if (!Array.isArray(urls) || urls.length === 0 || !urls.every((u) => typeof u === "string")) {
    throw new Error("kie.ai: resultJson has no resultUrls");
  }
  return urls as string[];
}
