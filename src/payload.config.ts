import path from "node:path";
import { fileURLToPath } from "node:url";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { ru } from "@payloadcms/translations/languages/ru";
import { buildConfig } from "payload";
import sharp from "sharp";
import { getEnv } from "@/lib/env";
import { migrations } from "./migrations";
import { catalogCollections } from "./payload/collections/catalog";
import { contentCollections } from "./payload/collections/content";
import { crmCollections } from "./payload/collections/crm";
import { Users } from "./payload/collections/users";
import { richTextEditor } from "./payload/editor";
import { globals } from "./payload/globals";

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
/** Max single file in the admin (public uploads use a separate route handler, limit 50 MB). */
const MAX_FILE_SIZE = 52 * MIB;
/**
 * Payload also limits the whole multipart request (default 50 MiB), which would reject a
 * 52 MiB file. Leave 1 MiB for form fields, headers and boundaries.
 */
const MAX_REQUEST_SIZE = MAX_FILE_SIZE + MIB;

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
  },
  i18n: {
    supportedLanguages: { ru },
    fallbackLanguage: "ru",
  },
  collections: [Users, ...contentCollections, ...catalogCollections, ...crmCollections],
  globals,
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
  }),
  upload: {
    limits: { fileSize: MAX_FILE_SIZE },
    requestSizeLimit: MAX_REQUEST_SIZE,
  },
  graphQL: { disablePlaygroundInProduction: true },
  typescript: { outputFile: path.resolve(dirname, "payload-types.ts") },
  // Default /admin and /api routes.
  routes: {},
});
