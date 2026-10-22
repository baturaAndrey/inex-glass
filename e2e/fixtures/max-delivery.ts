/**
 * MAX delivery through a local mock (task 13 admin-redesign, optional e2e).
 *
 *   payload run e2e/fixtures/max-delivery.ts      (started by e2e/admin-redesign-max.spec.ts)
 *
 * Runs the real `max-notify` job (`new_lead`) and the real erasure flow against the MAX mock of
 * the spec (`MAX_API_BASE_URL`), on the TEST database only:
 *  1. points `site-settings.notifications.max` at a fake group chat (the original values are
 *     restored at the end);
 *  2. creates a lead tagged with `E2E_MAX_RUN` in `company` — its `afterChange` hook queues the
 *     `max-notify` job — and runs that job with `payload.jobs.runByID`;
 *  3. queues and runs a second `new_lead` job for the same lead (idempotency: no second send);
 *  4. erases the lead with `eraseLeadPersonalData` (deletes the MAX message and the journal).
 * The outcome is printed as one `MAX_DELIVERY_RESULT <json>` line; the spec asserts on it and on
 * the requests the mock recorded. Nothing here is a test assertion: the spec owns the verdict.
 *
 * SAFETY. The bot is shared with another live site. The guard below runs BEFORE anything that
 * reads the environment or the config is imported (hence the dynamic imports) and aborts with
 * exit code 3 unless the MAX API is a loopback mock, the database is a local `*_test` one, the
 * site is not production and job crons are off.
 *
 * Top-level `await` on purpose: `payload run` exits as soon as the module body returns.
 */

export {};

const GUARD_EXIT_CODE = 3;
const RESULT_PREFIX = "MAX_DELIVERY_RESULT ";
/** The fake group chat of the run (any id: outside production it is replaced by the intercept). */
const FAKE_GROUP_CHAT_ID = "-999000222";
const LOCAL_API_PREFIXES = ["http://127.0.0.1:", "http://localhost:"] as const;
const LOCAL_DB_HOSTS = new Set(["localhost", "127.0.0.1"]);
const TEST_DB_SUFFIX = "_test";

function guardFailure(reason: string): never {
  console.error(`MAX_DELIVERY_GUARD: ${reason}`);
  process.exit(GUARD_EXIT_CODE);
}

/** Refuses to run anywhere but against the loopback mock and the local test database. */
function assertSafeEnvironment(env: NodeJS.ProcessEnv): void {
  const apiBase = env.MAX_API_BASE_URL ?? "";
  if (!LOCAL_API_PREFIXES.some((prefix) => apiBase.startsWith(prefix))) {
    guardFailure("MAX_API_BASE_URL must point at a loopback mock (http://127.0.0.1:<port>)");
  }
  let dbName = "";
  let dbHost = "";
  try {
    const url = new URL(env.DATABASE_URL ?? "");
    dbName = decodeURIComponent(url.pathname.replace(/^\//, ""));
    dbHost = url.hostname;
  } catch {
    guardFailure("DATABASE_URL is not a URL");
  }
  if (!dbName.endsWith(TEST_DB_SUFFIX) || !LOCAL_DB_HOSTS.has(dbHost)) {
    guardFailure(`DATABASE_URL must be a local *${TEST_DB_SUFFIX} database`);
  }
  if (env.SITE_ENV === "production") guardFailure("SITE_ENV must not be production");
  if (env.MAX_ENABLED !== "true") guardFailure("MAX_ENABLED must be true (the mock is up)");
  if (!env.MAX_INTERCEPT_CHAT_ID) guardFailure("MAX_INTERCEPT_CHAT_ID must be set");
  if (env.JOBS_ENABLED === "true") guardFailure("JOBS_ENABLED must be false (no crons)");
  if (!env.E2E_MAX_RUN) guardFailure("E2E_MAX_RUN (fixture marker) must be set");
}

assertSafeEnvironment(process.env);

const runMarker = process.env.E2E_MAX_RUN as string;

const { default: config } = await import("@payload-config");
const { getPayload } = await import("payload");
const { eraseLeadPersonalData } = await import("@/lib/leads-admin/erase");
const { readMaxSettings, updateMaxSettings } = await import("@/lib/max/link-service");
const { MAX_NOTIFY } = await import("@/jobs/max-notify");

const payload = await getPayload({ config });

type LogRow = { status: string; messageId: string | null; chatId: string | null; key: string };

async function journal(leadId: string): Promise<LogRow[]> {
  const { docs } = await payload.find({
    collection: "notification-log",
    where: { lead: { equals: leadId } },
    depth: 0,
    pagination: false,
    overrideAccess: true,
  });
  return docs.map((doc) => ({
    status: doc.status,
    messageId: doc.messageId ?? null,
    chatId: doc.chatId ?? null,
    key: doc.key,
  }));
}

/** Pending `max-notify` jobs of the lead (queued by the hook or by this script). */
async function pendingNotifyJobs(leadId: string): Promise<string[]> {
  const { docs } = await payload.find({
    collection: "payload-jobs",
    where: {
      and: [
        { taskSlug: { equals: MAX_NOTIFY } },
        { "input.leadId": { equals: leadId } },
        { completedAt: { exists: false } },
      ],
    },
    depth: 0,
    pagination: false,
    overrideAccess: true,
  });
  return docs.map((doc) => String(doc.id));
}

async function runJobs(ids: readonly string[]): Promise<void> {
  for (const id of ids) await payload.jobs.runByID({ id, silent: true });
}

const originalMax = await readMaxSettings(payload);
let leadId: string | null = null;
let exitCode = 0;

try {
  await updateMaxSettings(payload, { groupChatId: FAKE_GROUP_CHAT_ID, newLead: true });

  const lead = await payload.create({
    collection: "leads",
    data: {
      formType: "callback",
      company: `E2E ${runMarker}`,
      name: "E2E MAX",
      phone: `+79${String(Math.floor(Math.random() * 1e9)).padStart(9, "0")}`,
    },
    depth: 0,
    overrideAccess: true,
    context: { disableRevalidate: true },
  });
  leadId = lead.id;

  // 1. The job the lead hook queued (MAX_ENABLED=true in this process).
  const hookJobs = await pendingNotifyJobs(lead.id);
  await runJobs(hookJobs);
  const afterFirst = await journal(lead.id);

  // 2. A second job for the same event: the journal key makes it a duplicate.
  const queued = await payload.jobs.queue({
    task: MAX_NOTIFY,
    input: { event: "new_lead", leadId: lead.id },
  });
  await runJobs([String(queued.id)]);
  const afterSecond = await journal(lead.id);
  const leftoverJobs = await pendingNotifyJobs(lead.id);

  // 3. Erasure: the journal rows go with the lead, the MAX message is deleted in the chat.
  const erase = await eraseLeadPersonalData(payload, lead.id, { id: "e2e-max-delivery" });
  if (erase.ok) leadId = null;
  const afterErase = await journal(lead.id);

  const outcome = {
    leadId: lead.id,
    hookJobs: hookJobs.length,
    afterFirst,
    afterSecond,
    leftoverJobs: leftoverJobs.length,
    erase,
    afterErase,
  };
  process.stdout.write(`${RESULT_PREFIX}${JSON.stringify(outcome)}\n`);
} catch (error) {
  exitCode = 1;
  console.error(`MAX_DELIVERY_ERROR ${error instanceof Error ? error.name : "unknown"}`);
  if (error instanceof Error) console.error(error.stack ?? error.message);
} finally {
  // Best effort cleanup: a lead left behind by a failure, then the original settings.
  if (leadId) {
    await eraseLeadPersonalData(payload, leadId, { id: "e2e-max-delivery" }).catch(() => {
      exitCode = 1;
      console.error(`MAX_DELIVERY_CLEANUP lead ${leadId} was not erased`);
    });
  }
  await updateMaxSettings(payload, {
    groupChatId: originalMax.groupChatId ?? null,
    newLead: originalMax.newLead ?? null,
  }).catch(() => {
    exitCode = 1;
    console.error("MAX_DELIVERY_CLEANUP site-settings were not restored");
  });
}

/**
 * Closes the pooled sockets of the global `fetch` (undici) before exiting: on Windows,
 * `process.exit()` while undici still closes a keep-alive socket aborts Node with a libuv
 * assertion (`UV_HANDLE_CLOSING`, exit 3221226505) — the same issue `src/lib/cms/revalidate-token.ts`
 * avoids for the seed.
 */
async function closeFetchPool(): Promise<void> {
  const dispatcher = (globalThis as Record<symbol, unknown>)[
    Symbol.for("undici.globalDispatcher.1")
  ] as { close?: () => Promise<void> } | undefined;
  await dispatcher?.close?.().catch(() => undefined);
}

await closeFetchPool();
process.exit(exitCode);
