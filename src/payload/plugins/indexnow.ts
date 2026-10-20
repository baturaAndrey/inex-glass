import type { Plugin } from "payload";

/**
 * No-op placeholder. Task 36 replaces this file entirely (IndexNow pings on publish). It must not
 * change the schema: the `indexnow-submit` job slug is registered by task 18.
 */
export const indexNowPlugin: Plugin = (config) => config;
