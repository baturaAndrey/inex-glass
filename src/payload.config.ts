import path from "node:path";
import { fileURLToPath } from "node:url";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { ru } from "@payloadcms/translations/languages/ru";
import { buildConfig } from "payload";
import sharp from "sharp";
import { getEnv } from "@/lib/env";
import { isJobsRunnerEnabled, JOB_AUTORUN, jobTasks } from "./jobs";
import { migrations } from "./migrations";
import { getRole, isAdmin } from "./payload/access";
import { catalogCollections } from "./payload/collections/catalog";
import { contentCollections } from "./payload/collections/content";
import { crmCollections } from "./payload/collections/crm";
import { Users } from "./payload/collections/users";
import { richTextEditor } from "./payload/editor";
import { createEmailAdapter, isSmtpConfigured } from "./payload/email";
import { globals } from "./payload/globals";
import { dbSchemaHooks, plugins } from "./payload/plugins";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const env = getEnv();

/**
 * Public origin without a trailing slash (browsers send `Origin` in that form). Payload also
 * appends serverURL to `csrf` on its own; it is listed explicitly for clarity. Cookie auth from
 * any other Origin is rejected, so in dev open the admin at SITE_URL (default
 * http://localhost:3000), not at 127.0.0.1.
 */
const SERVER_ORIGIN = new URL(env.SITE_URL).origin;

const MIB = 1024 * 1024;
/**
 * Max single file in the admin (public uploads use a separate route handler, limit 50 MB).
 * Inclusive: busboy rejects a file that REACHES the limit, so «до 52 МиБ» needs `+ 1` for a file
 * of exactly 52 MiB to pass (task-42 acceptance, scenario 11).
 */
const MAX_FILE_SIZE = 52 * MIB + 1;
/**
 * Payload also limits the whole multipart request (default 50 MiB), which would reject a
 * 52 MiB file. Leave 1 MiB for form fields, headers and boundaries.
 */
const MAX_REQUEST_SIZE = MAX_FILE_SIZE + MIB;

export default buildConfig({
  admin: {
    user: Users.slug,
    // Russian day-first format for every date in the admin (list cells, fields); date-fns pattern.
    dateFormat: "dd.MM.yyyy HH:mm",
    importMap: { baseDir: path.resolve(dirname) },
    // Light only (DESIGN.md): no theme switcher in the account view.
    theme: "light",
    meta: {
      titleSuffix: " — Inex Glass",
      icons: [{ rel: "icon", type: "image/x-icon", url: "/favicon.ico" }],
    },
    components: {
      graphics: {
        Logo: "/payload/admin/graphics/logo#AdminLogo",
        Icon: "/payload/admin/graphics/icon#AdminIcon",
      },
      // Admin redesign: own sidebar (task 03) and dashboard (task 04); stubs render Payload's defaults.
      Nav: "/payload/admin/nav/inex-nav#InexNav",
      views: {
        dashboard: { Component: "/payload/admin/views/dashboard#InexDashboard" },
        // Leads report (task 32): the `/admin/leads-report` view.
        leadsReport: {
          Component: "/payload/admin/views/leads-report#LeadsReportView",
          path: "/leads-report",
        },
      },
    },
  },
  i18n: {
    supportedLanguages: { ru },
    fallbackLanguage: "ru",
  },
  collections: [Users, ...contentCollections, ...catalogCollections, ...crmCollections],
  globals,
  // Registry (task 10): tasks 35/36 replace only `src/payload/plugins/{search,indexnow}.ts`.
  plugins,
  editor: richTextEditor,
  secret: env.PAYLOAD_SECRET,
  serverURL: SERVER_ORIGIN,
  csrf: [SERVER_ORIGIN],
  sharp,
  db: postgresAdapter({
    idType: "uuid",
    pool: { connectionString: env.DATABASE_URL },
    // Push ONLY by explicit flag and ONLY on a personal throwaway DB (NEVER on a shared one).
    push: env.PAYLOAD_DB_PUSH,
    // Applied on Payload init in production. Migrations are expand/contract only.
    prodMigrations: migrations,
    migrationDir: path.resolve(dirname, "migrations"),
    // Drizzle hooks from the plugin registry (e.g. FTS column + GIN index, task 35).
    afterSchemaInit: dbSchemaHooks,
  }),
  upload: {
    limits: { fileSize: MAX_FILE_SIZE },
    requestSizeLimit: MAX_REQUEST_SIZE,
  },
  // SMTP via nodemailer with staging interception (task 18). Without SMTP_HOST Payload uses its
  // console adapter and `sendMail` refuses to send, so mail jobs fail visibly.
  ...(isSmtpConfigured() ? { email: createEmailAdapter() } : {}),
  // Payload Jobs (task 18): the task list is frozen with the `add_jobs_queue` migration.
  jobs: {
    tasks: jobTasks,
    // Runner and scheduler crons exist only on the jobs container (JOBS_ENABLED=true); other
    // containers only queue jobs. Crons start on the first `getPayload({ cron: true })`.
    autoRun: () => (isJobsRunnerEnabled() ? [...JOB_AUTORUN] : []),
    shouldAutoRun: () => isJobsRunnerEnabled(),
    deleteJobOnComplete: true,
    access: {
      queue: ({ req }) => getRole(req.user) !== null,
      run: ({ req }) => getRole(req.user) === "admin",
      cancel: ({ req }) => getRole(req.user) === "admin",
    },
    jobsCollectionOverrides: ({ defaultJobsCollection }) => ({
      ...defaultJobsCollection,
      admin: {
        ...defaultJobsCollection.admin,
        group: "Система",
        // Failed jobs (e.g. no lead recipients) stay visible to admins.
        hidden: ({ user }) => getRole(user) !== "admin",
      },
      access: { read: isAdmin, update: isAdmin, delete: isAdmin, create: () => false },
    }),
  },
  graphQL: { disablePlaygroundInProduction: true },
  typescript: { outputFile: path.resolve(dirname, "payload-types.ts") },
  // Default /admin and /api routes.
  routes: {},
});
