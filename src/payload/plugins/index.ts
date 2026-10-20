import { indexNowPlugin } from "./indexnow";
import { searchPluginEntry, searchSchemaHooks } from "./search";
import type { postgresAdapter } from "@payloadcms/db-postgres";
import type { Plugin } from "payload";

/** `afterSchemaInit` hooks accepted by the Postgres adapter (Payload 3.91). */
type PostgresSchemaHooks = NonNullable<Parameters<typeof postgresAdapter>[0]["afterSchemaInit"]>;

/**
 * Plugin registry wired into `payload.config.ts` (`plugins`, `db.afterSchemaInit`) by task 10,
 * so that tasks 35 and 36 only replace their own files (`search.ts`, `indexnow.ts`) and never
 * edit the config in the same wave.
 */
export const plugins: Plugin[] = [searchPluginEntry, indexNowPlugin];

/** Drizzle schema hooks run after Payload builds its tables (Postgres FTS, task 35). */
export const dbSchemaHooks: PostgresSchemaHooks = [...searchSchemaHooks];
