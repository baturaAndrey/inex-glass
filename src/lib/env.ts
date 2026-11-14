import { z } from "zod";
// Pure module (no env/Payload imports), so importing it here creates no cycle.
import { INDEXNOW_KEY_PATTERN } from "@/lib/seo/indexnow";

/**
 * Server environment validation (zod 4).
 *
 * `getEnv()` parses `process.env` once and memoizes the result. Empty strings are treated
 * as "not set" so that blank lines in `.env` (e.g. `SMTP_USER=`) fall back to defaults.
 *
 * The Docker image is built once in CI without any runtime secrets or database and then
 * deployed to staging and prod with their own values. `next build` still evaluates the
 * Payload config while collecting page data, so during the build phase (and only then):
 * - DATABASE_URL and PAYLOAD_SECRET fall back to inert, clearly non-secret placeholders
 *   (the build never connects to the database);
 * - production-only requirements (SITE_URL, FORM_HMAC_SECRET, ORDER_TOKEN_SECRET) are skipped.
 * At runtime all of them are enforced.
 */

const MIN_SECRET_LENGTH = 32;

/** Dev-only placeholders; production must provide real values (see superRefine below). */
const DEV_FORM_HMAC_SECRET = "dev-only-form-hmac-secret-change-me-0000";
const DEV_ORDER_TOKEN_SECRET = "dev-only-order-token-secret-change-me-000";
const DEFAULT_SITE_URL = "http://localhost:3000";

/** Next.js sets this while running `next build`. */
const NEXT_BUILD_PHASE = "phase-production-build";

/**
 * Build-phase-only placeholders. Not secrets: port 1 is never listening, so any accidental
 * connection attempt during the build fails fast instead of reaching a real database.
 */
const BUILD_PLACEHOLDER_DATABASE_URL = "postgresql://build:build@127.0.0.1:1/build";
const BUILD_PLACEHOLDER_PAYLOAD_SECRET = "build-phase-placeholder-not-a-secret-0000";

const booleanString = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

const secret = (name: string) =>
  z.string().min(MIN_SECRET_LENGTH, `${name} должна быть не короче ${MIN_SECRET_LENGTH} символов`);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // Database / Payload
  DATABASE_URL: z.url(),
  PAYLOAD_SECRET: secret("PAYLOAD_SECRET"),
  /** Schema push is allowed ONLY on a developer's personal throwaway database. */
  PAYLOAD_DB_PUSH: booleanString,

  // Site
  SITE_URL: z.url().default(DEFAULT_SITE_URL),
  /** Avoid depending on it: prefer runtime SITE_URL (NEXT_PUBLIC_* is inlined at build time). */
  NEXT_PUBLIC_SITE_URL: z.url().optional(),
  SITE_ENV: z.enum(["development", "staging", "production"]).default("development"),
  STAGING_BASIC_AUTH: z
    .string()
    .regex(/^[^:]+:.+$/, "STAGING_BASIC_AUTH должна иметь формат user:pass")
    .optional(),

  // Mail (dev: mailpit on localhost:1025)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  /** Staging: all outgoing mail is redirected to this mailbox. */
  MAIL_INTERCEPT_TO: z.email().optional(),

  // Files
  UPLOADS_DIR: z.string().default("./.data/lead-files"),
  MEDIA_DIR: z.string().default("./.data/media"),

  // Secrets with dev defaults (required in production)
  FORM_HMAC_SECRET: secret("FORM_HMAC_SECRET").default(DEV_FORM_HMAC_SECRET),
  /**
   * HMAC key for order-page tokens (tasks 18/33). Separate from PAYLOAD_SECRET so that
   * rotating Payload's secret does not invalidate links already sent to clients.
   */
  ORDER_TOKEN_SECRET: secret("ORDER_TOKEN_SECRET").default(DEV_ORDER_TOKEN_SECRET),

  // Jobs / SEO
  /** Enable the Payload Jobs runner on exactly one container. */
  JOBS_ENABLED: booleanString,
  /**
   * Same format as the IndexNow client and the key-file route expect (`openssl rand -hex 16`).
   * Validated here so a malformed key fails the deploy healthcheck loudly instead of every
   * IndexNow submission being skipped silently. Case is normalized: `openssl` prints lowercase,
   * but a hand-typed uppercase key is the same key.
   */
  INDEXNOW_KEY: z
    .string()
    .trim()
    .toLowerCase()
    .regex(INDEXNOW_KEY_PATTERN, "ожидается 32 hex-символа (openssl rand -hex 16)")
    .optional(),

  // MAX messenger (task 06 admin-redesign)
  /** Master switch of outgoing notifications (task 10). Linking works without it. */
  MAX_ENABLED: booleanString,
  /** Bot token from the MAX partner platform. Never logged. */
  MAX_BOT_TOKEN: z.string().min(16).optional(),
  /** Bot nickname for deep links: https://max.ru/<name>?start=<token>. */
  MAX_BOT_NAME: z
    .string()
    .regex(/^[A-Za-z0-9_.-]{3,64}$/, "ник бота: латиница, цифры, _ . -")
    .optional(),
  /** Secret of the webhook subscription (header X-Max-Bot-Api-Secret). */
  MAX_WEBHOOK_SECRET: z
    .string()
    .regex(/^[A-Za-z0-9_-]{32,256}$/, "32–256 символов A-Z a-z 0-9 _ -")
    .optional(),
  /** Not production: every notification goes to this chat (or nowhere when unset). */
  MAX_INTERCEPT_CHAT_ID: z
    .string()
    .regex(/^-?\d{1,20}$/, "числовой ID чата MAX")
    .optional(),
  /** Bot API base URL, only for mocks (e2e). Unset or SITE_ENV=production → https://platform-api2.max.ru. */
  MAX_API_BASE_URL: z.url().optional(),

  // Dev tools (scripts only; never present in prod images or prod env)
  KIE_AI_API_KEY: z.string().optional(),
  WORDKEEPER_API_KEY: z.string().optional(),
  EXA_API_KEY: z.string().optional(),
  FIRECRAWL_API_KEY: z.string().optional(),
});

type RawEnv = Record<string, string | undefined>;

/** Production-only requirements that cannot be expressed as plain field rules. */
function productionIssues(raw: RawEnv): string[] {
  const isProductionRuntime = raw.NODE_ENV === "production" && raw.NEXT_PHASE !== NEXT_BUILD_PHASE;
  if (!isProductionRuntime) return [];

  const required = ["SITE_URL", "FORM_HMAC_SECRET", "ORDER_TOKEN_SECRET"] as const;
  return required.filter((name) => !raw[name]).map((name) => `${name}: обязательна в production`);
}

/** MAX: sending notifications needs the bot token. Not enforced while building the image. */
function maxIssues(raw: RawEnv): string[] {
  if (raw.NEXT_PHASE === NEXT_BUILD_PHASE) return [];
  if (raw.MAX_ENABLED === "true" && !raw.MAX_BOT_TOKEN) {
    return ["MAX_BOT_TOKEN: обязательна при MAX_ENABLED=true"];
  }
  return [];
}

function normalize(source: NodeJS.ProcessEnv): RawEnv {
  const result: RawEnv = {};
  for (const [key, value] of Object.entries(source)) {
    result[key] = value === "" ? undefined : value;
  }
  return result;
}

/** Fills build-only placeholders for runtime secrets; a no-op outside `next build`. */
function withBuildPlaceholders(raw: RawEnv): RawEnv {
  if (raw.NEXT_PHASE !== NEXT_BUILD_PHASE) return raw;
  return {
    ...raw,
    DATABASE_URL: raw.DATABASE_URL ?? BUILD_PLACEHOLDER_DATABASE_URL,
    PAYLOAD_SECRET: raw.PAYLOAD_SECRET ?? BUILD_PLACEHOLDER_PAYLOAD_SECRET,
  };
}

function toEnv(parsed: z.infer<typeof envSchema>) {
  const { KIE_AI_API_KEY, WORDKEEPER_API_KEY, EXA_API_KEY, FIRECRAWL_API_KEY, ...core } = parsed;
  return {
    ...core,
    devTools: { KIE_AI_API_KEY, WORDKEEPER_API_KEY, EXA_API_KEY, FIRECRAWL_API_KEY },
  };
}

export type Env = ReturnType<typeof toEnv>;

let cached: Env | undefined;

/** Validated, memoized server environment. Throws a readable error listing invalid variables. */
export function getEnv(): Env {
  if (cached) return cached;

  const raw = withBuildPlaceholders(normalize(process.env));
  const parsed = envSchema.safeParse(raw);
  const problems = [
    ...(parsed.success
      ? []
      : parsed.error.issues.map((issue) => `${issue.path.join(".") || "(env)"}: ${issue.message}`)),
    ...productionIssues(raw),
    ...maxIssues(raw),
  ];

  if (!parsed.success || problems.length > 0) {
    throw new Error(
      `Некорректные переменные окружения:\n${problems.map((p) => `  - ${p}`).join("\n")}\n` +
        "См. env.example."
    );
  }

  cached = toEnv(parsed.data);
  return cached;
}
