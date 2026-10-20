import type { postgresAdapter } from "@payloadcms/db-postgres";
import type { Plugin } from "payload";

/**
 * No-op placeholder. Task 35 replaces this file entirely with `@payloadcms/plugin-search`
 * (collection `search`) and the `tsvector` column + GIN index hooks. Contract: keep both export
 * names and types. Until then neither export changes the schema, so `migrate:create` sees no diff.
 */
export const searchPluginEntry: Plugin = (config) => config;

export const searchSchemaHooks: NonNullable<
  Parameters<typeof postgresAdapter>[0]["afterSchemaInit"]
> = [];
