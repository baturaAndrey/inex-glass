import { getPayload } from "payload";
import config from "@payload-config";

/**
 * Payload Local API client for Server Components, route handlers and loaders.
 *
 * `getPayload` keeps a process-wide singleton (and applies pending `prodMigrations` on the
 * first call in production), so calling this on every request is cheap. Site code reads CMS
 * data through the cached loaders in `@/lib/cms/{globals,queries}`, not through this directly.
 */
export const getPayloadClient = () => getPayload({ config });
